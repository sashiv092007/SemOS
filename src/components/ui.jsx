/**
 * SemOS design tokens and shared presentational pieces.
 *
 * Three layers:
 *   1. App shell     - #030712 canvas, glass cards, monospace precision badges
 *   2. Window frames - macOS-style title bar, breadcrumb, tab pills
 *   3. Paper         - warm cream document sheets with heavy elevation
 *
 * Every page takes its surfaces, labels and controls from here.
 */

/* ------------------------------------------------------------------ */
/*  Layer 1: surfaces                                                  */
/* ------------------------------------------------------------------ */

/** Outer canvas colour. */
export const CANVAS = "bg-[#030712]";

/** Layered glass: hairline ring plus a deep, tight drop shadow. */
const GLASS_SHADOW = "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_40px_-15px_rgba(0,0,0,0.7)]";

/** Glass card. Never a solid fill. */
export const CARD = `rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl ${GLASS_SHADOW} transition-all duration-300 hover:border-slate-700/80`;

/** Glass card with the 1px top highlight, for active panels and windows. */
export const CARD_ACTIVE = `${CARD} border-t-white/10 hover:border-t-white/10`;

/**
 * Floating card that overlaps the cream paper sheet. This is the one surface
 * kept close to opaque: 40% glass over cream paper turns pale and its light
 * text becomes unreadable.
 */
export const PANEL = `rounded-xl border border-slate-800/80 border-t-white/10 bg-slate-900/90 backdrop-blur-xl ${GLASS_SHADOW} transition-all duration-300 hover:border-slate-700/80 hover:border-t-white/10`;

/* ------------------------------------------------------------------ */
/*  Layer 1: typography                                                */
/* ------------------------------------------------------------------ */

/** Precision badge: tags, statuses, unit codes, counters. */
export const BADGE =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-400";

/** Kept as an alias so older call sites read naturally. */
export const TAG = BADGE;

/** Quiet field and card-header label. */
export const LABEL = "block font-mono text-[10px] uppercase tracking-widest text-slate-500";

/** Primary heading and its subtext. */
export const HEADING = "font-extrabold tracking-tight text-slate-100";
export const SUBTEXT = "text-xs leading-relaxed text-slate-400 sm:text-sm";

/* ------------------------------------------------------------------ */
/*  Layer 1: controls                                                  */
/* ------------------------------------------------------------------ */

/** Text, number and select fields. Add a width where it is used. */
export const FIELD =
  "rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-all duration-300 hover:border-slate-700/80 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]";

/** Tab pill, resting and active (inner glow). */
export const TAB_PILL =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-sm font-medium text-slate-400 transition-all duration-300 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";
export const TAB_PILL_ACTIVE =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/80 px-3.5 py-1.5 text-sm font-medium text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";

/* ------------------------------------------------------------------ */
/*  Layer 3: paper                                                     */
/* ------------------------------------------------------------------ */

/** Heavy, realistic paper elevation for the cream document. */
export const PAPER_SHADOW = "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]";

/* ------------------------------------------------------------------ */
/*  Atmosphere                                                         */
/* ------------------------------------------------------------------ */

/**
 * One soft emerald glow. The parent needs `relative isolate` so the glow sits
 * behind its siblings; pass position and size through `className`.
 */
export function Glow({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 rounded-full bg-emerald-500/[0.04] blur-3xl ${className}`}
    />
  );
}

/** Page-level ambient light: a radial glow falling from the top. The parent needs `relative isolate`. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[56rem] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Layer 2: macOS-style window framing                                */
/* ------------------------------------------------------------------ */

/**
 * Window title bar: traffic lights, a centred monospace breadcrumb such as
 * `demos/grade-analyzer.jsx`, and an optional badge on the right.
 * `title` is read by screen readers as the section heading.
 */
export function WindowBar({ path, title, right }) {
  const cut = path.lastIndexOf("/");
  const folder = cut >= 0 ? path.slice(0, cut) : "";
  const file = cut >= 0 ? path.slice(cut + 1) : path;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-800/80 bg-slate-950/50 px-4 py-2.5">
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-[#FF5F56] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" />
        <span className="h-3 w-3 rounded-full bg-[#FFBD2E] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" />
        <span className="h-3 w-3 rounded-full bg-[#27C93F] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" />
      </div>
      <p className="min-w-0 truncate text-center font-mono text-xs text-slate-500">
        {title ? <span className="sr-only">{title}: </span> : null}
        {folder ? (
          <>
            {folder}
            <span className="mx-1 text-slate-700">/</span>
          </>
        ) : null}
        <span className="text-slate-300">{file}</span>
      </p>
      <div className="flex min-w-0 justify-end">
        {right ? <span className={`${BADGE} max-w-full truncate`}>{right}</span> : null}
      </div>
    </div>
  );
}

/** A full window: glass shell with top highlight, title bar, then the content. */
export function AppWindow({ path, title, right, className = "", bodyClassName = "", children }) {
  return (
    <section aria-label={title} className={`overflow-hidden ${CARD_ACTIVE} ${className}`}>
      <WindowBar path={path} right={right} />
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Special effects                                                    */
/* ------------------------------------------------------------------ */

/**
 * Vertical cyan laser that sweeps left to right and back.
 * The parent needs `relative overflow-hidden`. Keyframes live in globals.css.
 */
export function ScanLine() {
  return (
    <div
      aria-hidden="true"
      className="animate-scanLine pointer-events-none absolute inset-y-0 z-10 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
    >
      <div className="absolute inset-y-0 -left-10 w-20 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
    </div>
  );
}
