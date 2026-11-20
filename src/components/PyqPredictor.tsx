"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  BookOpenCheck,
  Check,
  Coffee,
  Copy,
  Flame,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Mic,
  Moon,
  Repeat,
  ScanSearch,
  Siren,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { saveToLibrary } from "@/lib/account";
import { handOff, takeHandoff } from "@/lib/handoff";
import {
  SAMPLE,
  buildPanicPlan,
  defaultStudyHours,
  planToText,
  rankTopics,
  validAnalysis,
  type Analysis,
  type Block,
  type Ranked,
  type Tier,
} from "@/lib/pyq";
import { BTN_GREEN, BTN_LIGHT, BTN_PURPLE, CARD, INPUT, PageHeader, Panel } from "./FeatureLayout";
import SavedShelf from "./SavedShelf";
import ShareToRoom from "./ShareToRoom";
import { fromPyq } from "@/lib/viva";
import { DropZone, FileChip } from "./FileDrop";

const MAX_FILES = 9; // plus one syllabus
const MAX_TOTAL_MB = 18;

const LOADING_LINES = [
  "Reading the question papers…",
  "Matching every question to a topic…",
  "Adding up marks per paper…",
  "Finding questions that keep coming back…",
  "Predicting this year's questions…",
];

const TIER: Record<Tier, { label: string; chip: string }> = {
  must: { label: "Must do", chip: "bg-pink-200 text-pink-900" },
  should: { label: "Should do", chip: "bg-yellow-200 text-yellow-900" },
  extra: { label: "If time", chip: "bg-slate-100 text-slate-600" },
};

