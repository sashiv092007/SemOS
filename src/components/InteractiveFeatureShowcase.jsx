"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  NotebookText,
  ScanLine,
  Target,
} from "lucide-react";
import { BADGE, CARD_ACTIVE, Glow, PAPER_SHADOW, ScanLine as Laser, TAB_PILL, TAB_PILL_ACTIVE, TAG, WindowBar } from "./ui";

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: "mastersheet", label: "Last-Min Revision", icon: BookOpenCheck, path: "demos/mastersheet.jsx", href: "/mastersheet", cta: "Open Mastersheet" },
  { id: "grades", label: "CDP & SGPA Target", icon: Target, path: "demos/grade-analyzer.jsx", href: "/grade-analyzer", cta: "Open Grade Analyzer" },
  { id: "roadmap", label: "Assignment Roadmaps", icon: CalendarClock, path: "demos/roadmap.jsx", href: "/roadmap", cta: "Open Roadmaps" },
  { id: "notes", label: "Smart Note Builder", icon: NotebookText, path: "demos/note-builder.jsx", href: "/note-builder", cta: "Open Note Builder" },
];

/* ------------------------------------------------------------------ */
/*  Tab 1: mastersheet snippet                                         */
/* ------------------------------------------------------------------ */

const FORMULAS = [
  { name: "Turnaround Time", expr: "TAT = CT - AT" },
  { name: "Waiting Time", expr: "WT = TAT - BT" },
];

const QUESTIONS = [
  { q: "Define turnaround time.", a: "The interval from a process's arrival to its completion." },
  { q: "What is a context switch?", a: "Saving the running process's state in its PCB and loading the next one's." },
  { q: "State the conditions for deadlock.", a: "Mutual exclusion, hold and wait, no preemption, circular wait." },
];

