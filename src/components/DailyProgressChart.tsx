"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Flame } from "lucide-react";
import type { Plan } from "@/lib/plan";
import { can3D, useGraphicsSupport } from "@/lib/webgl";
import { CARD, LABEL } from "./ui";

// Three.js only downloads when the 3D view is actually shown.
const ProgressChart3D = dynamic(() => import("./ProgressChart3D"), { ssr: false });

const VIEW_KEY = "semos.chartView";

const DAY = 86_400_000;
const MAX_BARS = 7;

type Bar = { index: number; weekday: string; date: string; hours: number; isToday: boolean; isFuture: boolean };

const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

/**
 * Hours of work completed on each day of the plan, from when assignments were
 * ticked off. Shows the whole plan when it is a week or shorter, otherwise the
 * seven days around today.
 */
function buildBars(plan: Plan, now: number) {
  // Calendar days in the viewer's time zone, from the day the plan started to the day it is due.
  const midnight = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const firstDay = midnight(plan.startAt);
  const deadline = plan.startAt + plan.days * DAY;
  const daysBetween = (t: number) => Math.round((midnight(t) - firstDay) / DAY);
  const totalDays = Math.max(1, daysBetween(deadline - 1) + 1);
  const dayOf = (t: number) => Math.min(totalDays - 1, Math.max(0, daysBetween(t)));
  const today = dayOf(now);

  const done = new Array<number>(totalDays).fill(0);
  for (const item of plan.items) {
    if (item.done && item.doneAt) done[dayOf(item.doneAt)] += item.hours;
  }

  const first = totalDays <= MAX_BARS ? 0 : Math.max(0, Math.min(today - 3, totalDays - MAX_BARS));
  const last = Math.min(totalDays, first + MAX_BARS);
  const bars: Bar[] = [];
  for (let i = first; i < last; i++) {
    const day = new Date(firstDay);
    day.setDate(day.getDate() + i);
    bars.push({
      index: i,
      weekday: day.toLocaleDateString(undefined, { weekday: "short" }),
      date: day.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      hours: done[i],
      isToday: i === today,
      isFuture: i > today,
    });
  }

  // Consecutive days with work done, ending today (or yesterday, if nothing is done yet today).
  let streak = 0;
  for (let i = done[today] > 0 ? today : today - 1; i >= 0 && done[i] > 0; i--) streak++;

  return { bars, streak, totalDays };
}

function readView(): "3d" | "2d" {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "2d" ? "2d" : "3d";
  } catch {
    return "3d";
  }
}

