"use client";

/**
 * Accounts and cloud saving.
 * - Who is signed in (`useAccount`).
 * - The Roadmap plan is kept in sync with the `plans` table: the newer copy wins,
 *   changes are sent up shortly after they are made, and the account is checked again
 *   whenever the tab comes back into view.
 * - Mastersheets and notes the AI built are kept in the `library` table.
 * Row-level security limits every row to its owner.
 */

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { currentPlan, onPlanSaved, planStamp, savePlan, validPlan } from "./plan";
import { SUPABASE_KEY, SUPABASE_URL, supabase } from "./supabase";

/* ---------- Account state ---------- */

export type Sync = "idle" | "syncing" | "saved" | "error";

export type Account = {
  status: "loading" | "out" | "in";
  user: { id: string; email: string; name: string; avatar: string } | null;
  sync: Sync;
};

const LOADING: Account = { status: "loading", user: null, sync: "idle" };
let state: Account = LOADING;
const listeners = new Set<() => void>();

function set(next: Partial<Account>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
}

function toUser(u: User): Account["user"] {
  const meta = u.user_metadata ?? {};
  const email = u.email ?? "";
  return {
    id: u.id,
    email,
    name: String(meta.full_name || meta.name || email.split("@")[0] || "Student"),
    avatar: String(meta.avatar_url || meta.picture || ""),
  };
}

/* ---------- Plan sync ---------- */

let pushTimer: ReturnType<typeof setTimeout> | undefined;

async function pushPlan() {
  const uid = state.user?.id;
  if (!uid) return;
  set({ sync: "syncing" });
  const plan = currentPlan();
  const updated_at = new Date(planStamp() || Date.now()).toISOString();
  const { error } = plan
    ? await supabase.from("plans").upsert({ user_id: uid, data: plan, updated_at })
    : await supabase.from("plans").delete().eq("user_id", uid);
  set({ sync: error ? "error" : "saved" });
}

/** Compare this browser's plan with the account's and keep the newer one in both places. */
async function pullPlan() {
  const uid = state.user?.id;
  if (!uid) return;
  set({ sync: "syncing" });
  const { data, error } = await supabase.from("plans").select("data, updated_at").eq("user_id", uid).maybeSingle();
  if (error) return set({ sync: "error" });
  if (state.user?.id !== uid) return; // signed out meanwhile

  const local = currentPlan();
  const localAt = planStamp();
  const remote = data ? validPlan(data.data) : null;
  const remoteAt = data ? Date.parse(data.updated_at) : 0;

  if (remote && remoteAt > localAt) {
    // Changed on another device since this browser last changed it.
    savePlan(remote, { stamp: remoteAt, fromCloud: true });
    return set({ sync: "saved" });
  }
  // Changed (or deleted) here more recently: send this browser's version up.
  if ((local && (!remote || localAt > remoteAt)) || (!local && remote && localAt > remoteAt)) return pushPlan();
  set({ sync: "saved" });
}

/* ---------- Start-up (once per page load, in the browser) ---------- */

let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const before = state.user?.id;
    set({ status: session?.user ? "in" : "out", user: session?.user ? toUser(session.user) : null });
    // Calls to Supabase inside this callback can lock up, so run them just after it.
    if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN") && before !== session.user.id) {
      setTimeout(pullPlan, 0);
    }
  });

  onPlanSaved(() => {
    if (!state.user) return;
    clearTimeout(pushTimer);
    set({ sync: "syncing" });
    pushTimer = setTimeout(pushPlan, 800);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.user) pullPlan();
  });
}

function subscribe(fn: () => void) {
  start();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Who is signed in, and whether the plan is synced. "loading" until the browser knows. */
export function useAccount(): Account {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

/* ---------- Sign in / out ---------- */

const messageFor = (e: { message?: string; code?: string } | null) => {
  if (!e) return "";
  const m = e.message ?? "";
  if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/already registered|already been registered/i.test(m)) return "This email already has an account. Sign in instead.";
  if (/email not confirmed/i.test(m)) return "Confirm your email first: open the link we sent you.";
  if (/rate limit/i.test(m)) return "Too many tries. Wait a minute and try again.";
  if (/password/i.test(m) && /6|short|weak/i.test(m)) return "Use a password of at least 6 characters.";
  return m || "Something went wrong. Try again.";
};

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return messageFor(error);
}

/** Returns an error message, or "confirm" when the account needs its email confirmed first. */
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/account` },
  });
  if (error) return messageFor(error);
  return data.session ? "" : "confirm";
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/account` },
  });
  return messageFor(error);
}

/** Which sign-in methods the project has switched on. */
export async function authProviders(): Promise<{ google: boolean }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const json = await res.json();
    return { google: Boolean(json?.external?.google) };
  } catch {
    return { google: false };
  }
}

/** Sign out and clear this browser's copy of the plan (the account keeps it). */
export async function signOut() {
  clearTimeout(pushTimer);
  if (state.sync === "syncing") await pushPlan();
  await supabase.auth.signOut();
  savePlan(null, { stamp: 0, fromCloud: true });
  window.dispatchEvent(new Event(LIBRARY_EVENT));
}

/* ---------- Library: saved mastersheets and notes ---------- */

export type LibraryKind = "mastersheet" | "notes";
export type LibraryItem = { id: string; kind: LibraryKind; title: string; created_at: string };

const LIBRARY_EVENT = "semos:library";

/** Save something the AI built. Returns false when signed out or on failure. */
export async function saveToLibrary(kind: LibraryKind, title: string, data: unknown) {
  if (!state.user) return false;
  const { error } = await supabase.from("library").insert({ kind, title: title.slice(0, 200), data });
  if (!error) window.dispatchEvent(new Event(LIBRARY_EVENT));
  return !error;
}

export async function listLibrary(kind: LibraryKind): Promise<LibraryItem[]> {
  if (!state.user) return [];
  const { data, error } = await supabase
    .from("library")
    .select("id, kind, title, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("Your saved items could not be loaded.");
  return (data ?? []) as LibraryItem[];
}

export async function openFromLibrary<T>(id: string): Promise<T | null> {
  const { data, error } = await supabase.from("library").select("data").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data.data as T;
}

export async function deleteFromLibrary(id: string) {
  const { error } = await supabase.from("library").delete().eq("id", id);
  if (!error) window.dispatchEvent(new Event(LIBRARY_EVENT));
  return !error;
}

/** Re-run `fn` whenever something is saved to or deleted from the library. */
export function onLibraryChange(fn: () => void) {
  window.addEventListener(LIBRARY_EVENT, fn);
  return () => window.removeEventListener(LIBRARY_EVENT, fn);
}