function MastersheetView() {
  return (
    <article className={`mx-auto max-w-2xl border border-stone-300 bg-[#fbf9f1] px-5 py-6 font-serif text-slate-900 sm:px-8 ${PAPER_SHADOW}`}>
      <header className="border-b-4 border-double border-slate-900 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">SEMOS / CS301 Operating Systems</p>
        <h3 className="mt-2 text-xl font-bold tracking-tight">Unit 3 · CPU Scheduling</h3>
      </header>

      <h4 className="mt-5 border-b border-slate-900 pb-1 font-sans text-[12px] font-bold uppercase tracking-[0.14em]">
        High-yield formulas
      </h4>
      <dl className="grid gap-x-8 sm:grid-cols-2">
        {FORMULAS.map((f) => (
          <div key={f.expr} className="border-b border-dotted border-stone-300 py-2.5">
            <dt className="text-sm text-slate-600">{f.name}</dt>
            <dd className="mt-1 rounded-sm border border-stone-300 bg-stone-200/50 px-2 py-1 font-mono text-base font-medium">{f.expr}</dd>
          </div>
        ))}
      </dl>

      <h4 className="mt-5 border-b border-slate-900 pb-1 font-sans text-[12px] font-bold uppercase tracking-[0.14em]">
        2-mark question bank
      </h4>
      <ol className="mt-1">
        {QUESTIONS.map((x, i) => (
          <li key={x.q} className="py-1.5 text-[15px] leading-relaxed">
            <p className="font-semibold text-slate-950">
              <span className="mr-2 font-mono text-xs font-medium text-slate-500">Q{i + 1}</span>
              {x.q}
            </p>
            <p className="text-slate-700">{x.a}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: scanning CDP                                                */
/* ------------------------------------------------------------------ */

const COMPONENTS = [
  { name: "Mid-Sem", weight: "30%", value: "24 / 30", note: "Scored", pct: 80, done: true },
  { name: "Internal Lab", weight: "20%", value: "17 / 20", note: "Scored", pct: 85, done: true },
  { name: "End-Sem Target", weight: "50%", value: "39 / 50", note: "Needed for A+", pct: 78, done: false },
];

function GradesView() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <ScanLine className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          CDP_CS301.pdf
        </p>
        <p className={TAG}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Scanning evaluation pattern
        </p>
      </div>

      {/* Document being scanned */}
      <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPONENTS.map((c) => (
            <div key={c.name} className="rounded-lg border border-slate-800/80 border-t-white/10 bg-slate-900/40 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{c.name}</p>
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{c.weight}</span>
              </div>
              <p className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${c.done ? "text-slate-100" : "text-emerald-400"}`}>
                {c.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${c.done ? "bg-slate-400" : "bg-emerald-400"}`}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <p className="text-sm text-slate-300">
            Mapped to target <span className="font-mono text-emerald-400">SGPA 8.5</span>
          </p>
          <p className="font-mono text-xs text-slate-500">41 / 50 so far · 80 / 100 needed overall</p>
        </div>

        {/* Laser: a vertical beam sweeping left to right and back */}
        <Laser />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: turn-in timeline                                            */
/* ------------------------------------------------------------------ */

const PHASES = [
  { name: "Phase 1: Problem Statement & Algorithm", meta: "Done · 1h 20min", state: "done" },
  { name: "Phase 2: Code Execution & Screenshots", meta: "In progress · 45min left", state: "active" },
  { name: "Phase 3: Lab Record Write-up", meta: "Up next · 1h", state: "todo" },
  { name: "Phase 4: Submit on Portal", meta: "Due Fri, 5:00 pm", state: "todo" },
];

function RoadmapView() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={TAG}>CS302 · 10 marks</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-100">DBMS Lab Assignment 2</h3>
        </div>
        <p className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-slate-500">
          Turn in within <span className="font-semibold text-emerald-400">2 days:06h:14min</span>
        </p>
      </div>

      <ol className="mt-5">
        {PHASES.map((p, i) => (
          <li key={p.name} className="relative flex gap-4 pb-5 last:pb-0">
            {i < PHASES.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[0.6875rem] top-6 h-full w-px ${p.state === "done" ? "bg-emerald-400/60" : "bg-slate-800"}`}
              />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full border ${
                p.state === "done"
                  ? "border-emerald-400 bg-emerald-400 text-slate-950"
                  : p.state === "active"
                    ? "border-emerald-400 bg-slate-950 text-emerald-400"
                    : "border-slate-700 bg-slate-950 text-slate-600"
              }`}
            >
              {p.state === "done" ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : p.state === "active" ? (
                <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <span className="font-mono text-[10px]">{i + 1}</span>
              )}
            </span>
            <div
              className={`min-w-0 flex-1 rounded-lg border px-4 py-3 ${
                p.state === "active" ? "border-emerald-400/40 bg-emerald-400/[0.04]" : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <p className={`text-sm font-semibold ${p.state === "todo" ? "text-slate-300" : "text-slate-100"}`}>{p.name}</p>
              <p className={`mt-0.5 font-mono text-xs ${p.state === "active" ? "text-emerald-400" : "text-slate-500"}`}>{p.meta}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: paginated notes                                             */
/* ------------------------------------------------------------------ */

const TOTAL_PAGES = 12;
const NOTE_PAGES = [
  {
    title: "Critical Section Problem",
    points: ["Mutual exclusion: one process inside at a time.", "Progress: the next entrant is chosen without indefinite delay.", "Bounded waiting: a limit on how often others go first."],
    code: null,
  },
  {
    title: "Peterson's Solution",
    points: ["Two-process software solution.", "Uses a shared turn variable and a flag[2] array.", "Relies on busy waiting."],
    code: "flag[i] = true;  turn = j;\nwhile (flag[j] && turn == j);",
  },
  {
    title: "Semaphores",
    points: ["Integer variable with atomic wait() and signal().", "Binary semaphore acts as a lock.", "Counting semaphore guards a pool of resources."],
    code: "wait(S):   while (S <= 0);  S--;\nsignal(S): S++;",
  },
];

function NotesView() {
  const [page, setPage] = useState(1);
  const note = NOTE_PAGES[(page - 1) % NOTE_PAGES.length];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-300 transition-all duration-200 hover:border-slate-700 hover:text-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="font-mono text-xs text-slate-500" aria-live="polite">
            Page <span className="text-emerald-400">{page}</span> of {TOTAL_PAGES}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
            disabled={page === TOTAL_PAGES}
            aria-label="Next page"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-300 transition-all duration-200 hover:border-slate-700 hover:text-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <Link
          href="/note-builder"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-slate-950 transition-all duration-200 hover:bg-emerald-400"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export PDF
        </Link>
      </div>

      <article className={`mt-3 border border-stone-300 bg-[#fbf9f1] px-5 py-6 font-serif text-slate-900 sm:px-8 ${PAPER_SHADOW}`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">Unit 3 — Process Synchronization</p>
        <h3 className="mt-2 border-b-4 border-double border-slate-900 pb-3 text-xl font-bold tracking-tight">{note.title}</h3>
        <ul className="mt-4 space-y-1.5">
          {note.points.map((point) => (
            <li key={point} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
              <span aria-hidden="true" className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 bg-slate-500" />
              {point}
            </li>
          ))}
        </ul>
        {note.code ? (
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900 px-3.5 py-2.5 font-mono text-sm leading-relaxed text-emerald-400">
            {note.code}
          </pre>
        ) : null}
        <p className="mt-6 border-t border-stone-300 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
          Page {page} of {TOTAL_PAGES}
        </p>
      </article>
    </div>
  );
}

const VIEWS = { mastersheet: MastersheetView, grades: GradesView, roadmap: RoadmapView, notes: NotesView };

/* ------------------------------------------------------------------ */
/*  Showcase                                                           */
/* ------------------------------------------------------------------ */

export default function InteractiveFeatureShowcase() {
  const [active, setActive] = useState(TABS[0].id);
  const tabRefs = useRef({});
  const tab = TABS.find((t) => t.id === active);
  const View = VIEWS[active];

  // Left/Right arrow keys move between tabs, as in a native tab bar.
  const onKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === active);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <section id="features" className="relative isolate scroll-mt-14 overflow-x-clip border-t border-slate-800/80">
      <Glow className="left-1/2 top-24 h-[30rem] w-[60rem] -translate-x-1/2" />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <p className={BADGE}>Feature tour</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
          Four tools, one semester workspace
        </h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
          Pick a tab to see what each one does. These are sample previews; the real tools are one click away.
        </p>

        {/* App window */}
        <div className={`mt-7 overflow-hidden ${CARD_ACTIVE}`}>
          <WindowBar path={tab.path} right="Preview" />

          {/* Tab pills */}
          <div
            role="tablist"
            aria-label="SemOS features"
            onKeyDown={onKeyDown}
            className="flex gap-1 overflow-x-auto border-b border-slate-800/80 bg-slate-950/30 px-3 py-2"
          >
            {TABS.map((t) => {
              const selected = t.id === active;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`showcase-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls="showcase-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(t.id)}
                  className={selected ? TAB_PILL_ACTIVE : TAB_PILL}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="showcase-panel"
            aria-labelledby={`showcase-tab-${active}`}
            tabIndex={0}
            className="min-h-[30rem] bg-slate-950/30 px-4 py-6 focus:outline-none sm:px-8 sm:py-8"
          >
            <div key={active} className="animate-showcaseIn">
              <View />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-950/50 px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Sample data</p>
            <Link
              href={tab.href}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400 transition-colors duration-300 hover:text-emerald-300"
            >
              {tab.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
