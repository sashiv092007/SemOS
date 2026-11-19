import Link from "next/link";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

/** The SemOS mark: a plum tile with a tilted yellow square. Same file as the browser-tab icon (app/icon.svg). */
export function SemosMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl bg-[#5b1065] shadow-sm ${className}`}>
      <span className="h-[35%] w-[35%] rotate-12 rounded-[4px] bg-yellow-300" />
    </span>
  );
}

/**
 * Mark + wordmark linking home. Used in every top bar so the logo is identical everywhere.
 * `textClass` only changes the word's colour, e.g. white over the home page's storm sky.
 */
export default function SemosLogo({ textClass = "text-[#3b0a45]" }: { textClass?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 rounded-xl text-lg font-bold tracking-tight transition-colors duration-700 ${textClass} ${FOCUS}`}>
      <SemosMark />
      SemOS
    </Link>
  );
}
