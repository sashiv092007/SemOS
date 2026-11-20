"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, UsersRound } from "lucide-react";
import { useAccount } from "@/lib/account";
import { listMyRooms, postItem, type Room } from "@/lib/rooms";
import { BTN_LIGHT, FOCUS } from "./FeatureLayout";

/** "Share to a room": posts a PYQ analysis, notes or a mastersheet into one of the student's Class Rooms. */
export default function ShareToRoom({ kind, title, data }: { kind: "pyq" | "notes" | "mastersheet"; title: string; data: unknown }) {
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    setError("");
    if (user && rooms === null) {
      listMyRooms()
        .then(setRooms)
        .catch((e: Error) => setError(e.message));
    }
  };

  const share = async (room: Room) => {
    if (!user) return;
    setBusy(room.id);
    setError("");
    try {
      await postItem(room.id, user.name, { kind, title, data });
      setDone((d) => [...d, room.id]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy("");
  };

  return (
    <div ref={box} className="relative">
      <button type="button" className={BTN_LIGHT} onClick={toggle} aria-expanded={open}>
        <UsersRound className="h-4 w-4" aria-hidden="true" />
        Share to a room
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl bg-white p-3 shadow-[0_20px_50px_-20px_rgba(59,10,69,0.5)] ring-1 ring-[#5b1065]/10">
          {!user ? (
            <p className="p-1 text-sm text-slate-600">
              <Link href="/account" className={`font-bold text-fuchsia-700 underline underline-offset-2 ${FOCUS}`}>
                Sign in
              </Link>{" "}
              to share with your class.
            </p>
          ) : rooms === null && !error ? (
            <p className="flex items-center gap-2 p-1 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your rooms…
            </p>
          ) : rooms && rooms.length === 0 ? (
            <p className="p-1 text-sm text-slate-600">
              You are not in any room yet.{" "}
              <Link href="/rooms" className={`font-bold text-fuchsia-700 underline underline-offset-2 ${FOCUS}`}>
                Create or join one
              </Link>
              .
            </p>
          ) : (
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {(rooms ?? []).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={Boolean(busy) || done.includes(r.id)}
                    onClick={() => share(r)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-fuchsia-50 disabled:cursor-default ${FOCUS}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#3b0a45]">{r.name}</span>
                      {r.course ? <span className="block truncate text-xs text-slate-500">{r.course}</span> : null}
                    </span>
                    {busy === r.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
                    ) : done.includes(r.id) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Shared
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error ? (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
