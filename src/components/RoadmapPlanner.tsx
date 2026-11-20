"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountButton from "./AccountButton";
import SemosLogo from "./SemosLogo";
import { TOOLS } from "@/lib/tools";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  House,
  LayoutGrid,
  ListChecks,
  Pencil,
  PieChart,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  buildSchedule,
  deadlineOf,
  devotedHours,
  formatRemaining,
  formatSpan,
  newId,
  savePlan,
  useNow,
  usePlan,
  type Plan,
  timeEntries,
  type Slot,
} from "@/lib/plan";

/* ------------------------------------------------------------------ */
/*  Styles (light dashboard)                                           */
/* ------------------------------------------------------------------ */

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";
const CARD = "rounded-[1.75rem] bg-[#fffaf2] shadow-[0_1px_2px_rgba(107,58,31,0.08),0_22px_44px_-30px_rgba(107,58,31,0.55)] ring-1 ring-[#6b3a1f]/[0.12]";
const CARD_TITLE = "text-base font-bold tracking-tight text-[#6b3a1f]";
const INPUT =
  "rounded-xl border border-[#e2c09c] bg-white px-3 py-2.5 text-sm text-[#3b0a45] placeholder:text-[#b58a68] transition-colors duration-150 hover:border-slate-300 focus:border-fuchsia-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-fuchsia-500/10";
