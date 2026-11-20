"use client";

/**
 * Passing something from one page to another tool page, for one visit only:
 * e.g. "Make a Mastersheet of these topics" from the PYQ Predictor, or "Open" on
 * something shared in a Class Room. Kept in sessionStorage so a reload does not repeat it.
 */

export type HandoffKind = "pyq" | "mastersheet" | "notes";

const key = (kind: HandoffKind) => `semos.handoff.${kind}`;

export function handOff(kind: HandoffKind, data: unknown) {
  try {
    window.sessionStorage.setItem(key(kind), JSON.stringify(data));
  } catch {
    // storage blocked: the tool page simply opens empty
  }
}

/** Read and forget what was handed to this tool page, or null. */
export function takeHandoff<T = unknown>(kind: HandoffKind): T | null {
  try {
    const raw = window.sessionStorage.getItem(key(kind));
    if (!raw) return null;
    window.sessionStorage.removeItem(key(kind));
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const TOOL_PATH: Record<HandoffKind, string> = {
  pyq: "/pyq",
  mastersheet: "/mastersheet",
  notes: "/note-builder",
};
