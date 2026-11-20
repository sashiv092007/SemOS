"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  CloudLightning,
  CloudRain,
  Copy,
  DoorOpen,
  ExternalLink,
  FolderOpen,
  Link2,
  LoaderCircle,
  LogIn,
  MessageSquareText,
  NotebookText,
  Plus,
  RefreshCw,
  ScanSearch,
  Send,
  Sun,
  Trash2,
  UsersRound,
} from "lucide-react";
import { listLibrary, openFromLibrary, useAccount, type LibraryItem } from "@/lib/account";
import { handOff, TOOL_PATH } from "@/lib/handoff";
import {
  createRoom,
  deleteItem,
  deleteRoom,
  inviteLink,
  itemData,
  joinRoom,
  leaveRoom,
  listMyRooms,
  loadRoom,
  normaliseCode,
  postItem,
  previewRoom,
  renameMe,
  syncMyWeather,
  type ItemKind,
  type Member,
  type Room,
  type RoomItem,
} from "@/lib/rooms";
import type { AssignmentStatus } from "@/lib/weather";
import { BTN_GREEN, BTN_LIGHT, BTN_PURPLE, CARD, FOCUS, INPUT, PageHeader, Panel } from "./FeatureLayout";
import ShareForecast from "./ShareForecast";

const PENDING_KEY = "semos.pendingJoin";

const WEATHER: Record<AssignmentStatus, { label: string; icon: typeof Sun; tile: string; bar: string }> = {
  sunny: { label: "Sunny", icon: Sun, tile: "bg-yellow-200 text-yellow-800", bar: "bg-yellow-300" },
  rainy: { label: "Rainy", icon: CloudRain, tile: "bg-blue-200 text-blue-800", bar: "bg-blue-400" },
  stormy: { label: "Stormy", icon: CloudLightning, tile: "bg-[#5b1065] text-white", bar: "bg-[#5b1065]" },
};

const KIND: Record<ItemKind, { label: string; icon: typeof Sun; tile: string }> = {
  pyq: { label: "PYQ analysis", icon: ScanSearch, tile: "bg-pink-200 text-pink-800" },
  notes: { label: "Notes", icon: NotebookText, tile: "bg-green-200 text-green-800" },
  mastersheet: { label: "Mastersheet", icon: BookOpenCheck, tile: "bg-fuchsia-200 text-[#5b1065]" },
  deadline: { label: "Deadline", icon: CalendarClock, tile: "bg-orange-200 text-orange-800" },
  link: { label: "Link", icon: Link2, tile: "bg-blue-200 text-blue-800" },
  post: { label: "Post", icon: MessageSquareText, tile: "bg-yellow-200 text-yellow-800" },
};

const MATERIAL: ItemKind[] = ["pyq", "notes", "mastersheet"];

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

