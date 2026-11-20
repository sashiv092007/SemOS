/**
 * PYQ Predictor: ranking topics from past papers, and the Panic Mode cram plan.
 * Pure functions; the AI only reads the papers (see /api/pyq).
 */

/* ---------- Types (what /api/pyq returns) ---------- */

export type Paper = { label: string; totalMarks: number };
export type PyqTopic = { name: string; unit: string; marks: number[] };
export type Repeated = { q: string; topic: string; papers: string[]; marks: number };
export type Predicted = { q: string; topic: string; marks: number; likelihood: "high" | "medium"; why: string };

export type Analysis = {
  subject: string;
  papers: Paper[];
  topics: PyqTopic[];
  repeated: Repeated[];
  predicted: Predicted[];
  insights: string[];
};

export type Tier = "must" | "should" | "extra";

export type Ranked = PyqTopic & {
  rank: number;
  score: number; // 0-1
  asked: number; // papers it appeared in
  total: number; // marks across all papers
  expected: number; // marks to expect this year
  dueBack: boolean; // asked often but skipped in the latest paper
  tier: Tier;
};

export function validAnalysis(a: unknown): Analysis | null {
  const x = a as Analysis | null;
  if (!x || !Array.isArray(x.papers) || !Array.isArray(x.topics)) return null;
  return {
    subject: typeof x.subject === "string" ? x.subject : "",
    papers: x.papers,
    topics: x.topics,
    repeated: Array.isArray(x.repeated) ? x.repeated : [],
    predicted: Array.isArray(x.predicted) ? x.predicted : [],
    insights: Array.isArray(x.insights) ? x.insights : [],
  };
}

/* ---------- Ranking ---------- */

/**
 * Score = how often it is asked (50%), how many marks it carries (35%) and how
 * recently it was asked (15%). Topics asked in at least half the papers but not in
 * the latest one get a nudge: examiners tend to bring them back.
 */
export function rankTopics(a: Analysis): Ranked[] {
  const n = Math.max(1, a.papers.length);
  const rows = a.topics.map((t) => {
    const asked = t.marks.filter((m) => m > 0).length;
    const total = t.marks.reduce((s, m) => s + m, 0);
    // Later papers count more: weights 1..n
    const recent = t.marks.reduce((s, m, i) => s + m * (i + 1), 0);
    const dueBack = n >= 3 && asked / n >= 0.5 && (t.marks[n - 1] ?? 0) === 0;
    return { ...t, asked, total, recent, dueBack, expected: asked ? (total / asked) * (asked / n) : 0 };
  });
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const maxRecent = Math.max(1, ...rows.map((r) => r.recent));

  const scored = rows
    .map((r) => {
      const score = Math.min(1, 0.5 * (r.asked / n) + 0.35 * (r.total / maxTotal) + 0.15 * (r.recent / maxRecent) + (r.dueBack ? 0.08 : 0));
      return { ...r, score };
    })
    .sort((x, y) => y.score - x.score || y.total - x.total);

  return scored.map(({ recent, ...r }, i) => {
    void recent;
    const tier: Tier = r.score >= 0.6 || i < 3 ? "must" : r.score >= 0.35 ? "should" : "extra";
    return { ...r, rank: i + 1, tier };
  });
}

/* ---------- Panic Mode ---------- */

export type BlockKind = "study" | "break" | "sleep" | "review" | "ready" | "exam";

export type Block = {
  kind: BlockKind;
  start: number; // ms epoch
  end: number;
  title: string;
  detail?: string;
  topic?: string;
};

