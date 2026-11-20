"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { listLibrary, openFromLibrary, saveToLibrary, useAccount, type LibraryItem } from "@/lib/account";
import { takeHandoff } from "@/lib/handoff";
import {
  COUNTS,
  STRICTNESS,
  fromMastersheet,
  fromNotes,
  fromPyq,
  report,
  type Question,
  type Strictness,
  type Turn,
  type VivaRecord,
} from "@/lib/viva";
import { BTN_GREEN, BTN_LIGHT, BTN_PURPLE, CARD, FOCUS, INPUT, PageHeader, Panel } from "./FeatureLayout";
import { DropZone, FileChip } from "./FileDrop";
import SavedShelf from "./SavedShelf";

/* ------------------------------------------------------------------ */
/*  Browser speech: listening (speech recognition) and speaking        */
/* ------------------------------------------------------------------ */

type RecResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<RecResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dictation into a text value. Chrome stops after a pause, so it restarts until told to stop. */
function useDictation(setText: (t: string) => void, getText: () => string) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const want = useRef(false);
  const base = useRef("");

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Rec = recognitionClass();
    if (!Rec) return;
    setError("");
    want.current = true;
    const run = () => {
      const r = new Rec();
      r.lang = "en-IN";
      r.continuous = true;
      r.interimResults = true;
      const prefix = getText().trim();
      base.current = prefix ? `${prefix} ` : "";
      r.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        setText(base.current + text.trimStart());
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Microphone access was blocked. Allow it in the browser's address bar, or type your answer.");
          want.current = false;
        } else if (e.error === "audio-capture") {
          setError("No microphone was found. Type your answer instead.");
          want.current = false;
        }
      };
      r.onend = () => {
        if (want.current) run();
        else setListening(false);
      };
      rec.current = r;
      try {
        r.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    };
    run();
  }, [getText, setText]);

  useEffect(() => () => {
    want.current = false;
    rec.current?.abort();
  }, []);

  return { listening, error, start, stop };
}

function speak(text: string, onState: (speaking: boolean) => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  u.voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang === "en-GB") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  u.rate = 0.98;
  u.onstart = () => onState(true);
  u.onend = () => onState(false);
  u.onerror = () => onState(false);
  synth.speak(u);
}

const stopSpeaking = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const VERDICT: Record<Turn["verdict"], { label: string; chip: string }> = {
  strong: { label: "Strong answer", chip: "bg-green-200 text-green-900" },
  ok: { label: "Decent answer", chip: "bg-yellow-200 text-yellow-900" },
  weak: { label: "Weak answer", chip: "bg-orange-200 text-orange-900" },
  wrong: { label: "Off the mark", chip: "bg-pink-200 text-pink-900" },
};

const scoreTint = (s: number) => (s >= 8 ? "bg-green-500" : s >= 6 ? "bg-[#a21caf]" : s >= 4 ? "bg-orange-400" : "bg-red-500");

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const parseTopics = (raw: string) =>
  raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 15);

