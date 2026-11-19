"use client";

import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

/** Light / Dark switch. The choice applies to every page of the site. */
export default function ThemeToggle() {
  const theme = useTheme();

  return (
    <div role="radiogroup" aria-label="Colour theme" className="flex items-center gap-0.5 rounded-full bg-white/70 p-1 ring-1 ring-white/80 backdrop-blur-md">
      {(
        [
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
        ] as const
      ).map((o) => {
        const on = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.value)}
            title={`${o.label} theme`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${FOCUS} ${
              on ? "bg-[#5b1065] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <o.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{o.label}</span>
            <span className="sr-only sm:hidden">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
