import type { ReactNode } from "react";

/*
 * Building blocks for the newer pages (PYQ Predictor, Class Rooms). Same palette and
 * cards as the tool dashboards, written light-first so dark-theme.css can flip them.
 */

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";
export const CARD =
  "rounded-[1.75rem] bg-white shadow-[0_1px_2px_rgba(59,10,69,0.06),0_22px_44px_-30px_rgba(59,10,69,0.45)] ring-1 ring-[#5b1065]/10";
export const BTN_GREEN = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#3ee07a] px-5 py-2.5 text-sm font-bold text-[#2a0730] shadow-[0_8px_20px_-8px_rgba(34,197,94,0.7)] transition-colors duration-150 hover:bg-[#5cf091] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
export const BTN_LIGHT = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5b1065] shadow-[0_1px_2px_rgba(59,10,69,0.05)] ring-1 ring-[#5b1065]/15 transition-colors duration-150 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
export const BTN_PURPLE = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#5b1065] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(91,16,101,0.8)] transition-colors duration-150 hover:bg-[#741a80] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
export const INPUT = `w-full rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-[#5b1065]/15 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500`;

/** Title row: pink tag, big plum headline with the yellow diamond, short text, and actions on the right. */
export function PageHeader({ tag, title, text, actions }: { tag: string; title: string; text: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 pt-10 sm:pt-14 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="w-fit rounded-full bg-pink-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink-800">{tag}</p>
        <h1 className="mt-2 text-balance text-4xl font-semibold tracking-[-0.035em] text-[#3b0a45] sm:text-[3.25rem] sm:leading-[1.02]">
          {title}
          <span aria-hidden="true" className="ml-3 inline-block h-3.5 w-3.5 rotate-45 rounded-[3px] bg-yellow-300 align-middle" />
        </h1>
        <p className="mt-3 max-w-xl text-[15px] font-medium text-slate-500">{text}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** A white card with a small heading row. */
export function Panel({
  id,
  title,
  icon,
  aside,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-label={title} className={`${CARD} scroll-mt-6 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-[#3b0a45]">
          {icon ?? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#3ee07a]" />}
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
