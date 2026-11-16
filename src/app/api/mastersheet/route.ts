/**
 * POST /api/mastersheet
 * Reads the uploaded notes and previous papers with Gemini and returns the
 * content of a mastersheet: key topics with notes, and formulas.
 *
 * The API key stays on the server. Set GEMINI_API_KEY in .env.local.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const MAX_FILES = 10;

const MIME: Record<string, { type: "document" | "image"; mime: string }> = {
  ".pdf": { type: "document", mime: "application/pdf" },
  ".png": { type: "image", mime: "image/png" },
  ".jpg": { type: "image", mime: "image/jpeg" },
  ".jpeg": { type: "image", mime: "image/jpeg" },
  ".webp": { type: "image", mime: "image/webp" },
};

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Subject name as it appears in the material, or the one the student gave." },
    unit: { type: "string", description: "Unit or chapter title covered by the material." },
    topics: {
      type: "array",
      description: "The most exam-important topics, most important first.",
      items: {
        type: "object",
        properties: {
          term: { type: "string", description: "Short topic name, at most 5 words." },
          definition: { type: "string", description: "A 2-mark answer: one or two sentences a student can reproduce in an exam." },
          points: { type: "array", items: { type: "string" }, description: "2 to 3 short revision notes on this topic." },
        },
        required: ["term", "definition", "points"],
      },
    },
    formulas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          expr: { type: "string", description: "The formula in plain text, e.g. TAT = CT - AT. No LaTeX." },
          note: { type: "string", description: "What the symbols mean, in a few words." },
          source: {
            type: "string",
            enum: ["document", "ai"],
            description: "document = this formula appears in the uploaded files. ai = it does not; you supplied it.",
          },
        },
        required: ["name", "expr", "note", "source"],
      },
    },
    pyqInsights: {
      type: "array",
      items: { type: "string" },
      description: "Only when previous papers were uploaded: up to 4 short observations about questions that recur.",
    },
  },
  required: ["subject", "unit", "topics", "formulas", "pyqInsights"],
};

type Formula = { name: string; expr: string; note: string; source: "document" | "ai" };
type Topic = { term: string; definition: string; points: string[] };

function buildPrompt(o: {
  subject: string;
  unit: string;
  topics: string[];
  pattern: string;
  notesCount: number;
  pyqCount: number;
}) {
  const hasFiles = o.notesCount + o.pyqCount > 0;
  return [
    "You are building a one-page last-minute exam revision sheet for an Indian university engineering student.",
    hasFiles
      ? `Attached: ${o.notesCount} file(s) of notes, textbook pages or slides, followed by ${o.pyqCount} previous-semester question paper(s).`
      : "No files are attached. Work from the subject and topics below using standard textbook knowledge.",
    o.subject ? `Subject given by the student: ${o.subject}.` : "The student did not name the subject. Detect it from the files.",
    o.unit ? `Unit or focus given by the student: ${o.unit}.` : "",
    o.topics.length
      ? `The student asked for these topics. Include every one of them, then add other important ones: ${o.topics.join("; ")}.`
      : "The student did not list topics. Pick them yourself.",
    `Target exam pattern: ${o.pattern}.`,
    "",
    "Do this:",
    "1. Pick the 5 to 8 topics that matter most for the exam. Prefer topics the material spends the most space on and, when previous papers are attached, topics those papers ask about repeatedly.",
    "2. For each topic write a 2-mark definition and 2 to 3 short revision notes. Use the wording of the uploaded material where it is correct.",
    "3. Formulas: list every important formula that appears in the uploaded files, each with source \"document\". Copy them accurately.",
    "4. If the uploaded files contain no formulas at all (or no files are attached), supply the standard formulas for these topics yourself, up to 6, each with source \"ai\". Never mark a formula \"document\" unless it is actually in the files. If the subject truly has no formulas, return an empty list.",
    "5. pyqInsights: only if previous papers are attached, otherwise an empty list.",
    "Write formulas in plain text without LaTeX. Keep everything concise enough to fit one printed page.",
  ]
    .filter((line) => line !== "")
    .join("\n");
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

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function clean(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  const topics: Topic[] = (Array.isArray(r.topics) ? r.topics : [])
    .map((t: Record<string, unknown>) => ({
      term: str(t?.term, 80),
      definition: str(t?.definition, 600),
      points: (Array.isArray(t?.points) ? t.points : []).map((p: unknown) => str(p, 300)).filter(Boolean).slice(0, 4),
    }))
    .filter((t: Topic) => t.term && t.definition)
    .slice(0, 10);
  const formulas: Formula[] = (Array.isArray(r.formulas) ? r.formulas : [])
    .map((f: Record<string, unknown>) => ({
      name: str(f?.name, 80),
      expr: str(f?.expr, 200),
      note: str(f?.note, 200),
      source: f?.source === "document" ? ("document" as const) : ("ai" as const),
    }))
    .filter((f: Formula) => f.expr)
    .slice(0, 12);
  return {
    subject: str(r.subject, 120),
    unit: str(r.unit, 160),
    topics,
    formulas,
    pyqInsights: (Array.isArray(r.pyqInsights) ? r.pyqInsights : []).map((p: unknown) => str(p, 240)).filter(Boolean).slice(0, 4),
  };
}

const fail = (status: number, error: string, code?: string) => Response.json({ error, code }, { status });

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return fail(503, "AI is not set up yet. Add GEMINI_API_KEY to the .env.local file and restart the server.", "no_key");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "The upload could not be read. Try again with smaller files.");
  }

  const subject = str(form.get("subject"), 120);
  const unit = str(form.get("unit"), 160);
  const pattern = str(form.get("pattern"), 80) || "2-mark and 10-mark questions";
  let topics: string[] = [];
  try {
    const parsed = JSON.parse(str(form.get("topics"), 4000) || "[]");
    if (Array.isArray(parsed)) topics = parsed.map((t) => str(t, 80)).filter(Boolean).slice(0, 12);
  } catch {
    // ignore malformed topics
  }

  const notes = form.getAll("notes").filter((f): f is File => f instanceof File);
  const pyqs = form.getAll("pyqs").filter((f): f is File => f instanceof File);
  const all = [...notes, ...pyqs];
  if (all.length > MAX_FILES) return fail(400, `Attach at most ${MAX_FILES} files in total.`);
  if (all.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
    return fail(413, "These files are too large together. Keep the total under 18 MB.");
  }
  if (all.length === 0 && topics.length === 0) {
    return fail(400, "Attach a PDF or add at least one topic.");
  }

  const skipped: string[] = [];
  const parts: Record<string, string>[] = [];
  let notesRead = 0;
  let pyqsRead = 0;
  for (const [group, files] of [["notes", notes], ["pyqs", pyqs]] as const) {
    for (const file of files) {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
      const kind = MIME[ext];
      if (!kind) {
        skipped.push(file.name);
        continue;
      }
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      parts.push({ type: kind.type, data, mime_type: kind.mime });
      if (group === "notes") notesRead++;
      else pyqsRead++;
    }
  }
  if (all.length > 0 && parts.length === 0) {
    return fail(400, "None of these files can be read. Use PDF or image files; export Word files as PDF first.");
  }

  parts.push({ type: "text", text: buildPrompt({ subject, unit, topics, pattern, notesCount: notesRead, pyqCount: pyqsRead }) });

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
      body: JSON.stringify({
        model: MODEL,
        input: parts,
        response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return fail(504, "The AI service did not answer in time. Try again, or use a smaller file.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = str((body as { error?: { message?: unknown } })?.error?.message, 300);
    if (res.status === 429) return fail(429, "The free AI quota is used up for now. Wait a minute and try again.");
    if (res.status === 401 || res.status === 403) return fail(502, `The Gemini API key was rejected. ${detail}`);
    return fail(502, `The AI service returned an error (${res.status}). ${detail}`);
  }

  const text = extractText(body);
  if (!text) return fail(502, "The AI returned no content. It may have declined this file; try another.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return fail(502, "The AI answer could not be understood. Try again.");
  }

  const sheet = clean(parsed);
  if (sheet.topics.length === 0) return fail(502, "The AI could not find any topics in this material.");

  return Response.json({ ...sheet, filesRead: parts.length - 1, skipped, model: MODEL });
}
