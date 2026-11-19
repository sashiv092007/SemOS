"use client";

import { useSyncExternalStore } from "react";

/* ---------- Types ---------- */

export type Assignment = {
  id: string;
  name: string;
  hours: number;
  done: boolean;
  doneAt?: number; // ms epoch, when it was ticked off
  logs?: TimeLog[]; // study time the student logged against this assignment
};

export type TimeLog = { at: number; hours: number };

export type Plan = {
  startAt: number; // ms epoch, when the timer started
  days: number; // time available; every assignment is due at startAt + days
  items: Assignment[];
};

export type Slot = Assignment & {
  order: number; // 1 = do first
  start: number;
  end: number;
  share: number; // fraction of the whole window, 0-1
};

const DAY = 86_400_000;
const KEY = "semos.plan.v1";
const EVENT = "semos:plan";

export const deadlineOf = (plan: Plan) => plan.startAt + plan.days * DAY;

/* ---------- Scheduling ---------- */

/**
 * Largest assignment first. The whole window is split between the assignments
 * in proportion to their effort, as back-to-back blocks ending at the deadline.
 */
export function buildSchedule(plan: Plan): Slot[] {
  const total = plan.items.reduce((sum, a) => sum + a.hours, 0);
  if (total <= 0) return [];
  const windowMs = plan.days * DAY;
  const sorted = [...plan.items].sort((a, b) => b.hours - a.hours);
  let cursor = plan.startAt;
  return sorted.map((a, i) => {
    const share = a.hours / total;
    const start = cursor;
    const end = i === sorted.length - 1 ? plan.startAt + windowMs : start + windowMs * share;
    cursor = end;
    return { ...a, order: i + 1, start, end, share };
  });
}

/* ---------- Time devoted ---------- */

/**
 * Every stretch of study time on an assignment: the hours the student logged,
 * plus, once it is ticked off, any planned hours they did not log (credited to
 * the day it was finished).
 */
export function timeEntries(a: Assignment): TimeLog[] {
  const logs = a.logs ?? [];
  const logged = logs.reduce((s, l) => s + l.hours, 0);
  if (a.done && a.doneAt && logged < a.hours) return [...logs, { at: a.doneAt, hours: a.hours - logged }];
  return logs;
}

export const devotedHours = (a: Assignment) => timeEntries(a).reduce((s, l) => s + l.hours, 0);

/* ---------- Formatting ---------- */

/** "7 days:00h:00min" style, rounded up to the minute, never negative. */
export function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d} ${d === 1 ? "day" : "days"}:${pad(h)}h:${pad(m)}min`;
}

/** "4 days 2h" style, for the length of one block. */
export function formatSpan(ms: number): string {
  const totalH = Math.max(0, Math.round(ms / 3_600_000));
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  if (d === 0) return `${h}h`;
  return h === 0 ? `${d} ${d === 1 ? "day" : "days"}` : `${d} ${d === 1 ? "day" : "days"} ${h}h`;
}

/* ---------- Storage (this browser only) ---------- */

let cachedRaw: string | null | undefined;
let cachedPlan: Plan | null = null;

function parse(raw: string | null): Plan | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p?.startAt !== "number" || typeof p?.days !== "number" || !Array.isArray(p?.items)) return null;
    return p as Plan;
  } catch {
    return null;
  }
}

function readPlan(): Plan | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // storage blocked: behave as if there is no plan
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPlan = parse(raw);
  }
  return cachedPlan;
}

export function savePlan(plan: Plan | null) {
  try {
    if (plan) window.localStorage.setItem(KEY, JSON.stringify(plan));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: nothing to do
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribePlan(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** `undefined` until the browser has loaded, then the saved plan or `null`. */
export function usePlan(): Plan | null | undefined {
  return useSyncExternalStore<Plan | null | undefined>(subscribePlan, readPlan, () => undefined);
}

/* ---------- Clock ---------- */

function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}

/** Current time in ms, ticking every second. 0 until the browser has loaded. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => 0,
  );
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
