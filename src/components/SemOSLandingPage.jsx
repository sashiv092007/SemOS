"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileDown, Menu, Share2, X } from "lucide-react";
import SemosShowcase from "./SemosShowcase";
import Hourglass3D from "./Hourglass3D";
import SemesterCountdown from "./SemesterCountdown";
import { Backdrop, BADGE, CARD, Glow, PANEL } from "./ui";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: "Mastersheet", href: "/mastersheet" },
  { label: "Grade Analyzer", href: "/grade-analyzer" },
  { label: "Note Builder", href: "/note-builder" },
  { label: "Roadmaps", href: "/roadmap" },
];

const FORMULAS = [
  { name: "Turnaround Time", expr: "TAT = CT − AT", note: "completion − arrival" },
  { name: "Waiting Time", expr: "WT = TAT − BT", note: "turnaround − burst" },
  { name: "Effective Access Time", expr: "EAT = (1 − p)·ma + p·pf", note: "p = page-fault rate" },
  { name: "CPU Utilisation", expr: "U = 1 − pⁿ", note: "p = I/O wait, n = processes" },
];

const KEYWORDS = [
  { term: "Process", text: "program in execution; program counter, stack, data section, PCB." },
  { term: "Context switch", text: "save state of running process in PCB, load state of the next." },
  { term: "Deadlock", text: "mutual exclusion, hold and wait, no preemption, circular wait." },
  { term: "Semaphore", text: "integer variable; atomic wait() and signal() only." },
  { term: "Thrashing", text: "more time paging than executing; high page-fault rate." },
  { term: "Starvation", text: "process waits indefinitely; solved by aging." },
];

const STRENGTHS = [
  "All four core scheduling formulas are on the sheet.",
  "2-mark keyword bank matches the Unit 3 syllabus list.",
  "Layout fits a single printable page.",
];

const IMPROVEMENTS = [
  "Add Banker's Algorithm: asked in 4 of the last 5 papers.",
  "Include one worked Gantt chart for SJF or Round Robin.",
];

const SCORE = 92;

