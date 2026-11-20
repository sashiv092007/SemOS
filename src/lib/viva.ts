/**
 * Viva Simulator: types shared by the page and /api/viva, turning saved work into
 * study material ("brief") for the examiner, and scoring the finished viva.
 */

export type Strictness = "friendly" | "standard" | "strict";
export type Verdict = "strong" | "ok" | "weak" | "wrong";

export type Question = { q: string; topic: string; followUp?: boolean };

export type Turn = Question & {
  answer: string;
  score: number; // 0-10
  verdict: Verdict;
  feedback: string;
  keyPoints: string[];
  missed: string[];
};

export type VivaSetup = { subject: string; topics: string[]; brief: string; strictness: Strictness; count: number };

/** What is saved to the account library and shown as the report. */
export type VivaRecord = { subject: string; strictness: Strictness; turns: Turn[]; at: number };

export const MAX_BRIEF = 6000;
export const COUNTS = [5, 8, 10] as const;

export const STRICTNESS: Record<Strictness, { label: string; text: string }> = {
  friendly: { label: "Friendly", text: "Internal faculty. Basic questions, gives hints." },
  standard: { label: "Standard", text: "A normal viva. Concepts, then a follow-up." },
  strict: { label: "Strict", text: "External examiner. Digs deep, no marks for vague answers." },
};

/* ---------- Study material from saved work ---------- */

const clip = (s: string) => (s.length > MAX_BRIEF ? `${s.slice(0, MAX_BRIEF - 1)}…` : s);
const plain = (s: unknown) => (typeof s === "string" ? s.replace(/\*\*/g, "") : "");
type Obj = Record<string, unknown>;
const list = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

/** Notes from the Note Builder: topics with definitions, summaries and points. */
export function fromNotes(d: Obj) {
  const topics = list(d.topics);
  const brief = topics
    .map((t) => [`# ${plain(t.name)}`, plain(t.def), plain(t.summary), ...list(t.bullets).map((b) => `- ${plain(b)}`)].filter(Boolean).join("\n"))
    .join("\n\n");
  return { subject: plain(d.subject), topics: topics.map((t) => plain(t.name)).filter(Boolean), brief: clip(brief) };
}

/** A PYQ analysis: topics most-asked first, and the questions likely this year. */
export function fromPyq(d: Obj) {
  const topics = list(d.topics)
    .map((t) => ({ name: plain(t.name), total: (Array.isArray(t.marks) ? (t.marks as number[]) : []).reduce((s, m) => s + (Number(m) || 0), 0) }))
    .sort((a, b) => b.total - a.total);
  const predicted = list(d.predicted).map((p) => `- (${plain(p.topic)}) ${plain(p.q)}`);
  const brief = [`Topics, most examined first: ${topics.map((t) => t.name).join("; ")}`, "", "Questions likely in the exam:", ...predicted].join("\n");
  return { subject: plain(d.subject), topics: topics.map((t) => t.name).filter(Boolean).slice(0, 12), brief: clip(brief) };
}

/** A saved mastersheet: topics with the AI's 2-mark definitions and points. */
export function fromMastersheet(d: Obj) {
  const ai = (d.ai ?? {}) as Obj;
  const rich = list(ai.topics);
  const brief = rich.length
    ? rich.map((t) => [`# ${plain(t.term)}`, plain(t.definition), ...list(t.points).map((p) => `- ${plain(p)}`)].join("\n")).join("\n\n")
    : "";
  const topics = rich.length ? rich.map((t) => plain(t.term)) : (Array.isArray(d.topics) ? (d.topics as unknown[]) : []).map(plain);
  return { subject: plain(d.subject), topics: topics.filter(Boolean).slice(0, 12), brief: clip(brief) };
}

/* ---------- Report ---------- */

export type TopicScore = { topic: string; avg: number; asked: number };

export function report(turns: Turn[]) {
  const avg = turns.length ? turns.reduce((s, t) => s + t.score, 0) / turns.length : 0;
  const byTopic = new Map<string, { sum: number; n: number }>();
  for (const t of turns) {
    const k = t.topic || "General";
    const cur = byTopic.get(k) ?? { sum: 0, n: 0 };
    byTopic.set(k, { sum: cur.sum + t.score, n: cur.n + 1 });
  }
  const topics: TopicScore[] = [...byTopic.entries()].map(([topic, v]) => ({ topic, avg: v.sum / v.n, asked: v.n })).sort((a, b) => a.avg - b.avg);
  const grade =
    avg >= 8 ? { label: "Viva-ready", tone: "text-green-700", text: "Clear, confident answers. Keep revising the weak spots below and you are set." }
    : avg >= 6 ? { label: "Good, with gaps", tone: "text-[#5b1065]", text: "You know most of it. Tighten the topics marked weak; examiners will probe there." }
    : avg >= 4 ? { label: "Borderline", tone: "text-orange-700", text: "The basics are there, but answers lacked key points. Revise the missed points and try again." }
    : { label: "Needs work", tone: "text-red-700", text: "Start with definitions and the key points listed for each question, then take the viva again." };
  return { avg, percent: Math.round(avg * 10), topics, weak: topics.filter((t) => t.avg < 6).map((t) => t.topic), grade };
}
