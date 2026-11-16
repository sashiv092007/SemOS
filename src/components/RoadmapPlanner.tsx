"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  buildSchedule,
  deadlineOf,
  formatRemaining,
  formatSpan,
  newId,
  savePlan,
  useNow,
  usePlan,
  type Plan,
  type Slot,
} from "@/lib/plan";

type Row = { id: string; name: string; hours: string; done: boolean };

const blankRow = (): Row => ({ id: newId(), name: "", hours: "", done: false });

const INPUT =
  "border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none";
const LABEL = "font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400";

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/* ---------- Form ---------- */

function PlanForm({ plan }: { plan: Plan | null }) {
  const [days, setDays] = useState(plan ? String(plan.days) : "7");
  const [rows, setRows] = useState<Row[]>(
    plan
      ? plan.items.map((a) => ({ id: a.id, name: a.name, hours: String(a.hours), done: a.done }))
      : [blankRow(), blankRow(), blankRow()],
  );
  const [error, setError] = useState("");

  const patch = (id: string, change: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));

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
      items: filled.map((r) => ({ id: r.id, name: r.name.trim(), hours: Number(r.hours), done: r.done })),
    });
  }

  return (
    <form onSubmit={submit} className="border border-slate-800 bg-slate-900/40">
      <h2 className={`border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>Your assignments</h2>

      <div className="space-y-5 px-4 py-4">
        <div>
          <label htmlFor="days" className={`block ${LABEL}`}>
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
            className={`${INPUT} mt-2 w-28 font-mono`}
          />
          <p className="mt-1.5 text-xs text-slate-500">All assignments are due when this time runs out.</p>
        </div>

        <fieldset>
          <legend className={LABEL}>Assignment and hours of work</legend>
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
                  className={`${INPUT} w-20 shrink-0 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))}
                  disabled={rows.length === 1}
                  aria-label={`Remove assignment ${i + 1}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-800 text-slate-500 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, blankRow()])}
            className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add assignment
          </button>
        </fieldset>

        {error ? (
          <p role="alert" className="border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {plan ? "Update schedule" : "Build schedule and start timer"}
          </button>
          {plan ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear this schedule and stop the timer?")) savePlan(null);
              }}
              className="border border-slate-800 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
            >
              Clear and start over
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/* ---------- Schedule ---------- */

function statusOf(slot: Slot, now: number, isCurrent: boolean) {
  if (slot.done) return { label: "Done", cls: "border-slate-700 text-slate-400" };
  if (now >= slot.end) return { label: "Overdue", cls: "border-red-400/50 text-red-400" };
  if (isCurrent) return { label: "Do now", cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" };
  return { label: "Up next", cls: "border-slate-700 text-slate-300" };
}

function Schedule({ plan, now: clock }: { plan: Plan; now: number }) {
  // the clock ticks in whole seconds, so it can sit just before the start time
  const now = Math.max(clock, plan.startAt);
  const slots = buildSchedule(plan);
  const currentId = slots.find((s) => !s.done)?.id;
  const deadline = deadlineOf(plan);
  const left = deadline - now;
  const totalHours = plan.items.reduce((s, a) => s + a.hours, 0);
  const perDay = totalHours / plan.days;
  const progress = Math.min(100, Math.max(0, ((now - plan.startAt) / (deadline - plan.startAt)) * 100));

  const toggle = (id: string) =>
    savePlan({ ...plan, items: plan.items.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) });

  return (
    <div className="space-y-4">
      {/* Countdown */}
      <section className="border border-slate-800 bg-slate-900/40">
        <h2 className={`border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>Semester timeline</h2>
        <div className="px-4 py-5">
          <p className="font-mono text-3xl font-semibold tabular-nums text-emerald-400 sm:text-4xl">
            {formatRemaining(left)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {left > 0 ? "remaining" : "The deadline has passed"} · everything is due {fmtDate(deadline)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {totalHours}h of work over {plan.days} {plan.days === 1 ? "day" : "days"} ≈ {perDay.toFixed(1)}h a day
          </p>
          {perDay > 24 ? (
            <p className="mt-3 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              This is more work than there are hours before the deadline. Cut scope or ask for an extension.
            </p>
          ) : perDay > 8 ? (
            <p className="mt-3 border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
              More than 8 hours a day. This plan is tight.
            </p>
          ) : null}
        </div>
      </section>

      {/* Order */}
      <section className="border border-slate-800 bg-slate-900/40">
        <h2 className={`border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>Order of work · largest first</h2>

        {/* Window bar */}
        <div className="px-4 pt-4">
          <div className="relative">
            <div className="flex h-2 gap-px bg-slate-950">
              {slots.map((s) => (
                <div
                  key={s.id}
                  title={`${s.name}: ${formatSpan(s.end - s.start)}`}
                  className={s.done ? "bg-slate-700" : "bg-emerald-400"}
                  style={{ width: `${s.share * 100}%`, opacity: s.done ? 1 : 1 - (s.order - 1) * (0.6 / slots.length) }}
                />
              ))}
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-1 h-4 w-px bg-white"
              style={{ left: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
            <span>Start</span>
            <span>Deadline</span>
          </div>
        </div>

        <ol className="mt-2 divide-y divide-slate-800">
          {slots.map((s) => {
            const st = statusOf(s, now, s.id === currentId);
            return (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-slate-500">
                  {String(s.order).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className={`text-sm font-semibold ${s.done ? "text-slate-500 line-through" : "text-white"}`}>
                      {s.name}
                    </p>
                    <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {s.hours}h of work · {formatSpan(s.end - s.start)} allocated
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {fmtDate(s.start)} → {fmtDate(s.end)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={s.done}
                  aria-label={s.done ? `Mark ${s.name} as not done` : `Mark ${s.name} as done`}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center border transition-colors ${
                    s.done
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : "border-slate-700 text-transparent hover:border-emerald-400 hover:text-emerald-400"
                  }`}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/* ---------- Page body ---------- */

export default function RoadmapPlanner() {
  const plan = usePlan();
  const now = useNow();
  const ready = plan !== undefined && now !== 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">Roadmap</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Schedule your assignments
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Tell SemOS what is due and how long you have. It orders the work largest first, splits your time between
        the assignments, and starts the countdown.
      </p>

      {!ready ? (
        <p className="mt-8 font-mono text-xs text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          {/* key: reset the form when a plan is cleared or first created */}
          <PlanForm key={plan ? plan.startAt : "new"} plan={plan} />
          {plan ? (
            <Schedule plan={plan} now={now} />
          ) : (
            <div className="border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
              Your schedule and countdown appear here once you add assignments.
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-600">Saved in this browser only. No account needed yet.</p>
    </div>
  );
}
