"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Plus,
  Rocket,
  ShieldCheck,
  ShieldAlert,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Grade maths (pure functions)                                       */
/* ------------------------------------------------------------------ */

// 10-point scale used for every projection on this page.
const BANDS = [
  { min: 90, gp: 10, letter: "O" },
  { min: 80, gp: 9, letter: "A+" },
  { min: 70, gp: 8, letter: "A" },
  { min: 60, gp: 7, letter: "B+" },
  { min: 50, gp: 6, letter: "B" },
  { min: 45, gp: 5, letter: "C" },
  { min: 40, gp: 4, letter: "P" },
  { min: 0, gp: 0, letter: "F" },
];
const PASS = BANDS[6];
const EPS = 1e-9;

const bandFor = (pct) => BANDS.find((b) => pct + EPS >= b.min);
const ceil = (x) => Math.ceil(x - EPS);
const num = (v) => (String(v).trim() === "" ? NaN : Number(v));

/** Turn a form row into a subject, or return the reason it is not usable yet. */
function parseRow(row, index) {
  const credits = num(row.credits);
  const total = num(row.total);
  const scored = num(row.scored);
  const topper = num(row.topper);
  const blank = [row.name, row.credits, row.total, row.scored, row.topper].every((v) => String(v).trim() === "");
  if (blank) return { blank: true };
  if (!(credits > 0)) return { error: "Enter the course credits." };
  if (!(total > 0)) return { error: "Enter the total marks of what has been assessed so far." };
  if (!(scored >= 0)) return { error: "Enter the marks you scored." };
  if (scored > total) return { error: "Your marks can't be more than the total." };
  if (!Number.isNaN(topper)) {
    if (topper > total) return { error: "The highest marks can't be more than the total." };
    if (topper < scored) return { error: "The highest marks can't be below your own." };
  }
  return {
    subject: {
      id: row.id,
      name: row.name.trim() || `Subject ${index + 1}`,
      credits,
      total,
      scored,
      topper: Number.isNaN(topper) || topper <= 0 ? null : topper,
    },
  };
}

/**
 * Everything the right-hand column shows.
 * final % = current % x completed weight + remaining % x remaining weight.
 * With the relative curve on, a subject's % is scaled so the class topper's
 * current rate counts as 100%.
 */
