"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarClock, NotebookText, Target } from "lucide-react";
import { TAB_PILL, TAB_PILL_ACTIVE } from "./ui";

const TOOLS = [
  { href: "/mastersheet", label: "Mastersheet", icon: BookOpenCheck },
  { href: "/grade-analyzer", label: "Grade Analyzer", icon: Target },
  { href: "/note-builder", label: "Note Builder", icon: NotebookText },
  { href: "/roadmap", label: "Roadmaps", icon: CalendarClock },
];

/** Floating pill selector for moving between the four tools. */
export default function ToolTabs({ wide = false }) {
  const pathname = usePathname();
  return (
    <div className={`mx-auto px-4 pt-6 sm:px-6 ${wide ? "max-w-[100rem]" : "max-w-7xl"}`}>
      <nav
        aria-label="Tools"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-slate-800/80 border-t-white/10 bg-slate-900/40 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_40px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        {TOOLS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={active ? TAB_PILL_ACTIVE : TAB_PILL}
            >
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