export type PanicPlan = {
  blocks: Block[];
  covered: Ranked[];
  skipped: Ranked[];
  /** Share of past marks the covered topics carried, 0-1. */
  coverage: number;
  studyMinutes: number;
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const STUDY_RUN = 50; // minutes of study before a break
const BREAK = 10;
const READY = 30; // getting ready and travelling to the exam
const MIN_TOPIC = 20;

/** A sensible default for how many of the hours left can go into studying. */
export function defaultStudyHours(hoursLeft: number) {
  if (hoursLeft <= 1.5) return Math.max(0.5, Math.round((hoursLeft - 0.5) * 2) / 2);
  // Leave an hour for review and travel, and keep more room for sleep the more time there is.
  const sleep = Math.min(7.5, Math.max(0, (hoursLeft - 6) * 0.75));
  return Math.min(12, Math.max(1, Math.round((hoursLeft - 1 - sleep) * 2) / 2));
}

const roundTo5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

/**
 * Hour-by-hour plan from now until the exam:
 * study blocks (most important topics first, time shared by score, 50 min on / 10 off),
 * then sleep if there is room, then a final review, getting ready, and the exam.
 * Topics that do not get at least 20 minutes are left out and listed in `skipped`.
 */
export function buildPanicPlan(ranked: Ranked[], predicted: Predicted[], now: number, hoursLeft: number, studyHours: number): PanicPlan {
  const examAt = now + hoursLeft * HOUR;
  const start = Math.ceil(now / (5 * MIN)) * 5 * MIN;
  const window = Math.max(0, (examAt - start) / MIN);

  const review = Math.min(60, Math.max(15, roundTo5(window * 0.08)));
  const ready = window > 3 * 60 ? READY : Math.min(READY, Math.max(0, roundTo5(window * 0.08)));
  // Breaks take about 1/6 of the time spent in study blocks.
  const studyRoom = Math.max(0, window - review - ready);
  const studyWall = Math.min(studyRoom, studyHours * 60);
  const studyMinutes = Math.floor((studyWall * STUDY_RUN) / (STUDY_RUN + BREAK));

  // Share study time by score, dropping the weakest topics until each gets MIN_TOPIC.
  let chosen = ranked.filter((r) => r.total > 0);
  while (chosen.length > 0 && studyMinutes / chosen.length < MIN_TOPIC) chosen = chosen.slice(0, -1);
  const sum = chosen.reduce((s, r) => s + r.score, 0) || 1;
  let alloc = chosen.map((r) => Math.max(MIN_TOPIC, roundTo5((studyMinutes * r.score) / sum)));
  // Rounding and minimums can overshoot: trim from the least important topics.
  let over = alloc.reduce((s, m) => s + m, 0) - studyMinutes;
  for (let i = alloc.length - 1; over > 0 && i >= 0; i--) {
    const cut = Math.min(over, alloc[i] - MIN_TOPIC);
    alloc[i] -= cut;
    over -= cut;
  }
  alloc = alloc.map((m) => Math.max(0, m));

  const blocks: Block[] = [];
  let t = start;
  let run = 0;
  chosen.forEach((topic, i) => {
    let left = alloc[i];
    const focus = predicted.find((p) => p.topic.toLowerCase() === topic.name.toLowerCase());
    const detail = focus ? `Practise: ${focus.q}` : topic.dueBack ? "Skipped last paper, likely to come back" : undefined;
    while (left > 0) {
      if (run >= STUDY_RUN) {
        blocks.push({ kind: "break", start: t, end: t + BREAK * MIN, title: "Break: water, stretch, no phone" });
        t += BREAK * MIN;
        run = 0;
      }
      const len = Math.min(left, STUDY_RUN - run);
      const last = blocks[blocks.length - 1];
      if (last?.kind === "study" && last.topic === topic.name) last.end += len * MIN;
      else blocks.push({ kind: "study", start: t, end: t + len * MIN, title: topic.name, detail, topic: topic.name });
      t += len * MIN;
      run += len;
      left -= len;
    }
  });

  const reviewAt = examAt - (review + ready) * MIN;
  const gap = (reviewAt - t) / MIN;
  if (gap >= 4 * 60) {
    blocks.push({ kind: "sleep", start: t, end: reviewAt, title: "Sleep", detail: "A rested brain recalls far more than an extra hour of reading." });
  } else if (gap >= 15) {
    blocks.push({ kind: "break", start: t, end: reviewAt, title: "Rest and eat", detail: "Step away before the final review." });
  }
  blocks.push({
    kind: "review",
    start: reviewAt,
    end: reviewAt + review * MIN,
    title: "Final review",
    detail: "Read your one-page Mastersheet and the likely questions once. Nothing new now.",
  });
  if (ready > 0) blocks.push({ kind: "ready", start: reviewAt + review * MIN, end: examAt, title: "Get ready and travel", detail: "Hall ticket, ID, pens, calculator." });
  blocks.push({ kind: "exam", start: examAt, end: examAt, title: "Exam starts" });

  const covered = chosen;
  const skipped = ranked.filter((r) => !covered.includes(r));
  const all = ranked.reduce((s, r) => s + r.total, 0) || 1;
  const coverage = covered.reduce((s, r) => s + r.total, 0) / all;
  return { blocks, covered, skipped, coverage, studyMinutes };
}

/** Plain-text copy of the plan, for WhatsApp or notes. */
export function planToText(plan: PanicPlan, subject: string) {
  const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const lines = [`Panic Mode plan${subject ? ` · ${subject}` : ""} (SemOS)`, ""];
  for (const b of plan.blocks) {
    lines.push(b.kind === "exam" ? `${time(b.start)}  ${b.title}` : `${time(b.start)}–${time(b.end)}  ${b.title}${b.detail ? ` (${b.detail})` : ""}`);
  }
  if (plan.skipped.length) lines.push("", `Skipping: ${plan.skipped.map((s) => s.name).join(", ")}`);
  return lines.join("\n");
}

/* ---------- Built-in sample ---------- */

export const SAMPLE: Analysis = {
  subject: "Operating Systems",
  papers: [
    { label: "Dec 2022", totalMarks: 80 },
    { label: "May 2023", totalMarks: 80 },
    { label: "Dec 2023", totalMarks: 80 },
    { label: "May 2024", totalMarks: 80 },
  ],
  topics: [
    { name: "Deadlocks & Banker's Algorithm", unit: "Unit 3", marks: [10, 10, 15, 10] },
    { name: "CPU Scheduling Algorithms", unit: "Unit 2", marks: [10, 15, 10, 10] },
    { name: "Page Replacement", unit: "Unit 4", marks: [10, 10, 0, 10] },
    { name: "Process Synchronization", unit: "Unit 3", marks: [5, 10, 10, 0] },
    { name: "Paging & Segmentation", unit: "Unit 4", marks: [10, 5, 10, 5] },
    { name: "Disk Scheduling", unit: "Unit 5", marks: [5, 5, 10, 10] },
    { name: "Process States & PCB", unit: "Unit 1", marks: [5, 5, 5, 5] },
    { name: "Threads & Multithreading", unit: "Unit 2", marks: [5, 0, 5, 5] },
    { name: "File Allocation Methods", unit: "Unit 5", marks: [0, 5, 5, 0] },
    { name: "System Calls", unit: "Unit 1", marks: [5, 0, 0, 5] },
    { name: "Virtual Memory & Thrashing", unit: "Unit 4", marks: [5, 5, 0, 5] },
    { name: "Inter-process Communication", unit: "Unit 2", marks: [0, 0, 5, 0] },
  ],
  repeated: [
    { q: "Explain the Banker's algorithm with an example and find the safe sequence.", topic: "Deadlocks & Banker's Algorithm", papers: ["Dec 2022", "Dec 2023", "May 2024"], marks: 10 },
    { q: "Compare FCFS, SJF and Round Robin scheduling with Gantt charts and average waiting time.", topic: "CPU Scheduling Algorithms", papers: ["Dec 2022", "May 2023", "May 2024"], marks: 10 },
    { q: "Calculate page faults for FIFO, LRU and Optimal page replacement for the given reference string.", topic: "Page Replacement", papers: ["Dec 2022", "May 2023", "May 2024"], marks: 10 },
    { q: "Explain the critical section problem and its requirements.", topic: "Process Synchronization", papers: ["May 2023", "Dec 2023"], marks: 5 },
    { q: "Draw and explain the process state transition diagram.", topic: "Process States & PCB", papers: ["Dec 2022", "May 2023", "Dec 2023", "May 2024"], marks: 5 },
    { q: "Compute total head movement for SSTF and SCAN disk scheduling.", topic: "Disk Scheduling", papers: ["Dec 2023", "May 2024"], marks: 10 },
  ],
  predicted: [
    { q: "Explain the Banker's algorithm and find whether the system is in a safe state.", topic: "Deadlocks & Banker's Algorithm", marks: 10, likelihood: "high", why: "Asked in all 4 papers" },
    { q: "Solve the given processes with SJF (preemptive) and Round Robin; compare average waiting time.", topic: "CPU Scheduling Algorithms", marks: 10, likelihood: "high", why: "Asked in all 4 papers, always numerical" },
    { q: "Explain semaphores and solve the producer-consumer problem using them.", topic: "Process Synchronization", marks: 10, likelihood: "high", why: "Asked 3 times, skipped in May 2024" },
    { q: "Find page faults using LRU and Optimal for a reference string with 3 frames.", topic: "Page Replacement", marks: 10, likelihood: "high", why: "Asked in 3 of 4 papers" },
    { q: "Compute total head movement for FCFS, SSTF and C-SCAN.", topic: "Disk Scheduling", marks: 10, likelihood: "high", why: "10 marks in the last two papers" },
    { q: "Differentiate paging and segmentation.", topic: "Paging & Segmentation", marks: 5, likelihood: "medium", why: "Asked every paper, 5-10 marks" },
    { q: "Draw the process state diagram and explain the PCB.", topic: "Process States & PCB", marks: 5, likelihood: "medium", why: "Same 5-mark question every paper" },
    { q: "What is thrashing? How can it be prevented?", topic: "Virtual Memory & Thrashing", marks: 5, likelihood: "medium", why: "Asked in 3 of 4 papers" },
    { q: "Explain user-level and kernel-level threads.", topic: "Threads & Multithreading", marks: 5, likelihood: "medium", why: "Asked in 3 of 4 papers" },
  ],
  insights: [
    "Unit 3 (deadlocks and synchronization) carried 15–25 marks in every paper.",
    "Every paper had at least one 10-mark numerical: scheduling, page replacement or disk scheduling.",
    "Process Synchronization was skipped in May 2024 after three straight appearances, so expect it back.",
  ],
};
