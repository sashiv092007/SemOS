/**
 * POST /api/notes
 * Reads uploaded photos, screenshots and PDFs with Gemini and returns structured
 * study notes: one entry per topic with a definition, a short summary, an optional
 * formula, revision bullets and 2-mark questions. The Note Builder lays these out
 * as "Exam Ready", "Detailed Summary" or "2-Mark Q&A" pages without another call.
 */

import { aiErrorResponse, AiError, filesToParts, generateJson, requireKey, type Part } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_FILES = 12;
// Gemini takes inline files up to about 20 MB per request in total.
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Subject name, e.g. Operating Systems. Empty if it cannot be told." },
    unit: { type: "string", description: "Unit or chapter title the material covers, e.g. Unit 3 - Process Synchronization." },
    topics: {
      type: "array",
      description: "Every topic in the material, in the order it appears. 3 to 12 topics.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Topic name, at most 6 words." },
          def: {
            type: "string",
            description: "One or two sentence definition. Wrap 2 to 4 key terms in **double asterisks**.",
          },
          summary: { type: "string", description: "2 to 3 sentences explaining the idea in plain words." },
          formula: {
            type: "object",
            description: "Only if the topic has a formula, algorithm step or code fragment in the material. Otherwise omit.",
            properties: {
              label: { type: "string", description: "What the formula is, e.g. Effective access time." },
              expr: { type: "string", description: "Plain text, no LaTeX. Use \\n between lines of code." },
            },
            required: ["label", "expr"],
          },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "3 short revision points. Wrap key terms in **double asterisks**.",
          },
          qa: {
            type: "array",
            description: "1 to 3 two-mark exam questions on this topic with model answers.",
            items: {
              type: "object",
              properties: { q: { type: "string" }, a: { type: "string", description: "One or two sentences." } },
              required: ["q", "a"],
            },
          },
        },
        required: ["name", "def", "summary", "bullets", "qa"],
      },
    },
    unreadable: {
      type: "array",
      items: { type: "string" },
      description: "Short notes about parts that could not be read (blurred, cut off). Empty if all was readable.",
    },
  },
  required: ["subject", "unit", "topics", "unreadable"],
};

function buildPrompt(count: number, autoClean: boolean) {
  return [
    `Attached: ${count} file(s) a university student uploaded: textbook photos, whiteboard or blackboard photos, WhatsApp screenshots, lecture slides or PDFs.`,
    "Turn them into clean, structured study notes for exam revision.",
    autoClean
      ? "The photos may be messy: handwriting, glare and reflections on a board, skewed angles, crossed-out words. Read through that and fix obvious spelling slips, but never invent content that is not there."
      : "Keep the wording close to the original material.",
    "",
    "Rules:",
    "1. Cover every topic that appears in the material, in the order it appears. Merge duplicates across files.",
    "2. Use the material's own facts. Where a definition is incomplete you may complete it with standard textbook knowledge, but keep it accurate and short.",
    "3. Formulas, algorithm steps and code go in `formula`, copied accurately in plain text. Omit `formula` when there is none.",
    "4. Write 2-mark questions the way Indian university exams ask them (Define..., State..., Differentiate..., List...).",
    "5. If something is unreadable, say so in `unreadable` instead of guessing.",
    "6. Skip anything that is not study material (chat messages, stickers, phone status bars).",
  ].join("\n");
}

type Topic = {
  name: string;
  def: string;
  summary: string;
  formula?: { label: string; expr: string };
  bullets: string[];
  qa: { q: string; a: string }[];
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function clean(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  const topics: Topic[] = (Array.isArray(r.topics) ? r.topics : [])
    .map((t: Record<string, unknown>) => {
      const f = (t?.formula ?? null) as Record<string, unknown> | null;
      // Models sometimes write a backslash and "n" instead of a real line break.
      const expr = str(f?.expr, 600).replace(/\\n/g, "\n");
      const formula = expr ? { label: str(f?.label, 80) || "Formula", expr } : undefined;
      return {
        name: str(t?.name, 80),
        def: str(t?.def, 600),
        summary: str(t?.summary, 900),
        ...(formula ? { formula } : {}),
        bullets: (Array.isArray(t?.bullets) ? t.bullets : []).map((b: unknown) => str(b, 300)).filter(Boolean).slice(0, 5),
        qa: (Array.isArray(t?.qa) ? t.qa : [])
          .map((x: Record<string, unknown>) => ({ q: str(x?.q, 300), a: str(x?.a, 600) }))
          .filter((x: { q: string; a: string }) => x.q && x.a)
          .slice(0, 3),
      };
    })
    .filter((t: Topic) => t.name && t.def)
    .slice(0, 14);
  return {
    subject: str(r.subject, 120),
    unit: str(r.unit, 160),
    topics,
    unreadable: (Array.isArray(r.unreadable) ? r.unreadable : []).map((u: unknown) => str(u, 200)).filter(Boolean).slice(0, 5),
  };
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  try {
    requireKey();
  } catch (e) {
    return aiErrorResponse(e);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "The upload could not be read. Try again with smaller files.");
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail(400, "Add at least one photo, screenshot or PDF first.");
  if (files.length > MAX_FILES) return fail(400, `Add at most ${MAX_FILES} files at a time.`);
  if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
    return fail(413, "These files are too large together. Keep the total under 18 MB, or split them into two batches.");
  }

  const { parts, skipped } = await filesToParts(files);
  if (parts.length === 0) return fail(400, "None of these files can be read. Use JPG, PNG, WEBP or PDF files.");

  const prompt: Part = { type: "text", text: buildPrompt(parts.length, form.get("autoClean") !== "false") };

  try {
    const { data, model } = await generateJson([...parts, prompt], SCHEMA);
    const notes = clean(data);
    if (notes.topics.length === 0) {
      throw new AiError(422, "No study topics were found in these files. Try clearer photos or a PDF of the notes.");
    }
    return Response.json({ ...notes, filesRead: parts.length, skipped, model });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