function analyze({ target, subjects, assessments, relative }) {
  const rw = Math.min(1, assessments.reduce((s, a) => s + a.weight, 0) / 100);
  const cw = 1 - rw;
  const remMax = assessments.reduce((s, a) => s + a.max, 0);
  const totalCredits = subjects.reduce((s, x) => s + x.credits, 0);

  const rows = subjects.map((s) => {
    const p = (s.scored / s.total) * 100;
    const curved = relative && s.topper;
    const scale = curved ? s.total / s.topper : 1;
    const shown = (raw) => Math.min(100, raw * scale);
    // % needed across the remaining assessments to finish in `band`
    const required = (band) => {
      const needRaw = band.min / scale;
      if (rw <= 0) return p + EPS >= needRaw ? 0 : Infinity;
      const r = (needRaw - p * cw) / rw;
      return r <= EPS ? 0 : r;
    };
    const projected = bandFor(shown(p)); // if you keep scoring at your current rate
    const secured = bandFor(shown(p * cw)); // even with zero in everything left
    const options = BANDS.filter((b) => b.gp >= secured.gp && required(b) <= 100 + EPS).map((b) => ({
      band: b,
      r: required(b),
    }));
    return { ...s, p, curved, shownPct: shown(p), projected, secured, required, options };
  });

  const projectedSgpa = rows.reduce((s, x) => s + x.credits * x.projected.gp, 0) / totalCredits;

  // Most balanced set of grades that reaches the target: knapsack over half-credit points.
  // Effort grows with the square of how far a subject must rise above its current pace, so the
  // plan spreads the load instead of demanding full marks in one subject. Ties go to fewer marks.
  const effort = (x, r) => Math.max(0, r - x.p) ** 2 + 0.01 * r;
  const units = rows.map((x) => Math.round(x.credits * 2));
  const totalUnits = units.reduce((a, b) => a + b, 0);
  const maxPts = totalUnits * 10;
  let layer = new Array(maxPts + 1).fill(null);
  layer[0] = { cost: 0, picks: [] };
  rows.forEach((x, i) => {
    const next = new Array(maxPts + 1).fill(null);
    layer.forEach((state, pts) => {
      if (!state) return;
      for (const o of x.options) {
        const np = pts + units[i] * o.band.gp;
        const cost = state.cost + effort(x, o.r);
        if (!next[np] || cost < next[np].cost - EPS) next[np] = { cost, picks: [...state.picks, o] };
      }
    });
    layer = next;
  });
  const needPts = ceil(target * totalUnits);
  let best = null;
  let bestPts = -1;
  for (let pts = needPts; pts <= maxPts; pts++) {
    if (layer[pts] && (!best || layer[pts].cost < best.cost - EPS)) {
      best = layer[pts];
      bestPts = pts;
    }
  }
  const feasible = Boolean(best);
  if (!best) {
    for (let pts = maxPts; pts >= 0; pts--) {
      if (layer[pts]) {
        best = layer[pts];
        bestPts = pts;
        break;
      }
    }
  }

  const marksFor = (r) => assessments.map((a) => ({ name: a.name, max: a.max, marks: Math.min(a.max, ceil((r / 100) * a.max)) }));

  const items = rows.map((x, i) => {
    const pick = best.picks[i];
    const passR = x.required(PASS);
    return {
      id: x.id,
      name: x.name,
      credits: x.credits,
      curved: x.curved,
      band: pick.band,
      r: pick.r,
      safe: pick.r === 0,
      parts: marksFor(pick.r),
      passSecured: passR === 0,
      passPossible: passR <= 100 + EPS,
      passParts: marksFor(Math.min(100, passR)),
    };
  });
  const totalMarks = items.reduce((s, it) => s + it.parts.reduce((m, p) => m + p.marks, 0), 0);
  const hardest = [...items].filter((it) => !it.safe).sort((a, b) => b.r - a.r)[0];

  // Which subject gives the most SGPA for the fewest extra marks beyond your current pace.
  const ranking = rows
    .map((x) => {
      const idx = BANDS.indexOf(x.projected);
      const nextBand = idx > 0 ? BANDS[idx - 1] : null;
      if (!nextBand || rw <= 0) return { id: x.id, name: x.name, reason: nextBand ? "Nothing left to be assessed." : "Already at the top grade." };
      const r = x.required(nextBand);
      if (r > 100 + EPS) return { id: x.id, name: x.name, reason: `${nextBand.letter} is out of reach from here.` };
      const extraMarks = Math.max(1, ceil(((r - x.p) / 100) * remMax));
      const boost = (x.credits * (nextBand.gp - x.projected.gp)) / totalCredits;
      return { id: x.id, name: x.name, from: x.projected, to: nextBand, extraMarks, boost, yieldPer: boost / extraMarks };
    })
    .sort((a, b) => (b.yieldPer ?? -1) - (a.yieldPer ?? -1));

  return {
    rows,
    rw,
    cw,
    remMax,
    projectedSgpa,
    feasible,
    planSgpa: bestPts / totalUnits,
    items,
    totalMarks,
    hardest,
    ranking,
    passAll: items.every((it) => it.passSecured),
    passOpen: items.filter((it) => !it.passSecured).length,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared UI                                                          */
/* ------------------------------------------------------------------ */

const LABEL = "block font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400";
const INPUT =
  "border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none";
const CARD = "border border-slate-800 bg-slate-900/80";
const PRIMARY =
  "inline-flex items-center justify-center gap-2 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400";

const newId = () => Math.random().toString(36).slice(2, 10);
const blankRow = () => ({ id: newId(), name: "", credits: "", total: "", scored: "", topper: "" });

const SAMPLE = [
  ["CS301 - Operating Systems", 4, 50, 40, 47],
  ["CS302 - Database Systems", 4, 50, 46, 48],
  ["CS303 - Computer Networks", 3, 50, 33, 45],
  ["MA301 - Probability & Statistics", 3, 50, 36, 44],
  ["HS301 - Environmental Studies", 2, 50, 42, 46],
];

function StepCard({ n, title, done, children }) {
  return (
    <section className={CARD}>
      <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center border font-mono text-[11px] ${
            done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600 text-slate-300"
          }`}
        >
          {done ? <Check className="h-3 w-3" aria-hidden="true" /> : n}
        </span>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Step {n} · {title}
        </h2>
      </header>
      <div className="px-4 py-5">{children}</div>
    </section>
  );
}

function Alert({ children }) {
  return (
    <p role="alert" className="mt-4 border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: one subject row                                            */
/* ------------------------------------------------------------------ */

const FIELDS = [
  { key: "credits", label: "Credits", ph: "4" },
  { key: "total", label: "Total marks", ph: "50" },
  { key: "scored", label: "Your marks", ph: "40" },
  { key: "topper", label: "Highest", ph: "47" },
];

function SubjectRow({ row, index, parsed, relative, onChange, onRemove, canRemove }) {
  const s = parsed.subject;
  let metrics = null;
  if (s) {
    const pct = (s.scored / s.total) * 100;
    const rel = s.topper ? Math.min(100, (s.scored / s.topper) * 100) : null;
    const band = bandFor(relative && rel !== null ? rel : pct);
    metrics = (
      <p className="mt-2 font-mono text-xs text-emerald-400">
        {pct.toFixed(1)}%
        {rel !== null ? <span className="text-slate-400"> · {rel.toFixed(1)}% of topper</span> : null}
        <span className="text-slate-400"> · projected grade </span>
        {band.letter} ({band.gp})
        {relative && rel === null ? <span className="text-slate-500"> · no topper score, so no curve</span> : null}
      </p>
    );
  }

  return (
    <li className="border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-start gap-2">
        <span className="pt-2.5 font-mono text-xs text-slate-500">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            aria-label={`Subject ${index + 1} code or name`}
            placeholder="CS301 - Operating Systems"
            value={row.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={`${INPUT} w-full`}
          />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-500">{f.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder={f.ph}
                  aria-label={`Subject ${index + 1} ${f.label.toLowerCase()}`}
                  value={row[f.key]}
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
                  className={`${INPUT} mt-1 w-full font-mono`}
                />
              </label>
            ))}
          </div>
          {metrics}
          {parsed.error ? <p className="mt-2 text-xs text-red-300">{parsed.error}</p> : null}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove subject ${index + 1}`}
          className="inline-flex h-10 w-9 shrink-0 items-center justify-center border border-slate-800 text-slate-500 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Right column                                                       */
/* ------------------------------------------------------------------ */

function Badge({ tone, icon: Icon, children }) {
  const tones = {
    good: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
    warn: "border-amber-400/50 bg-amber-400/10 text-amber-300",
    bad: "border-red-400/50 bg-red-400/10 text-red-300",
  };
  return (
    <p className={`flex items-start gap-2 border px-3 py-2.5 text-sm leading-relaxed ${tones[tone]}`}>
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  );
}

function ScoreCard({ result, target }) {
  const gap = target - result.projectedSgpa;
  const t = Number(target.toFixed(2));
  const available = result.items.length * result.remMax;
  const marks = `${result.totalMarks} of the ${available} marks still available`;

  let badge;
  if (result.rw <= 0) {
    badge = result.feasible ? (
      <Badge tone="good" icon={Rocket}>{`Nothing is left to be assessed and your marks already give an SGPA of ${t}.`}</Badge>
    ) : (
      <Badge tone="bad" icon={Target}>{`Nothing is left to be assessed, so the SGPA stays at ${result.planSgpa.toFixed(2)}.`}</Badge>
    );
  } else if (!result.feasible) {
    badge = (
      <Badge tone="bad" icon={Target}>
        {`An SGPA of ${t} is out of reach this semester. With full marks in everything left, the best possible is ${result.planSgpa.toFixed(2)}. The plan below aims for that.`}
      </Badge>
    );
  } else if (result.totalMarks === 0) {
    badge = <Badge tone="good" icon={Rocket}>{`Target locked in! 🚀 Your marks so far already secure an SGPA of ${t}.`}</Badge>;
  } else if (gap <= 0) {
    badge = (
      <Badge tone="good" icon={Rocket}>
        {`🔥 You're on track! Keep your current pace. You need ${marks} across upcoming assessments to reach an SGPA of ${t}.`}
      </Badge>
    );
  } else if (gap <= 0.5) {
    badge = (
      <Badge tone="good" icon={Rocket}>
        {`You're almost there! 🚀 You need ${marks} across upcoming assessments to reach an SGPA of ${t}.`}
      </Badge>
    );
  } else {
    badge = (
      <Badge tone="warn" icon={Target}>
        {`A real push is needed: ${marks} across upcoming assessments to reach an SGPA of ${t}.`}
      </Badge>
    );
  }

  return (
    <section className={CARD}>
      <h2 className={`border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>Live target analysis</h2>
      <div className="px-4 py-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">Current projected SGPA</p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-emerald-400">
              {result.projectedSgpa.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">if you keep scoring at today&apos;s rate</p>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <p className="text-xs text-slate-400">Target SGPA</p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-white">{target.toFixed(2)}</p>
            <p className={`mt-1 font-mono text-xs ${gap <= 0 ? "text-emerald-400" : "text-amber-300"}`}>
              {gap <= 0 ? `${Math.abs(gap).toFixed(2)} ahead` : `${gap.toFixed(2)} short`}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {badge}
          {result.passAll ? (
            <Badge tone="good" icon={ShieldCheck}>
              Pass Shield Active: every subject is already past the pass mark, even with zero in what is left.
            </Badge>
          ) : (
            <Badge tone="warn" icon={ShieldAlert}>
              {`Pass Shield not active yet: ${result.passOpen} subject${result.passOpen === 1 ? " still needs" : "s still need"} marks to pass. See the roadmap.`}
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}

const joinParts = (parts) => parts.map((p) => `${p.marks}/${p.max} in ${p.name}`).join(" and ");

function Roadmap({ result }) {
  return (
    <section className={CARD}>
      <h2 className={`border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>Where to score and how much</h2>
      <ol className="divide-y divide-slate-800">
        {result.items.map((it) => (
          <li key={it.id} className="px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-white">{it.name}</p>
              <span className="font-mono text-xs text-emerald-400">
                target {it.band.letter} ({it.band.gp}) · {it.credits} cr
              </span>
            </div>
            {it.safe ? (
              <p className="mt-1 text-sm text-emerald-300">
                {`Safe Zone reached! ${it.band.letter} is already secured.`}
                {result.hardest ? ` Focus remaining time on ${result.hardest.name}.` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-300">
                Score minimum <span className="font-mono text-emerald-400">{joinParts(it.parts)}</span>
                {it.curved ? <span className="text-slate-500"> (relative curve target)</span> : null}.
              </p>
            )}
            {!it.passSecured ? (
              <p className="mt-1 font-mono text-xs text-amber-300">
                {it.passPossible ? `To pass: at least ${joinParts(it.passParts)}.` : "A pass is out of reach even with full marks."}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Ranking({ result }) {
  return (
    <section className={CARD}>
      <h2 className={`flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 ${LABEL}`}>
        <Zap className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
        Panic-mode priority ranking
      </h2>
      <ol className="divide-y divide-slate-800">
        {result.ranking.map((r, i) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-slate-500">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{r.name}</p>
              {r.reason ? (
                <p className="mt-0.5 text-xs text-slate-500">{r.reason}</p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400">
                  {r.from.letter} → {r.to.letter} with {r.extraMarks} extra mark{r.extraMarks === 1 ? "" : "s"} beyond your
                  current pace
                </p>
              )}
            </div>
            {r.reason ? null : (
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-400">
                +{r.boost.toFixed(2)} SGPA
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-800 px-4 py-2.5 text-xs text-slate-500">
        Ranked by SGPA gained per extra mark, as a stand-in for study hours.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Analyzer                                                           */
/* ------------------------------------------------------------------ */

export default function GradeAnalyzer() {
  const [step, setStep] = useState(1);
  const [target, setTarget] = useState("8.5");
  const [count, setCount] = useState("5");
  const [rows, setRows] = useState([]);
  const [files, setFiles] = useState([]);
  const [assessments, setAssessments] = useState([{ id: "end-sem", name: "End-Sem Exam", weight: 50, max: 100 }]);
  const [relative, setRelative] = useState(true);
  const [stepError, setStepError] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  /* ----- step 1 ----- */
  const proceed = (e) => {
    e.preventDefault();
    const t = num(target);
    const n = num(count);
    if (!(t > 0 && t <= 10)) return setStepError("Enter a target between 0 and 10.");
    if (!(Number.isInteger(n) && n >= 1 && n <= 12)) return setStepError("Enter a whole number of subjects from 1 to 12.");
    setStepError("");
    setRows((rs) => Array.from({ length: n }, (_, i) => rs[i] ?? blankRow()));
    setStep((s) => Math.max(s, 2));
  };

  /* ----- step 2 ----- */
  const patchRow = (id, change) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const setRowsAndCount = (next) => {
    setRows(next);
    setCount(String(next.length));
  };
  const fillSample = () =>
    setRowsAndCount(
      SAMPLE.map(([name, credits, total, scored, topper]) => ({
        id: newId(),
        name,
        credits: String(credits),
        total: String(total),
        scored: String(scored),
        topper: String(topper),
      })),
    );

  /* ----- step 3 ----- */
  const addFiles = (list) => {
    const ok = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
    const next = [...files];
    const bad = [];
    for (const f of Array.from(list)) {
      const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")).toLowerCase() : "";
      if (!ok.includes(ext)) bad.push(`${f.name}: file type not accepted`);
      else if (f.size > 10 * 1024 * 1024) bad.push(`${f.name}: larger than 10 MB`);
      else if (next.length >= 3) bad.push(`${f.name}: limit of 3 files reached`);
      else if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push({ name: f.name, size: f.size });
    }
    setFileError(bad.join(". "));
    setFiles(next);
  };
  const weightSum = assessments.reduce((s, a) => s + a.weight, 0);
  const patchAssessment = (id, change) =>
    setAssessments((as) =>
      as.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...change };
        const others = as.reduce((s, x) => s + (x.id === id ? 0 : x.weight), 0);
        next.weight = Math.max(0, Math.min(100 - others, next.weight)); // the split can never pass 100%
        return next;
      }),
    );

  /* ----- derived ----- */
  const parsed = rows.map(parseRow);
  const subjects = parsed.filter((p) => p.subject).map((p) => p.subject);
  const t = num(target);
  const targetOk = t > 0 && t <= 10;
  const cleanAssessments = assessments
    .filter((a) => a.weight > 0 && a.max > 0)
    .map((a) => ({ ...a, name: a.name.trim() || "Upcoming assessment" }));
  const result =
    subjects.length && targetOk ? analyze({ target: t, subjects, assessments: cleanAssessments, relative }) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">Grade analyzer</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Find the marks you need for your target
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Enter your marks so far and what is still to come. SemOS works out the minimum you need in each subject and
        where your study time pays off most.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* LEFT: step-by-step input */}
        <div className="min-w-0 space-y-5">
          <StepCard n={1} title="Target and subject count" done={step > 1}>
            <form onSubmit={proceed} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="target" className={LABEL}>
                    Target SGPA / CGPA
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="target"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.1"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder="8.5"
                      className={`${INPUT} w-28 font-mono`}
                    />
                    <span className="font-mono text-sm text-slate-500">/ 10.0</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="count" className={LABEL}>
                    Number of subjects this semester
                  </label>
                  <input
                    id="count"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="12"
                    step="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="5"
                    className={`${INPUT} mt-2 w-28 font-mono`}
                  />
                </div>
              </div>
              {stepError ? <Alert>{stepError}</Alert> : null}
              <button type="submit" className={`${PRIMARY} mt-5`}>
                {step > 1 ? "Update subject count" : "Proceed to Subject Breakdown"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </StepCard>

          {step >= 2 ? (
            <StepCard n={2} title="Subject marks" done={step > 2}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Total marks = everything assessed so far. Highest = the class topper&apos;s marks out of the same total.
                </p>
                <button
                  type="button"
                  onClick={fillSample}
                  className="font-mono text-xs text-slate-400 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-emerald-400"
                >
                  Fill sample data
                </button>
              </div>
              <ol className="mt-3 space-y-2">
                {rows.map((row, i) => (
                  <SubjectRow
                    key={row.id}
                    row={row}
                    index={i}
                    parsed={parsed[i]}
                    relative={relative}
                    onChange={(change) => patchRow(row.id, change)}
                    onRemove={() => setRowsAndCount(rows.filter((r) => r.id !== row.id))}
                    canRemove={rows.length > 1}
                  />
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => rows.length < 12 && setRowsAndCount([...rows, blankRow()])}
                  disabled={rows.length >= 12}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add subject
                </button>
                {step === 2 ? (
                  <button type="button" onClick={() => setStep(3)} className={PRIMARY}>
                    Continue to Evaluation Pattern
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </StepCard>
          ) : null}

          {step >= 3 ? (
            <StepCard n={3} title="Course delivery plan / evaluation pattern" done={false}>
              <label
                htmlFor="cdp-upload"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`block cursor-pointer border border-dashed px-4 py-4 transition-colors focus-within:border-emerald-400 ${
                  dragOver ? "border-emerald-400 bg-emerald-400/5" : "border-slate-700 bg-slate-950 hover:border-slate-500"
                }`}
              >
                <input
                  id="cdp-upload"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="flex items-start gap-3">
                  <Upload className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Upload CDP / Syllabus Evaluation Breakdown (.pdf, .docx, screenshot)
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                      Upload your continuous evaluation split (e.g., Mid-Sem 30%, Lab 20%, End-Sem 50%) so SemOS can
                      map out your exact path to hit your target.
                    </span>
                  </span>
                </span>
              </label>
              {files.length ? (
                <ul className="mt-1.5 space-y-1">
                  {files.map((f) => (
                    <li key={f.name + f.size} className="flex items-center gap-2 border border-slate-800 bg-slate-950/60 px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((x) => x !== f))}
                        aria-label={`Remove ${f.name}`}
                        className="inline-flex h-5 w-5 items-center justify-center text-slate-500 transition-colors hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {files.length ? (
                <p className="mt-2 text-xs text-amber-300">
                  Attached. Automatic reading of the file is not connected yet, so set the split below.
                </p>
              ) : null}
              {fileError ? (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {fileError}.
                </p>
              ) : null}

              <div className="mt-5">
                <p className={LABEL}>Upcoming assessments</p>
                <ul className="mt-2 space-y-2">
                  {assessments.map((a, i) => (
                    <li key={a.id} className="border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label={`Assessment ${i + 1} name`}
                          value={a.name}
                          onChange={(e) => patchAssessment(a.id, { name: e.target.value })}
                          placeholder="End-Sem Exam"
                          className={`${INPUT} min-w-0 flex-1`}
                        />
                        <label className="flex shrink-0 items-center gap-2 font-mono text-xs text-slate-500">
                          out of
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            aria-label={`Assessment ${i + 1} maximum marks`}
                            value={a.max || ""}
                            onChange={(e) => patchAssessment(a.id, { max: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                            className={`${INPUT} w-20 font-mono`}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setAssessments(assessments.filter((x) => x.id !== a.id))}
                          aria-label={`Remove assessment ${i + 1}`}
                          className="inline-flex h-10 w-9 shrink-0 items-center justify-center border border-slate-800 text-slate-500 transition-colors hover:border-slate-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <label className="mt-3 flex items-center gap-3">
                        <span className="shrink-0 text-xs text-slate-400">Weightage</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={a.weight}
                          onChange={(e) => patchAssessment(a.id, { weight: Number(e.target.value) })}
                          aria-label={`Assessment ${i + 1} weightage percent`}
                          className="h-1 min-w-0 flex-1 cursor-pointer accent-emerald-500"
                        />
                        <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-emerald-400">
                          {a.weight}%
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAssessments([...assessments, { id: newId(), name: "", weight: Math.min(20, 100 - weightSum), max: 50 }])
                    }
                    disabled={weightSum >= 100 || assessments.length >= 5}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add assessment
                  </button>
                  <p className="font-mono text-xs text-slate-500">
                    Done so far <span className="text-slate-200">{100 - weightSum}%</span> · still to come{" "}
                    <span className="text-emerald-400">{weightSum}%</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
                <div>
                  <p id="relative-label" className="text-sm text-slate-200">
                    Relative grading curve
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Estimate: treats the topper&apos;s current score as 100%. Turn off for absolute grading.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={relative}
                  aria-labelledby="relative-label"
                  onClick={() => setRelative(!relative)}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    relative ? "border-emerald-500 bg-emerald-500" : "border-slate-700 bg-slate-800"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform ${
                      relative ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </StepCard>
          ) : null}
        </div>

        {/* RIGHT: live analysis and action plan */}
        <div className="min-w-0 space-y-5 lg:sticky lg:top-20">
          {result ? (
            <>
              <ScoreCard result={result} target={t} />
              <Roadmap result={result} />
              <Ranking result={result} />
              <details className={`${CARD} px-4 py-3 text-xs text-slate-400`}>
                <summary className="cursor-pointer font-mono uppercase tracking-[0.18em] text-slate-400">
                  Grade scale used
                </summary>
                <p className="mt-3 font-mono leading-relaxed text-slate-300">
                  {BANDS.map((b) => `${b.letter} ${b.min}%+ = ${b.gp}`).join(" · ")}
                </p>
                <p className="mt-2 leading-relaxed text-slate-500">
                  Final % = marks so far × done weightage + upcoming marks × upcoming weightage. Check your
                  university&apos;s own grade bands and any minimum end-sem pass mark.
                </p>
              </details>
            </>
          ) : (
            <section className={`${CARD} px-4 py-10 text-center`}>
              <Target className="mx-auto h-6 w-6 text-slate-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-slate-300">Your projected SGPA and action plan appear here.</p>
              <p className="mt-1 text-xs text-slate-500">
                {step === 1 ? "Set a target and subject count to begin." : "Fill in at least one subject's marks."}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
