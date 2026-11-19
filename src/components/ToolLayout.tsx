"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDown,
  BookOpenCheck,
  CalendarClock,
  Clock3,
  House,
  LayoutGrid,
  NotebookText,
  Sparkles,
  Target,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { deadlineOf, useNow, usePlan } from "@/lib/plan";

/*
 * Dashboard chrome shared by Mastersheet, Grade Analyzer and Note Builder.
 * Same look as the Roadmap page: grey canvas, white rounded cards, pill tabs.
 */

/* Palette: deep purple, bright green, pink, yellow and orange on a soft lavender canvas. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";
const CARD =
  "rounded-[1.75rem] bg-[#fffaf2] shadow-[0_1px_2px_rgba(107,58,31,0.08),0_22px_44px_-30px_rgba(107,58,31,0.55)] ring-1 ring-[#6b3a1f]/[0.12]";
const BTN_GREEN = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#3ee07a] px-5 py-2.5 text-sm font-bold text-[#2a0730] shadow-[0_8px_20px_-8px_rgba(34,197,94,0.7)] transition-colors duration-150 hover:bg-[#5cf091] ${FOCUS}`;
const BTN_LIGHT = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5b1065] shadow-[0_1px_2px_rgba(59,10,69,0.05)] ring-1 ring-[#5b1065]/15 transition-colors duration-150 hover:bg-fuchsia-50 ${FOCUS}`;

const TOOLS = [
  { href: "/mastersheet", label: "Mastersheet", icon: BookOpenCheck },
  { href: "/grade-analyzer", label: "Grade Analyzer", icon: Target },
  { href: "/note-builder", label: "Note Builder", icon: NotebookText },
  { href: "/roadmap", label: "Roadmap", icon: CalendarClock },
];

const DAY = 86_400_000;

const STAT_TINTS = ["bg-fuchsia-100 text-[#5b1065]", "bg-green-100 text-green-800", "bg-yellow-100 text-yellow-800", "bg-pink-100 text-pink-800"];
const ICON_TINTS = ["bg-green-200 text-green-800", "bg-yellow-200 text-yellow-800", "bg-pink-200 text-pink-800"];

/* ------------------------------------------------------------------ */
/*  Top bar and side rail                                              */
/* ------------------------------------------------------------------ */

export function ToolNav() {
  const pathname = usePathname();
  const plan = usePlan();
  const now = useNow();
  const left = plan && now ? Math.max(0, deadlineOf(plan) - now) : null;

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-4 px-4 pt-5 sm:px-6">
      <Link href="/" className={`flex items-center gap-2.5 rounded-xl text-lg font-bold tracking-tight text-[#3b0a45] ${FOCUS}`}>
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b1065] shadow-sm">
          <span className="h-3.5 w-3.5 rotate-12 rounded-[4px] bg-yellow-300" />
        </span>
        SemOS
      </Link>

      <nav aria-label="Tools" className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 lg:order-none lg:mx-0 lg:w-auto lg:px-0">
        <ul className="flex gap-2">
          {TOOLS.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${FOCUS} ${
                    active
                      ? "bg-[#5b1065] text-white shadow-[0_8px_20px_-10px_rgba(91,16,101,0.8)]"
                      : "bg-white text-slate-500 ring-1 ring-[#5b1065]/10 hover:bg-fuchsia-50 hover:text-[#5b1065]"
                  }`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {left !== null ? (
          <Link
            href="/roadmap"
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-yellow-200 px-4 py-2.5 text-sm font-bold text-yellow-900 ring-1 ring-yellow-300 hover:bg-yellow-300 ${FOCUS}`}
          >
            <Clock3 className="h-4 w-4 text-yellow-700" aria-hidden="true" />
            <span className="tabular-nums">
              {left > 0 ? `${Math.floor(left / DAY)}d ${String(Math.floor((left % DAY) / 3_600_000)).padStart(2, "0")}h left` : "Deadline passed"}
            </span>
          </Link>
        ) : null}
        <Link href="/" aria-label="SemOS home" className={`grid h-10 w-10 place-items-center rounded-full bg-pink-200 text-pink-800 transition-colors duration-150 hover:bg-pink-300 ${FOCUS}`}>
          <House className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

const RAIL = [
  { href: "#overview", label: "Overview", icon: LayoutGrid, tint: "bg-[#5b1065] text-white shadow-md" },
  { href: "#scene", label: "3D view", icon: Sparkles, tint: "bg-yellow-200 text-yellow-800 hover:bg-yellow-300" },
  { href: "#tool", label: "Tool", icon: Wrench, tint: "bg-[#3ee07a] text-[#2a0730] hover:bg-[#5cf091]" },
];

