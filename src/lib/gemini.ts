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
 * Models in order of preference. GEMINI_FALLBACK_MODELS (comma separated) overrides the backups.
 * The lite models come early because they keep answering when Google's main models are overloaded.
 */
const MODELS = [
  GEMINI_MODEL,
  ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite,gemini-3.7-flash,gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
].filter((m, i, all) => all.indexOf(m) === i);

const BUSY = new Set([429, 500, 503]);

/** If the current models have not answered after this long, the next model starts as well. */
const HEAD_START_MS = 12_000;

type Outcome =
  | { ok: true; data: unknown; model: string }
  | { ok: false; kind: "busy" | "quota" | "slow" | "missing" | "bad_output"; error?: AiError }
  | { ok: false; kind: "fatal"; error: AiError };

/**
 * Send files and a prompt to Gemini and get back JSON matching `schema`, plus the model that answered.
 *
 * The preferred model starts first. If it fails, or has not answered within HEAD_START_MS, the next
 * model starts too; the first valid answer wins and the other requests are cancelled. So a healthy
 * main model answers on its own, and an overloaded one is covered by a backup within seconds.
 * Throws AiError with a student-friendly message on every failure.
 */
export async function generateJson<T = unknown>(parts: Part[], schema: object, timeoutMs = 55_000): Promise<{ data: T; model: string }> {
  const key = requireKey();
  const deadline = Date.now() + timeoutMs;
  const all = new AbortController();
  const stopAll = setTimeout(() => all.abort(), timeoutMs);

  async function attempt(model: string): Promise<Outcome> {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
        body: JSON.stringify({ model, input: parts, response_format: { type: "text", mime_type: "application/json", schema } }),
        signal: all.signal,
      });
    } catch {
      return { ok: false, kind: "slow" };
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = short((body as { error?: { message?: unknown } })?.error?.message, 300);
      if (BUSY.has(res.status)) return { ok: false, kind: res.status === 429 ? "quota" : "busy" };
      if (res.status === 404) return { ok: false, kind: "missing" };
      if (res.status === 400 && /api key/i.test(detail)) {
        return { ok: false, kind: "fatal", error: new AiError(502, "The Gemini API key is not valid. Check GEMINI_API_KEY.", "bad_key") };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, kind: "fatal", error: new AiError(502, `The Gemini API key was rejected. ${detail}`, "bad_key") };
      }
      return { ok: false, kind: "bad_output", error: new AiError(502, `The AI service returned an error (${res.status}). ${detail}`) };
    }
    const text = extractText(body);
    if (!text) {
      return { ok: false, kind: "bad_output", error: new AiError(502, "The AI returned no content. It may have declined this file; try another.") };
    }
    try {
      return { ok: true, data: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")), model };
    } catch {
      return { ok: false, kind: "bad_output", error: new AiError(502, "The AI answer could not be understood. Try again.") };
    }
  }

  const running = new Map<number, Promise<{ id: number; out: Outcome }>>();
  let next = 0;
  const launch = () => {
    if (next >= MODELS.length || Date.now() > deadline - 2_000) return;
    const id = next++;
    running.set(id, attempt(MODELS[id]).then((out) => ({ id, out })));
  };

  const seen = new Set<string>();
  let lastError: AiError | undefined;
  try {
    launch();
    while (running.size > 0) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const headStart =
        next < MODELS.length ? new Promise<"head-start">((r) => (timer = setTimeout(() => r("head-start"), HEAD_START_MS))) : null;
      const winner = await Promise.race(headStart ? [...running.values(), headStart] : [...running.values()]);
      clearTimeout(timer);

      if (winner === "head-start") {
        launch();
        continue;
      }
      running.delete(winner.id);
      const { out } = winner;
      if (out.ok) return { data: out.data as T, model: out.model };
      if (out.kind === "fatal") throw out.error;
      seen.add(out.kind);
      if (out.error) lastError = out.error;
      launch(); // this model failed: start the next one straight away
    }
  } finally {
    clearTimeout(stopAll);
    all.abort(); // cancel any requests still running
  }

  if (seen.has("bad_output") && lastError) throw lastError;
  if (seen.has("quota") && !seen.has("busy") && !seen.has("slow")) {
    throw new AiError(429, "The free AI quota is used up for now. Wait a minute and try again.", "quota");
  }
  if (seen.has("busy")) throw new AiError(503, "The AI service is very busy right now. Try again in a minute.", "busy");
  if (seen.has("slow")) throw new AiError(504, "The AI service did not answer in time. Try again, or use smaller files.", "timeout");
  throw new AiError(502, `None of the configured AI models are available on this key (${MODELS.join(", ")}).`, "bad_model");
}