const CATEGORIES = [
  { label: "Syllabus coverage", value: 96 },
  { label: "Formula recall", value: 94 },
  { label: "Answer format", value: 86 },
];

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <Link href="/" className="font-mono text-base font-bold uppercase tracking-[0.2em] text-slate-100">
      SEM<span className="text-emerald-400">OS</span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#030712]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-slate-400 transition-colors hover:text-emerald-400"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#" className="hidden text-sm text-slate-400 transition-colors hover:text-slate-100 sm:inline">
            Sign In
          </a>
          <a
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400"
          >
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 rounded-lg items-center justify-center border border-slate-800 text-slate-300 transition-all duration-200 hover:border-slate-700 hover:text-slate-100 md:hidden"
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-slate-800 px-4 py-2 md:hidden">
          {[...NAV_LINKS, { label: "Sign In", href: "#" }].map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-slate-300 transition-colors hover:text-emerald-400"
            >
              {l.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated sand timer                                                */
/* ------------------------------------------------------------------ */

// One full drain takes CYCLE seconds; the sand fades out, resets and fades back in.
const CYCLE = "14s";
const GLASS =
  "M48 38 H152 C152 92 106 118 106 140 C106 162 152 188 152 242 H48 C48 188 94 162 94 140 C94 118 48 92 48 38 Z";

function SandTimer() {
  const loop = { dur: CYCLE, repeatCount: "indefinite" };

  return (
    <svg
      viewBox="0 0 200 280"
      className="relative h-72 w-auto sm:h-80"
      role="img"
      aria-label="Sand timer with sand draining from the top bulb into the bottom bulb"
    >
      <defs>
        <clipPath id="semos-glass">
          <path d={GLASS} />
        </clipPath>
        <clipPath id="semos-top-bulb">
          <rect x="40" y="38" width="120" height="102" />
        </clipPath>
        <clipPath id="semos-bottom-bulb">
          <rect x="40" y="140" width="120" height="102" />
        </clipPath>
        <linearGradient id="semos-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="semos-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Frame posts */}
      <line x1="40" y1="30" x2="40" y2="250" stroke="#1e293b" strokeWidth="3" />
      <line x1="160" y1="30" x2="160" y2="250" stroke="#1e293b" strokeWidth="3" />

      {/* Glass body */}
      <path d={GLASS} fill="#0f172a" fillOpacity="0.7" />

      <g clipPath="url(#semos-glass)">
        {/* Sand, faded out briefly while it resets */}
        <g>
          <animate
            attributeName="opacity"
            values="1;1;0;0;1"
            keyTimes="0;0.9;0.945;0.955;1"
            {...loop}
          />

          {/* Top bulb: surface sinks as it drains */}
          <g clipPath="url(#semos-top-bulb)">
            <path d="M40 50 Q100 64 160 50 V150 H40 Z" fill="url(#semos-sand)">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 90; 0 90; 0 0; 0 0"
                keyTimes="0;0.88;0.95;0.951;1"
                {...loop}
              />
            </path>
          </g>

          <g clipPath="url(#semos-bottom-bulb)">
            {/* Falling stream */}
            <line
              x1="100"
              y1="138"
              x2="100"
              y2="244"
              stroke="#6ee7b7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="3 4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.35s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes="0;0.02;0.87;0.89;1"
                {...loop}
              />
            </line>

            {/* Loose grains scattering off the stream */}
            {[
              { dx: -5, delay: "0s" },
              { dx: 4, delay: "0.3s" },
              { dx: -2, delay: "0.55s" },
              { dx: 6, delay: "0.8s" },
            ].map((g) => (
              <circle key={g.delay} cx="100" cy="142" r="1.3" fill="#a7f3d0" opacity="0">
                <animate attributeName="cy" from="142" to="240" dur="1.1s" begin={g.delay} repeatCount="indefinite" />
                <animate
                  attributeName="cx"
                  from="100"
                  to={100 + g.dx}
                  dur="1.1s"
                  begin={g.delay}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.9;0.9;0"
                  keyTimes="0;0.1;0.8;1"
                  dur="1.1s"
                  begin={g.delay}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Bottom bulb: mound rises as sand lands */}
            <path d="M40 262 V226 Q100 176 160 226 V262 Z" fill="url(#semos-sand)">
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 62; 0 0; 0 0; 0 62; 0 62"
                keyTimes="0;0.88;0.95;0.951;1"
                {...loop}
              />
            </path>
          </g>
        </g>

        {/* Glass sheen */}
        <rect x="48" y="38" width="104" height="204" fill="url(#semos-sheen)" />
      </g>

      {/* Glass outline */}
      <path d={GLASS} fill="none" stroke="#475569" strokeWidth="1.5" />

      {/* Caps */}
      <rect x="30" y="22" width="140" height="14" fill="#0f172a" stroke="#334155" />
      <rect x="30" y="244" width="140" height="14" fill="#0f172a" stroke="#334155" />
      <line x1="30" y1="29" x2="170" y2="29" stroke="#34d399" strokeOpacity="0.5" />
      <line x1="30" y1="251" x2="170" y2="251" stroke="#34d399" strokeOpacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-x-clip border-b border-slate-800">
      <Glow className="-left-40 -top-24 h-[30rem] w-[44rem]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-28 lg:pt-20">
        {/* Left column */}
        <div>
          <p className="inline-flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Panic-Mode UX Active
          </p>

          <h1 className="mt-6 max-w-xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-100 sm:text-5xl lg:text-6xl">
            Submit work on time to get the <span className="text-emerald-400">score you want.</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            SemOS harmonizes your syllabus, assignments, and exam roadmaps into a single high-density
            workspace—eliminating late penalties and securing your SGPA.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/mastersheet"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400"
            >
              Launch Mastersheet
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="/roadmap"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-slate-700 hover:text-slate-100"
            >
              Explore Roadmaps
            </a>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col items-center">
          <div className={`relative flex w-full max-w-sm items-center justify-center overflow-hidden px-6 py-8 ${CARD}`}>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-2xl"
            />
            <Hourglass3D className="relative h-72 w-full sm:h-80" fallback={<SandTimer />} />
          </div>

          <SemesterCountdown className="mt-4 w-full max-w-sm" />
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#mastersheet"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-slate-500 transition-colors hover:text-emerald-400"
      >
        Scroll to preview the Mastersheet
        <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Mastersheet workspace                                              */
/* ------------------------------------------------------------------ */


function PanelTitle({ children }) {
  return (
    <h3 className="border-b border-slate-800 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
      {children}
    </h3>
  );
}

function BulletGroup({ title, items }) {
  return (
    <div className="px-4 py-4">
      <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-300">
            <span aria-hidden="true" className="mt-[0.55rem] h-1 w-1 shrink-0 bg-slate-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FoundPanel({ className = "" }) {
  return (
    <aside className={`${PANEL} ${className}`}>
      <PanelTitle>What we found</PanelTitle>
      <div className="divide-y divide-slate-800">
        <BulletGroup title="Strengths Identified" items={STRENGTHS} />
        <BulletGroup title="Improvement Suggestions" items={IMPROVEMENTS} />
      </div>
    </aside>
  );
}

function ScoreGauge({ score }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36" role="img" aria-label={`Exam readiness score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#34d399"
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold tabular-nums text-slate-100">{score}</span>
        <span className="font-mono text-[11px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function ScorePanel({ className = "" }) {
  return (
    <aside className={`${PANEL} ${className}`}>
      <PanelTitle>Exam readiness score</PanelTitle>
      <div className="flex flex-col items-center px-4 pb-5 pt-6">
        <ScoreGauge score={SCORE} />
        <span className="mt-4 border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          Excellent
        </span>
      </div>
      <div className="border-t border-slate-800 px-4 py-4">
        <h4 className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Category breakdown</h4>
        <ul className="mt-3.5 space-y-3.5">
          {CATEGORIES.map((c) => (
            <li key={c.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-300">{c.label}</span>
                <span className="font-mono text-xs tabular-nums text-slate-100">{c.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${c.value}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SheetHeading({ n, children }) {
  return (
    <h3 className="border-b border-slate-900 pb-1.5 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-slate-900">
      <span className="mr-2 font-mono font-medium text-slate-500">{n}.</span>
      {children}
    </h3>
  );
}

function DocumentSheet() {
  return (
    <article className="border border-stone-300 bg-[#fbf9f1] px-5 py-7 font-serif text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] sm:px-10 sm:py-10 xl:px-32 xl:py-12">
      <header className="border-b-4 border-double border-slate-900 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          SEMOS <span className="text-slate-400">/</span> CS301 Operating Systems
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight">Operating Systems</h2>
        <p className="mt-1 text-base italic text-slate-600">Unit 3 · CPU Scheduling &amp; Deadlocks</p>
      </header>

      <section className="mt-7">
        <SheetHeading n={1}>Formulas</SheetHeading>
        <dl className="grid sm:grid-cols-2 sm:gap-x-10">
          {FORMULAS.map((f) => (
            <div key={f.name} className="border-b border-dotted border-stone-300 py-3">
              <dt className="text-sm text-slate-600">{f.name}</dt>
              <dd className="mt-1 rounded-sm border border-stone-300 bg-stone-200/50 px-2 py-1 font-mono text-base font-medium">{f.expr}</dd>
              <dd className="mt-0.5 text-xs italic text-slate-500">{f.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <SheetHeading n={2}>2-Mark Keyword Bank</SheetHeading>
        <ul className="mt-1">
          {KEYWORDS.map((k) => (
            <li key={k.term} className="py-1.5 text-[15px] leading-relaxed text-slate-800">
              <span className="font-semibold text-slate-950 underline decoration-1 underline-offset-[3px]">
                {k.term}
              </span>
              <span className="text-slate-400"> — </span>
              {k.text}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-9 flex items-center justify-between border-t border-stone-300 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <span>CS301 · Last-minute mastersheet</span>
        <span>Page 1 / 1</span>
      </footer>
    </article>
  );
}

function MastersheetWorkspace() {
  return (
    <section id="mastersheet" className="relative isolate scroll-mt-14 overflow-x-clip">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className={BADGE}>Mastersheet workspace</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-100 sm:text-2xl">
              Operating Systems <span className="font-mono text-slate-400">(CS301)</span> — Last-Minute Mastersheet
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 font-mono text-xs text-slate-300 transition-all duration-200 hover:border-slate-700 hover:text-slate-100"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 font-mono text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              Export PDF
            </button>
          </div>
        </div>

        {/*
          Below xl the three pieces stack. From xl the cream sheet is the base layer and
          the dark panels are absolutely positioned over its top-left corner and right edge.
          The sheet's wide xl side padding keeps its text clear of both panels.
        */}
        <div className="relative isolate mt-8 flex flex-col gap-5 xl:mt-10 xl:block xl:min-h-[42rem]">
          <Glow className="inset-x-0 top-10 h-[36rem]" />
          <FoundPanel className="xl:absolute xl:left-0 xl:top-14 xl:z-10 xl:w-[17rem]" />
          <div className="xl:ml-44 xl:mr-52">
            <DocumentSheet />
          </div>
          <ScorePanel className="xl:absolute xl:right-0 xl:top-24 xl:z-10 xl:w-80" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SemOSLandingPage() {
  return (
    <div className="relative isolate min-h-screen scroll-smooth bg-[#030712] font-sans text-slate-200 antialiased">
      <Backdrop />
      <Navbar />
      <main>
        <Hero />
        <MastersheetWorkspace />
        <SemosShowcase />
      </main>
    </div>
  );
}
