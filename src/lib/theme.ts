"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark theme for the whole site. The choice is stored in this browser and put on
 * <html data-theme="dark">, which dark-theme.css styles. The root layout applies it before
 * the first paint, so pages never flash light first.
 */

export type ThemeName = "light" | "dark";

export const THEME_KEY = "semos.theme";
const EVENT = "semos:theme";

function apply(theme: ThemeName) {
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  root.style.colorScheme = theme;
}

export function setTheme(theme: ThemeName) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked: the theme still changes for this page
  }
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

const read = (): ThemeName => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function subscribe(cb: () => void) {
  // Another tab changed the theme: follow it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    apply(e.newValue === "dark" ? "dark" : "light");
    cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** The current theme. "light" during server rendering. */
export function useTheme(): ThemeName {
  return useSyncExternalStore(subscribe, read, () => "light");
}