/** Floating icon rail on wide screens, jumping between the page's sections. */
function SideRail() {
  return (
    <nav aria-label="Page sections" className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 min-[1360px]:block">
      <ul className="flex flex-col gap-3">
        {RAIL.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              title={r.label}
              aria-label={r.label}
              className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-150 ${FOCUS} ${r.tint}`}
            >
              <r.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header + overview cards                                       */
/* ------------------------------------------------------------------ */

export type FloatCard = { icon: LucideIcon; title: string; text: string };
export type Stat = { value: string; label: string };

/**
 * Title row like the Roadmap, then two cards: "at a glance" (numbers and what the tool does)
 * and a wide card whose dark inner panel holds the tool's 3D scene at the shape it was made for.
 */
export function ToolHero({
  tag,
  title,
  text,
  cta,
  scene,
  caption,
  cards,
  stats,
}: {
  tag: string;
  title: string;
  text: string;
  cta: string;
  scene: ReactNode;
  caption?: ReactNode;
  cards: FloatCard[];
  stats: Stat[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <SideRail />

      <div className="flex flex-col gap-5 pt-10 sm:pt-14 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="w-fit rounded-full bg-pink-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink-800">{tag}</p>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-[-0.035em] text-[#3b0a45] sm:text-[3.25rem] sm:leading-[1.02]">
            {title}
            <span aria-hidden="true" className="ml-3 inline-block h-3.5 w-3.5 rotate-45 rounded-[3px] bg-yellow-300 align-middle" />
          </h1>
          <p className="mt-3 max-w-xl text-[15px] font-medium text-slate-500">{text}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/roadmap" className={BTN_LIGHT}>
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Roadmap
          </Link>
          <a href="#tool" className={BTN_GREEN}>
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            {cta}
          </a>
        </div>
      </div>

      <div className="mt-8 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
        <section id="overview" aria-labelledby="glance-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
          <h2 id="glance-title" className="flex items-center gap-2 text-base font-bold tracking-tight text-[#3b0a45]">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#3ee07a]" />
            At a glance
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-2.5">
            {stats.map((s, i) => (
              <li key={s.label} className={`min-w-0 rounded-2xl px-3.5 py-3 ${STAT_TINTS[i % STAT_TINTS.length]}`}>
                <span className="block truncate text-2xl font-bold tabular-nums tracking-tight">{s.value}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold opacity-75">{s.label}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-5 divide-y divide-fuchsia-100">
            {cards.map((c, i) => (
              <li key={c.title} className="flex items-center gap-3 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${ICON_TINTS[i % ICON_TINTS.length]}`}>
                  <c.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#3b0a45]">{c.title}</span>
                  <span className="block truncate text-xs text-slate-500">{c.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section id="scene" aria-label="3D view" className={`${CARD} flex scroll-mt-6 flex-col p-2`}>
          <div className="relative min-h-[16rem] flex-1 overflow-hidden rounded-[1.4rem] bg-[radial-gradient(120%_90%_at_50%_0%,#8b1d8f_0%,#5b1065_45%,#2a0730_100%)] sm:min-h-[20rem]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_110%,rgba(236,72,153,0.35),transparent)]" />
            {/* Playful shapes in the corners, behind the scene */}
            <svg aria-hidden="true" viewBox="0 0 40 40" className="pointer-events-none absolute right-5 top-5 h-9 w-9 rotate-12 text-yellow-300">
              <path fill="currentColor" d="M20 2c3 9 9 15 18 18-9 3-15 9-18 18-3-9-9-15-18-18 9-3 15-9 18-18Z" />
            </svg>
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full border-[10px] border-pink-300/70" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-6 right-8 h-3 w-3 rounded-full bg-[#3ee07a]" />
            <div className="absolute inset-0">{scene}</div>
            <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-bold text-[#3b0a45]">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Live 3D
            </span>
          </div>
          {caption ? <div className="px-3 pb-2 pt-3 text-xs text-[#5b1065]/70">{caption}</div> : null}
        </section>
      </div>
    </div>
  );
}

/** The tool itself: the original dark components, shown in the light dashboard theme. */
export function ToolBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div id="tool" className={`tool-light scroll-mt-4 ${className}`}>
      {children}
    </div>
  );
}
