/**
 * Server-only helper for calling Google Gemini (Interactions API).
 * Shared by the Mastersheet, Note Builder and Grade Analyzer routes.
 *
 * Needs GEMINI_API_KEY in the environment (.env.local locally, Project Settings →
 * Environment Variables on Vercel). GEMINI_MODEL optionally overrides the model.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export type Part =
  | { type: "text"; text: string }
  | { type: "document" | "image"; data: string; mime_type: string };

const MIME: Record<string, { type: "document" | "image"; mime: string }> = {
  ".pdf": { type: "document", mime: "application/pdf" },
  ".png": { type: "image", mime: "image/png" },
  ".jpg": { type: "image", mime: "image/jpeg" },
  ".jpeg": { type: "image", mime: "image/jpeg" },
  ".webp": { type: "image", mime: "image/webp" },
};

/** A failure to show the student, with the HTTP status the route should return. */
export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const aiErrorResponse = (e: unknown) =>
  e instanceof AiError
    ? Response.json({ error: e.message, code: e.code }, { status: e.status })
    : Response.json({ error: "Something went wrong on the server. Try again." }, { status: 500 });

export function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AiError(
      503,
      "AI is not set up yet. Add GEMINI_API_KEY to .env.local (or to the Vercel project's environment variables) and restart.",
      "no_key",
    );
  }
  return key;
}

/** Turn uploaded files into Gemini parts. Files of unsupported types are listed in `skipped`. */
export async function filesToParts(files: File[]) {
  const parts: Part[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    const kind = MIME[ext];
    if (!kind) {
      skipped.push(file.name);
      continue;
    }
    parts.push({ type: kind.type, data: Buffer.from(await file.arrayBuffer()).toString("base64"), mime_type: kind.mime });
  }
  return { parts, skipped };
}

/** Pull the generated text out of an Interactions API response. */
function extractText(body: unknown): string | null {
  const b = body as { output_text?: unknown; steps?: { content?: { text?: unknown }[] }[] };
  if (typeof b?.output_text === "string") return b.output_text;
  const steps = Array.isArray(b?.steps) ? b.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    for (const part of steps[i]?.content ?? []) {
      if (typeof part?.text === "string" && part.text.trim()) return part.text;
    }
  }
  return null;
}

const short = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Models to try, in order. When one is overloaded (503) or out of free quota (429),
 * the next one is used. GEMINI_FALLBACK_MODELS (comma separated) overrides the list.
 */
const MODELS = [
  GEMINI_MODEL,
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.7-flash,gemini-flash-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
].filter((m, i, all) => all.indexOf(m) === i);

const BUSY = new Set([429, 500, 503]);

// A model that hangs must not use up the whole request: cap each attempt, except the last.
const FIRST_TRY_MS = 28_000;
const FALLBACK_TRY_MS = 20_000;

/**
 * Send files and a prompt to Gemini and get back JSON matching `schema`, plus the model that answered.
 * A busy, slow or unavailable model hands over to the next one. All attempts share `timeoutMs`.
 * Throws AiError with a student-friendly message on every failure.
 */
export async function generateJson<T = unknown>(parts: Part[], schema: object, timeoutMs = 55_000): Promise<{ data: T; model: string }> {
  const key = requireKey();
  const deadline = Date.now() + timeoutMs;
  const payload = (model: string) =>
    JSON.stringify({ model, input: parts, response_format: { type: "text", mime_type: "application/json", schema } });

  let lastBusy = "";
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const left = deadline - Date.now();
    if (left < 3_000) break;
    const isLast = i === MODELS.length - 1;
    const budget = isLast ? left : Math.min(left, i === 0 ? FIRST_TRY_MS : FALLBACK_TRY_MS);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
        body: payload(model),
        signal: AbortSignal.timeout(budget),
      });
    } catch {
      lastBusy = "slow"; // timed out or network hiccup: let the next model try
      continue;
    }

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = short((body as { error?: { message?: unknown } })?.error?.message, 300);
      if (BUSY.has(res.status)) {
        lastBusy = res.status === 429 ? "quota" : "busy";
        continue;
      }
      if (res.status === 404) continue; // model not available on this key
      if (res.status === 400 && /api key/i.test(detail)) throw new AiError(502, "The Gemini API key is not valid. Check GEMINI_API_KEY.", "bad_key");
      if (res.status === 401 || res.status === 403) throw new AiError(502, `The Gemini API key was rejected. ${detail}`, "bad_key");
      throw new AiError(502, `The AI service returned an error (${res.status}). ${detail}`);
    }

    const text = extractText(body);
    if (!text) throw new AiError(502, "The AI returned no content. It may have declined this file; try another.");
    try {
      return { data: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T, model };
    } catch {
      throw new AiError(502, "The AI answer could not be understood. Try again.");
    }
  }

  if (lastBusy === "slow") throw new AiError(504, "The AI service did not answer in time. Try again, or use smaller files.", "timeout");

  if (lastBusy === "quota") throw new AiError(429, "The free AI quota is used up for now. Wait a minute and try again.", "quota");
  if (lastBusy === "busy") throw new AiError(503, "The AI service is very busy right now. Try again in a minute.", "busy");
  throw new AiError(502, `None of the configured AI models are available on this key (${MODELS.join(", ")}).`, "bad_model");
}
