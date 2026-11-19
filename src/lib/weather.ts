import { buildSchedule, deadlineOf, devotedHours, type Plan } from "./plan";

/* ---------- Types ---------- */

export type AssignmentStatus = "sunny" | "rainy" | "stormy";

export interface WeatherAssignment {
  name: string;
  dueDate: number; // ms epoch
  estimatedHours: number; // total hours of work
  completed: boolean;
  /** Hours already put in (logged study time). Ignored once completed. */
  hoursDone?: number;
  /** Hours the schedule expected to be finished by now. */
  hoursDueByNow?: number;
}

export interface WeatherOptions {
  now?: number;
  /** The most a student can realistically work in a day. Beyond it the deadline cannot be met. */
  maxHoursPerDay?: number;
}

export type Weather = { status: AssignmentStatus; reason: string };

const DAY = 86_400_000;
const HOUR = 3_600_000;

/* ---------- Logic ---------- */

/**
 * One schedule at a time, with any number of assignments.
 *
 * Sunny:  no schedule, everything done, or the schedule is being followed.
 * Rainy:  behind the schedule, but the remaining work can still be finished before its deadline.
 * Stormy: behind the schedule and the remaining work can no longer fit before its deadline
 *         (at most `maxHoursPerDay` hours of work a day), or a deadline has passed with work left.
 */
export function calculateWeather(assignments: WeatherAssignment[], options: WeatherOptions = {}): Weather {
  const now = options.now ?? Date.now();
  const maxPerDay = options.maxHoursPerDay ?? 12;

  if (assignments.length === 0) return { status: "sunny", reason: "No schedule yet." };

  const open = assignments.filter((a) => !a.completed).sort((a, b) => a.dueDate - b.dueDate);
  if (open.length === 0) return { status: "sunny", reason: "Every assignment is submitted." };

  // Can the work that is left still fit before each deadline?
  let left = 0;
  let fits = true;
  for (const a of open) {
    left += Math.max(0, a.estimatedHours - (a.hoursDone ?? 0));
    const available = a.dueDate <= now ? 0 : ((a.dueDate - now) / DAY) * maxPerDay;
    if (left > available + 1e-9) fits = false;
  }

  // Is the student keeping up with the schedule?
  const total = assignments.reduce((s, a) => s + a.estimatedHours, 0);
  const done = assignments.reduce((s, a) => s + (a.completed ? a.estimatedHours : Math.min(a.hoursDone ?? 0, a.estimatedHours)), 0);
  const expected = assignments.reduce((s, a) => s + (a.hoursDueByNow ?? 0), 0);
  const slack = Math.max(0.5, total * 0.05); // small grace so a few minutes late is not "behind"
  const behind = done < expected - slack;

  if (!fits) return { status: "stormy", reason: "You can no longer finish everything on time." };
  if (behind) return { status: "rainy", reason: `You are ${fmt(expected - done)} behind your schedule, but can still finish on time.` };
  return { status: "sunny", reason: "You are following your schedule." };
}

/** Backwards-compatible: just the status. */
export function calculateWeatherStatus(assignments: WeatherAssignment[], options: WeatherOptions = {}): AssignmentStatus {
  return calculateWeather(assignments, options).status;
}

const fmt = (h: number) => `${Number.isInteger(Math.round(h * 10) / 10) ? Math.round(h) : h.toFixed(1)}h`;

/** The weather for the saved roadmap schedule (or sunny when there is none). */
export function weatherFromPlan(plan: Plan | null | undefined, now: number): Weather {
  if (!plan || plan.items.length === 0) return calculateWeather([], { now });
  const deadline = deadlineOf(plan);
  return calculateWeather(
    buildSchedule(plan).map((s) => {
      const span = Math.max(s.end - s.start, HOUR / 60);
      const elapsed = Math.min(1, Math.max(0, (now - s.start) / span));
      return {
        name: s.name,
        dueDate: deadline,
        estimatedHours: s.hours,
        completed: s.done,
        hoursDone: devotedHours(s),
        hoursDueByNow: s.hours * elapsed,
      };
    }),
    { now },
  );
}
