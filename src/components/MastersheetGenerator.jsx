"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, FileText, Loader2, ScrollText, Sparkles, Upload, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Reference data                                                     */
/* ------------------------------------------------------------------ */

const PATTERNS = ["VTU", "Anna University", "Amrita", "Custom 2-Mark & 10-Mark split"];

const TAT = { name: "Turnaround Time", expr: "TAT = CT − AT", note: "completion − arrival" };
const WT = { name: "Waiting Time", expr: "WT = TAT − BT", note: "turnaround − burst" };

// Built-in summaries for common topics. A topic matches when it contains one of `keys`.
const CONCEPTS = [
  {
    keys: ["peterson"],
    term: "Peterson's Algorithm",
    def: "Two-process software solution to the critical-section problem using a shared turn variable and a flag[2] array; gives mutual exclusion, progress and bounded waiting.",
  },
  {
    keys: ["banker", "safety algo"],
    term: "Banker's Algorithm",
    def: "Deadlock-avoidance algorithm that grants a request only if the resulting state is safe, i.e. a safe sequence of all processes exists.",
    formulas: [
      { name: "Need matrix", expr: "Need = Max − Allocation", note: "per process, per resource" },
      { name: "Safety check", expr: "Needᵢ ≤ Work ⇒ Work += Allocᵢ", note: "repeat until all finish" },
    ],
  },
  {
    keys: ["thrash"],
    term: "Thrashing",
    def: "State in which a process spends more time servicing page faults than executing, because it has too few frames for its working set.",
  },
  {
    keys: ["round robin"],
    term: "Round Robin",
    def: "Preemptive scheduling in which each process runs for a fixed time quantum in cyclic order; an unfinished process rejoins the tail of the ready queue.",
    formulas: [TAT, WT],
  },
  {
    keys: ["sjf", "shortest job"],
    term: "Shortest Job First",
    def: "Scheduling policy that runs the process with the smallest next CPU burst; gives minimum average waiting time but can starve long jobs.",
    formulas: [TAT, WT],
  },
  {
    keys: ["fcfs", "first come"],
    term: "FCFS",
    def: "Non-preemptive scheduling in arrival order; simple, but short jobs wait behind long ones (convoy effect).",
    formulas: [TAT, WT],
  },
  {
    keys: ["hrrn", "response ratio"],
    term: "HRRN",
    def: "Non-preemptive scheduling that runs the process with the highest response ratio, which favours short jobs while preventing starvation.",
    formulas: [{ name: "Response Ratio", expr: "RR = (W + S) / S", note: "W = waiting, S = service time" }],
  },
  {
    keys: ["paging", "page fault", "effective access"],
    term: "Paging",
    def: "Memory-management scheme that divides logical memory into fixed-size pages and physical memory into equal-size frames, removing external fragmentation.",
    formulas: [{ name: "Effective Access Time", expr: "EAT = (1 − p)·ma + p·pf", note: "p = page-fault rate" }],
  },
  {
    keys: ["cpu util", "multiprogramming"],
    term: "CPU Utilisation",
    def: "Fraction of time the CPU is busy; rises with the degree of multiprogramming.",
    formulas: [{ name: "CPU Utilisation", expr: "U = 1 − pⁿ", note: "p = I/O wait, n = processes" }],
  },
  {
    keys: ["deadlock"],
    term: "Deadlock",
    def: "Set of processes each holding a resource and waiting for one held by another; needs mutual exclusion, hold and wait, no preemption and circular wait.",
  },
  {
    keys: ["semaphore"],
    term: "Semaphore",
    def: "Integer variable accessed only through the atomic operations wait() and signal(), used for process synchronisation.",
  },
  {
    keys: ["critical section"],
    term: "Critical Section",
    def: "Code segment that accesses shared data and must be executed by at most one process at a time.",
  },
  {
    keys: ["context switch"],
    term: "Context Switch",
    def: "Saving the state of the running process in its PCB and loading the saved state of the next process.",
  },
  {
    keys: ["starvation", "aging"],
    term: "Starvation",
    def: "Indefinite waiting of a low-priority process; solved by aging, which raises priority with waiting time.",
  },
  {
    keys: ["virtual memory"],
    term: "Virtual Memory",
    def: "Technique that lets a process run without being entirely in main memory, using demand paging and a backing store.",
  },
  {
    keys: ["segmentation"],
    term: "Segmentation",
    def: "Memory-management scheme that divides a program into variable-size logical segments, each with a base and limit.",
  },
];

