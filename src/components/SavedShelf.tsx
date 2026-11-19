"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, FolderOpen, LoaderCircle, Trash2 } from "lucide-react";
import { deleteFromLibrary, listLibrary, onLibraryChange, openFromLibrary, useAccount, type LibraryItem, type LibraryKind } from "@/lib/account";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * The student's saved mastersheets or notes, with Open and Delete.
 * Signed out, it invites them to sign in instead.
 */
export default function SavedShelf<T>({
  kind,
  label,
  onOpen,
  className = "",
}: {
  kind: LibraryKind;
  label: string; // e.g. "mastersheets"
  onOpen: (data: T, item: LibraryItem) => void;
  className?: string;
}) {
  const { status, user } = useAccount();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    listLibrary(kind)
      .then((list) => {
        setItems(list);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [kind]);

  useEffect(() => {
    if (!user) return;
    load();
    return onLibraryChange(load);
  }, [user, load]);

  if (status === "loading") return null;

  if (!user) {
    return (
      <p className={`flex items-center gap-2 rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-900 ring-1 ring-yellow-300 ${className}`}>
        <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <Link href="/account" className={`font-semibold underline underline-offset-2 ${FOCUS}`}>
            Sign in
          </Link>{" "}
          to keep your {label} and open them on any device.
        </span>
      </p>
    );
  }

  const open = async (item: LibraryItem) => {
    setBusyId(item.id);
    const data = await openFromLibrary<T>(item.id);
    setBusyId("");
    if (data) onOpen(data, item);
    else setError("That item could not be opened. Try again.");
  };

  const remove = async (item: LibraryItem) => {
    setBusyId(item.id);
    const ok = await deleteFromLibrary(item.id);
    setBusyId("");
    if (!ok) setError("That item could not be deleted. Try again.");
  };

  return (
    <section aria-label={`Saved ${label}`} className={`rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Cloud className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        Your saved {label}
      </h3>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {items === null ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">Nothing saved yet. What the AI builds for you is saved here automatically.</p>
      ) : (
        <ul className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{item.title || "Untitled"}</span>
                <span className="block font-mono text-[10px] text-slate-400">{when(item.created_at)}</span>
              </span>
              <button
                type="button"
                onClick={() => open(item)}
                disabled={Boolean(busyId)}
                className={`inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 ${FOCUS}`}
              >
                {busyId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                Open
              </button>
              <button
                type="button"
                onClick={() => remove(item)}
                disabled={Boolean(busyId)}
                aria-label={`Delete ${item.title || "this item"}`}
                className={`grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-60 ${FOCUS}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