const BTN_DARK = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#3ee07a] px-5 py-2.5 text-sm font-bold text-[#2a0730] shadow-[0_8px_20px_-8px_rgba(34,197,94,0.7)] transition-colors duration-150 hover:bg-[#5cf091] active:bg-[#2fcf6a] ${FOCUS}`;
const BTN_LIGHT = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5b1065] shadow-[0_1px_2px_rgba(59,10,69,0.05)] ring-1 ring-[#5b1065]/15 transition-colors duration-150 hover:bg-fuchsia-50 ${FOCUS}`;
const ICON_BTN = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9c6a45] ring-1 ring-slate-900/[0.07] transition-colors duration-150 hover:bg-slate-50 hover:text-[#3b0a45] ${FOCUS}`;

type Status = "done" | "now" | "overdue" | "next";

/** One colour per status, used by the progress line, the ring, the bars and the pills. */
const STATUS: Record<Status, { label: string; fill: string; ring: string; pill: string; dot: string }> = {
  done: { label: "Done", fill: "bg-green-500", ring: "ring-green-500", pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  now: { label: "Do now", fill: "bg-blue-500", ring: "ring-blue-500", pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  overdue: { label: "Overdue", fill: "bg-orange-500", ring: "ring-orange-500", pill: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  next: { label: "Up next", fill: "bg-hatch bg-slate-100", ring: "", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-300" },
};

const DAY = 86_400_000;

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtDay = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtShort = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const fmtH = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

function ago(ms: number) {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function statusOf(slot: Slot, now: number, currentId: string | undefined): Status {
  if (slot.done) return "done";
  if (now >= slot.end) return "overdue";
  if (slot.id === currentId) return "now";
  return "next";
}

function toggleDone(plan: Plan, id: string) {
  savePlan({
    ...plan,
    items: plan.items.map((a) => (a.id === id ? { ...a, done: !a.done, doneAt: a.done ? undefined : Date.now() } : a)),
  });
}

const midnight = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ------------------------------------------------------------------ */
/*  Top bar and side rail                                              */
/* ------------------------------------------------------------------ */


function TopBar({ plan, now }: { plan: Plan | null | undefined; now: number }) {
  const pathname = usePathname();
  const left = plan && now ? deadlineOf(plan) - now : null;
  const d = left !== null ? Math.floor(Math.max(0, left) / DAY) : 0;
  const h = left !== null ? Math.floor((Math.max(0, left) % DAY) / 3_600_000) : 0;

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-4 px-4 pt-5 sm:px-6">
      <SemosLogo />

      <nav aria-label="Tools" className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-2">
          {TOOLS.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${FOCUS} ${
                    active ? "bg-[#5b1065] text-white shadow-[0_8px_20px_-10px_rgba(91,16,101,0.8)]" : "bg-white text-[#9c6a45] ring-1 ring-[#5b1065]/10 hover:bg-fuchsia-50 hover:text-[#5b1065]"
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
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-yellow-200 px-4 py-2.5 text-sm font-bold text-yellow-900 ring-1 ring-yellow-300">
            <Clock3 className="h-4 w-4 text-yellow-700" aria-hidden="true" />
            <span className="tabular-nums">{left > 0 ? `${d}d ${String(h).padStart(2, "0")}h left` : "Deadline passed"}</span>
          </span>
        ) : null}
        <AccountButton />
        <Link href="/" aria-label="SemOS home" className={`grid h-10 w-10 place-items-center rounded-full bg-pink-200 text-pink-800 transition-colors duration-150 hover:bg-pink-300 ${FOCUS}`}>
          <House className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

const RAIL_TINTS = [
  "bg-[#5b1065] text-white shadow-md",
  "bg-yellow-200 text-yellow-800 hover:bg-yellow-300",
  "bg-pink-200 text-pink-800 hover:bg-pink-300",
  "bg-orange-200 text-orange-800 hover:bg-orange-300",
  "bg-fuchsia-200 text-fuchsia-800 hover:bg-fuchsia-300",
];

const RAIL = [
  { href: "#overview", label: "Overview", icon: LayoutGrid },
  { href: "#daily", label: "Hours per day", icon: BarChart3 },
  { href: "#breakdown", label: "Work breakdown", icon: PieChart },
  { href: "#pie", label: "Time plan", icon: Clock3 },
  { href: "#order", label: "Order of work", icon: ListChecks },
];

/** Floating icon rail on wide screens, jumping between the dashboard cards. */
function SideRail({ onEdit }: { onEdit: () => void }) {
  return (
    <nav aria-label="Dashboard sections" className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 min-[1360px]:block">
      <ul className="flex flex-col gap-3">
        {RAIL.map((r, i) => (
          <li key={r.href}>
            <a
              href={r.href}
              title={r.label}
              aria-label={r.label}
              className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-150 ${FOCUS} ${
                RAIL_TINTS[i % RAIL_TINTS.length]
              }`}
            >
              <r.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onEdit}
            title="Edit assignments"
            aria-label="Edit assignments"
            className={`grid h-11 w-11 place-items-center rounded-full bg-[#3ee07a] text-[#2a0730] transition-colors duration-150 hover:bg-[#5cf091] ${FOCUS}`}
          >
            <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary strip                                                      */
/* ------------------------------------------------------------------ */

/**
 * Stat layout: below xl the countdown gets its own full row and the other three share the next;
 * from xl all four sit in one row, the countdown column wider so "7 days:05h:09min" never clips.
 */
const DIVIDER = ["col-span-3 xl:col-span-1", "xl:border-l xl:pl-5", "border-l pl-3 xl:pl-5", "border-l pl-3 xl:pl-5"];

function Summary({ plan, now, slots, currentId }: { plan: Plan; now: number; slots: Slot[]; currentId?: string }) {
  const deadline = deadlineOf(plan);
  const left = deadline - now;
  const total = plan.items.reduce((s, a) => s + a.hours, 0);
  const done = plan.items.reduce((s, a) => s + (a.done ? a.hours : 0), 0);
  const perDay = total / plan.days;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Where the plan expects you to be by now, if the work were spread evenly.
  const expected = total * Math.min(1, Math.max(0, (now - plan.startAt) / (deadline - plan.startAt)));
  const gap = done - expected;
  const remainingDays = Math.max(left / DAY, 0);
  const needNow = remainingDays > 0 ? (total - done) / remainingDays : 0;

  const stats: { label: string; value: string; trend?: { up: boolean; text: string }; sub: string; href: string }[] = [
    { label: "Time left", value: formatRemaining(left), sub: left > 0 ? `due ${fmtDate(deadline)}` : "Deadline has passed", href: "#order" },
    { label: "Planned", value: fmtH(total), sub: `${plan.items.length} ${plan.items.length === 1 ? "assignment" : "assignments"}`, href: "#order" },
    {
      label: "Completed",
      value: fmtH(done),
      trend: { up: gap >= -0.05, text: `${pct}%` },
      sub: gap >= -0.05 ? "on pace" : `${fmtH(Number((-gap).toFixed(1)))} behind`,
      href: "#breakdown",
    },
    {
      label: "Per day",
      value: fmtH(Number(perDay.toFixed(1))),
      trend: needNow > 0 ? { up: needNow <= perDay + 0.05, text: fmtH(Number(needNow.toFixed(1))) } : undefined,
      sub: needNow > 0 ? "from now on" : `over ${plan.days} ${plan.days === 1 ? "day" : "days"}`,
      href: "#daily",
    },
  ];

  return (
    <section id="overview" aria-label="Summary" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <dl className="grid grid-cols-3 gap-y-6 xl:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]">
        {stats.map((s, i) => (
          <div key={s.label} className={`min-w-0 border-[#f1e2d0] pr-3 ${DIVIDER[i]}`}>
            <div className="flex items-start justify-between gap-2">
              <dt className="truncate text-sm font-medium text-slate-600">{s.label}</dt>
              <a href={s.href} aria-label={`Go to details for ${s.label.toLowerCase()}`} className={`${ICON_BTN} -mt-1 !h-7 !w-7 max-sm:!hidden`}>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="truncate text-xl font-bold tabular-nums tracking-tight text-[#3b0a45] sm:text-[1.65rem]">{s.value}</span>
              <span className="flex min-w-0 items-center gap-1 text-xs text-[#b58a68]">
                {s.trend ? (
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${s.trend.up ? "text-green-600" : "text-orange-600"}`}>
                    {s.trend.up ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />}
                    {s.trend.text}
                  </span>
                ) : null}
                <span className="truncate">{s.sub}</span>
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {/* One segment per assignment, in schedule order; a ringed dot closes each finished or active block. */}
      <div className="mt-7 flex h-3 items-center gap-1.5" role="img" aria-label="Assignments in schedule order, coloured by status">
        {slots.map((s) => {
          const st = STATUS[statusOf(s, now, currentId)];
          return (
            <div key={s.id} className={`relative h-full rounded-full ${st.fill}`} style={{ flexGrow: s.share, flexBasis: 0 }}>
              {st.ring ? (
                <span className={`absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white ring-4 ${st.ring}`} />
              ) : null}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-[#9c6a45]">
        {(Object.keys(STATUS) as Status[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS[k].dot}`} />
            {STATUS[k].label}
          </li>
        ))}
      </ul>

      {perDay > 24 ? (
        <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          This is more work than there are hours before the deadline. Cut scope or ask for an extension.
        </p>
      ) : perDay > 8 ? (
        <p className="mt-5 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">More than 8 hours a day. This plan is tight.</p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Assignment colours (same in the bar chart, the pie and the list)   */
/* ------------------------------------------------------------------ */

const PALETTE = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#eab308", "#06b6d4", "#64748b"];
const colourOf = (order: number) => PALETTE[(order - 1) % PALETTE.length];

/* ------------------------------------------------------------------ */
/*  Time devoted over the whole plan                                   */
/* ------------------------------------------------------------------ */

type Bucket = { key: number; label: string; short: string; tip: string; isToday: boolean; isFuture: boolean; parts: number[] };

/**
 * Hours devoted per day across the whole plan (per week when the plan is longer than a month),
 * split by assignment in schedule order.
 */
function devotedBuckets(plan: Plan, slots: Slot[], now: number) {
  const firstDay = midnight(plan.startAt);
  const dayIndex = (t: number) => Math.round((midnight(t) - firstDay) / DAY);
  const totalDays = Math.max(1, dayIndex(deadlineOf(plan) - 1) + 1);
  const size = totalDays > 31 ? 7 : 1;
  const count = Math.ceil(totalDays / size);
  const today = dayIndex(now);

  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
    const d = new Date(firstDay);
    d.setDate(d.getDate() + i * size);
    const first = i * size;
    const last = Math.min(totalDays, first + size) - 1;
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    return {
      key: i,
      label: size === 1 ? weekday : fmtShort(d.getTime()),
      short: size === 1 ? weekday.slice(0, 2) : String(d.getDate()),
      tip: size === 1 ? fmtDay(d.getTime()) : `Week of ${fmtShort(d.getTime())}`,
      isToday: today >= first && today <= last,
      isFuture: first > today,
      parts: slots.map(() => 0),
    };
  });

  slots.forEach((s, si) => {
    for (const e of timeEntries(s)) {
      const b = Math.min(count - 1, Math.max(0, Math.floor(dayIndex(e.at) / size)));
      buckets[b].parts[si] += e.hours;
    }
  });

  // Consecutive days (or weeks) with study time, ending today or the one before.
  const sums = buckets.map((b) => b.parts.reduce((x, y) => x + y, 0));
  const t = buckets.findIndex((b) => b.isToday);
  let streak = 0;
  if (t >= 0) for (let i = sums[t] > 0 ? t : t - 1; i >= 0 && sums[i] > 0; i--) streak++;

  return { buckets, sums, size, streak };
}

function logTime(plan: Plan, id: string, hours: number) {
  savePlan({
    ...plan,
    items: plan.items.map((a) => (a.id === id ? { ...a, logs: [...(a.logs ?? []), { at: Date.now(), hours }] } : a)),
  });
}

function LogTimeForm({ plan, slots, currentId }: { plan: Plan; slots: Slot[]; currentId?: string }) {
  const open = slots.filter((s) => !s.done);
  const [id, setId] = useState(currentId ?? open[0]?.id ?? "");
  const [hours, setHours] = useState("1");
  const [msg, setMsg] = useState("");
  const chosen = open.find((s) => s.id === id) ?? open[0];

  if (!chosen) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      setMsg("Enter between 0.25 and 24 hours.");
      return;
    }
    logTime(plan, chosen.id, h);
    setMsg(`Logged ${fmtH(h)} on ${chosen.name}.`);
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl bg-[#fff0e1] p-2 pl-4 ring-1 ring-[#f0a868]/40">
      <label htmlFor="log-what" className="w-full pt-1 text-sm font-semibold text-slate-700 sm:w-auto sm:pt-0">
        Log study time
      </label>
      <select
        id="log-what"
        value={chosen.id}
        onChange={(e) => setId(e.target.value)}
        className={`${INPUT} min-w-0 flex-1 bg-white py-2 sm:max-w-[16rem]`}
      >
        {open.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        inputMode="decimal"
        min="0.25"
        max="24"
        step="0.25"
        aria-label="Hours studied"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className={`${INPUT} w-20 bg-white py-2 tabular-nums`}
      />
      <span className="text-sm text-[#9c6a45]">h</span>
      <button type="submit" className={`${BTN_DARK} py-2`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Log
      </button>
      {msg ? (
        <p role="status" className="w-full px-1 text-xs font-medium text-[#9c6a45]">
          {msg}
        </p>
      ) : null}
    </form>
  );
}

function DevotedChart({ plan, now, slots, currentId }: { plan: Plan; now: number; slots: Slot[]; currentId?: string }) {
  const { buckets, sums, size, streak } = devotedBuckets(plan, slots, now);
  const total = plan.items.reduce((s, a) => s + a.hours, 0);
  const devoted = sums.reduce((a, b) => a + b, 0);
  const target = (total / plan.days) * size;
  const top = Math.max(1, Math.ceil(Math.max(target, ...sums) * 1.15));
  const ticks = [4, 3, 2, 1, 0].map((i) => (top * i) / 4);
  const [active, setActive] = useState<number | null>(null);
  const todayKey = buckets.find((b) => b.isToday)?.key ?? null;
  const shown = active ?? todayKey;
  const dense = buckets.length > 16;
  // With many bars, label every few so the axis stays readable.
  const every = buckets.length > 24 ? 4 : buckets.length > 16 ? 2 : 1;
  const unit = size === 1 ? "day" : "week";
  const gap = dense ? "gap-0.5 sm:gap-1" : "gap-1.5 sm:gap-3";

  return (
    <section id="daily" aria-labelledby="daily-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="daily-title" className="text-lg font-bold tracking-tight text-[#6b3a1f]">
            Time devoted, whole plan
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-[#9c6a45]">
            <span className="font-semibold text-[#3b0a45]">
              {fmtH(Number(devoted.toFixed(1)))} of {fmtH(total)}
            </span>
            devoted
            {streak > 0 ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-green-600">
                <ArrowUp className="h-3 w-3" aria-hidden="true" />
                {streak}-{unit} streak
              </span>
            ) : null}
            <span className="text-[#b58a68]">
              · target {fmtH(Number(target.toFixed(1)))} a {unit}
            </span>
          </p>
        </div>
        <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-900/[0.07]">
          {fmtShort(plan.startAt)} – {fmtShort(deadlineOf(plan))}
        </span>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-[#9c6a45]">
        {slots.map((s) => (
          <li key={s.id} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: colourOf(s.order) }} />
            <span className="max-w-[10rem] truncate">{s.name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
        <div className="relative h-72 sm:h-80" aria-hidden="true">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute right-0 -translate-y-1/2 text-[11px] font-medium tabular-nums text-[#b58a68]"
              style={{ top: `${(i / 4) * 100}%` }}
            >
              {fmtH(Number(t.toFixed(1)))}
            </span>
          ))}
        </div>

        <div className="relative h-72 sm:h-80">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 z-10 border-t border-dashed border-slate-400/60"
            style={{ bottom: `${(target / top) * 100}%` }}
          />
          <ol className={`flex h-full items-stretch ${gap}`}>
            {buckets.map((b, i) => {
              const sum = sums[i];
              const h = Math.max((sum / top) * 100, 6);
              const label = `${b.tip}: ${fmtH(Number(sum.toFixed(1)))} devoted${b.isToday ? " (today)" : ""}`;
              return (
                <li
                  key={b.key}
                  tabIndex={0}
                  aria-label={label}
                  onMouseEnter={() => setActive(b.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(b.key)}
                  onBlur={() => setActive(null)}
                  className={`relative min-w-0 flex-1 rounded-full ${FOCUS}`}
                >
                  <div
                    className={`bg-hatch absolute inset-0 rounded-full ${b.isFuture ? "bg-slate-50" : "bg-slate-100/60"} ${b.isToday ? "ring-2 ring-slate-900/10" : ""}`}
                  />
                  {sum > 0 ? (
                    <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse overflow-hidden rounded-full" style={{ height: `${h}%` }}>
                      {b.parts.map((p, si) =>
                        p > 0 ? (
                          <div key={si} className="min-h-0 border-t border-white/60" style={{ flexGrow: p, background: colourOf(slots[si].order) }} />
                        ) : null,
                      )}
                    </div>
                  ) : null}
                  {shown === b.key ? (
                    <div
                      role="tooltip"
                      className={`absolute z-20 mb-2 w-max max-w-[14rem] rounded-xl bg-white px-3 py-2 text-xs shadow-[0_10px_28px_rgba(16,24,40,0.14)] ring-1 ring-slate-900/5 ${
                        i > buckets.length - 4 ? "right-0" : i < 3 ? "left-0" : "left-1/2 -translate-x-1/2"
                      }`}
                      style={{ bottom: `${sum > 0 ? h : 6}%` }}
                    >
                      <p className="font-medium text-[#b58a68]">
                        {b.tip}
                        {b.isToday ? " · today" : ""}
                      </p>
                      <p className="mt-0.5 font-semibold text-[#3b0a45]">{fmtH(Number(sum.toFixed(1)))} devoted</p>
                      {b.parts.map((p, si) =>
                        p > 0 ? (
                          <p key={si} className="mt-0.5 flex items-center gap-1.5 text-slate-600">
                            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colourOf(slots[si].order) }} />
                            <span className="truncate">{slots[si].name}</span>
                            <span className="ml-auto pl-2 font-semibold tabular-nums text-[#3b0a45]">{fmtH(Number(p.toFixed(1)))}</span>
                          </p>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div />
        <ol className={`mt-3 flex ${gap}`} aria-hidden="true">
          {buckets.map((b, i) => (
            <li key={b.key} className="min-w-0 flex-1 text-center">
              <span className={`block text-[11px] ${b.isToday ? "font-bold text-[#3b0a45]" : "font-medium text-[#b58a68]"}`}>
                {i % every === 0 || b.isToday ? (
                  <>
                    <span className="sm:hidden">{b.short}</span>
                    <span className="hidden sm:inline">{b.label}</span>
                  </>
                ) : (
                  " "
                )}
              </span>
              {b.isToday ? <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-[#5b1065]" /> : null}
            </li>
          ))}
        </ol>
      </div>

      <LogTimeForm key={currentId} plan={plan} slots={slots} currentId={currentId} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie: how the available time is shared out to finish on time       */
/* ------------------------------------------------------------------ */

function TimePie({ plan, now, slots }: { plan: Plan; now: number; slots: Slot[] }) {
  const [hover, setHover] = useState<string | null>(null);

  // Slices follow the schedule: each assignment's block is its share of the whole window.
  const slices = slots.map((s, i) => {
    const before = slots.slice(0, i).reduce((sum, x) => sum + x.share, 0);
    const a0 = -Math.PI / 2 + before * Math.PI * 2;
    return { s, a0, a1: a0 + s.share * Math.PI * 2 };
  });
  const point = (r: number, a: number) => `${100 + Math.cos(a) * r} ${100 + Math.sin(a) * r}`;
  const arc = (a0: number, a1: number, r: number) =>
    a1 - a0 >= Math.PI * 2 - 1e-6
      ? `M 100 ${100 - r} A ${r} ${r} 0 1 1 99.99 ${100 - r} Z`
      : `M 100 100 L ${point(r, a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${point(r, a1)} Z`;
  const focus = slots.find((s) => s.id === hover);

  return (
    <section id="pie" aria-labelledby="pie-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <h2 id="pie-title" className={CARD_TITLE}>
        Time plan to finish on time
      </h2>
      <p className="mt-1 text-xs font-medium text-[#9c6a45]">
        How your {plan.days} {plan.days === 1 ? "day is" : "days are"} shared out, largest first
      </p>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[13rem]">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={slots.map((s) => `${s.name}: ${Math.round(s.share * 100)}% of the time`).join(", ")}
        >
          {slices.map(({ s, a0, a1 }) => {
            const out = hover === s.id ? 6 : 0;
            const mid = (a0 + a1) / 2;
            return (
              <path
                key={s.id}
                d={arc(a0, a1, 92)}
                fill={colourOf(s.order)}
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
                opacity={hover && hover !== s.id ? 0.35 : 1}
                transform={`translate(${Math.cos(mid) * out} ${Math.sin(mid) * out})`}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                className="transition-[opacity,transform] duration-150"
              />
            );
          })}
          <circle cx="100" cy="100" r="50" fill="white" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-14 text-center">
          <span className="text-xl font-bold tabular-nums text-[#3b0a45]">{focus ? `${Math.round(focus.share * 100)}%` : `${plan.days}d`}</span>
          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[#9c6a45]">{focus ? focus.name : "to finish everything"}</span>
        </div>
      </div>

      <ul className="mt-5 space-y-1">
        {slots.map((s) => {
          const left = s.done ? 0 : Math.max(0, s.hours - devotedHours(s));
          const blockLeft = Math.max(0, s.end - Math.max(now, s.start));
          const perDay = blockLeft > 0 ? left / Math.max(blockLeft / DAY, 1) : left;
          return (
            <li
              key={s.id}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors duration-150 ${hover === s.id ? "bg-slate-50" : ""}`}
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colourOf(s.order) }} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-semibold ${s.done ? "text-[#b58a68] line-through" : "text-slate-800"}`}>{s.name}</span>
                <span className="block truncate text-[11px] text-[#b58a68]">
                  {formatSpan(s.end - s.start)} · {fmtShort(s.start)} → {fmtShort(s.end)}
                  {!s.done && left > 0 ? ` · ${fmtH(Number(perDay.toFixed(1)))}/day` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-[#3b0a45]">{Math.round(s.share * 100)}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Completion ring                                                    */
/* ------------------------------------------------------------------ */

const TICKS = 72;

function CompletionRing({ plan, slots, currentId }: { plan: Plan; slots: Slot[]; currentId?: string }) {
  const total = plan.items.reduce((s, a) => s + a.hours, 0) || 1;
  const done = slots.filter((s) => s.done).reduce((s, a) => s + a.hours, 0);
  const active = slots.filter((s) => !s.done && s.id === currentId).reduce((s, a) => s + a.hours, 0);
  const parts = [
    { key: "done", label: "Done", hours: done, stroke: "stroke-green-500", dot: "bg-green-500" },
    { key: "now", label: "In progress", hours: active, stroke: "stroke-blue-500", dot: "bg-blue-500" },
    { key: "left", label: "Not started", hours: total - done - active, stroke: "stroke-orange-400", dot: "bg-orange-400" },
  ];

  // Hand out the ticks in proportion to the hours, in order: done, in progress, not started.
  let cursor = 0;
  const bounds = parts.map((p) => {
    const start = cursor;
    cursor += Math.round((p.hours / total) * TICKS);
    return { ...p, start, end: Math.min(cursor, TICKS) };
  });
  const colourOf = (i: number) => bounds.find((b) => i >= b.start && i < b.end)?.stroke ?? "stroke-orange-400";

  return (
    <section id="breakdown" aria-labelledby="ring-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <h2 id="ring-title" className={CARD_TITLE}>
        Work breakdown
      </h2>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[13.5rem]">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`${Math.round((done / total) * 100)}% of the work is done`}>
          {Array.from({ length: TICKS }, (_, i) => {
            const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
            const r1 = 68;
            const r2 = 96;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * r1}
                y1={100 + Math.sin(a) * r1}
                x2={100 + Math.cos(a) * r2}
                y2={100 + Math.sin(a) * r2}
                strokeWidth="2.2"
                strokeLinecap="round"
                className={colourOf(i)}
              />
            );
          })}
          <circle cx="100" cy="100" r="58" className="fill-white stroke-slate-100" strokeWidth="1" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-[#3b0a45]">{fmtH(done)}</span>
          <span className="text-xs font-medium text-[#9c6a45]">of {fmtH(total)} done</span>
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.key} className="min-w-0">
            <span className="block text-xl font-bold tabular-nums text-[#3b0a45]">{Math.round((p.hours / total) * 100)}%</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#9c6a45]">
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`} />
              <span className="truncate">{p.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  "Do now" card                                                      */
/* ------------------------------------------------------------------ */

function DoNow({ plan, now, slots, currentId }: { plan: Plan; now: number; slots: Slot[]; currentId?: string }) {
  const current = slots.find((s) => s.id === currentId);
  const upcoming = slots.filter((s) => !s.done && s.id !== currentId).slice(0, 2);

  return (
    <section aria-labelledby="now-title" className={`${CARD} p-2`}>
      {/* Illustration: the next blocks as faded bubbles, the current one in front. */}
      <div aria-hidden="true" className="relative h-40 overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-fuchsia-200 via-pink-100 to-amber-100">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/50 blur-2xl" />
        {(upcoming.length ? upcoming : [{ id: "a", name: "Nothing else queued" }]).map((u, i) => (
          <span
            key={u.id}
            className="absolute right-[-1rem] max-w-[75%] truncate rounded-full bg-white/60 px-4 py-1.5 text-xs font-medium text-[#b58a68] shadow-sm"
            style={{ top: `${14 + i * 30}px`, right: `${-16 + i * 22}px` }}
          >
            Next: {u.name}
          </span>
        ))}
        <span className="absolute bottom-7 left-10 right-4 flex items-center gap-2 truncate rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(192,38,211,0.2)] ring-1 ring-fuchsia-200">
          <Sparkles className="h-4 w-4 shrink-0 text-fuchsia-600" />
          <span className="truncate">{current ? `Working on ${current.name}…` : "All caught up"}</span>
        </span>
        <Send className="absolute bottom-3 left-4 h-4 w-4 -rotate-12 text-fuchsia-500" />
      </div>

      <div className="px-3 pb-3 pt-4">
        <h2 id="now-title" className="w-fit rounded-full bg-pink-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-pink-800">
          {current ? "Do now" : "All done"}
        </h2>
        {current ? (
          <>
            <p className="mt-1 text-lg font-bold tracking-tight text-[#6b3a1f] [overflow-wrap:anywhere]">{current.name}</p>
            <p className="mt-1 text-sm text-[#9c6a45]">
              {fmtH(current.hours)} of work · block ends {fmtDate(current.end)}
            </p>
            <p className="mt-3 text-sm font-semibold tabular-nums text-slate-700">
              {now < current.end ? `${formatSpan(current.end - now)} left in this block` : "This block is overdue"}
            </p>
            <button type="button" onClick={() => toggleDone(plan, current.id)} className={`${BTN_DARK} mt-4 w-full`}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark as done
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Every assignment is ticked off. Add more when the next batch arrives.</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Assignment list                                                    */
/* ------------------------------------------------------------------ */

function Assignments({ plan, now, slots, currentId }: { plan: Plan; now: number; slots: Slot[]; currentId?: string }) {
  return (
    <section id="order" aria-labelledby="list-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <h2 id="list-title" className={CARD_TITLE}>
        Order of work
      </h2>
      <p className="mt-1 text-xs font-medium text-[#9c6a45]">Largest first. Tick each one off as you finish it.</p>
      <ol className="mt-3 divide-y divide-[#f1e2d0]">
        {slots.map((s) => {
          const st = STATUS[statusOf(s, now, currentId)];
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => toggleDone(plan, s.id)}
                aria-pressed={s.done}
                aria-label={s.done ? `Mark ${s.name} as not done` : `Mark ${s.name} as done`}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${FOCUS} ${
                  s.done ? "border-green-500 bg-green-500 text-white" : "border-slate-200 text-transparent hover:border-green-500 hover:text-green-500"
                }`}
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${s.done ? "text-[#b58a68] line-through" : "text-[#3b0a45]"}`}>
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: colourOf(s.order) }} />
                  <span className="truncate">{s.name}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-[#b58a68]" title={`${fmtDate(s.start)} → ${fmtDate(s.end)}`}>
                  {fmtH(Number(devotedHours(s).toFixed(1)))} of {fmtH(s.hours)} devoted · {fmtDay(s.start)} → {fmtDay(s.end)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.pill}`}>{st.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress gauge and recent activity                                 */
/* ------------------------------------------------------------------ */

function Activity({ plan, now }: { plan: Plan; now: number }) {
  const count = plan.items.length;
  const doneCount = plan.items.filter((a) => a.done).length;
  const frac = count ? doneCount / count : 0;
  const recent = plan.items
    .filter((a) => a.done && a.doneAt)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
    .slice(0, 3);

  // Half-circle gauge; the arc length is π·r, filled in proportion to finished assignments.
  const r = 80;
  const len = Math.PI * r;

  return (
    <section aria-labelledby="activity-title" className={`${CARD} p-5 sm:p-6`}>
      <h2 id="activity-title" className={CARD_TITLE}>
        Recent activity
      </h2>
      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#9c6a45]">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue-500" />
        Completed
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#3b0a45]">
        {doneCount}
        <span className="text-lg font-semibold text-[#b58a68]">/{count}</span>
      </p>
      <svg viewBox="0 0 200 108" className="mx-auto mt-2 w-full max-w-[15rem]" role="img" aria-label={`${doneCount} of ${count} assignments completed`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="16" strokeLinecap="round" className="stroke-slate-100" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          className="stroke-blue-500"
          strokeDasharray={`${len * frac} ${len}`}
          opacity={frac > 0 ? 1 : 0}
        />
        <text x="100" y="96" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-slate-900">
          {Math.round(frac * 100)}%
        </text>
      </svg>
      <ul className="mt-4 space-y-2.5">
        {recent.length ? (
          recent.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-50 text-green-600">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{a.name}</span>
              <span className="shrink-0 text-xs text-[#b58a68]">{ago(now - (a.doneAt ?? now))}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-[#9c6a45]">Nothing ticked off yet.</li>
        )}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

type Row = { id: string; name: string; hours: string; done: boolean };

const blankRow = (): Row => ({ id: newId(), name: "", hours: "", done: false });

function PlanForm({ plan, onClose }: { plan: Plan | null; onClose?: () => void }) {
  const [days, setDays] = useState(plan ? String(plan.days) : "7");
  const [rows, setRows] = useState<Row[]>(
    plan
      ? plan.items.map((a) => ({ id: a.id, name: a.name, hours: String(a.hours), done: a.done }))
      : [blankRow(), blankRow(), blankRow()],
  );
  const [error, setError] = useState("");

  const patch = (id: string, change: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = Number(days);
    if (!Number.isFinite(d) || d <= 0 || d > 365) {
      setError("Enter the time you have as a number of days between 1 and 365.");
      return;
    }
    const filled = rows.filter((r) => r.name.trim() || r.hours.trim());
    if (filled.length === 0) {
      setError("Add at least one assignment.");
      return;
    }
    for (const r of filled) {
      const h = Number(r.hours);
      if (!r.name.trim()) {
        setError("Every assignment needs a name.");
        return;
      }
      if (!Number.isFinite(h) || h <= 0) {
        setError(`Enter how many hours "${r.name.trim()}" will take.`);
        return;
      }
    }
    setError("");
    savePlan({
      startAt: plan?.startAt ?? Date.now(),
      days: d,
      items: filled.map((r) => ({
        id: r.id,
        name: r.name.trim(),
        hours: Number(r.hours),
        done: r.done,
        doneAt: r.done ? plan?.items.find((a) => a.id === r.id)?.doneAt : undefined,
        logs: plan?.items.find((a) => a.id === r.id)?.logs,
      })),
    });
    onClose?.();
  }

  return (
    <form id="plan-form" onSubmit={submit} aria-labelledby="form-title" className={`${CARD} scroll-mt-6 p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="form-title" className="text-lg font-bold tracking-tight text-[#6b3a1f]">
            {plan ? "Edit assignments" : "Add your assignments"}
          </h2>
          <p className="mt-1 text-xs font-medium text-[#9c6a45]">All of them are due when your time runs out.</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close editor" className={ICON_BTN}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        <label htmlFor="days" className="text-sm font-semibold text-slate-700">
          Time you have (days)
        </label>
        <input
          id="days"
          type="number"
          inputMode="decimal"
          min="1"
          max="365"
          step="any"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className={`${INPUT} mt-2 block w-28 tabular-nums`}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-700">Assignment and hours of work</legend>
        <ul className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2">
              <input
                type="text"
                aria-label={`Assignment ${i + 1} name`}
                placeholder={`Assignment ${i + 1}`}
                value={r.name}
                onChange={(e) => patch(r.id, { name: e.target.value })}
                className={`${INPUT} min-w-0 flex-1`}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                aria-label={`Assignment ${i + 1} hours of work`}
                placeholder="hrs"
                value={r.hours}
                onChange={(e) => patch(r.id, { hours: e.target.value })}
                className={`${INPUT} w-20 shrink-0 tabular-nums`}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))}
                disabled={rows.length === 1}
                aria-label={`Remove assignment ${i + 1}`}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#b58a68] transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 ${FOCUS}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, blankRow()])}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-fuchsia-700 transition-colors duration-150 hover:text-[#5b1065] ${FOCUS}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add assignment
        </button>
      </fieldset>

      {error ? (
        <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className={BTN_DARK}>
          {plan ? "Update schedule" : "Build schedule and start timer"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state preview                                                */
/* ------------------------------------------------------------------ */

function EmptyPreview() {
  const bars: [number, number][] = [
    [38, 0], [55, 0], [30, 14], [62, 0], [44, 0], [70, 0], [36, 18], [58, 0], [26, 30], [64, 0],
  ];
  return (
    <section aria-label="Dashboard preview" className={`${CARD} flex flex-col p-5 sm:p-6`}>
      <h2 className="text-lg font-bold tracking-tight text-[#6b3a1f]">Your dashboard</h2>
      <p className="mt-1 text-xs font-medium text-[#9c6a45]">
        Add your assignments and SemOS fills this in: countdown, hours per day, work breakdown and what to do next.
      </p>
      <div aria-hidden="true" className="mt-8 flex h-64 items-end gap-2.5">
        {bars.map(([blue, orange], i) => (
          <div key={i} className="bg-hatch relative h-full flex-1 rounded-full bg-slate-50">
            <div className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-full" style={{ height: `${blue + orange}%` }}>
              {orange ? <div className="bg-orange-300" style={{ flexGrow: orange }} /> : null}
              <div className={i % 3 === 1 ? "bg-orange-300" : "bg-blue-300"} style={{ flexGrow: blue }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page body                                                          */
/* ------------------------------------------------------------------ */

export default function RoadmapPlanner() {
  const plan = usePlan();
  const clock = useNow();
  const ready = plan !== undefined && clock !== 0;
  // Whether the edit form is open above the dashboard (closed by default once a plan exists).
  const [editing, setEditing] = useState(false);

  const now = plan ? Math.max(clock, plan.startAt) : clock;
  const slots = plan ? buildSchedule(plan) : [];
  const currentId = slots.find((s) => !s.done)?.id;

  const openEditor = () => {
    setEditing(true);
    requestAnimationFrame(() => document.getElementById("plan-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <TopBar plan={plan} now={clock} />
      {ready && plan ? <SideRail onEdit={openEditor} /> : null}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] text-[#3b0a45] sm:text-[3.25rem] sm:leading-none">
              Assignment Roadmap
            </h1>
            <p className="mt-3 max-w-xl text-[15px] font-medium text-[#9c6a45]">
              Real-time countdown, schedule and daily progress for everything that is due.
            </p>
          </div>
          {ready && plan ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/[0.06]">
                <CalendarDays className="h-4 w-4 text-[#b58a68]" aria-hidden="true" />
                {fmtShort(plan.startAt)} – {fmtShort(deadlineOf(plan))}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear this schedule and stop the timer?")) savePlan(null);
                }}
                className={BTN_LIGHT}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear plan
              </button>
              <button
                type="button"
                onClick={() => (editing ? setEditing(false) : openEditor())}
                aria-expanded={editing}
                aria-controls="plan-form"
                className={BTN_DARK}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {editing ? "Close editor" : "Edit assignments"}
              </button>
            </div>
          ) : null}
        </div>

        {!ready ? (
          <p className="mt-10 text-sm text-[#b58a68]">Loading…</p>
        ) : plan ? (
          <>
            {editing ? (
              <div className="mt-8">
                <PlanForm key={plan.startAt + ":" + plan.items.length} plan={plan} onClose={() => setEditing(false)} />
              </div>
            ) : null}

            <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="min-w-0 space-y-5">
                <Summary plan={plan} now={now} slots={slots} currentId={currentId} />
                <DevotedChart plan={plan} now={now} slots={slots} currentId={currentId} />
              </div>
              <div className="min-w-0 space-y-5">
                <DoNow plan={plan} now={now} slots={slots} currentId={currentId} />
                <CompletionRing plan={plan} slots={slots} currentId={currentId} />
              </div>
            </div>

            <div className="mt-5 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)]">
              <TimePie plan={plan} now={now} slots={slots} />
              <div className="min-w-0 md:order-last md:col-span-2 xl:order-none xl:col-span-1">
                <Assignments plan={plan} now={now} slots={slots} currentId={currentId} />
              </div>
              <Activity plan={plan} now={now} />
            </div>
          </>
        ) : (
          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <PlanForm key="new" plan={null} />
            <EmptyPreview />
          </div>
        )}

        <p className="mt-8 text-xs font-medium text-[#b58a68]">Saved in this browser only. No account needed.</p>
      </main>
    </>
  );
}