const fmtH = (h: number) => (Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`);

/* ------------------------------------------------------------------ */
/*  Results                                                            */
/* ------------------------------------------------------------------ */

function Heatmap({ analysis, ranked }: { analysis: Analysis; ranked: Ranked[] }) {
  const max = Math.max(1, ...ranked.flatMap((r) => r.marks));
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-sm">
        <caption className="sr-only">Marks each topic carried in each paper</caption>
        <thead>
          <tr>
            <th scope="col" className="pb-1 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
              Topic
            </th>
            {analysis.papers.map((p) => (
              <th key={p.label} scope="col" className="w-16 pb-1 text-center text-[11px] font-bold text-slate-500">
                {p.label}
              </th>
            ))}
            <th scope="col" className="w-20 pb-1 text-center text-[11px] font-bold text-slate-500">
              Expect
            </th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => (
            <tr key={r.name}>
              <th scope="row" className="max-w-0 pr-2 text-left font-semibold text-[#3b0a45]">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-slate-400">{r.rank}</span>
                  <span className="truncate" title={r.name}>
                    {r.name}
                  </span>
                  {r.dueBack ? (
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800" title="Asked often but skipped in the latest paper">
                      Due back
                    </span>
                  ) : null}
                </span>
              </th>
              {r.marks.map((m, i) => {
                const a = m / max;
                return (
                  <td
                    key={i}
                    className={`h-9 rounded-lg text-center text-xs font-bold tabular-nums ${m > 0 ? (a > 0.45 ? "text-white" : "text-[#3b0a45]") : "bg-slate-100 text-slate-300"}`}
                    style={m > 0 ? { backgroundColor: `rgba(162, 28, 175, ${0.14 + 0.86 * a})` } : undefined}
                    title={`${r.name}, ${analysis.papers[i]?.label}: ${m} marks`}
                  >
                    {m > 0 ? m : "–"}
                  </td>
                );
              })}
              <td className="text-center">
                <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-bold tabular-nums ${TIER[r.tier].chip}`}>≈{Math.round(r.expected)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BLOCK_STYLE: Record<Block["kind"], { icon: typeof Flame; dot: string; card: string }> = {
  study: { icon: BookOpenCheck, dot: "bg-[#5b1065] text-white", card: "bg-fuchsia-50" },
  break: { icon: Coffee, dot: "bg-green-200 text-green-800", card: "bg-green-50" },
  sleep: { icon: Moon, dot: "bg-blue-200 text-blue-800", card: "bg-blue-50" },
  review: { icon: Sparkles, dot: "bg-yellow-300 text-yellow-900", card: "bg-yellow-100" },
  ready: { icon: AlarmClock, dot: "bg-orange-200 text-orange-800", card: "bg-orange-50" },
  exam: { icon: GraduationCap, dot: "bg-pink-300 text-pink-900", card: "bg-pink-100" },
};

function clock(ms: number, base: number) {
  const d = new Date(ms);
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.round((new Date(ms).setHours(0, 0, 0, 0) - new Date(base).setHours(0, 0, 0, 0)) / 86_400_000);
  return days === 0 ? t : days === 1 ? `Tomorrow ${t}` : `${d.toLocaleDateString([], { weekday: "short" })} ${t}`;
}

const span = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PyqPredictor() {
  const router = useRouter();
  const [papers, setPapers] = useState<File[]>([]);
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isSample, setIsSample] = useState(false);
  const request = useRef<AbortController | null>(null);

  // Panic Mode
  const [hoursLeft, setHoursLeft] = useState(14);
  const [studyHours, setStudyHours] = useState(defaultStudyHours(14));
  const [panicAt, setPanicAt] = useState(0); // when the plan was made (0 = not yet)
  const [copied, setCopied] = useState(false);

  const ranked = useMemo(() => (analysis ? rankTopics(analysis) : []), [analysis]);
  const plan = useMemo(
    () => (analysis && panicAt ? buildPanicPlan(ranked, analysis.predicted, panicAt, hoursLeft, studyHours) : null),
    [analysis, ranked, panicAt, hoursLeft, studyHours],
  );

  const show = (a: Analysis, sample: boolean) => {
    request.current?.abort();
    setAnalysis(a);
    setIsSample(sample);
    setError("");
    setPanicAt(0);
    setLoading(false);
    requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Something opened from a Class Room arrives here.
  useEffect(() => {
    const handed = validAnalysis(takeHandoff("pyq"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of sessionStorage after hydration
    if (handed) show(handed, false);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 2600);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => () => request.current?.abort(), []);

  const addPapers = (files: File[]) => {
    setError("");
    const ok = files.filter((f) => /\.(pdf|png|jpe?g|webp)$/i.test(f.name));
    if (ok.length < files.length) setError("Only PDF, JPG, PNG and WEBP files can be read.");
    if (papers.length + ok.length > MAX_FILES) setError(`Add at most ${MAX_FILES} papers at a time.`);
    setPapers([...papers, ...ok].slice(0, MAX_FILES));
  };

  const analyse = async () => {
    if (loading) return;
    if (papers.length === 0) {
      setError("Add at least one question paper. Three or more give much better predictions.");
      return;
    }
    const total = papers.reduce((s, f) => s + f.size, 0) + (syllabus?.size ?? 0);
    if (total > MAX_TOTAL_MB * 1024 * 1024) {
      setError(`These files are ${(total / 1024 / 1024).toFixed(1)} MB together. Keep them under ${MAX_TOTAL_MB} MB.`);
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    setLine(0);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    const body = new FormData();
    for (const f of papers) body.append("papers", f, f.name);
    if (syllabus) body.set("syllabus", syllabus, syllabus.name);
    body.set("subject", subject.trim());
    try {
      const res = await fetch("/api/pyq", { method: "POST", body, signal: controller.signal });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error || "The papers could not be analysed. Try again.");
      const result = validAnalysis(json);
      if (!result) throw new Error("The analysis came back incomplete. Try again.");
      show(result, false);
      const issues = [...(json.unreadable ?? []), ...(json.skipped ?? []).map((n: string) => `${n} was skipped`)];
      if (issues.length) setNotice(`Some parts could not be read: ${issues.join("; ")}`);
      // Signed in: keep a copy in the account (does nothing when signed out).
      saveToLibrary("pyq", `${result.subject || "PYQ analysis"} · ${result.papers.length} papers`, result);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const startPanic = () => {
    setPanicAt(Date.now());
    requestAnimationFrame(() => document.getElementById("panic-plan")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const changeHoursLeft = (h: number) => {
    const v = Math.min(96, Math.max(1, h || 1));
    setHoursLeft(v);
    setStudyHours(defaultStudyHours(v));
    if (panicAt) setPanicAt(Date.now());
  };
  const changeStudy = (h: number) => {
    setStudyHours(Math.min(hoursLeft, Math.max(0.5, h || 0.5)));
    if (panicAt) setPanicAt(Date.now());
  };

  const copyPlan = async () => {
    if (!plan || !analysis) return;
    try {
      await navigator.clipboard.writeText(planToText(plan, analysis.subject));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Copying is blocked in this browser. Select the plan and copy it by hand.");
    }
  };

  const toMastersheet = () => {
    if (!analysis) return;
    const topics = (plan?.covered ?? ranked).slice(0, 12).map((r) => r.name);
    handOff("mastersheet", { subject: analysis.subject, unit: "Top exam topics (from PYQ Predictor)", topics });
    router.push("/mastersheet");
  };

  const toViva = () => {
    if (!analysis) return;
    handOff("viva", fromPyq(analysis as unknown as Record<string, unknown>));
    router.push("/viva");
  };

  const mustCount = ranked.filter((r) => r.tier === "must").length;
  const mustMarks = ranked.filter((r) => r.tier === "must").reduce((s, r) => s + r.total, 0);
  const allMarks = ranked.reduce((s, r) => s + r.total, 0) || 1;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <PageHeader
        tag="Exam season"
        title="PYQ Predictor"
        text="Upload past question papers. See which topics come every year, the questions that repeat, what is likely this time, and a cram plan if the exam is tomorrow."
        actions={
          <>
            <button type="button" className={BTN_LIGHT} onClick={() => show(SAMPLE, true)}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              See a sample
            </button>
            <a href="#upload" className={BTN_GREEN}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload papers
            </a>
          </>
        }
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel id="upload" title="Your question papers" icon={<ScanSearch className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}>
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Course (optional)</span>
              <input className={INPUT} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Operating Systems, BCS303" maxLength={120} />
            </label>

            <DropZone label="Add question papers" hint="PDFs or photos, one or many papers per file · up to 9 files" multiple onFiles={addPapers}>
              {papers.length ? (
                <ul className="mt-2 grid gap-1.5">
                  {papers.map((f, i) => (
                    <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => setPapers((cur) => cur.filter((_, j) => j !== i))} />
                  ))}
                </ul>
              ) : null}
            </DropZone>

            <DropZone label="Add the syllabus (optional)" hint="Helps spot topics that have never been asked yet" multiple={false} onFiles={(f) => f[0] && setSyllabus(f[0])}>
              {syllabus ? (
                <ul className="mt-2">
                  <FileChip file={syllabus} onRemove={() => setSyllabus(null)} />
                </ul>
              ) : null}
            </DropZone>

            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button type="button" className={`${BTN_GREEN} w-full py-3`} onClick={analyse} disabled={loading}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
              {loading ? LOADING_LINES[line] : `Analyse ${papers.length || ""} ${papers.length === 1 ? "paper" : "papers"}`.replace(/\s+/g, " ")}
            </button>
            {loading ? <p className="text-center text-xs text-slate-500">This usually takes 20–40 seconds.</p> : null}
          </div>
        </Panel>

        <div className="grid content-start gap-5">
          <Panel title="How it works">
            <ol className="grid gap-3 text-sm">
              {[
                ["Upload 3–5 past papers", "Photos from the library or PDFs from the department site both work."],
                ["See the pattern", "A heatmap of marks per topic per paper, and the questions that repeat."],
                ["Study in the right order", "Topics ranked Must do, Should do and If time, with likely questions."],
                ["Exam tomorrow?", "Panic Mode turns the ranking into an hour-by-hour plan up to the exam."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-yellow-200 text-xs font-bold text-yellow-900">{i + 1}</span>
                  <span>
                    <span className="block font-bold text-[#3b0a45]">{t}</span>
                    <span className="block text-slate-500">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
          <div className="tool-light">
            <SavedShelf<Analysis>
              kind="pyq"
              label="PYQ analyses"
              onOpen={(data) => {
                const a = validAnalysis(data);
                if (a) show(a, false);
              }}
            />
          </div>
        </div>
      </div>

      {analysis ? (
        <div id="results" className="scroll-mt-6">
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-700">{isSample ? "Sample analysis" : "Your analysis"}</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3b0a45]">{analysis.subject || "Your course"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isSample ? <ShareToRoom kind="pyq" title={`${analysis.subject || "PYQ analysis"} · ${analysis.papers.length} papers`} data={analysis} /> : null}
              <button type="button" className={BTN_LIGHT} onClick={toViva}>
                <Mic className="h-4 w-4" aria-hidden="true" />
                Practise viva
              </button>
              <button type="button" className={BTN_PURPLE} onClick={startPanic}>
                <Siren className="h-4 w-4" aria-hidden="true" />
                Panic Mode
              </button>
            </div>
          </div>

          {notice ? <p className="mt-4 rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-900">{notice}</p> : null}

          <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { v: String(analysis.papers.length), l: "papers read", c: "bg-fuchsia-100 text-[#5b1065]" },
              { v: String(ranked.length), l: "topics examined", c: "bg-green-100 text-green-800" },
              { v: `${Math.round((mustMarks / allMarks) * 100)}%`, l: `of marks in ${mustCount} must-do topics`, c: "bg-yellow-100 text-yellow-800" },
              { v: String(analysis.repeated.length), l: "repeated questions", c: "bg-pink-100 text-pink-800" },
            ].map((s) => (
              <li key={s.l} className={`rounded-2xl px-4 py-3.5 ${s.c}`}>
                <span className="block text-3xl font-bold tabular-nums tracking-tight">{s.v}</span>
                <span className="mt-0.5 block text-xs font-semibold opacity-80">{s.l}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Panel
              title="Topic heatmap"
              icon={<Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />}
              aside={<span className="text-xs text-slate-500">Marks per paper · darker = more marks</span>}
            >
              <Heatmap analysis={analysis} ranked={ranked} />
            </Panel>

            <Panel title="Study in this order" icon={<TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />}>
              <ol className="grid gap-2">
                {ranked.map((r) => (
                  <li key={r.name} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">{r.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#3b0a45]">{r.name}</span>
                      <span className="block text-xs text-slate-500">
                        In {r.asked} of {analysis.papers.length} papers{r.unit ? ` · ${r.unit}` : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TIER[r.tier].chip}`}>{TIER[r.tier].label}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Most likely this year" icon={<Sparkles className="h-4 w-4 text-yellow-500" aria-hidden="true" />}>
              <ol className="grid gap-2.5">
                {analysis.predicted.map((p, i) => (
                  <li key={i} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-bold tabular-nums text-slate-400">{i + 1}.</span>
                      <p className="min-w-0 flex-1 text-sm font-semibold text-[#3b0a45]">{p.q}</p>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600 ring-1 ring-[#5b1065]/10">{p.marks}m</span>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 pl-6 text-xs text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${p.likelihood === "high" ? "bg-pink-200 text-pink-900" : "bg-yellow-200 text-yellow-900"}`}>
                        {p.likelihood === "high" ? "High chance" : "Medium chance"}
                      </span>
                      {p.why}
                    </p>
                  </li>
                ))}
              </ol>
            </Panel>

            <div className="grid content-start gap-5">
              <Panel title="Questions that keep coming back" icon={<Repeat className="h-4 w-4 text-fuchsia-600" aria-hidden="true" />}>
                {analysis.repeated.length ? (
                  <ul className="grid gap-2.5">
                    {analysis.repeated.map((r, i) => (
                      <li key={i} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-[#3b0a45]">{r.q}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <span className="font-bold text-fuchsia-700">{r.papers.length}×</span> · {r.papers.join(", ")}
                          {r.marks ? ` · ${r.marks} marks` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No question was repeated word for word. Add more papers to find repeats.</p>
                )}
              </Panel>
              {analysis.insights.length ? (
                <Panel title="Paper pattern" icon={<Lightbulb className="h-4 w-4 text-yellow-500" aria-hidden="true" />}>
                  <ul className="grid gap-2 text-sm text-slate-600">
                    {analysis.insights.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3ee07a]" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </div>
          </div>

          {/* ---------------- Panic Mode ---------------- */}
          <section id="panic" aria-labelledby="panic-title" className={`${CARD} mt-5 scroll-mt-6 overflow-hidden`}>
            <div className="bg-[radial-gradient(120%_120%_at_0%_0%,#8b1d8f_0%,#5b1065_45%,#2a0730_100%)] p-5 text-white sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-3 py-1 text-xs font-bold text-[#3b0a45]">
                    <Siren className="h-3.5 w-3.5" aria-hidden="true" /> Panic Mode
                  </p>
                  <h2 id="panic-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Exam soon? Get an hour-by-hour plan.
                  </h2>
                  <p className="mt-2 text-sm text-white/75">Most-asked topics first, 50 minutes on and 10 off, sleep if there is time, and a final review before you leave.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70">Exam starts in (hours)</span>
                  <input
                    type="number"
                    min={1}
                    max={96}
                    step={0.5}
                    value={hoursLeft}
                    onChange={(e) => changeHoursLeft(Number(e.target.value))}
                    className="w-full rounded-2xl bg-white/10 px-4 py-2.5 text-lg font-bold tabular-nums text-white ring-1 ring-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70">Hours I can study</span>
                  <input
                    type="number"
                    min={0.5}
                    max={hoursLeft}
                    step={0.5}
                    value={studyHours}
                    onChange={(e) => changeStudy(Number(e.target.value))}
                    className="w-full rounded-2xl bg-white/10 px-4 py-2.5 text-lg font-bold tabular-nums text-white ring-1 ring-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </label>
                <button type="button" onClick={startPanic} className={`${BTN_GREEN} py-3`}>
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  {plan ? "Rebuild from now" : "Make my plan"}
                </button>
              </div>
            </div>

            {plan ? (
              <div id="panic-plan" className="scroll-mt-6 p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-[#3b0a45]">{fmtH(Math.round((plan.studyMinutes / 60) * 10) / 10)} of study</span> covering{" "}
                    <span className="font-bold text-[#3b0a45]">{plan.covered.length} topics</span>, worth{" "}
                    <span className="font-bold text-green-700">{Math.round(plan.coverage * 100)}% of past marks</span>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BTN_LIGHT} onClick={copyPlan}>
                      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {copied ? "Copied" : "Copy plan"}
                    </button>
                    <button type="button" className={BTN_GREEN} onClick={toMastersheet}>
                      Mastersheet of these topics
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <ol className="mt-5 grid gap-2">
                  {plan.blocks.map((b, i) => {
                    const s = BLOCK_STYLE[b.kind];
                    return (
                      <li key={i} className="grid grid-cols-[5.5rem_auto_1fr] items-start gap-3 sm:grid-cols-[7.5rem_auto_1fr]">
                        <span className="pt-2 text-right text-xs font-bold tabular-nums text-slate-500">{clock(b.start, panicAt)}</span>
                        <span className={`mt-1 grid h-7 w-7 place-items-center rounded-full ${s.dot}`}>
                          <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div className={`min-w-0 rounded-2xl px-4 py-2.5 ${s.card}`}>
                          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold text-[#3b0a45]">
                            <span className="min-w-0">{b.title}</span>
                            {b.kind !== "exam" ? <span className="text-xs font-semibold tabular-nums text-slate-500">{span(b.end - b.start)}</span> : null}
                          </p>
                          {b.detail ? <p className="mt-0.5 text-xs text-slate-600">{b.detail}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {plan.skipped.length ? (
                  <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-bold text-[#3b0a45]">Not enough time for:</span> {plan.skipped.map((s) => s.name).join(", ")}. Together they carried{" "}
                    {Math.round((plan.skipped.reduce((s, r) => s + r.total, 0) / allMarks) * 100)}% of past marks, so they are the safest to skip.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