const findConcept = (topic) => {
  const t = topic.toLowerCase();
  return CONCEPTS.find((c) => c.keys.some((k) => t.includes(k)));
};

/* ------------------------------------------------------------------ */
/*  Derived sheet + score (pure, recalculated on every change)         */
/* ------------------------------------------------------------------ */

function deriveSheet({ topics, notes, pyqs, prioritize }) {
  const definitions = topics.map((topic) => {
    const c = findConcept(topic);
    return c ? { term: c.term, text: c.def, known: true } : { term: topic, text: "", known: false };
  });

  const formulas = [];
  for (const topic of topics) {
    for (const f of findConcept(topic)?.formulas ?? []) {
      if (!formulas.some((x) => x.expr === f.expr)) formulas.push(f);
    }
  }

  const unknown = definitions.filter((d) => !d.known).map((d) => d.term);

  const coverage = topics.length === 0 ? 0 : Math.min(96, 36 + topics.length * 9 + (notes.length ? 15 : 0));
  const recall = formulas.length === 0 ? 0 : Math.min(94, 46 + formulas.length * 10 + (prioritize ? 18 : 0));
  const format = topics.length === 0 ? 0 : Math.min(86, 52 + (pyqs.length ? 28 : 0) + Math.min(pyqs.length, 3) * 2);
  const categories = [
    { label: "Syllabus coverage", value: coverage },
    { label: "Formula recall", value: recall },
    { label: "Answer format", value: format },
  ];
  const score = Math.round((coverage + recall + format) / 3);

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const strengths = [];
  if (topics.length) strengths.push(`${plural(topics.length, "topic")} mapped to the sheet.`);
  if (formulas.length) strengths.push(`${plural(formulas.length, "formula")} ready to revise.`);
  if (notes.length) strengths.push(`${plural(notes.length, "source file")} attached for definitions.`);
  if (pyqs.length) strengths.push(`${plural(pyqs.length, "PYQ paper")} attached for recurring 2-mark and 10-mark patterns.`);
  if (prioritize && formulas.length) strengths.push("High-weightage formulas are listed first.");

  const warnings = [];
  if (!topics.length) warnings.push("No topics yet. Add the concepts your unit covers.");
  else if (topics.length < 3) warnings.push("Fewer than 3 topics. A unit usually needs more.");
  if (!pyqs.length) warnings.push("No PYQs uploaded, so recurring question patterns can't be checked.");
  if (!notes.length) warnings.push("No notes uploaded. Definitions use built-in summaries only.");
  if (unknown.length) warnings.push(`${plural(unknown.length, "topic")} ${unknown.length === 1 ? "needs" : "need"} your notes: ${unknown.join(", ")}.`);
  if (topics.length && !formulas.length) warnings.push("No formulas found for these topics.");

  return { definitions, formulas, categories, score, strengths, warnings };
}

