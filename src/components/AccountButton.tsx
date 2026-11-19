"use client";

import Link from "next/link";
import { CloudCheck, CloudOff, LoaderCircle, LogIn } from "lucide-react";
import { useAccount } from "@/lib/account";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

/** Top-bar entry to the account: "Sign in" when signed out, the student's initial and sync state when in. */
export default function AccountButton({ tone = "light" }: { tone?: "light" | "glass" }) {
  const { status, user, sync } = useAccount();

  if (status === "loading") {
    return <span aria-hidden="true" className="h-10 w-24 animate-pulse rounded-full bg-white/60" />;
  }

  if (!user) {
    return (
      <Link
        href="/account"
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${FOCUS} ${
          tone === "glass"
            ? "bg-white/70 text-slate-800 ring-1 ring-white/80 backdrop-blur-md hover:bg-white"
            : "bg-white text-[#5b1065] ring-1 ring-[#5b1065]/15 hover:bg-fuchsia-50"
        }`}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const SyncIcon = sync === "syncing" ? LoaderCircle : sync === "error" ? CloudOff : CloudCheck;
  const syncText = sync === "syncing" ? "Saving…" : sync === "error" ? "Not synced" : "Saved to your account";

  return (
    <Link
      href="/account"
      title={`${user.email} · ${syncText}`}
      className={`inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold text-[#3b0a45] ring-1 ring-[#5b1065]/15 transition-colors duration-150 hover:bg-fuchsia-50 ${FOCUS}`}
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote avatar, no need for image optimisation
        <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[#5b1065] text-xs font-bold uppercase text-yellow-200">
          {user.name.slice(0, 1)}
        </span>
      )}
      <span className="sr-only">Your account, {syncText}</span>
      <SyncIcon
        aria-hidden="true"
        className={`h-4 w-4 ${sync === "error" ? "text-red-500" : "text-emerald-600"} ${sync === "syncing" ? "animate-spin" : ""}`}
      />
    </Link>
  );
}
