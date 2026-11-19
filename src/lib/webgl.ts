"use client";

import { useSyncExternalStore } from "react";

export type GraphicsSupport = { webgl: boolean; reducedMotion: boolean; lowPower: boolean };

let cached: GraphicsSupport | null = null;

function detect(): GraphicsSupport {
  if (cached) return cached;
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  cached = {
    webgl,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    lowPower: (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4,
  };
  return cached;
}

const noSubscribe = () => () => {};

/**
 * What the browser can handle for 3D scenes. `null` during server rendering
 * and the first client render, so pages hydrate without mismatches.
 */
export function useGraphicsSupport(): GraphicsSupport | null {
  return useSyncExternalStore(noSubscribe, detect, () => null);
}

/** True when a 3D scene should be shown instead of its flat fallback. */
export function can3D(support: GraphicsSupport | null) {
  return Boolean(support && support.webgl && !support.reducedMotion);
}
