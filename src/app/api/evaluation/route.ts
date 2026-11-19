/**
 * POST /api/evaluation
 * Reads a course delivery plan (CDP), syllabus or evaluation-scheme screenshot with
 * Gemini and returns the evaluation components (mid-sems, labs, quizzes, end-sem...)
 * with their weightage in the final grade and their maximum marks. Each component is
 * marked as probably done or still to come, using dates in the document when present.
 */

import { AiError, aiErrorResponse, filesToParts, generateJson, requireKey, type Part } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

const SCHEMA = {
  type: "object",
  properties: {
    course: { type: "string", description: "Course name or code if shown, else empty." },
    components: {
      type: "array",
      description: "Every assessed component that counts towards the final grade.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name, e.g. Mid-Sem 1, Lab Record, Quiz 2, End-Sem Exam." },
          weight: { type: "number", description: "Share of the final grade in percent (0-100)." },
          max: { type: "number", description: "Maximum marks of this component as written, e.g. 50. Use 100 if not given." },
          status: {
            type: "string",
            enum: ["done", "upcoming", "unknown"],
            description: "done if its date is before today, upcoming if after today, unknown if the document has no date for it.",
          },
          when: { type: "string", description: "Date or week as written in the document, else empty." },
        },
        required: ["name", "weight", "max", "status", "when"],
      },
    },
    note: { type: "string", description: "One short sentence about anything unclear, e.g. weights not adding to 100. Empty if all clear." },
  },
  required: ["course", "components", "note"],
};

function buildPrompt(today: string) {
  return [
    "Attached: a university course delivery plan (CDP), syllabus or evaluation-scheme document, or a screenshot of one.",
    `Today's date is ${today}.`,
    "List every assessed component that counts towards the final grade: internal tests, mid-semester exams, quizzes, assignments, lab work, projects, attendance marks, end-semester exam.",
    "For each give its weight as a percent of the final grade. If the document gives marks instead (e.g. CIE 50 + SEE 50, or Test 1 = 20 marks out of 100 total), convert them to percent of the final grade.",
    "Give the component's own maximum marks as written. Mark each one done, upcoming or unknown by comparing its date with today. The end-semester exam is upcoming unless its date has passed.",
    "Do not invent components. If the weights do not add up to 100, say so in `note`.",
  ].join("\n");
}

type Component = { name: string; weight: number; max: number; status: "done" | "upcoming" | "unknown"; when: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function clean(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  const components: Component[] = (Array.isArray(r.components) ? r.components : [])
    .map((c: Record<string, unknown>) => ({
      name: str(c?.name, 60),
      weight: Math.max(0, Math.min(100, Number(c?.weight) || 0)),
      max: Math.max(1, Math.min(1000, Math.round(Number(c?.max) || 100))),
      status: c?.status === "done" || c?.status === "upcoming" ? (c.status as "done" | "upcoming") : ("unknown" as const),
      when: str(c?.when, 40),
    }))
    .filter((c: Component) => c.name && c.weight > 0)
    .slice(0, 12);

  // If the weights overshoot 100, scale them down so the split stays valid.
  const sum = components.reduce((s, c) => s + c.weight, 0);
  if (sum > 100.5) components.forEach((c) => (c.weight = Math.round((c.weight * 100) / sum)));
  components.forEach((c) => (c.weight = Math.round(c.weight)));

  return { course: str(r.course, 120), components, note: str(r.note, 240), weightTotal: Math.round(sum) };
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
    return fail(400, "The upload could not be read. Try again with a smaller file.");
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail(400, "Attach the CDP, syllabus or a screenshot of the evaluation scheme.");
  if (files.length > MAX_FILES) return fail(400, `Attach at most ${MAX_FILES} files.`);
  if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) return fail(413, "These files are too large together. Keep them under 18 MB.");

  const { parts, skipped } = await filesToParts(files);
  if (parts.length === 0) {
    return fail(400, "This file type can't be read. Use a PDF or a screenshot; save Word files as PDF first.");
  }

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const prompt: Part = { type: "text", text: buildPrompt(today) };

  try {
    const { data, model } = await generateJson([...parts, prompt], SCHEMA, 50_000);
    const result = clean(data);
    if (result.components.length === 0) {
      throw new AiError(422, "No evaluation split was found in this file. Set the assessments below by hand.");
    }
    return Response.json({ ...result, skipped, model });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