function statusFor(score) {
  if (score >= 90) return { label: "Excellent", cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" };
  if (score >= 75) return { label: "Good", cls: "border-sky-400/50 bg-sky-400/10 text-sky-400" };
  if (score >= 50) return { label: "Needs work", cls: "border-amber-400/50 bg-amber-400/10 text-amber-400" };
  return { label: "At risk", cls: "border-red-400/50 bg-red-400/10 text-red-400" };
}

/* ------------------------------------------------------------------ */
/*  Input panel pieces                                                 */
/* ------------------------------------------------------------------ */

const LABEL = "block font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400";
const INPUT =
  "w-full border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none";

const MAX_FILES = 5;
const MAX_MB = 10;
const MAX_TOPICS = 12;

function TagInput({ topics, onChange }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (topics.length >= MAX_TOPICS) return;
    if (topics.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...topics, value]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && topics.length) {
      onChange(topics.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor="topic-input" className={LABEL}>
        Topic tags
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border border-slate-800 bg-slate-950 p-2 focus-within:border-emerald-400">
        {topics.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 border border-slate-700 bg-slate-900 py-1 pl-2 pr-1 font-mono text-xs text-slate-200"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(topics.filter((x) => x !== t))}
              aria-label={`Remove topic ${t}`}
              className="inline-flex h-4 w-4 items-center justify-center text-slate-500 transition-colors hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="topic-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={topics.length ? "Add another…" : "e.g. Peterson's Algorithm"}
          className="min-w-[9rem] flex-1 bg-transparent px-1 py-1 text-sm text-white placeholder:text-slate-600 focus:outline-none"
        />
      </div>
      <p className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>Press Enter to add a concept.</span>
        <span className="font-mono">
          {topics.length}/{MAX_TOPICS}
        </span>
      </p>
    </div>
  );
}

function UploadZone({ id, icon: Icon, title, tag, tagTone, hint, accept, extensions, files, onChange }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  const addFiles = (fileList) => {
    const next = [...files];
    const rejected = [];
    for (const f of Array.from(fileList)) {
      const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")).toLowerCase() : "";
      if (!extensions.includes(ext)) rejected.push(`${f.name}: file type not accepted`);
      else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name}: larger than ${MAX_MB} MB`);
      else if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      else if (next.length >= MAX_FILES) rejected.push(`${f.name}: limit of ${MAX_FILES} files reached`);
      else next.push({ name: f.name, size: f.size });
    }
    setError(rejected.join(". "));
    if (next.length !== files.length) onChange(next);
  };

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`block cursor-pointer border border-dashed px-4 py-4 transition-colors focus-within:border-emerald-400 ${
          over ? "border-emerald-400 bg-emerald-400/5" : "border-slate-700 bg-slate-950 hover:border-slate-500"
        }`}
      >
        <input
          id={id}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-white">{title}</span>
              <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none ${tagTone}`}>
                {tag}
              </span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">{hint}</span>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <Upload className="h-3 w-3" aria-hidden="true" />
                Drop files or click to browse
              </span>
              <span className="border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-500">
                {extensions.join(" ")} · max {MAX_FILES} files · {MAX_MB} MB each
              </span>
            </span>
          </span>
        </span>
      </label>

      {files.length ? (
        <ul className="mt-1.5 space-y-1">
          {files.map((f) => (
            <li
              key={f.name + f.size}
              className="flex items-center gap-2 border border-slate-800 bg-slate-900/60 px-2.5 py-1.5"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">{f.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-slate-500">
                {f.size >= 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x !== f))}
                aria-label={`Remove ${f.name}`}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-300">
          {error}.
        </p>
      ) : null}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span id="prioritize-label" className="text-sm text-slate-200">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="prioritize-label"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          checked ? "border-emerald-500 bg-emerald-500" : "border-slate-700 bg-slate-800"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview canvas pieces                                              */
/* ------------------------------------------------------------------ */

const PANEL = "border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70";

function PanelTitle({ children }) {
  return (
    <h3 className="border-b border-slate-800 px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
      {children}
    </h3>
  );
}

function BulletGroup({ title, items, empty }) {
  return (
    <div className="px-3.5 py-3.5">
      <h4 className="text-[13px] font-semibold text-white">{title}</h4>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-400">
              <span aria-hidden="true" className="mt-[0.5rem] h-1 w-1 shrink-0 bg-slate-500" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{empty}</p>
      )}
    </div>
  );
}

function FoundPanel({ strengths, warnings, className = "" }) {
  return (
    <aside className={`${PANEL} ${className}`}>
      <PanelTitle>What we found</PanelTitle>
      <div className="divide-y divide-slate-800">
        <BulletGroup title="Strengths Identified" items={strengths} empty="Nothing yet." />
        <BulletGroup title="Exam Warnings" items={warnings} empty="No warnings." />
      </div>
    </aside>
  );
}

function ScoreGauge({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28" role="img" aria-label={`Exam readiness score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#34d399"
          strokeWidth="7"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tabular-nums text-emerald-400">{score}</span>
        <span className="font-mono text-[10px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function ScorePanel({ score, categories, className = "" }) {
  const status = statusFor(score);
  return (
    <aside className={`${PANEL} ${className}`}>
      <PanelTitle>Exam readiness score</PanelTitle>
      <div className="flex flex-col items-center px-3.5 pb-4 pt-5">
        <ScoreGauge score={score} />
        <span
          className={`mt-3 border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${status.cls}`}
        >
          {status.label}
        </span>
      </div>
      <div className="border-t border-slate-800 px-3.5 py-3.5">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">Category breakdown</h4>
        <ul className="mt-3 space-y-3">
          {categories.map((c) => (
            <li key={c.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-300">{c.label}</span>
                <span className="font-mono text-xs tabular-nums text-emerald-400">{c.value}</span>
              </div>
              <div className="mt-1.5 h-1 bg-slate-800">
                <div className="h-1 bg-emerald-400 transition-[width] duration-500" style={{ width: `${c.value}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SheetHeading({ n, hint, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-900 pb-1.5">
      <h3 className="font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-slate-900">
        <span className="mr-2 font-mono font-medium text-slate-500">{n}.</span>
        {children}
      </h3>
      {hint ? <span className="shrink-0 font-mono text-[10px] uppercase text-slate-500">{hint}</span> : null}
    </div>
  );
}

function DocumentSheet({ subject, unit, pattern, prioritize, sheet, sourceCount, generatedAt, className = "" }) {
  const formulaSection = (n) => (
    <section key="formulas" className="mt-7">
      <SheetHeading n={n} hint={prioritize ? "High weightage" : null}>
        Formulas
      </SheetHeading>
      {sheet.formulas.length ? (
        <dl className="grid gap-x-8 @md:grid-cols-2">
          {sheet.formulas.map((f) => (
            <div key={f.expr} className="border-b border-dotted border-stone-300 py-2.5">
              <dt className="text-sm text-slate-600">{f.name}</dt>
              <dd className="mt-0.5 break-words font-mono text-[15px] font-medium">{f.expr}</dd>
              <dd className="mt-0.5 text-xs italic text-slate-500">{f.note}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm italic text-slate-500">
          No formulas for these topics yet. Try adding Round Robin, Paging or Banker&apos;s Algorithm.
        </p>
      )}
    </section>
  );

  const definitionSection = (n) => (
    <section key="definitions" className="mt-7">
      <SheetHeading n={n} hint="2 lines each">
        2-Mark Definitions
      </SheetHeading>
      {sheet.definitions.length ? (
        <ul className="mt-1">
          {sheet.definitions.map((d) => (
            <li key={d.term} className="py-1.5 text-[15px] leading-relaxed text-slate-800">
              <span className="break-words font-semibold text-slate-950 underline decoration-1 underline-offset-[3px]">
                {d.term}
              </span>
              <span className="text-slate-400"> — </span>
              {d.known ? (
                d.text
              ) : (
                <span className="italic text-slate-500">no built-in summary; this will be written from your notes once AI generation is connected.</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm italic text-slate-500">Add topic tags to fill this section.</p>
      )}
    </section>
  );

  const sections = prioritize ? [formulaSection, definitionSection] : [definitionSection, formulaSection];

  return (
    <article
      className={`@container border border-stone-300 bg-[#fbf9f1] font-serif text-slate-900 shadow-[6px_6px_0_0_rgba(15,23,42,0.9),6px_6px_0_1px_rgba(51,65,85,0.9)] ${className}`}
    >
      <header className="border-b-4 border-double border-slate-900 pb-4">
        <p className="break-words font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          SEMOS <span className="text-slate-400">/</span> {subject.trim() || "Untitled subject"}
        </p>
        <h2 className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight @md:text-3xl">
          {subject.trim() || "Untitled subject"}
        </h2>
        <p className="mt-1 break-words text-base italic text-slate-600">{unit.trim() || "Unit / topic focus"}</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-slate-600">
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-slate-400">Pattern</dt>
            <dd className="text-slate-900">{pattern}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-slate-400">Topics</dt>
            <dd className="text-slate-900">{sheet.definitions.length}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="uppercase tracking-wider text-slate-400">Sources</dt>
            <dd className="text-slate-900">{sourceCount}</dd>
          </div>
        </dl>
      </header>

      {sections.map((render, i) => render(i + 1))}

      <footer className="mt-8 flex items-center justify-between gap-3 border-t border-stone-300 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <span>{generatedAt ? `Generated ${generatedAt}` : "Live preview"}</span>
        <span>Page 1 / 1</span>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Generator                                                          */
/* ------------------------------------------------------------------ */

export default function MastersheetGenerator() {
  const [subject, setSubject] = useState("Operating Systems");
  const [unit, setUnit] = useState("Unit 3: CPU Scheduling & Deadlocks");
  const [topics, setTopics] = useState(["Peterson's Algorithm", "Banker's Safety Algo", "Thrashing"]);
  const [notes, setNotes] = useState([]);
  const [pyqs, setPyqs] = useState([]);
  const [prioritize, setPrioritize] = useState(true);
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [generating, setGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const sheet = deriveSheet({ topics, notes, pyqs, prioritize });

  const generate = (e) => {
    e.preventDefault();
    if (generating) return;
    if (!subject.trim()) {
      setError("Enter a subject name first.");
      return;
    }
    if (!topics.length) {
      setError("Add at least one topic tag.");
      return;
    }
    setError("");
    setGenerating(true);
    timer.current = setTimeout(() => {
      setGenerating(false);
      setGeneratedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }, 1600);
  };

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6 lg:py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">Mastersheet generator</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Build a last-minute mastersheet
      </h1>

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[2fr_3fr]">
        {/* LEFT 40%: configuration and sources */}
        <form onSubmit={generate} noValidate className="border border-slate-800 bg-slate-900/40">
          <h2 className="border-b border-slate-800 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Configuration &amp; source input
          </h2>

          <div className="space-y-6 px-4 py-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div>
                <label htmlFor="subject" className={LABEL}>
                  Subject name
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className={`${INPUT} mt-2`}
                />
              </div>
              <div>
                <label htmlFor="unit" className={LABEL}>
                  Unit / topic focus
                </label>
                <input
                  id="unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. Unit 3: CPU Scheduling & Deadlocks"
                  className={`${INPUT} mt-2`}
                />
              </div>
            </div>

            <TagInput topics={topics} onChange={setTopics} />

            <fieldset>
              <legend className={LABEL}>Sources</legend>
              <div className="mt-2 space-y-3">
                <UploadZone
                  id="notes-upload"
                  icon={BookOpen}
                  title="Upload Notes / Textbooks / Slides"
                  tag="Optional"
                  tagTone="border-slate-700 text-slate-400"
                  hint="Your own material, used to write definitions in your syllabus wording."
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                  extensions={[".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"]}
                  files={notes}
                  onChange={setNotes}
                />
                <UploadZone
                  id="pyq-upload"
                  icon={ScrollText}
                  title="Upload Previous Sem Papers (PYQs)"
                  tag="Recommended"
                  tagTone="border-emerald-400/50 text-emerald-400"
                  hint="Used by AI to extract 2-mark & 10-mark recurring patterns."
                  accept=".pdf,.png"
                  extensions={[".pdf", ".png"]}
                  files={pyqs}
                  onChange={setPyqs}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className={LABEL}>Generation preferences</legend>
              <div className="mt-3 space-y-4">
                <Toggle checked={prioritize} onChange={setPrioritize} label="Prioritize High-Weightage Formulas" />
                <div>
                  <label htmlFor="pattern" className="text-sm text-slate-200">
                    Target University Pattern
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="pattern"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className={`${INPUT} appearance-none pr-9`}
                    >
                      {PATTERNS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {error ? (
              <p role="alert" className="border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              aria-busy={generating}
              className={`flex w-full items-center justify-center gap-2 bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.6)] ${
                generating ? "cursor-progress opacity-80" : ""
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  Generate Mastersheet
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            <p aria-live="polite" className="-mt-3 text-center font-mono text-[11px] text-slate-500">
              {generating ? "Building your sheet" : generatedAt ? `Last generated ${generatedAt}` : " "}
            </p>
          </div>
        </form>

        {/* RIGHT 60%: live preview canvas */}
        <section aria-label="Live mastersheet preview" className="xl:sticky xl:top-20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Live mastersheet preview
            </h2>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Updates as you type
            </span>
          </div>

          {/*
            Container-query layout, so it adapts to the canvas width, not the screen:
            - narrow: found panel, score panel, then the sheet
            - medium (36rem+): the two dark panels sit side by side and overlap the sheet's top edge
            - wide (50rem+): the panels float over the sheet's top-left corner and right edge
          */}
          <div className="@container">
            <div className={`relative @min-[50rem]:min-h-[38rem] ${generating ? "opacity-60" : ""} transition-opacity`}>
              <div className="relative z-10 grid gap-3 @min-[36rem]:mx-5 @min-[36rem]:grid-cols-2 @min-[50rem]:static @min-[50rem]:mx-0 @min-[50rem]:block">
                <FoundPanel
                  strengths={sheet.strengths}
                  warnings={sheet.warnings}
                  className="@min-[50rem]:absolute @min-[50rem]:left-0 @min-[50rem]:top-12 @min-[50rem]:z-10 @min-[50rem]:w-48"
                />
                <ScorePanel
                  score={sheet.score}
                  categories={sheet.categories}
                  className="@min-[50rem]:absolute @min-[50rem]:right-0 @min-[50rem]:top-24 @min-[50rem]:z-10 @min-[50rem]:w-52"
                />
              </div>

              <div className="mt-3 @min-[36rem]:-mt-10 @min-[50rem]:ml-[9.25rem] @min-[50rem]:mr-[10.25rem] @min-[50rem]:mt-0">
                <DocumentSheet
                  subject={subject}
                  unit={unit}
                  pattern={pattern}
                  prioritize={prioritize}
                  sheet={sheet}
                  sourceCount={notes.length + pyqs.length}
                  generatedAt={generatedAt}
                  className="px-5 pb-7 pt-7 @min-[36rem]:px-8 @min-[36rem]:pt-[4.5rem] @min-[50rem]:px-[3.75rem] @min-[50rem]:pt-9"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