async function post<T>(body: BodyInit, json: boolean): Promise<T> {
  const res = await fetch("/api/viva", { method: "POST", body, headers: json ? { "Content-Type": "application/json" } : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || "The examiner did not answer. Try again.");
  return data as T;
}

type Source = "topics" | "upload" | "saved";
type Phase = "setup" | "starting" | "asking" | "marking" | "feedback" | "report";
type Session = { subject: string; topics: string[]; brief: string; strictness: Strictness; count: number };
type Marked = Omit<Turn, keyof Question | "answer"> & { next: Question | null };

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

function Report({ record, onRetry, onNew }: { record: VivaRecord; onRetry: (topics: string[]) => void; onNew: () => void }) {
  const r = report(record.turns);
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="mt-8 grid gap-5">
      <section className={`${CARD} grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7`} aria-label="Result">
        <div className="relative mx-auto h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="12" className="stroke-slate-100" />
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="12" strokeLinecap="round" stroke="#3ee07a" strokeDasharray={C} strokeDashoffset={C * (1 - r.percent / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block text-4xl font-bold tabular-nums tracking-tight text-[#3b0a45]">{r.avg.toFixed(1)}</span>
              <span className="block text-xs font-semibold text-slate-500">out of 10</span>
            </span>
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-700">
            {record.subject || "Viva"} · {STRICTNESS[record.strictness].label} examiner · {record.turns.length} questions
          </p>
          <h2 className={`mt-1 text-3xl font-semibold tracking-tight ${r.grade.tone}`}>{r.grade.label}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">{r.grade.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.weak.length ? (
              <button type="button" className={BTN_GREEN} onClick={() => onRetry(r.weak)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Practise weak topics again
              </button>
            ) : null}
            <button type="button" className={BTN_LIGHT} onClick={onNew}>
              <Play className="h-4 w-4" aria-hidden="true" />
              New viva
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Panel title="By topic">
          <ul className="grid gap-3">
            {r.topics.map((t) => (
              <li key={t.topic}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold text-[#3b0a45]">{t.topic}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">{t.avg.toFixed(1)}/10</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${scoreTint(t.avg)}`} style={{ width: `${Math.max(4, t.avg * 10)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Every question">
          <ol className="grid gap-2">
            {record.turns.map((t, i) => (
              <li key={i}>
                <details className="group rounded-2xl bg-slate-50 px-4 py-3">
                  <summary className={`flex cursor-pointer list-none items-start gap-3 ${FOCUS}`}>
                    <span className={`mt-0.5 grid h-7 w-9 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums text-white ${scoreTint(t.score)}`}>{t.score}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-[#3b0a45]">{t.q}</span>
                  </summary>
                  <div className="mt-3 grid gap-2 pl-12 text-sm">
                    <p className="text-slate-600">
                      <span className="font-bold text-slate-700">You said: </span>
                      {t.answer || "(no answer)"}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-bold text-slate-700">Examiner: </span>
                      {t.feedback}
                    </p>
                    {t.missed.length ? (
                      <ul className="grid gap-1">
                        {t.missed.map((m, j) => (
                          <li key={j} className="flex gap-2 text-orange-800">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VivaSimulator() {
  const { user } = useAccount();

  // Setup
  const [source, setSource] = useState<Source>("topics");
  const [subject, setSubject] = useState("");
  const [topicText, setTopicText] = useState("");
  const [handedBrief, setHandedBrief] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [picked, setPicked] = useState<LibraryItem | null>(null);
  const [strictness, setStrictness] = useState<Strictness>("standard");
  const [count, setCount] = useState<number>(8);
  const [voiceOn, setVoiceOn] = useState(true);
  const [canListen, setCanListen] = useState(true);

  // Session
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [marked, setMarked] = useState<Marked | null>(null);
  const [record, setRecord] = useState<VivaRecord | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [askedAt, setAskedAt] = useState(0);
  const [tick, setTick] = useState(0);

  const answerRef = useRef("");
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  const getAnswer = useCallback(() => answerRef.current, []);
  const dictation = useDictation(setAnswer, getAnswer);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- browser features and hand-offs are only known after hydration */
    setCanListen(Boolean(recognitionClass()));
    if (!("speechSynthesis" in window)) setVoiceOn(false);
    const handed = takeHandoff<{ subject?: string; topics?: string[]; brief?: string }>("viva");
    if (handed) {
      setSubject(handed.subject ?? "");
      setTopicText((handed.topics ?? []).join("\n"));
      setHandedBrief(handed.brief ?? "");
      setSource("topics");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    return stopSpeaking;
  }, []);

  useEffect(() => {
    if (source !== "saved" || !user || library) return;
    Promise.all([listLibrary("notes"), listLibrary("pyq"), listLibrary("mastersheet")])
      .then((l) => setLibrary(l.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch((e: Error) => setError(e.message));
  }, [source, user, library]);

  // Thinking-time clock while a question is open.
  useEffect(() => {
    if (phase !== "asking") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const say = (text: string) => {
    if (voiceOn) speak(text, setSpeaking);
  };

  const ask = (q: Question) => {
    setQuestion(q);
    setAnswer("");
    setMarked(null);
    setPhase("asking");
    setAskedAt(Date.now());
    setTick(0);
    say(q.q);
  };

  /* ---------- start ---------- */

  const begin = async (override?: Partial<Session>) => {
    setError("");
    stopSpeaking();
    let s: Session = { subject: subject.trim(), topics: parseTopics(topicText), brief: handedBrief, strictness, count };
    let body: BodyInit;
    let json = true;

    if (override) {
      s = { ...s, ...override };
      body = JSON.stringify({ action: "start", ...s });
    } else if (source === "upload") {
      if (!files.length) return setError("Add your notes as PDFs or photos first.");
      const form = new FormData();
      for (const f of files) form.append("files", f, f.name);
      form.set("subject", s.subject);
      form.set("strictness", strictness);
      form.set("count", String(count));
      body = form;
      json = false;
    } else if (source === "saved") {
      if (!picked) return setError("Pick something you saved first.");
      const data = await openFromLibrary<Record<string, unknown>>(picked.id);
      if (!data) return setError("That item could not be opened. Try again.");
      const m = picked.kind === "notes" ? fromNotes(data) : picked.kind === "pyq" ? fromPyq(data) : fromMastersheet(data);
      s = { ...s, subject: m.subject || s.subject, topics: m.topics, brief: m.brief };
      body = JSON.stringify({ action: "start", ...s });
    } else {
      if (!s.topics.length) return setError("Write at least one topic, e.g. Normalization.");
      body = JSON.stringify({ action: "start", ...s });
    }

    setPhase("starting");
    setTurns([]);
    setRecord(null);
    try {
      const res = await post<{ subject: string; topics: string[]; brief: string; question: Question }>(body, json);
      const next = { ...s, subject: res.subject || s.subject, topics: res.topics, brief: res.brief || s.brief };
      setSession(next);
      ask(res.question);
    } catch (e) {
      setError((e as Error).message);
      setPhase("setup");
    }
  };

  /* ---------- answer ---------- */

  const submit = async (dontKnow = false) => {
    if (!session || !question || phase !== "asking") return;
    const text = dontKnow ? "I don't know." : answer.trim();
    if (!text) return setError("Say or type your answer first, or press \"I don't know\".");
    dictation.stop();
    stopSpeaking();
    setError("");
    setPhase("marking");
    const remaining = session.count - turns.length - 1;
    try {
      const res = await post<Marked>(
        JSON.stringify({
          action: "turn",
          subject: session.subject,
          topics: session.topics,
          brief: session.brief,
          strictness: session.strictness,
          history: turns.map((t) => ({ q: t.q, topic: t.topic, answer: t.answer, score: t.score })),
          question,
          answer: text,
          remaining,
        }),
        true,
      );
      setTurns((all) => [...all, { ...question, answer: dontKnow ? "" : text, score: res.score, verdict: res.verdict, feedback: res.feedback, keyPoints: res.keyPoints, missed: res.missed }]);
      setMarked(res);
      setPhase("feedback");
      say(res.feedback);
    } catch (e) {
      setError((e as Error).message);
      setPhase("asking");
    }
  };

  const finish = (all: Turn[]) => {
    stopSpeaking();
    dictation.stop();
    if (!session || !all.length) {
      setPhase("setup");
      return;
    }
    const rec: VivaRecord = { subject: session.subject, strictness: session.strictness, turns: all, at: Date.now() };
    setRecord(rec);
    setPhase("report");
    const avg = all.reduce((s, t) => s + t.score, 0) / all.length;
    saveToLibrary("viva", `${session.subject || "Viva"} · ${avg.toFixed(1)}/10`, rec);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (marked?.next) ask(marked.next);
    else finish(turns);
  };

  const reset = () => {
    stopSpeaking();
    dictation.stop();
    setPhase("setup");
    setSession(null);
    setQuestion(null);
    setTurns([]);
    setRecord(null);
    setError("");
  };

  const inSession = phase === "asking" || phase === "marking" || phase === "feedback";
  const elapsed = askedAt ? tick : 0;

  /* ---------- render ---------- */

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <PageHeader
        tag="Practice out loud"
        title="Viva Simulator"
        text="An AI examiner asks you questions from your own notes. Answer by speaking, get marked out of 10 on every answer, and see exactly what you missed."
      />

      {phase === "report" && record ? <Report record={record} onRetry={(t) => begin({ subject: record.subject, topics: t, brief: session?.brief ?? "", strictness: record.strictness, count: 5 })} onNew={reset} /> : null}

      {phase === "setup" || phase === "starting" ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Panel title="What should the examiner ask about?" icon={<GraduationCap className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}>
            <div role="tablist" aria-label="Source" className="flex flex-wrap gap-1.5">
              {(
                [
                  ["topics", "Type topics"],
                  ["upload", "Upload notes"],
                  ["saved", "From my saved"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={source === id}
                  onClick={() => {
                    setSource(id);
                    setError("");
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${FOCUS} ${
                    source === id ? "bg-[#5b1065] text-white" : "bg-slate-100 text-slate-600 hover:bg-fuchsia-50 hover:text-[#5b1065]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              {source !== "saved" ? (
                <input className={INPUT} value={subject} onChange={(e) => {
                    setSubject(e.target.value);
                    setError("");
                  }} placeholder="Subject, e.g. Database Management Systems" maxLength={120} aria-label="Subject" />
              ) : null}

              {source === "topics" ? (
                <>
                  <textarea
                    className={`${INPUT} min-h-28 resize-y`}
                    value={topicText}
                    onChange={(e) => {
                      setTopicText(e.target.value);
                      setError("");
                    }}
                    placeholder={"One topic per line or separated by commas, e.g.\nNormalization, ACID properties, B+ trees, Two-phase locking"}
                    aria-label="Topics"
                  />
                  {handedBrief ? (
                    <p className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Using your PYQ analysis too, so questions follow what is actually asked in exams.
                    </p>
                  ) : null}
                </>
              ) : null}

              {source === "upload" ? (
                <DropZone
                  label="Add notes, textbook pages or slides"
                  hint="PDFs or photos · up to 6 files · the examiner asks only from these"
                  multiple
                  onFiles={(f) => {
                    setError("");
                    setFiles((cur) => [...cur, ...f.filter((x) => /\.(pdf|png|jpe?g|webp)$/i.test(x.name))].slice(0, 6));
                  }}
                >
                  {files.length ? (
                    <ul className="mt-2 grid gap-1.5">
                      {files.map((f, i) => (
                        <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => setFiles((cur) => cur.filter((_, j) => j !== i))} />
                      ))}
                    </ul>
                  ) : null}
                </DropZone>
              ) : null}

              {source === "saved" ? (
                !user ? (
                  <p className="rounded-2xl bg-yellow-100 px-4 py-3 text-sm text-yellow-900">Sign in to use the notes, mastersheets and PYQ analyses you saved.</p>
                ) : library === null ? (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your saved work…
                  </p>
                ) : library.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nothing saved yet. Build notes, a mastersheet or a PYQ analysis while signed in and it appears here.</p>
                ) : (
                  <ul className="grid max-h-72 gap-1.5 overflow-y-auto" role="radiogroup" aria-label="Saved work">
                    {library.map((it) => (
                      <li key={it.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={picked?.id === it.id}
                          onClick={() => {
                            setPicked(it);
                            setError("");
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${FOCUS} ${
                            picked?.id === it.id ? "bg-fuchsia-100 ring-2 ring-fuchsia-500" : "bg-slate-50 hover:bg-fuchsia-50"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#3b0a45]">{it.title || "Untitled"}</span>
                            <span className="block text-xs text-slate-500">{it.kind === "pyq" ? "PYQ analysis" : it.kind === "notes" ? "Notes" : "Mastersheet"}</span>
                          </span>
                          {picked?.id === it.id ? <CheckCircle2 className="h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden="true" /> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </Panel>

          <div className="grid content-start gap-5">
            <Panel title="Examiner">
              <div className="grid gap-2" role="radiogroup" aria-label="Examiner strictness">
                {(Object.keys(STRICTNESS) as Strictness[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={strictness === k}
                    onClick={() => setStrictness(k)}
                    className={`rounded-2xl px-4 py-2.5 text-left transition-colors ${FOCUS} ${strictness === k ? "bg-[#5b1065] text-white" : "bg-slate-50 hover:bg-fuchsia-50"}`}
                  >
                    <span className={`block text-sm font-bold ${strictness === k ? "" : "text-[#3b0a45]"}`}>{STRICTNESS[k].label}</span>
                    <span className={`block text-xs ${strictness === k ? "text-white/75" : "text-slate-500"}`}>{STRICTNESS[k].text}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Number of questions">
                  <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-500">Questions</span>
                  {COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={count === n}
                      onClick={() => setCount(n)}
                      className={`h-9 w-9 rounded-full text-sm font-bold ${FOCUS} ${count === n ? "bg-yellow-300 text-[#3b0a45]" : "bg-slate-100 text-slate-600 hover:bg-yellow-100"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-pressed={voiceOn}
                  onClick={() => setVoiceOn((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${FOCUS} ${voiceOn ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                >
                  {voiceOn ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
                  Read questions aloud
                </button>
              </div>
              {!canListen ? (
                <p className="mt-3 rounded-xl bg-yellow-100 px-3 py-2 text-xs text-yellow-900">This browser cannot listen, so you will type your answers. Chrome or Edge let you speak them.</p>
              ) : null}
              {error ? (
                <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
              <button type="button" className={`${BTN_GREEN} mt-4 w-full py-3`} onClick={() => begin()} disabled={phase === "starting"}>
                {phase === "starting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                {phase === "starting" ? "The examiner is reading your material…" : "Start the viva"}
              </button>
            </Panel>
            <div className="tool-light">
              <SavedShelf<VivaRecord>
                kind="viva"
                label="viva reports"
                onOpen={(data) => {
                  if (!Array.isArray(data?.turns)) return;
                  setRecord(data);
                  setSession({ subject: data.subject, topics: [], brief: "", strictness: data.strictness, count: data.turns.length });
                  setPhase("report");
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {inSession && session && question ? (
        <div className="mt-8 grid gap-5">
          <section aria-label="Examiner" className={`${CARD} overflow-hidden`}>
            <div className="bg-[radial-gradient(120%_120%_at_0%_0%,#8b1d8f_0%,#5b1065_45%,#2a0730_100%)] p-5 text-white sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-bold text-[#3b0a45]">
                    Question {Math.min(turns.length + (phase === "feedback" ? 0 : 1), session.count)} of {session.count}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">{STRICTNESS[session.strictness].label} examiner</span>
                </div>
                <button
                  type="button"
                  onClick={() => (turns.length ? finish(turns) : reset())}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20 ${FOCUS}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  End viva
                </button>
              </div>
              <ol className="mt-4 flex gap-1.5" aria-label="Progress">
                {Array.from({ length: session.count }, (_, i) => {
                  const t = turns[i];
                  return (
                    <li
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${t ? scoreTint(t.score) : i === turns.length ? "bg-yellow-300" : "bg-white/20"}`}
                      title={t ? `Q${i + 1}: ${t.score}/10` : `Q${i + 1}`}
                    />
                  );
                })}
              </ol>

              <div className="mt-6 flex gap-4">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                  {speaking ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-yellow-300/40" /> : null}
                  <GraduationCap className="relative h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                    {question.topic}
                    {question.followUp ? <span className="ml-2 rounded-full bg-pink-300 px-2 py-0.5 normal-case tracking-normal text-pink-950">Follow-up</span> : null}
                  </p>
                  <p className="mt-1 text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-[1.7rem]" aria-live="polite">
                    {question.q}
                  </p>
                  {"speechSynthesis" in globalThis ? (
                    <button
                      type="button"
                      onClick={() => speak(question.q, setSpeaking)}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20 ${FOCUS}`}
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Repeat the question
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {phase === "asking" || phase === "marking" ? (
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-4">
                  {canListen ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (dictation.listening) dictation.stop();
                        else {
                          stopSpeaking();
                          dictation.start();
                        }
                      }}
                      disabled={phase === "marking"}
                      aria-pressed={dictation.listening}
                      className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full transition-colors ${FOCUS} ${
                        dictation.listening ? "bg-red-500 text-white" : "bg-[#3ee07a] text-[#2a0730] hover:bg-[#5cf091]"
                      } disabled:opacity-60`}
                      aria-label={dictation.listening ? "Stop listening" : "Answer by speaking"}
                    >
                      {dictation.listening ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-red-400/50" /> : null}
                      {dictation.listening ? <Square className="relative h-5 w-5" aria-hidden="true" /> : <Mic className="relative h-6 w-6" aria-hidden="true" />}
                    </button>
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400" title="Speaking is not supported in this browser">
                      <MicOff className="h-6 w-6" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#3b0a45]">
                      {dictation.listening ? "Listening… speak your answer, then press stop" : canListen ? "Tap the mic and answer out loud" : "Type your answer below"}
                    </p>
                    <p className="text-xs tabular-nums text-slate-500">Thinking time {mmss(elapsed)} · in a real viva, aim to start within 10 seconds</p>
                  </div>
                </div>
                <textarea
                  className={`${INPUT} mt-4 min-h-32 resize-y text-[15px] leading-relaxed`}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={canListen ? "Your spoken answer appears here. You can fix any word before submitting." : "Type your answer as you would say it."}
                  aria-label="Your answer"
                  maxLength={3000}
                  disabled={phase === "marking"}
                />
                {dictation.error || error ? (
                  <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {dictation.error || error}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className={BTN_GREEN} onClick={() => submit(false)} disabled={phase === "marking"}>
                    {phase === "marking" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                    {phase === "marking" ? "The examiner is marking…" : "Submit answer"}
                  </button>
                  <button type="button" className={BTN_LIGHT} onClick={() => submit(true)} disabled={phase === "marking"}>
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    I don&apos;t know
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "feedback" && marked ? (
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`grid h-14 w-16 place-items-center rounded-2xl text-xl font-bold tabular-nums text-white ${scoreTint(marked.score)}`}>{marked.score}</span>
                  <div className="min-w-0 flex-1">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${VERDICT[marked.verdict].chip}`}>{VERDICT[marked.verdict].label}</span>
                    <p className="mt-1.5 text-[15px] font-medium text-[#3b0a45]">{marked.feedback}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-800">A full-marks answer covers</p>
                    <ul className="mt-2 grid gap-1.5 text-sm text-slate-700">
                      {marked.keyPoints.map((k, i) => (
                        <li key={i} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                          {k}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-orange-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-800">You missed</p>
                    {marked.missed.length ? (
                      <ul className="mt-2 grid gap-1.5 text-sm text-slate-700">
                        {marked.missed.map((m, i) => (
                          <li key={i} className="flex gap-2">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-green-800">
                        <Sparkles className="h-4 w-4" aria-hidden="true" /> Nothing important. Well answered.
                      </p>
                    )}
                  </div>
                </div>
                <button type="button" className={`${BTN_PURPLE} mt-5`} onClick={next} autoFocus>
                  {marked.next ? "Next question" : "See my report"}
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