export default function DailyProgressChart({ plan, now }: { plan: Plan; now: number }) {
  const { bars, streak, totalDays } = buildBars(plan, now);
  const support = useGraphicsSupport();
  const supports3D = can3D(support);
  const [view, setView] = useState<"3d" | "2d">(readView);
  const show3D = supports3D && view === "3d";
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  // Pause the 3D scene while it is scrolled out of view.
  useEffect(() => {
    if (!show3D || !box.current) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [show3D]);

  const choose = (next: "3d" | "2d") => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  };
  const totalHours = plan.items.reduce((s, a) => s + a.hours, 0);
  const doneHours = plan.items.reduce((s, a) => s + (a.done ? a.hours : 0), 0);
  const target = totalHours / plan.days;
  const scale = Math.max(target, ...bars.map((b) => b.hours), 1) * 1.15;
  const nothingLogged = !plan.items.some((a) => a.done && a.doneAt);

  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
        <h2 className={LABEL}>Daily progress</h2>
        <div className="flex items-center gap-2">
        {supports3D ? (
          <div role="radiogroup" aria-label="Chart view" className="flex rounded-full border border-slate-700 bg-slate-900 p-0.5">
            {(["3d", "2d"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => choose(v)}
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  view === v ? "bg-slate-700 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : null}
        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-300">
          {bars.length === totalDays ? "Whole plan" : "This week"}
        </span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-5">
        {show3D ? (
          <div
            ref={box}
            role="img"
            aria-label={`Hours completed per day: ${bars
            .map((bar) => `${bar.weekday} ${bar.date} ${fmtHours(bar.hours)}${bar.isToday ? " (today)" : ""}`)
            .join(", ")}. Daily target ${fmtHours(Math.round(target * 10) / 10)}.`}
            className="relative h-64 border-b border-slate-800 sm:h-72"
          >
            {!ready ? (
              <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-slate-500">Loading 3D chart…</p>
            ) : null}
            <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
              <ProgressChart3D
                bars={bars.map((bar) => ({
                  key: bar.index,
                  label: bar.isToday ? "Today" : bar.weekday,
                  value: fmtHours(bar.hours),
                  hours: bar.hours,
                  isToday: bar.isToday,
                  isFuture: bar.isFuture,
                }))}
                target={target}
                scale={scale}
                targetLabel={`target ${fmtHours(Math.round(target * 10) / 10)}`}
                active={visible}
                lowPower={support?.lowPower}
                onReady={() => setReady(true)}
              />
            </div>
          </div>
        ) : (
          <>
          {/* Chart */}
          <div
            role="img"
            aria-label={`Hours completed per day: ${bars
              .map((bar) => `${bar.weekday} ${bar.date} ${fmtHours(bar.hours)}${bar.isToday ? " (today)" : ""}`)
              .join(", ")}. Daily target ${fmtHours(Math.round(target * 10) / 10)}.`}
            className="border-b border-slate-800 pb-2"
          >
            {/* Plot area: bar heights and the target line share this box */}
            <div className="relative flex h-40 items-end gap-3 px-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-emerald-400/50"
                style={{ bottom: `${(target / scale) * 100}%` }}
              >
                <span className="absolute -top-4 right-0 font-mono text-[10px] text-emerald-400/80">
                  target {fmtHours(Math.round(target * 10) / 10)}
                </span>
              </div>

              {bars.map((bar) => (
                <div key={bar.index} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div
                    title={`${bar.weekday} ${bar.date}: ${fmtHours(bar.hours)} done`}
                    className={`relative w-full rounded-t-xl transition-all duration-500 ${
                      bar.isToday
                        ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        : bar.isFuture
                          ? "border border-dashed border-slate-700 bg-slate-900/40"
                          : "bg-slate-700 hover:bg-slate-600"
                    }`}
                    style={{ height: bar.hours > 0 ? `${(bar.hours / scale) * 100}%` : bar.isFuture ? "12%" : "4px" }}
                  >
                    {bar.hours > 0 ? (
                      <span
                        className={`absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] ${
                          bar.isToday ? "text-amber-300" : "text-slate-400"
                        }`}
                      >
                        {fmtHours(bar.hours)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Day labels */}
            <div className="mt-2 flex gap-3 px-1">
              {bars.map((bar) => (
                <span
                  key={bar.index}
                  title={bar.date}
                  className={`min-w-0 flex-1 truncate text-center text-[11px] font-medium ${bar.isToday ? "text-amber-300" : "text-slate-400"}`}
                >
                  {bar.isToday ? "Today" : bar.weekday}
                </span>
              ))}
            </div>
          </div>

          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 text-xs">
          <div className={`flex items-center gap-2 font-medium ${streak ? "text-emerald-400" : "text-slate-500"}`}>
            <Flame className={`h-4 w-4 ${streak ? "text-orange-400" : "text-slate-600"}`} aria-hidden="true" />
            {streak ? `${streak}-day streak` : "No streak yet"}
          </div>
          <span className="font-mono text-slate-400">
            {fmtHours(doneHours)} of {fmtHours(totalHours)} done
          </span>
        </div>

        {nothingLogged ? (
          <p className="mt-3 text-xs text-slate-500">Tick an assignment below when you finish it to log the day&apos;s work.</p>
        ) : null}
      </div>
    </section>
  );
}
