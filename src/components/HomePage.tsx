"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CloudLightning,
  CloudRain,
  Gauge,
  LayoutGrid,
  ListChecks,
  NotebookText,
  Sparkles,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import { buildSchedule, deadlineOf, formatRemaining, timeEntries, useNow, usePlan, type Plan } from "@/lib/plan";
import { weatherFromPlan, type AssignmentStatus } from "@/lib/weather";
import DynamicWeatherBackground from "./DynamicWeatherBackground";
import Hourglass3D from "./Hourglass3D";
import { DocumentSheet, SandTimer } from "./SemOSLandingPage";

/* ------------------------------------------------------------------ */
/*  Weather themes                                                     */
/* ------------------------------------------------------------------ */

type Theme = {
  label: string;
  line: string;
  icon: LucideIcon;
  /** Headline and body colours over the sky. */
  ink: string;
  inkSoft: string;
  /** Card hover glow in the weather's accent colour. */
  glow: string;
  tile: string;
  accentCard: string;
  accentInk: string;
  bar: string;
  dot: string;
};

const THEMES: Record<AssignmentStatus, Theme> = {
  sunny: {
    label: "Clear skies",
    line: "Everything is on track. Keep the pace.",
    icon: Sun,
    ink: "text-slate-900",
    inkSoft: "text-slate-600",
    glow: "hover:ring-lime-300/90 hover:shadow-[0_28px_60px_-20px_rgba(101,163,13,0.55)]",
    tile: "bg-lime-200/90 text-lime-800",
    accentCard: "bg-gradient-to-b from-lime-200/95 to-lime-400/90",
    accentInk: "text-lime-950",
    bar: "bg-lime-500",
    dot: "bg-lime-500",
  },
  rainy: {
    label: "Rain",
    line: "You are falling behind. Still doable, with less buffer.",
    icon: CloudRain,
    ink: "text-white",
    inkSoft: "text-white/80",
    glow: "hover:ring-amber-300/90 hover:shadow-[0_28px_60px_-20px_rgba(217,119,6,0.55)]",
    tile: "bg-amber-200/90 text-amber-800",
    accentCard: "bg-gradient-to-b from-amber-100/95 to-amber-300/90",
    accentInk: "text-amber-950",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  stormy: {
    label: "Storm",
    line: "Something is overdue or cannot fit before the deadline.",
    icon: CloudLightning,
    ink: "text-white",
    inkSoft: "text-white/75",
    glow: "hover:ring-rose-300/90 hover:shadow-[0_28px_60px_-20px_rgba(225,29,72,0.6)]",
    tile: "bg-rose-200/90 text-rose-800",
    accentCard: "bg-gradient-to-b from-rose-200/95 to-rose-400/90",
    accentInk: "text-rose-950",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
  },
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";
const GLASS = "rounded-[1.75rem] bg-white/65 ring-1 ring-white/70 backdrop-blur-xl shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] transition-[box-shadow,--tw-ring-color] duration-300";
const BTN_DARK = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-slate-700 ${FOCUS}`;
const BTN_GLASS = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-white/80 backdrop-blur-md transition-colors duration-150 hover:bg-white ${FOCUS}`;

const TOOLS = [
  { href: "/mastersheet", label: "Mastersheet", text: "Past papers into a one-page exam sheet", icon: BookOpenCheck },
  { href: "/grade-analyzer", label: "Grade Analyzer", text: "What you need in each subject for your CGPA", icon: Target },
  { href: "/note-builder", label: "Note Builder", text: "Messy notes into clean revision notes", icon: NotebookText },
  { href: "/roadmap", label: "Roadmap", text: "Every assignment planned to its deadline", icon: CalendarClock },
];

const fmtH = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

/* ------------------------------------------------------------------ */
/*  Numbers for the dashboard cards (your plan, or a sample)           */
/* ------------------------------------------------------------------ */

type Stats = {
  sample: boolean;
  timeLeft: string;
  count: number;
  doneCount: number;
  perDay: number;
  pct: number;
  segments: number[]; // share of each assignment, in order
  doneFlags: boolean[];
  current: string;
  hoursCurve: number[]; // cumulative hours devoted, one point per day
  devoted: number;
  today: number;
};

const SAMPLE: Stats = {
  sample: true,
  timeLeft: "6 days:04h:20min",
  count: 4,
  doneCount: 2,
  perDay: 3.2,
  pct: 62,
  segments: [0.38, 0.24, 0.22, 0.16],
  doneFlags: [true, true, false, false],
  current: "CN assignment",
  hoursCurve: [0, 2, 3.5, 6, 6.5, 10, 13, 17],
  devoted: 17,
  today: 4,
};

function statsFor(plan: Plan | null | undefined, now: number): Stats {
  if (!plan || !now || plan.items.length === 0) return SAMPLE;
  const slots = buildSchedule(plan);
  const total = plan.items.reduce((s, a) => s + a.hours, 0) || 1;
  const done = plan.items.filter((a) => a.done);
  const left = deadlineOf(plan) - now;

  // Hours devoted per day from the start of the plan to today, as a running total.
  const day0 = new Date(plan.startAt).setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.floor((now - day0) / 86_400_000) + 1);
  const perDayDone = new Array<number>(days).fill(0);
  for (const a of plan.items)
    for (const e of timeEntries(a)) {
      const i = Math.min(days - 1, Math.max(0, Math.floor((e.at - day0) / 86_400_000)));
      perDayDone[i] += e.hours;
    }
  const curve = [0];
  perDayDone.forEach((h) => curve.push(curve[curve.length - 1] + h));
  const devoted = curve[curve.length - 1];
  const remaining = plan.items.reduce((s, a) => s + (a.done ? 0 : a.hours), 0);

  return {
    sample: false,
    timeLeft: formatRemaining(left),
    count: plan.items.length,
    doneCount: done.length,
    perDay: left > 0 ? remaining / Math.max(left / 86_400_000, 1 / 24) : remaining,
    pct: Math.round((done.reduce((s, a) => s + a.hours, 0) / total) * 100),
    segments: slots.map((s) => s.share),
    doneFlags: slots.map((s) => s.done),
    current: slots.find((s) => !s.done)?.name ?? "",
    hoursCurve: curve,
    devoted,
    today: perDayDone[days - 1],
  };
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

function Nav({ theme }: { theme: Theme }) {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 pt-5 sm:px-6">
      <Link href="/" className={`flex items-center gap-2.5 rounded-full text-xl font-bold tracking-tight ${theme.ink} ${FOCUS}`}>
        <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 shadow-sm">
          <span className="h-3 w-3 rounded-[3px] bg-emerald-400" />
        </span>
        SemOS
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className={`rounded-sm text-sm font-semibold transition-opacity duration-150 hover:opacity-70 ${theme.ink} ${FOCUS}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <Link href="/roadmap" className={BTN_DARK}>
        Start planning
      </Link>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero: left stage (caption, rail, hourglass, mastersheet card)      */
/* ------------------------------------------------------------------ */

const IMPORTANCE = [3, 5, 4, 7, 9, 6, 8, 9, 5, 4, 6, 8, 7, 9, 6, 3, 5, 7, 4, 6, 8, 5, 9, 7, 4, 3, 6, 8, 5, 4, 7, 9, 6, 5, 3, 4, 6, 7, 5, 4];

function Stage({ theme, weather, reason }: { theme: Theme; weather: AssignmentStatus; reason: string }) {
  const Icon = theme.icon;
  return (
    <div className="relative flex min-w-0 flex-col gap-6 lg:min-h-[44rem] lg:pl-20">
      {/* Vertical tool rail */}
      <nav aria-label="Tools" className={`${GLASS} absolute left-0 top-56 hidden flex-col gap-2 p-2 lg:flex`}>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900/10 text-slate-900" title="Home">
          <LayoutGrid className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            title={t.label}
            aria-label={t.label}
            className={`grid h-11 w-11 place-items-center rounded-2xl text-slate-700 transition-colors duration-150 hover:bg-white ${FOCUS}`}
          >
            <t.icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      {/* Caption bubble */}
      <div className="flex items-center gap-3 lg:ml-16 lg:mt-10">
        <span className={`${GLASS} grid h-16 w-16 shrink-0 place-items-center rounded-full`}>
          <Icon className={`h-7 w-7 ${weather === "sunny" ? "text-amber-500" : weather === "rainy" ? "text-slate-600" : "text-rose-600"}`} aria-hidden="true" />
        </span>
        <p className="max-w-[16rem] rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium leading-snug text-slate-700 shadow-sm backdrop-blur-md">
          <span className="font-bold text-slate-900">{theme.label}.</span> {reason}
        </p>
      </div>

      {/* Hourglass on two floating glass screens */}
      <div className="relative mx-auto h-80 w-full max-w-[22rem] sm:h-96">
        <div aria-hidden="true" className="absolute left-2 top-10 h-60 w-44 -rotate-6 rounded-[1.75rem] bg-gradient-to-br from-white/80 to-sky-100/50 shadow-xl ring-1 ring-white/80 backdrop-blur-md sm:h-64" />
        <div aria-hidden="true" className="absolute right-2 top-4 h-72 w-52 rotate-3 rounded-[1.75rem] bg-gradient-to-br from-white/85 via-emerald-50/60 to-teal-100/50 shadow-2xl ring-1 ring-white/90 backdrop-blur-md sm:h-80" />
        <span aria-hidden="true" className="absolute left-0 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="absolute inset-x-8 inset-y-2 z-10">
          <Hourglass3D className="h-full w-full" fallback={<div className="origin-center scale-[0.8]"><SandTimer /></div>} />
        </div>
      </div>

      {/* Mastersheet card */}
      <article className={`${GLASS} ${theme.glow} p-5 lg:mr-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Mastersheet
            <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-slate-500">CS301</span>
          </h2>
          <div className="flex gap-2">
            <a href="#sample" className={`${BTN_GLASS} px-3.5 py-1.5 text-xs`}>
              Preview
            </a>
            <Link href="/mastersheet" className={`${BTN_DARK} px-3.5 py-1.5 text-xs`}>
              Make yours
            </Link>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Formulas, 2-mark keywords and the topics that keep coming up in past papers, ranked and fitted on one printable page.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-white">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          {/* Topic importance, drawn like a waveform. */}
          <div aria-hidden="true" className="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
            {IMPORTANCE.map((v, i) => (
              <span key={i} className={`w-[3px] shrink-0 rounded-full ${i < 24 ? theme.bar : "bg-slate-300"}`} style={{ height: `${v * 10}%` }} />
            ))}
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">24 / 40 topics</span>
        </div>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero: right side dashboard (the weather-tinted bento)              */
/* ------------------------------------------------------------------ */

function AreaChart({ points, className = "" }: { points: number[]; className?: string }) {
  const max = Math.max(1, ...points);
  const n = Math.max(points.length - 1, 1);
  const xy = points.map((p, i) => [(i / n) * 200, 100 - (p / max) * 86] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor="white" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={`${line} L 200 100 L 0 100 Z`} fill="url(#area-fill)" />
      <path d={line} fill="none" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="#0f172a" />
    </svg>
  );
}

function Dashboard({ theme, stats, reason, hasPlan }: { theme: Theme; stats: Stats; reason: string; hasPlan: boolean }) {
  const tiles = [
    { label: "Time left", value: stats.timeLeft, icon: Clock3 },
    { label: "Assignments", value: String(stats.count), icon: ListChecks },
    { label: "Finished", value: `${stats.doneCount} of ${stats.count}`, icon: CheckCircle2 },
    { label: "Needed per day", value: fmtH(Number(stats.perDay.toFixed(1))), icon: Gauge },
  ];
  const Icon = theme.icon;

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_12.5rem]">
      {/* Main card */}
      <section aria-labelledby="sem-title" className={`${GLASS} ${theme.glow} p-5 sm:row-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <h2 id="sem-title" className="text-lg font-bold tracking-tight text-slate-900">
            Your semester
          </h2>
          {stats.sample ? <span className="rounded-full bg-slate-900/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-500">Sample</span> : null}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/70 p-2.5 ring-1 ring-white/80">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${theme.tile}`}>
                <t.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="truncate text-xs font-medium text-slate-500">{t.label}</dt>
                <dd className="truncate text-sm font-bold tabular-nums text-slate-900">{t.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <h3 className="mt-5 text-base font-bold tracking-tight text-slate-900">Roadmap progress</h3>
        <div className="mt-2 rounded-2xl bg-white/70 p-3.5 ring-1 ring-white/80">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{stats.current ? `Working on ${stats.current}…` : "Every assignment is done"}</span>
          </p>
          <div className="mt-3 flex h-1.5 gap-1.5" aria-hidden="true">
            {stats.segments.map((share, i) => (
              <span key={i} className={`rounded-full ${stats.doneFlags[i] ? theme.bar : "bg-slate-200"}`} style={{ flexGrow: share, flexBasis: 0 }} />
            ))}
          </div>
          <p className="mt-2 flex justify-between text-xs font-medium text-slate-500">
            <span>Work finished</span>
            <span className="tabular-nums">{stats.pct}%</span>
          </p>
        </div>

        <h3 className="mt-5 text-base font-bold tracking-tight text-slate-900">Outlook</h3>
        <Link
          href="/roadmap"
          className={`mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-900/[0.05] px-4 py-4 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-900/[0.08] ${FOCUS}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {stats.sample ? "Add your assignments to get your forecast" : `${theme.label}: open your roadmap`}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {/* Accent card: hours devoted */}
      <section aria-labelledby="hours-title" className={`relative flex min-h-[13rem] flex-col overflow-hidden rounded-[1.75rem] ${theme.accentCard} p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ring-1 ring-white/50 transition-colors duration-700`}>
        <h2 id="hours-title" className={`text-lg font-bold tracking-tight ${theme.accentInk}`}>
          Study hours
        </h2>
        <span className="absolute right-5 top-[4.25rem] rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
          +{fmtH(Number(stats.today.toFixed(1)))} today
        </span>
        <AreaChart points={stats.hoursCurve} className="mt-auto h-24 w-full" />
        <p className={`mt-2 text-center text-sm font-semibold ${theme.accentInk}`}>{fmtH(Number(stats.devoted.toFixed(1)))} devoted</p>
      </section>

      {/* Weather card: what the sky means right now */}
      <section aria-labelledby="weather-title" className={`${GLASS} ${theme.glow} flex flex-col p-4`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${theme.tile}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="weather-title" className="min-w-0 text-sm font-bold text-slate-900">
            {theme.label}
          </h2>
        </div>
        <p className="mt-3 text-[13px] font-medium leading-snug text-slate-600" aria-live="polite">
          {reason}
        </p>
        <Link href="/roadmap" className={`${BTN_DARK} mt-auto w-full px-3 py-2 text-xs`}>
          {hasPlan ? "Open schedule" : "Create a schedule"}
        </Link>
      </section>

      {/* Tools list */}
      <section aria-labelledby="tools-title" className={`${GLASS} ${theme.glow} p-5 sm:col-span-2`}>
        <h2 id="tools-title" className="text-lg font-bold tracking-tight text-slate-900">
          Your tools
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`group flex items-center gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-white/80 transition-colors duration-150 hover:bg-white ${FOCUS}`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white">
                  <t.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{t.label}</span>
                  <span className="block truncate text-xs text-slate-500">{t.text}</span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900/[0.06] text-slate-700 transition-colors duration-150 group-hover:bg-slate-900 group-hover:text-white">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Below the hero                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  { title: "Upload what you have", text: "Lecture notes, textbook photos, your syllabus and previous years' question papers. PDFs and images both work." },
  { title: "SemOS ranks the topics", text: "Every topic gets a 1–10 importance score from how often past papers ask it and how much the syllabus weighs it." },
  { title: "Revise from one page", text: "Formulas, 2-mark definitions and the must-know topics, laid out on a single sheet you can print." },
];

const FOUND = {
  strengths: ["All four core scheduling formulas are on the sheet.", "2-mark keyword bank matches the Unit 3 syllabus.", "Fits a single printable page."],
  suggestions: ["Add Banker's Algorithm: asked in 4 of the last 5 papers.", "Include one worked Gantt chart for SJF or Round Robin."],
};
const READINESS = [
  { label: "Syllabus coverage", value: 96 },
  { label: "Formula recall", value: 94 },
  { label: "Answer format", value: 86 },
];

function SamplePreview({ theme }: { theme: Theme }) {
  return (
    <section id="sample" aria-labelledby="sample-title" className="mx-auto max-w-7xl scroll-mt-6 px-4 pt-24 sm:px-6">
      <div className={`${GLASS} p-5 sm:p-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="sample-title" className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
              What you get
            </h2>
            <p className="mt-2 max-w-xl text-[15px] text-slate-600">
              A sample sheet for Operating Systems, Unit 3. Yours is built from your own files, with a readiness check that points out what is still missing.
            </p>
          </div>
          <Link href="/mastersheet" className={BTN_DARK}>
            Try it with your notes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid items-start gap-5 xl:grid-cols-[16rem_minmax(0,1fr)_16rem]">
          <aside className="rounded-3xl bg-white/80 p-5 ring-1 ring-white">
            <h3 className="text-sm font-bold text-slate-900">What SemOS found</h3>
            {(["strengths", "suggestions"] as const).map((k) => (
              <div key={k} className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</h4>
                <ul className="mt-2 space-y-2">
                  {FOUND[k].map((t) => (
                    <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
                      <span aria-hidden="true" className={`mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full ${k === "strengths" ? theme.dot : "bg-slate-400"}`} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
          <div className="min-w-0 [&_article]:shadow-[0_30px_60px_-30px_rgba(15,23,42,0.5)] [&_article]:xl:px-12">
            <DocumentSheet />
          </div>
          <aside className="rounded-3xl bg-white/80 p-5 ring-1 ring-white">
            <h3 className="text-sm font-bold text-slate-900">Exam readiness</h3>
            <p className="mt-3 text-5xl font-bold tabular-nums tracking-tight text-slate-900">
              92<span className="text-lg font-semibold text-slate-400"> / 100</span>
            </p>
            <ul className="mt-5 space-y-4">
              {READINESS.map((c) => (
                <li key={c.label}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{c.label}</span>
                    <span className="tabular-nums text-slate-900">{c.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${theme.bar} transition-colors duration-700`} style={{ width: `${c.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ theme }: { theme: Theme }) {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
      <h2 id="how-title" className={`text-3xl font-semibold tracking-[-0.03em] sm:text-4xl ${theme.ink} transition-colors duration-700`}>
        How it works
      </h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`${GLASS} ${theme.glow} p-6`}>
            <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${theme.tile}`}>{i + 1}</span>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Closing({ theme }: { theme: Theme }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6">
      <div className={`${GLASS} flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between`}>
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">Start with one subject.</h2>
          <p className="mt-2 text-[15px] text-slate-600">Upload a syllabus and a couple of past papers to get your first sheet.</p>
        </div>
        <Link href="/mastersheet" className={BTN_DARK}>
          Make your mastersheet
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <footer className={`mt-8 flex flex-wrap items-center justify-between gap-4 text-sm font-medium ${theme.inkSoft} transition-colors duration-700`}>
        <span>© 2026 SemOS</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-5">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className={`rounded-sm hover:opacity-70 ${FOCUS}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </footer>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const plan = usePlan();
  const now = useNow();

  // Sunny until the browser has loaded the saved schedule.
  const live = now ? weatherFromPlan(plan, now) : { status: "sunny" as const, reason: "No schedule yet." };
  const weather = live.status;
  const theme = THEMES[weather];
  const stats = statsFor(plan, now);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <DynamicWeatherBackground status={weather} />
      <Nav theme={theme} />

      <main>
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
            <h1 className={`text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[5.25rem] ${theme.ink} transition-colors duration-700`}>
              Ace Your Semester With SemOS
            </h1>
            <div className="lg:pt-3">
              <p className={`text-lg font-semibold leading-snug sm:text-xl ${theme.ink} transition-colors duration-700`}>
                Exam sheets, grade targets and assignment plans, built from your own files.{" "}
                <span className={`${theme.inkSoft} transition-colors duration-700`}>
                  From the syllabus to the last exam, everything happens in one calm workspace, and the sky shows how your workload is going.
                </span>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/mastersheet" className={BTN_DARK}>
                  Make your mastersheet
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/roadmap" className={BTN_GLASS}>
                  Plan your assignments
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 grid items-start gap-6 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <Stage theme={theme} weather={weather} reason={live.reason} />
            <Dashboard theme={theme} stats={stats} reason={live.reason} hasPlan={Boolean(plan && plan.items.length)} />
          </div>
        </section>

        <SamplePreview theme={theme} />
        <HowItWorks theme={theme} />
        <Closing theme={theme} />
      </main>
    </div>
  );
}
