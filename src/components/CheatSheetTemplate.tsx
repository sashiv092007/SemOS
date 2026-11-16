import type { ReactNode } from "react";

/* ---------- Types ---------- */

export type Formula = { name: string; expr: string; note?: string };
export type Definition = { term: string; text: string };
export type BulletAnswer = { question: string; points: string[] };
export type Finding = { title: string; detail: string };
export type Category = { label: string; value: number; max: number };

export type CheatSheetData = {
  subjectCode: string;
  subject: string;
  unit: string;
  formulas: Formula[];
  definitions: Definition[];
  bulletAnswer: BulletAnswer;
  score: number; // 0-100, normally the sum of the category values
  categories: Category[];
  strengths: Finding[];
  improvements: Finding[];
};

/* ---------- Sample data (replace with generated output) ---------- */

export const SAMPLE_SHEET: CheatSheetData = {
  subjectCode: "CS301",
  subject: "Operating Systems",
  unit: "Unit 3 · CPU Scheduling & Deadlocks",
  formulas: [
    { name: "Turnaround Time", expr: "TAT = CT − AT", note: "completion − arrival" },
    { name: "Waiting Time", expr: "WT = TAT − BT", note: "turnaround − burst" },
    { name: "Response Ratio (HRRN)", expr: "RR = (W + S) / S", note: "highest ratio runs next" },
    { name: "CPU Utilisation", expr: "U = 1 − pⁿ", note: "p = I/O wait fraction, n = processes" },
    { name: "Effective Access Time", expr: "EAT = (1 − p)·ma + p·pf", note: "p = page-fault rate" },
    { name: "Throughput", expr: "T = n / total time", note: "processes completed per unit time" },
  ],
  definitions: [
    {
      term: "Process",
      text: "A program in execution, with its own program counter, stack, data section and PCB.",
    },
    {
      term: "Context Switch",
      text: "Saving the state of the running process in its PCB and loading the saved state of the next process.",
    },
    {
      term: "Deadlock",
      text: "A set of processes each holding a resource and waiting for a resource held by another in the set.",
    },
    {
      term: "Semaphore",
      text: "An integer variable accessed only through the atomic operations wait() and signal().",
    },
  ],
  bulletAnswer: {
    question: "State the necessary conditions for deadlock.",
    points: [
      "Mutual exclusion: at least one resource is non-shareable.",
      "Hold and wait: a process holds one resource while requesting another.",
      "No preemption: a resource is released only voluntarily.",
      "Circular wait: P₀ → P₁ → … → Pₙ → P₀ chain of waiting.",
      "All four must hold together; breaking any one prevents deadlock.",
    ],
  },
  score: 93,
  categories: [
    { label: "Syllabus coverage", value: 25, max: 25 },
    { label: "Formula recall", value: 32, max: 35 },
    { label: "Numerical practice", value: 27, max: 30 },
    { label: "Answer format", value: 9, max: 10 },
  ],
  strengths: [
    { title: "All unit formulas covered", detail: "Every numerical type from the last 3 papers maps to a formula here." },
    { title: "2-mark bank complete", detail: "Definitions match the syllabus keyword list for Unit 3." },
  ],
  improvements: [
    { title: "Add Banker's Algorithm", detail: "10-mark numerical, asked in 4 of the last 5 papers." },
    { title: "Include one Gantt chart", detail: "SJF and Round Robin problems need a worked chart." },
  ],
};