function until(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "passed";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d ? `in ${d}d ${h}h` : `in ${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

const dueLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const safeUrl = (raw: string) => {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Lobby: list, create, join                                          */
/* ------------------------------------------------------------------ */

function Lobby({ userName, joinCode, onOpen }: { userName: string; joinCode: string | null; onOpen: (id: string) => void }) {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [code, setCode] = useState(joinCode ?? "");
  const [busy, setBusy] = useState("");
  const [invite, setInvite] = useState<{ name: string; course: string; members: number } | null | undefined>(undefined);

  useEffect(() => {
    listMyRooms()
      .then(setRooms)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!joinCode) return;
    previewRoom(joinCode).then(setInvite);
  }, [joinCode]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the room a name, e.g. CSE-B 3rd sem.");
    setBusy("create");
    setError("");
    try {
      const room = await createRoom(name, course, userName);
      onOpen(room.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  };

  const join = async (raw: string) => {
    const c = normaliseCode(raw);
    if (!c) return setError("Room codes are 6 letters and numbers, like K7QM2P.");
    setBusy("join");
    setError("");
    try {
      const id = await joinRoom(c, userName);
      onOpen(id);
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  };

  return (
    <div className="mt-8 grid gap-5">
      {joinCode ? (
        <section className={`${CARD} overflow-hidden`} aria-label="Invitation">
          <div className="flex flex-wrap items-center gap-4 bg-[radial-gradient(120%_120%_at_0%_0%,#8b1d8f_0%,#5b1065_45%,#2a0730_100%)] p-5 text-white sm:p-6">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-[#3b0a45]">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">You are invited to</p>
              {invite === undefined ? (
                <p className="mt-1 text-lg font-bold">Loading…</p>
              ) : invite ? (
                <>
                  <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{invite.name}</p>
                  <p className="text-sm text-white/75">
                    {invite.course ? `${invite.course} · ` : ""}
                    {invite.members} {invite.members === 1 ? "member" : "members"}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-lg font-bold">No room has the code {joinCode}.</p>
              )}
            </div>
            {invite ? (
              <button type="button" className={BTN_GREEN} disabled={busy === "join"} onClick={() => join(joinCode)}>
                {busy === "join" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                Join room
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Your rooms" icon={<UsersRound className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}>
          {rooms === null ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
            </p>
          ) : rooms.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-bold text-[#3b0a45]">No rooms yet.</p>
              <p className="mt-1">Create one for your class and drop the invite link in the class WhatsApp group. One person uploads the PYQs, everyone gets the analysis.</p>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition-colors hover:bg-fuchsia-50 ${FOCUS}`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#5b1065] text-sm font-bold text-white">
                      {r.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#3b0a45]">{r.name}</span>
                      <span className="block truncate text-xs text-slate-500">{r.course || `Code ${r.code}`}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid content-start gap-5">
          <Panel title="Create a room" icon={<Plus className="h-4 w-4 text-green-600" aria-hidden="true" />}>
            <form onSubmit={create} className="grid gap-3">
              <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name, e.g. CSE-B 3rd sem" maxLength={80} aria-label="Room name" />
              <input className={INPUT} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course (optional), e.g. Operating Systems" maxLength={120} aria-label="Course" />
              <button type="submit" className={BTN_GREEN} disabled={busy === "create"}>
                {busy === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Create room
              </button>
            </form>
          </Panel>
          <Panel title="Join with a code" icon={<LogIn className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                join(code);
              }}
              className="flex gap-2"
            >
              <input
                className={`${INPUT} font-mono uppercase tracking-[0.3em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="K7QM2P"
                aria-label="Room code"
              />
              <button type="submit" className={BTN_PURPLE} disabled={busy === "join"}>
                Join
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Composer                                                           */
/* ------------------------------------------------------------------ */

type Tab = "post" | "deadline" | "link" | "library";

function Composer({ roomId, author, onPosted }: { roomId: string; author: string; onPosted: () => void }) {
  const [tab, setTab] = useState<Tab>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [shared, setShared] = useState<string[]>([]);

  useEffect(() => {
    if (tab !== "library" || library) return;
    Promise.all([listLibrary("pyq"), listLibrary("notes"), listLibrary("mastersheet")])
      .then((lists) => setLibrary(lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch((e: Error) => setError(e.message));
  }, [tab, library]);

  const reset = () => {
    setTitle("");
    setBody("");
    setDue("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    let item: Parameters<typeof postItem>[2];
    if (tab === "post") {
      if (!body.trim()) return setError("Write something first.");
      item = { kind: "post", title: body.trim().split("\n")[0].slice(0, 120), body };
    } else if (tab === "deadline") {
      if (!title.trim()) return setError("What is due? e.g. DBMS assignment 2.");
      const at = due ? new Date(due) : null;
      if (!at || Number.isNaN(at.getTime())) return setError("Pick the date and time it is due.");
      item = { kind: "deadline", title, body, due_at: at.toISOString() };
    } else {
      const url = safeUrl(body);
      if (!url) return setError("Paste a full link starting with https://");
      item = { kind: "link", title: title.trim() || new URL(url).hostname, body: url };
    }
    setBusy(true);
    try {
      await postItem(roomId, author, item);
      reset();
      onPosted();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const shareSaved = async (it: LibraryItem) => {
    setBusy(true);
    setError("");
    try {
      const data = await openFromLibrary(it.id);
      if (!data) throw new Error("That item could not be read.");
      await postItem(roomId, author, { kind: it.kind, title: it.title || KIND[it.kind].label, data });
      setShared((s) => [...s, it.id]);
      onPosted();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "post", label: "Post" },
    { id: "deadline", label: "Deadline" },
    { id: "link", label: "Link" },
    { id: "library", label: "From my saved" },
  ];

  return (
    <Panel title="Share with the class" icon={<Send className="h-4 w-4 text-green-600" aria-hidden="true" />}>
      <div role="tablist" aria-label="What to share" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setError("");
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${FOCUS} ${
              tab === t.id ? "bg-[#5b1065] text-white" : "bg-slate-100 text-slate-600 hover:bg-fuchsia-50 hover:text-[#5b1065]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="mt-3">
          {library === null && !error ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your saved work…
            </p>
          ) : library && library.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Nothing saved yet. Analyse papers in the{" "}
              <Link href="/pyq" className="font-bold text-fuchsia-700 underline underline-offset-2">
                PYQ Predictor
              </Link>{" "}
              or build notes and mastersheets while signed in, and they show up here.
            </p>
          ) : (
            <ul className="grid max-h-72 gap-1.5 overflow-y-auto">
              {(library ?? []).map((it) => {
                const k = KIND[it.kind];
                return (
                  <li key={it.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${k.tile}`}>
                      <k.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#3b0a45]">{it.title || k.label}</span>
                      <span className="block text-xs text-slate-500">
                        {k.label} · {ago(it.created_at)}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy || shared.includes(it.id)}
                      onClick={() => shareSaved(it)}
                      className={`inline-flex items-center gap-1 rounded-full bg-[#3ee07a] px-3 py-1.5 text-xs font-bold text-[#2a0730] hover:bg-[#5cf091] disabled:bg-slate-200 disabled:text-slate-500 ${FOCUS}`}
                    >
                      {shared.includes(it.id) ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                      {shared.includes(it.id) ? "Shared" : "Share"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-3">
          {tab === "post" ? (
            <textarea
              className={`${INPUT} min-h-24 resize-y`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Lab record submission moved to Friday. Viva questions from Unit 2 only."
              maxLength={2000}
              aria-label="Post"
            />
          ) : null}
          {tab === "deadline" ? (
            <>
              <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is due? e.g. DBMS assignment 2" maxLength={200} aria-label="What is due" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="datetime-local" className={INPUT} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date and time" />
                <input className={INPUT} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details (optional)" maxLength={500} aria-label="Details" />
              </div>
            </>
          ) : null}
          {tab === "link" ? (
            <>
              <input className={INPUT} value={body} onChange={(e) => setBody(e.target.value)} placeholder="https://…" inputMode="url" aria-label="Link" />
              <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is it? e.g. Unit 3 lecture recording" maxLength={200} aria-label="Link title" />
            </>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          <button type="submit" className={`${BTN_GREEN} justify-self-start`} disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Share
          </button>
        </form>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Room                                                               */
/* ------------------------------------------------------------------ */

function Forecast({ members, me }: { members: Member[]; me: string }) {
  const counts = { sunny: 0, rainy: 0, stormy: 0 } as Record<AssignmentStatus, number>;
  for (const m of members) if (m.weather_at) counts[m.weather]++;
  const known = counts.sunny + counts.rainy + counts.stormy;
  const sorted = [...members].sort((a, b) => (a.user_id === me ? -1 : b.user_id === me ? 1 : 0));

  return (
    <Panel title="Class forecast" icon={<Sun className="h-4 w-4 text-yellow-500" aria-hidden="true" />} aside={<ShareForecast className={`${BTN_LIGHT} px-3 py-1.5 text-xs`} label="Share mine" />}>
      {known ? (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${counts.sunny} sunny, ${counts.rainy} rainy, ${counts.stormy} stormy`}>
            {(["sunny", "rainy", "stormy"] as const).map((k) => (counts[k] ? <span key={k} className={WEATHER[k].bar} style={{ width: `${(counts[k] / known) * 100}%` }} /> : null))}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
            {(["sunny", "rainy", "stormy"] as const).map((k) => (
              <span key={k}>
                {counts[k]} {WEATHER[k].label.toLowerCase()}
              </span>
            ))}
          </p>
        </>
      ) : null}
      <ul className="mt-3 grid max-h-[26rem] gap-1.5 overflow-y-auto">
        {sorted.map((m) => {
          const w = WEATHER[m.weather];
          return (
            <li key={m.user_id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${m.weather_at ? w.tile : "bg-slate-200 text-slate-400"}`} title={m.weather_at ? w.label : "No forecast yet"}>
                <w.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#3b0a45]">
                  {m.display_name}
                  {m.user_id === me ? <span className="ml-1.5 text-xs font-semibold text-fuchsia-700">(you)</span> : null}
                </span>
                <span className="block truncate text-xs text-slate-500">{m.weather_at ? `${m.weather_note} · ${ago(m.weather_at)}` : "Has not planned assignments yet"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Weather comes from each person&apos;s{" "}
        <Link href="/roadmap" className="font-semibold text-fuchsia-700 underline underline-offset-2">
          Roadmap
        </Link>
        . Only the weather and totals are shared, not assignment names.
      </p>
    </Panel>
  );
}

function RoomView({ roomId, me, myName, onBack }: { roomId: string; me: string; myName: string; onBack: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<Awaited<ReturnType<typeof loadRoom>> | undefined>(undefined);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "material" | "deadline" | "talk">("all");
  const [busy, setBusy] = useState("");
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);

  const refresh = useCallback(() => {
    loadRoom(roomId)
      .then((r) => {
        setState(r);
        setLoadedAt(Date.now());
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [roomId]);

  useEffect(() => {
    // Share this browser's weather first, so the forecast includes it.
    syncMyWeather(me).finally(refresh);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(id);
    };
  }, [me, refresh]);

  const items = useMemo(() => state?.items ?? [], [state]);
  const deadlines = useMemo(
    () => items.filter((i) => i.kind === "deadline" && i.due_at && Date.parse(i.due_at) > loadedAt - 86_400_000).sort((a, b) => a.due_at!.localeCompare(b.due_at!)),
    [items, loadedAt],
  );
  const shown = items.filter((i) =>
    filter === "all" ? true : filter === "material" ? MATERIAL.includes(i.kind) : filter === "deadline" ? i.kind === "deadline" : i.kind === "post" || i.kind === "link",
  );

  if (state === undefined) {
    return error ? (
      <div className="mt-8">
        <Alert>{error}</Alert>
      </div>
    ) : (
      <p className="mt-10 flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening the room…
      </p>
    );
  }
  if (state === null) {
    return (
      <div className={`${CARD} mt-8 p-6`}>
        <p className="font-bold text-[#3b0a45]">This room is not available.</p>
        <p className="mt-1 text-sm text-slate-500">It may have been deleted, or you left it.</p>
        <button type="button" onClick={onBack} className={`${BTN_LIGHT} mt-4`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All rooms
        </button>
      </div>
    );
  }

  const { room, members } = state;
  const owner = room.created_by === me;
  const link = inviteLink(room.code);
  const wa = `https://wa.me/?text=${encodeURIComponent(`Join our class room "${room.name}" on SemOS to share PYQs, notes and deadlines: ${link}`)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(`Copying is blocked here. The code is ${room.code}.`);
    }
  };

  const open = async (it: RoomItem) => {
    if (!MATERIAL.includes(it.kind)) return;
    setBusy(it.id);
    const data = await itemData(it.id);
    setBusy("");
    if (!data) return setError("That could not be opened. Try again.");
    const kind = it.kind as "pyq" | "notes" | "mastersheet";
    handOff(kind, data);
    router.push(TOOL_PATH[kind]);
  };

  const remove = async (it: RoomItem) => {
    if (!window.confirm(`Delete "${it.title}" for everyone in the room?`)) return;
    setBusy(it.id);
    try {
      await deleteItem(it.id);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy("");
  };

  const leave = async () => {
    const msg = owner ? `Delete "${room.name}" and everything shared in it, for all ${members.length} members?` : `Leave "${room.name}"?`;
    if (!window.confirm(msg)) return;
    setBusy("leave");
    try {
      if (owner) await deleteRoom(room.id);
      else await leaveRoom(room.id, me);
      onBack();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (nameEdit?.trim()) await renameMe(me, nameEdit);
    setNameEdit(null);
    refresh();
  };

  const myMember = members.find((m) => m.user_id === me);

  return (
    <div className="mt-6">
      <button type="button" onClick={onBack} className={`inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-slate-500 hover:text-[#5b1065] ${FOCUS}`}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All rooms
      </button>

      <section className={`${CARD} mt-3 overflow-hidden`} aria-label="Room">
        <div className="flex flex-wrap items-center gap-5 bg-[radial-gradient(120%_120%_at_0%_0%,#8b1d8f_0%,#5b1065_45%,#2a0730_100%)] p-5 text-white sm:p-7">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Class Room · {members.length} {members.length === 1 ? "member" : "members"}
            </p>
            <h2 className="mt-1 truncate text-3xl font-semibold tracking-tight">{room.name}</h2>
            {room.course ? <p className="text-sm text-white/75">{room.course}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-2xl bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60">Code</span>
              <span className="block font-mono text-xl font-bold tracking-[0.25em]">{room.code}</span>
            </span>
            <button type="button" onClick={copy} className={BTN_GREEN}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy invite link"}
            </button>
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${BTN_LIGHT} bg-white/95`}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-7">
          {nameEdit === null ? (
            <p className="text-slate-500">
              You appear as <span className="font-bold text-[#3b0a45]">{myMember?.display_name ?? myName}</span>{" "}
              <button type="button" onClick={() => setNameEdit(myMember?.display_name ?? myName)} className={`font-semibold text-fuchsia-700 underline underline-offset-2 ${FOCUS}`}>
                change
              </button>
            </p>
          ) : (
            <form onSubmit={saveName} className="flex items-center gap-2">
              <input className={`${INPUT} py-1.5`} value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} maxLength={60} aria-label="Your name in rooms" autoFocus />
              <button type="submit" className={`${BTN_PURPLE} px-4 py-1.5`}>
                Save
              </button>
            </form>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={refresh} className={`${BTN_LIGHT} px-3 py-1.5 text-xs`}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
            </button>
            <button type="button" onClick={leave} disabled={busy === "leave"} className={`${BTN_LIGHT} px-3 py-1.5 text-xs text-red-700`}>
              {owner ? <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> : <DoorOpen className="h-3.5 w-3.5" aria-hidden="true" />}
              {owner ? "Delete room" : "Leave"}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Composer roomId={room.id} author={myMember?.display_name ?? myName} onPosted={refresh} />

          <Panel
            title="Shared in this room"
            icon={<FolderOpen className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}
            aside={
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["all", "All"],
                    ["material", "Study material"],
                    ["deadline", "Deadlines"],
                    ["talk", "Posts & links"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${FOCUS} ${filter === id ? "bg-yellow-200 text-yellow-900" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {shown.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                {items.length === 0 ? "Nothing shared yet. Be the first: share a PYQ analysis, notes or the next deadline." : "Nothing of this kind yet."}
              </p>
            ) : (
              <ul className="grid gap-2">
                {shown.map((it) => {
                  const k = KIND[it.kind];
                  const url = it.kind === "link" ? safeUrl(it.body) : null;
                  return (
                    <li key={it.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.tile}`}>
                        <k.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {it.kind === "post" ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-[#3b0a45]">{it.body}</p>
                        ) : (
                          <p className="break-words text-sm font-bold text-[#3b0a45]">{it.title}</p>
                        )}
                        {it.kind === "deadline" && it.due_at ? (
                          <p className="mt-0.5 text-xs font-semibold text-orange-700">
                            Due {dueLabel(it.due_at)} · {until(it.due_at)}
                          </p>
                        ) : null}
                        {it.kind === "deadline" && it.body ? <p className="mt-0.5 text-xs text-slate-600">{it.body}</p> : null}
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 block truncate text-xs font-semibold text-blue-700 underline underline-offset-2">
                            {url}
                          </a>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-500">
                          {MATERIAL.includes(it.kind) ? `${k.label} · ` : ""}
                          {it.author || "Someone"} · {ago(it.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-1">
                        {MATERIAL.includes(it.kind) ? (
                          <button type="button" onClick={() => open(it)} disabled={Boolean(busy)} className={`inline-flex items-center gap-1 rounded-full bg-[#3ee07a] px-3 py-1.5 text-xs font-bold text-[#2a0730] hover:bg-[#5cf091] ${FOCUS}`}>
                            {busy === it.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                            Open
                          </button>
                        ) : null}
                        {it.user_id === me || owner ? (
                          <button
                            type="button"
                            onClick={() => remove(it)}
                            disabled={Boolean(busy)}
                            aria-label={`Delete ${it.title}`}
                            className={`grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 ${FOCUS}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-5">
          <Panel title="Coming up" icon={<CalendarClock className="h-4 w-4 text-orange-500" aria-hidden="true" />}>
            {deadlines.length ? (
              <ul className="grid gap-2">
                {deadlines.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#3b0a45]">{d.title}</span>
                      <span className="block text-xs text-slate-500">{dueLabel(d.due_at!)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-orange-800 ring-1 ring-orange-200">{until(d.due_at!)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No deadlines shared yet. Add one from &quot;Share with the class&quot;.</p>
            )}
          </Panel>
          <Forecast members={members} me={me} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ClassRooms() {
  const { status, user } = useAccount();
  const params = useSearchParams();
  const router = useRouter();
  const roomId = params.get("room");
  const joinParam = params.get("join");
  const [pending, setPending] = useState<string | null>(null);

  // An invite opened while signed out is remembered until the student signs in.
  useEffect(() => {
    const fromUrl = joinParam ? normaliseCode(joinParam) : null;
    try {
      if (fromUrl) window.localStorage.setItem(PENDING_KEY, fromUrl);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after hydration
      setPending(fromUrl ?? window.localStorage.getItem(PENDING_KEY));
    } catch {
      setPending(fromUrl);
    }
  }, [joinParam]);

  const go = (id: string | null) => {
    try {
      window.localStorage.removeItem(PENDING_KEY);
    } catch {
      // ignore
    }
    setPending(null);
    router.push(id ? `/rooms?room=${id}` : "/rooms");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {!roomId ? (
        <PageHeader
          tag="Together"
          title="Class Rooms"
          text="One room per class. Share PYQ analyses, notes, mastersheets and deadlines, and see how everyone's workload weather looks."
        />
      ) : null}

      {status === "loading" ? (
        <p className="mt-10 flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
        </p>
      ) : !user ? (
        <section className={`${CARD} mt-8 flex flex-wrap items-center gap-5 p-6`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-200 text-yellow-900">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#3b0a45]">{pending ? `You are invited to room ${pending}` : "Sign in to use Class Rooms"}</p>
            <p className="text-sm text-slate-500">
              {pending ? "Sign in or create a free account, then come back to this page to join." : "Rooms are shared with classmates, so they need an account."}
            </p>
          </div>
          <Link href="/account" className={BTN_GREEN}>
            <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
          </Link>
        </section>
      ) : roomId ? (
        <RoomView key={roomId} roomId={roomId} me={user.id} myName={user.name} onBack={() => go(null)} />
      ) : (
        <Lobby key={pending ?? ""} userName={user.name} joinCode={pending} onOpen={(id) => go(id)} />
      )}
    </div>
  );
}
