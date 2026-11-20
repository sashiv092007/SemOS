/**
 * POST /api/pyq
 * Reads previous-year question papers (PDFs or photos), and optionally the syllabus,
 * with Gemini. Returns every topic with the marks it carried in each paper, the
 * questions that keep coming back, and the questions most likely to be asked this year.
 * The PYQ Predictor ranks topics and builds the Panic Mode plan from this, in the browser.
 */

import { aiErrorResponse, AiError, filesToParts, generateJson, requireKey, type Part } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "Subject or course name, e.g. Operating Systems. Empty if it cannot be told." },
    papers: {
      type: "array",
      description: "One entry per distinct exam paper found in the files, oldest first.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short label such as 'May 2024' or 'Dec 2023 (Re-exam)'. Use 'Paper 1', 'Paper 2' if no date is printed." },
          totalMarks: { type: "number", description: "Maximum marks printed on the paper, or the sum of the questions if not printed." },
        },
        required: ["label", "totalMarks"],
      },
    },
    topics: {
      type: "array",
      description: "Every syllabus topic that was examined, 4 to 25 topics. Group questions into topics the way a textbook chapter section would.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Topic name, at most 6 words." },
          unit: { type: "string", description: "Unit or module it belongs to, e.g. 'Unit 3'. Empty if unknown." },
          marks: {
            type: "array",
            description: "Marks this topic carried in each paper, same order and same length as `papers`. 0 where it was not asked.",
            items: { type: "number" },
          },
        },
        required: ["name", "unit", "marks"],
      },
    },
    repeated: {
      type: "array",
      description: "Questions asked in two or more papers (same question or a close rewording). At most 12.",
      items: {
        type: "object",
        properties: {
          q: { type: "string", description: "The question in its most common wording." },
          topic: { type: "string", description: "The topic name it belongs to, exactly as in `topics`." },
          papers: { type: "array", items: { type: "string" }, description: "Labels of the papers it appeared in." },
          marks: { type: "number", description: "Marks it usually carries." },
        },
        required: ["q", "topic", "papers", "marks"],
      },
    },
    predicted: {
      type: "array",
      description: "8 to 12 questions most likely in the next exam, most likely first.",
      items: {
        type: "object",
        properties: {
          q: { type: "string", description: "The question as it would be printed." },
          topic: { type: "string", description: "The topic name it belongs to, exactly as in `topics`." },
          marks: { type: "number" },
          likelihood: { type: "string", enum: ["high", "medium"] },
          why: { type: "string", description: "One short reason, e.g. 'Asked in 3 of 4 papers' or 'In syllabus, never asked yet'." },
        },
        required: ["q", "topic", "marks", "likelihood", "why"],
      },
    },
    insights: {
      type: "array",
      items: { type: "string" },
      description: "2 to 4 short observations about the paper pattern, e.g. 'Unit 4 always carries a 10-mark question'.",
    },
    unreadable: { type: "array", items: { type: "string" }, description: "Parts that could not be read. Empty if all was readable." },
  },
  required: ["subject", "papers", "topics", "repeated", "predicted", "insights", "unreadable"],
};

function buildPrompt(count: number, subject: string, hasSyllabus: boolean) {
  return [
    `Attached: ${count} file(s) a university student uploaded: previous-year exam question papers${hasSyllabus ? ", and the course syllabus (the last file)" : ""}.`,
    subject ? `The course is: ${subject}.` : "",
    "Analyse the papers so the student knows what to study first for the coming exam.",
    "",
    "Rules:",
    "1. Find each separate exam paper. One file can hold several papers, and one paper can span several photos.",
    "2. For every question (including sub-parts and 'OR' choices) decide which topic it tests and add its marks to that topic for that paper. For an OR choice, count the marks once for each topic offered.",
    "3. `marks` for each topic must have exactly one number per paper, in the same order as `papers`.",
    "4. Repeated questions: same question or a close rewording across different papers.",
    hasSyllabus
      ? "5. Predictions: weigh how often and how recently a topic was asked, and include syllabus topics that were never asked (mark them medium)."
      : "5. Predictions: weigh how often and how recently a topic was asked. Topics asked in most papers but skipped in the latest one are likely to come back.",
    "6. Write predicted questions the way Indian university exams word them (Explain..., Differentiate..., Write short notes on...).",
    "7. Use only what is in the papers for counts. Never invent papers or marks. Report unreadable parts in `unreadable`.",
  ]
    .filter(Boolean)
    .join("\n");
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, max = 500) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v : []);

function clean(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  const papers = arr(r.papers)
    .map((p, i) => ({ label: str(p?.label, 40) || `Paper ${i + 1}`, totalMarks: num(p?.totalMarks, 1000) }))
    .slice(0, 12);
  const n = papers.length;
  const topics = arr(r.topics)
    .map((t) => {
      const marks = arr(t?.marks).map((m) => num(m));
      return {
        name: str(t?.name, 80),
        unit: str(t?.unit, 40),
        marks: Array.from({ length: n }, (_, i) => marks[i] ?? 0),
      };
    })
    .filter((t) => t.name && t.marks.some((m) => m > 0))
    .slice(0, 30);
  return {
    subject: str(r.subject, 120),
    papers,
    topics,
    repeated: arr(r.repeated)
      .map((x) => ({
        q: str(x?.q, 400),
        topic: str(x?.topic, 80),
        papers: (Array.isArray(x?.papers) ? x.papers : []).map((p: unknown) => str(p, 40)).filter(Boolean).slice(0, 12),
        marks: num(x?.marks, 100),
      }))
      .filter((x) => x.q && x.papers.length >= 2)
      .slice(0, 12),
    predicted: arr(r.predicted)
      .map((x) => ({
        q: str(x?.q, 400),
        topic: str(x?.topic, 80),
        marks: num(x?.marks, 100),
        likelihood: x?.likelihood === "high" ? "high" : "medium",
        why: str(x?.why, 160),
      }))
      .filter((x) => x.q)
      .slice(0, 14),
    insights: arr(r.insights)
      .map((s) => str(s, 240))
      .filter(Boolean)
      .slice(0, 5),
    unreadable: arr(r.unreadable)
      .map((s) => str(s, 200))
      .filter(Boolean)
      .slice(0, 5),
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

  const papers = form.getAll("papers").filter((f): f is File => f instanceof File);
  const syllabus = form.get("syllabus");
  const syllabusFile = syllabus instanceof File && syllabus.size > 0 ? syllabus : null;
  const all = syllabusFile ? [...papers, syllabusFile] : papers;

  if (papers.length === 0) return fail(400, "Add at least one question paper first. Two or more give much better predictions.");
  if (all.length > MAX_FILES) return fail(400, `Add at most ${MAX_FILES} files at a time.`);
  if (all.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
    return fail(413, "These files are too large together. Keep the total under 18 MB (photos at normal quality are fine).");
  }

  const { parts, skipped } = await filesToParts(all);
  if (parts.length === 0) return fail(400, "None of these files can be read. Use JPG, PNG, WEBP or PDF files.");

  const subject = str(form.get("subject"), 120);
  const prompt: Part = { type: "text", text: buildPrompt(parts.length, subject, Boolean(syllabusFile)) };

  try {
    const { data, model } = await generateJson([...parts, prompt], SCHEMA);
    const result = clean(data);
    if (result.papers.length === 0 || result.topics.length === 0) {
      throw new AiError(422, "No exam questions were found in these files. Check that they are question papers, or try clearer photos.");
    }
    return Response.json({ ...result, subject: result.subject || subject, filesRead: parts.length, skipped, model });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