/* ---------- Building blocks ---------- */

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative h-36 w-36 shrink-0"
      role="img"
      aria-label={`Exam readiness score ${clamped} out of 100`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="6" className="stroke-slate-800" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          className="stroke-emerald-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold tabular-nums text-slate-50">{clamped}</span>
        <span className="font-mono text-[11px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

/* ---------- Left side: the paper sheet ---------- */

function SheetSection({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex items-baseline justify-between gap-3 border-b border-stone-900 pb-1.5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-stone-900">
          <span className="mr-2 font-mono font-medium text-stone-500">{n}.</span>
          {title}
        </h2>
        {hint ? <span className="font-mono text-[11px] text-stone-500">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Term({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-stone-950 underline decoration-stone-900 decoration-1 underline-offset-[3px]">
      {children}
    </span>
  );
}

function DocumentSheet({ data }: { data: CheatSheetData }) {
  return (
    <article className="border border-stone-300 bg-[#f8f6ef] px-5 py-7 text-stone-800 shadow-[6px_6px_0_0_rgba(15,23,42,0.9),6px_6px_0_1px_rgba(51,65,85,0.9)] sm:px-10 sm:py-10 xl:pb-12 xl:pl-[7.5rem] xl:pr-[8.5rem] xl:pt-12">
      {/* Header block */}
      <header className="border-b-4 border-double border-stone-900 pb-4">
        <div className="flex items-start justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
          <span>Revision sheet</span>
          <span>Semos</span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-stone-950">
          {data.subject}
        </h1>
        <p className="mt-1 font-serif text-base italic text-stone-600">{data.unit}</p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 font-mono text-[11px] text-stone-600">
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-stone-400">Code</dt>
            <dd className="text-stone-900">{data.subjectCode}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-stone-400">Formulas</dt>
            <dd className="text-stone-900">{data.formulas.length}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-stone-400">Definitions</dt>
            <dd className="text-stone-900">{data.definitions.length}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-7">
        <SheetSection n={1} title="Formulas">
          <dl>
            {data.formulas.map((f) => (
              <div
                key={f.name}
                className="grid grid-cols-1 gap-x-6 gap-y-0.5 border-b border-dotted border-stone-300 py-2.5 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-baseline"
              >
                <dt className="text-sm text-stone-600">{f.name}</dt>
                <dd className="font-mono text-base font-medium text-stone-950">{f.expr}</dd>
                {f.note ? <dd className="text-xs italic text-stone-500 sm:text-right">{f.note}</dd> : null}
              </div>
            ))}
          </dl>
        </SheetSection>

        <SheetSection n={2} title="2-mark definitions" hint="2 lines each">
          <ul className="mt-1">
            {data.definitions.map((d) => (
              <li key={d.term} className="py-2 text-[15px] leading-relaxed">
                <Term>{d.term}</Term>
                <span className="text-stone-500"> — </span>
                {d.text}
              </li>
            ))}
          </ul>
        </SheetSection>

        <SheetSection n={3} title="5-mark answer" hint="1 point = 1 mark">
          <p className="mt-3 text-[15px] font-semibold text-stone-950">Q. {data.bulletAnswer.question}</p>
          <ol className="mt-2 space-y-1.5">
            {data.bulletAnswer.points.map((p, i) => {
              const [head, ...rest] = p.split(":");
              return (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="w-5 shrink-0 font-mono text-xs leading-[1.9] text-stone-500">{i + 1}.</span>
                  <span>
                    {rest.length > 0 ? (
                      <>
                        <Term>{head}</Term>:{rest.join(":")}
                      </>
                    ) : (
                      p
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </SheetSection>
      </div>

      <footer className="mt-9 flex items-center justify-between border-t border-stone-300 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-stone-400">
        <span>
          {data.subjectCode} · {data.subject}
        </span>
        <span>Page 1 / 1</span>
      </footer>
    </article>
  );
}

/* ---------- Floating dark panels ---------- */

const PANEL = "border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70";

function PanelHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-b border-slate-800 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
      {children}
    </h2>
  );
}

function FindingList({ title, items }: { title: string; items: Finding[] }) {
  return (
    <div className="px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
      <ul className="mt-2.5 space-y-2.5">
        {items.map((it) => (
          <li key={it.title}>
            <p className="text-[13px] font-medium text-slate-200">{it.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{it.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FoundPanel({ data, className = "" }: { data: CheatSheetData; className?: string }) {
  return (
    <section className={`${PANEL} ${className}`}>
      <PanelHeader>What we found</PanelHeader>
      <div className="divide-y divide-slate-800">
        <FindingList title="Strengths identified" items={data.strengths} />
        <FindingList title="Improvement suggestions" items={data.improvements} />
      </div>
    </section>
  );
}

function statusFor(score: number) {
  if (score >= 90) return { label: "Excellent", cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" };
  if (score >= 75) return { label: "Good", cls: "border-sky-400/50 bg-sky-400/10 text-sky-400" };
  if (score >= 50) return { label: "Needs work", cls: "border-amber-400/50 bg-amber-400/10 text-amber-400" };
  return { label: "At risk", cls: "border-red-400/50 bg-red-400/10 text-red-400" };
}

function ScorePanel({ data, className = "" }: { data: CheatSheetData; className?: string }) {
  const status = statusFor(data.score);
  return (
    <aside className={`${PANEL} ${className}`}>
      <PanelHeader>Exam readiness score</PanelHeader>
      <div className="flex flex-col items-center px-4 pb-5 pt-6">
        <ScoreRing score={data.score} />
        <span
          className={`mt-4 border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${status.cls}`}
        >
          {status.label}
        </span>
      </div>
      <div className="border-t border-slate-800 px-4 py-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Category breakdown</h3>
        <ul className="mt-3.5 space-y-3.5">
          {data.categories.map((c) => (
            <li key={c.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-slate-300">{c.label}</span>
                <span className="font-mono text-xs tabular-nums text-slate-50">
                  {c.value}
                  <span className="text-slate-500">/{c.max}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 bg-slate-800">
                <div className="h-1 bg-emerald-400" style={{ width: `${(c.value / c.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ---------- Template ---------- */

export default function CheatSheetTemplate({ data = SAMPLE_SHEET }: { data?: CheatSheetData }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top bar */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="border border-slate-700 px-2 py-1 font-mono text-xs font-semibold tracking-widest text-slate-50">
              SEMOS
            </span>
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">/ cheat-sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border border-slate-800 px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-50"
            >
              Share
            </button>
            <button
              type="button"
              className="border border-emerald-400 bg-emerald-400 px-3 py-1.5 font-mono text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300"
            >
              Print sheet
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:py-12">
        {/*
          3-layer stage.
          Below xl: the three pieces stack (found, sheet, score).
          From xl: the cream sheet is the base layer and the two dark panels are
          absolutely positioned over its top-left corner and right edge. The sheet
          has matching wide side padding at xl, so the panels cover margin, not text.
        */}
        <div className="relative flex flex-col gap-5 xl:block xl:min-h-[46rem]">
          <FoundPanel data={data} className="xl:absolute xl:left-0 xl:top-14 xl:z-10 xl:w-[17rem]" />

          <div className="xl:ml-44 xl:mr-52">
            <DocumentSheet data={data} />
          </div>

          <ScorePanel data={data} className="xl:absolute xl:right-0 xl:top-28 xl:z-10 xl:w-80" />
        </div>
      </main>
    </div>
  );
}
