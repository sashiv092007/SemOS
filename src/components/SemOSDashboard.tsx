import Link from "next/link";
import {
  Trophy,
  BookOpen,
  Clock,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CheckCircle,
  Flame,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/", active: true },
  { label: "Mastersheets", href: "/mastersheet" },
  { label: "CDP Scanner", href: "/grade-analyzer" },
  { label: "Note Builder", href: "/note-builder" },
  { label: "Roadmaps", href: "/roadmap" },
];

const BARS = [
  { day: "Mon", height: "60%", lessons: "4" },
  { day: "Tue", height: "40%", lessons: "2" },
  { day: "Wed", height: "90%", lessons: "8", active: true },
  { day: "Thu", height: "70%", lessons: "5" },
  { day: "Fri", height: "80%", lessons: "6" },
];

export default function SemOSDashboard() {
  return (
    <div className="min-h-screen bg-[#090d16] p-4 font-sans text-slate-100 sm:p-6 lg:p-8">
      {/* 1. Floating pill header */}
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[#131b2e]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 font-bold text-white shadow-lg">
            S
          </div>
          <span className="truncate text-base font-bold tracking-tight text-white">SemOS Workspace</span>
        </Link>

        {/* Center pill nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-full border border-white/5 bg-slate-900/90 p-1.5 text-xs font-medium lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={
                item.active
                  ? "rounded-full bg-indigo-600 px-4 py-2 text-white shadow-md"
                  : "rounded-full px-4 py-2 text-slate-400 transition-colors hover:text-white"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User status */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
              J
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none text-white">Jacob</p>
              <p className="mt-0.5 font-mono text-[10px] text-emerald-400">Target: 8.8 SGPA</p>
            </div>
          </div>
        </div>
      </header>

      {/* Pill nav for smaller screens */}
      <nav
        aria-label="Primary"
        className="mx-auto -mt-4 mb-6 flex max-w-7xl gap-1 overflow-x-auto rounded-full border border-white/5 bg-slate-900/90 p-1.5 text-xs font-medium lg:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={
              item.active
                ? "shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-white shadow-md"
                : "shrink-0 rounded-full px-4 py-2 text-slate-400 transition-colors hover:text-white"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 2. Main bento grid */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: featured hero cards */}
        <div className="flex flex-col gap-6 md:col-span-4">
          {/* Featured subject banner */}
          <div className="bento-card relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 text-white">
            <div className="relative z-10">
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                Active Module
              </span>
              <h3 className="mt-3 text-2xl font-bold leading-tight">Operating Systems &amp; CPU Scheduling</h3>
              <p className="mt-1 text-xs text-indigo-100/80">Unit III: Deadlock Prevention &amp; Peterson&apos;s Algorithm</p>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-xs font-medium">12 Formulas Extracted</span>
              <Link
                href="/mastersheet"
                aria-label="Open the Operating Systems mastersheet"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-950 shadow-lg transition-transform hover:scale-105"
              >
                <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            {/* Decorative graphics */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-purple-500/30 blur-2xl" />
            <Trophy className="pointer-events-none absolute right-4 top-4 h-24 w-24 text-white/10" aria-hidden="true" />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bento-card flex flex-col justify-between p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">78</p>
                <p className="mt-0.5 text-xs text-slate-400">Key Concepts</p>
              </div>
            </div>

            <div className="bento-card flex flex-col justify-between p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">43 hrs</p>
                <p className="mt-0.5 text-xs text-slate-400">Study Tracked</p>
              </div>
            </div>
          </div>

          {/* Current subjects */}
          <div className="bento-card p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Current Subjects</h4>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> OS (CS301)
              </span>
              <span className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                <span className="h-2 w-2 rounded-full bg-blue-400" /> DBMS (CS302)
              </span>
              <span className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                <span className="h-2 w-2 rounded-full bg-purple-400" /> Networks (CS303)
              </span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: progress and charting */}
        <div className="flex flex-col gap-6 md:col-span-5">
          {/* Weekly progress */}
          <div className="bento-card flex flex-1 flex-col justify-between p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Weekly Prep Progress</h3>
                <p className="mt-0.5 text-xs text-slate-400">Formula retention &amp; exam practice accuracy</p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                This Week
              </span>
            </div>

            {/* Bar chart */}
            <div
              role="img"
              aria-label={`Lessons per day: ${BARS.map((b) => `${b.day} ${b.lessons}`).join(", ")}`}
              className="flex h-48 items-end justify-between gap-3 border-b border-slate-800 px-2 pb-2 pt-6"
            >
              {BARS.map((bar) => (
                <div key={bar.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    title={`${bar.lessons} lessons`}
                    className={`w-full rounded-t-xl transition-all ${
                      bar.active
                        ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                    style={{ height: bar.height }}
                  />
                  <span className="text-[11px] font-medium text-slate-400">{bar.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 text-xs">
              <div className="flex items-center gap-2 font-medium text-emerald-400">
                <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
                <span>5-Day Prep Streak</span>
              </div>
              <span className="text-slate-400">Target: 12 hrs / week</span>
            </div>
          </div>

          {/* Recommended next steps */}
          <div className="bento-card p-5">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Recommended Next Steps</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="text-xs text-slate-200">Solve 2023 PYQ Banker&apos;s Safety Algorithm</span>
                </div>
                <span className="shrink-0 rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-400">10 Marks</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="text-xs text-slate-300">Review Thrashing &amp; Page Fault Formulas</span>
                </div>
                <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">5 mins</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: exam schedule and AI launcher */}
        <div className="flex flex-col gap-6 md:col-span-3">
          {/* Exam countdown */}
          <div className="bento-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mid-Sem Countdown</h4>
              <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-center">
              <span className="font-mono text-3xl font-extrabold text-white">14 : 08 : 32</span>
              <span className="mt-1 block text-[10px] uppercase tracking-widest text-slate-400">Days : Hours : Mins</span>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">CS301 MidSem</span>
                <span className="font-medium text-emerald-400">Nov 24</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">CS302 Quiz</span>
                <span className="font-medium text-amber-400">Nov 28</span>
              </div>
            </div>
          </div>

          {/* AI action card */}
          <div className="bento-card border-purple-500/20 bg-gradient-to-b from-purple-900/30 to-slate-900 p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-bold text-white">Generate Exam Cheatsheet</h4>
            <p className="mt-1 text-xs text-slate-400">Auto-summarize syllabus slides into a 1-page PDF.</p>
            <Link
              href="/mastersheet"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2.5 text-xs font-medium text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500"
            >
              Launch Mastersheet Builder <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
