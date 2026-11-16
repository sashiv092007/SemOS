"use client";

import Link from "next/link";
import { deadlineOf, formatRemaining, useNow, usePlan } from "@/lib/plan";

/**
 * The "Semester Timeline" box. Counts down to the saved plan's deadline in
 * "7 days:00h:00min" form; with no plan it invites the student to make one.
 */
export default function SemesterCountdown({ className = "" }: { className?: string }) {
  const plan = usePlan();
  const now = useNow();

  const box = `block rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-slate-500 backdrop-blur-md transition-all duration-200 hover:border-slate-700 ${className}`;

  if (!plan || now === 0) {
    return (
      <Link href="/roadmap" className={box}>
        Semester Timeline:{" "}
        <span className="whitespace-nowrap font-semibold text-emerald-400">
          {plan === null ? "add your assignments →" : "-- days:--h:--min"}
        </span>
      </Link>
    );
  }

  const left = deadlineOf(plan) - Math.max(now, plan.startAt);
  return (
    <Link href="/roadmap" className={box}>
      Semester Timeline:{" "}
      <span className="whitespace-nowrap font-semibold normal-case tabular-nums text-emerald-400">{formatRemaining(left)}</span>{" "}
      {left > 0 ? "remaining" : "· deadline passed"}
    </Link>
  );
}
