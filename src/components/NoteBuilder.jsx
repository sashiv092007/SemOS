"use client";

import { ToolBody, ToolHero } from "./ToolLayout";
import { ListChecks, FileDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { triggerSweep } from "@/lib/sweep";
import { saveToLibrary } from "@/lib/account";
import SavedShelf from "./SavedShelf";
import Lazy3D from "./three/Lazy3D";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Maximize,
  Minimize,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CARD_ACTIVE, Glow, LABEL, PAPER_SHADOW, WindowBar } from "./ui";

const MessyCleanScene = dynamic(() => import("./three/MessyCleanScene"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Sample note material (stands in for OCR output)                    */
/* ------------------------------------------------------------------ */

const SUBJECT = "Operating Systems";
const UNIT = "Unit 3 — Process Synchronization";

// **double asterisks** mark keywords that are shown in bold.
const TOPICS = [
  {
    name: "Critical Section Problem",
    def: "A **critical section** is a code segment that accesses **shared data** and must be executed by at most one process at a time.",
    summary:
      "When several processes read and write the same data, the final result can depend on the order in which they run. This is a race condition. A correct solution lets processes cooperate without corrupting the shared data.",
    bullets: [
      "**Mutual exclusion**: only one process is inside its critical section.",
      "**Progress**: if no one is inside, the choice of who enters next cannot be postponed forever.",
      "**Bounded waiting**: a limit exists on how many times others enter before a waiting process does.",
    ],
    qa: [
      { q: "Define critical section.", a: "A code segment that accesses shared data and must be executed by only one process at a time." },
      { q: "What is a race condition?", a: "A situation where the outcome depends on the order in which processes access shared data." },
    ],
  },
  {
    name: "Peterson's Solution",
    def: "**Peterson's solution** is a software solution for **two processes** that uses a shared **turn** variable and a **flag[2]** array.",
    summary:
      "A process sets its flag to show it wants to enter, then gives the turn to the other process. It waits only while the other process also wants to enter and holds the turn.",
    formula: { label: "Entry section of process i", expr: "flag[i] = true;  turn = j;\nwhile (flag[j] && turn == j);" },
    bullets: [
      "Satisfies **mutual exclusion**, **progress** and **bounded waiting**.",
      "Works for **two processes** only.",
      "Uses **busy waiting**, which wastes CPU time.",
    ],
    qa: [
      { q: "Which variables does Peterson's solution use?", a: "An integer turn and a boolean array flag[2]." },
      { q: "State one limitation of Peterson's solution.", a: "It works for only two processes and uses busy waiting." },
    ],
  },
  {
    name: "Semaphores",
    def: "A **semaphore** is an integer variable that is accessed only through two atomic operations, **wait()** and **signal()**.",
    summary:
      "A semaphore controls how many processes may use a resource at once. To avoid busy waiting, a blocked process is placed in a queue attached to the semaphore and woken by signal().",
    formula: { label: "Definitions", expr: "wait(S):   while (S <= 0);  S--;\nsignal(S): S++;" },
    bullets: [
      "**Binary semaphore**: value 0 or 1, used as a lock (mutex).",
      "**Counting semaphore**: any non-negative value, used for a pool of resources.",
      "A busy-waiting semaphore is called a **spinlock**.",
    ],
    qa: [
      { q: "Define semaphore.", a: "An integer variable accessed only through the atomic operations wait() and signal()." },
      { q: "Differentiate binary and counting semaphores.", a: "A binary semaphore takes only 0 or 1; a counting semaphore can take any non-negative value." },
    ],
  },
  {
    name: "Bounded-Buffer Problem",
    def: "The **bounded-buffer (producer-consumer) problem** synchronises a producer and a consumer that share a buffer of **n** slots.",
    summary:
      "The producer must wait when the buffer is full and the consumer must wait when it is empty. Three semaphores keep the two in step and protect the buffer itself.",
    formula: { label: "Initial values", expr: "mutex = 1,  empty = n,  full = 0" },
    bullets: [
      "**mutex** gives exclusive access to the buffer.",
      "**empty** counts free slots; the producer does wait(empty).",
      "**full** counts filled slots; the consumer does wait(full).",
    ],
    qa: [
      { q: "Name the semaphores used in the bounded-buffer problem.", a: "mutex initialised to 1, empty initialised to n and full initialised to 0." },
    ],
  },
  {
    name: "Monitors",
    def: "A **monitor** is a high-level synchronisation construct in which **only one process** can be active at a time.",
    summary:
      "A monitor groups shared data with the procedures that operate on it. Processes that cannot continue wait on condition variables inside the monitor.",
    bullets: [
      "**Condition variables** support x.wait() and x.signal().",
      "x.wait() suspends the caller until another process calls x.signal().",
      "Mutual exclusion is provided **automatically** by the monitor.",
    ],
    qa: [
      { q: "What is a monitor?", a: "A synchronisation construct that allows only one process to be active inside it at a time." },
      { q: "What is a condition variable?", a: "A variable inside a monitor on which processes wait and signal using x.wait() and x.signal()." },
    ],
  },
  {
    name: "Deadlock",
    def: "A **deadlock** is a state in which each process in a set is **waiting for a resource held by another** process in the set.",
    summary:
      "Deadlock can arise only if four conditions hold together. Breaking any one of them prevents it; the Banker's algorithm avoids it by granting only requests that keep the system in a safe state.",
    formula: { label: "Banker's algorithm", expr: "Need = Max - Allocation" },
    bullets: [
      "**Mutual exclusion** and **hold and wait**.",
      "**No preemption** and **circular wait**.",
      "A **safe state** has at least one safe sequence of all processes.",
    ],
    qa: [
      { q: "List the necessary conditions for deadlock.", a: "Mutual exclusion, hold and wait, no preemption and circular wait." },
      { q: "What is a safe state?", a: "A state in which a safe sequence exists, so every process can finish." },
    ],
  },
];

/** Built-in example, shown by "See sample notes" and before any real build. */
const SAMPLE = { subject: SUBJECT, unit: UNIT, topics: TOPICS };

const MODES = [
  { id: "exam", label: "Exam Ready", hint: "Bullet Points + Keywords" },
  { id: "detailed", label: "Detailed Summary", hint: "Short paragraphs per topic" },
  { id: "qa", label: "2-Mark Question & Answer Bank", hint: "Question and model answer" },
];

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** The paginated note contents for a formatting depth. `data` is the AI's notes or the sample. */
function buildPages(mode, data = SAMPLE) {
  const unit = data.unit || data.subject || "Your notes";
  if (mode === "qa") {
    const all = data.topics.flatMap((t) => t.qa.map((x) => ({ type: "qa", topic: t.name, ...x })));
    return chunk(all, 4).map((blocks) => ({ title: unit, subtitle: "2-Mark Question & Answer Bank", blocks }));
  }
  return chunk(data.topics, 2).map((group) => ({
    title: unit,
    subtitle: group.map((t) => t.name).join(" · "),
    blocks: group.flatMap((t) => [
      { type: "heading", text: t.name },
      mode === "detailed" ? { type: "para", text: `${t.def} ${t.summary}` } : { type: "def", text: t.def },
      ...(t.formula ? [{ type: "formula", ...t.formula }] : []),
      { type: "bullets", items: mode === "detailed" ? t.bullets.slice(0, 2) : t.bullets },
    ]),
  }));
}

const plain = (s) => s.replace(/\*\*/g, "");

/** "Unit 3 — Process Synchronization" -> "unit-3-process-synchronization" */
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "notes";

function pageToText(page, index) {
  const lines = [`Page ${index + 1}: ${page.title}`, page.subtitle, ""];
  for (const b of page.blocks) {
    if (b.type === "heading") lines.push("", b.text.toUpperCase());
    else if (b.type === "def" || b.type === "para") lines.push(plain(b.text));
    else if (b.type === "formula") lines.push(`${b.label}:`, b.expr);
    else if (b.type === "bullets") b.items.forEach((it) => lines.push(`- ${plain(it)}`));
    else if (b.type === "qa") lines.push(`Q. ${b.q}`, `A. ${b.a}`, "");
  }
  return lines.join("\n").trim();
}

/* ------------------------------------------------------------------ */
/*  PDF export (real file, built with jsPDF)                           */
/* ------------------------------------------------------------------ */

// The built-in PDF fonts cover basic Latin only.
const pdfSafe = (s) =>
  plain(s)
    .replace(/[—–−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "|")
    .replace(/[^\x20-\x7E\n]/g, "");

async function buildPdf(pages, subject = SUBJECT) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const maxW = W - M * 2;
  let y = M;

  const room = (h) => {
    if (y + h > H - M - 20) {
      doc.addPage();
      y = M;
    }
  };
  const text = (str, { size = 11, style = "normal", font = "helvetica", color = [30, 41, 59], indent = 0, gap = 6 } = {}) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfSafe(str), maxW - indent);
    const lh = size * 1.4;
    for (const line of lines) {
      room(lh);
      doc.text(line, M + indent, y + size);
      y += lh;
    }
    y += gap;
  };

  pages.forEach((page, i) => {
    if (i > 0) {
      doc.addPage();
      y = M;
    }
    text(`SEMOS | ${subject || "Notes"}`, { size: 8, color: [100, 116, 139], gap: 4 });
    text(`Page ${i + 1}: ${page.title}`, { size: 16, style: "bold", color: [15, 23, 42], gap: 2 });
    text(page.subtitle, { size: 10, style: "italic", color: [71, 85, 105], gap: 6 });
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 14;

    for (const b of page.blocks) {
      if (b.type === "heading") {
        y += 6;
        room(40);
        text(b.text, { size: 12, style: "bold", color: [15, 23, 42], gap: 4 });
      } else if (b.type === "def" || b.type === "para") {
        text(b.text, { gap: 8 });
      } else if (b.type === "formula") {
        const lines = pdfSafe(b.expr).split("\n");
        const boxH = 26 + lines.length * 14;
        room(boxH + 8);
        doc.setFillColor(15, 23, 42);
        doc.rect(M, y, maxW, boxH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(pdfSafe(b.label).toUpperCase(), M + 10, y + 13);
        doc.setFont("courier", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(52, 211, 153);
        lines.forEach((line, k) => doc.text(line, M + 10, y + 28 + k * 14));
        y += boxH + 10;
      } else if (b.type === "bullets") {
        for (const it of b.items) {
          room(16);
          doc.setFillColor(71, 85, 105);
          doc.circle(M + 4, y + 7.5, 1.6, "F");
          text(it, { indent: 14, gap: 2 });
        }
        y += 6;
      } else if (b.type === "qa") {
        room(50);
        text(`Q. ${b.q}`, { style: "bold", color: [15, 23, 42], gap: 2 });
        text(`A. ${b.a}`, { gap: 12 });
      }
    }
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${total}`, W / 2, H - 30, { align: "center" });
  }
  doc.save("semos-notes.pdf");
}

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

const TOOL =
  "inline-flex h-9 min-w-9 rounded-lg items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-2 font-mono text-xs text-slate-300 transition-all duration-200 hover:border-slate-700 hover:text-slate-100 disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:text-slate-300";
const EXPORT =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50";

const MAX_FILES = 12;
const MAX_MB = 15;
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const ACCEPT_EXT = [...IMAGE_EXT, ".pdf"];

const fmtSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Rich({ text }) {
  return text.split("**").map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-slate-950">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Block({ block }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="mt-6 border-b border-slate-300 pb-1 font-sans text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900 first:mt-0">
          {block.text}
        </h3>
      );
    case "def":
    case "para":
      return (
        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-700">
          <Rich text={block.text} />
        </p>
      );
    case "formula":
      return (
        <figure className="mt-3 rounded-md border border-slate-800 bg-slate-900 px-3.5 py-2.5">
          <figcaption className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate-400">{block.label}</figcaption>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-emerald-400">
            {block.expr}
          </pre>
        </figure>
      );
    case "bullets":
      return (
        <ul className="mt-3 space-y-1.5">
          {block.items.map((it) => (
            <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
              <span aria-hidden="true" className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 bg-slate-500" />
              <span>
                <Rich text={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "qa":
      return (
        <div className="mt-4 border-l-2 border-slate-900 pl-3.5 first:mt-0">
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-slate-500">{block.topic} · 2 marks</p>
          <p className="mt-1 text-[15px] font-semibold leading-relaxed text-slate-950">Q. {block.q}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700">A. {block.a}</p>
        </div>
      );
    default:
      return null;
  }
}

function PaperPage({ page, index, total, zoom, subject = SUBJECT }) {
  return (
    <article
      style={{ zoom }}
      className={`mx-auto w-full max-w-[40rem] border border-stone-300 bg-[#fbf9f1] px-6 py-7 font-serif text-slate-900 antialiased sm:px-10 sm:py-9 ${PAPER_SHADOW}`}
    >
      <header className="border-b-4 border-double border-slate-900 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          SEMOS <span className="text-slate-400">/</span> {subject || "Notes"}
        </p>
        <h2 className="mt-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          Page {index + 1}: {page.title}
        </h2>
        <p className="mt-1 text-sm italic text-slate-600">{page.subtitle}</p>
      </header>
      <div className="mt-5">
        {page.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
      <footer className="mt-8 border-t border-stone-300 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        Page {index + 1} of {total}
      </footer>
    </article>
  );
}

function Toggle({ checked, onChange, labelId }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        checked ? "border-emerald-500 bg-emerald-500" : "border-slate-700 bg-slate-800"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Note Builder                                                       */
/* ------------------------------------------------------------------ */

export default function NoteBuilder() {
  // left column
  const [files, setFiles] = useState([]); // { id, name, size, kind, url, file }
  const [mode, setMode] = useState("exam");
  const [autoClean, setAutoClean] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | processing | complete
  const [notes, setNotes] = useState(null); // notes from the AI; null = the built-in sample
  const request = useRef(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // reader
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpDraft, setJumpDraft] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState(null); // { kind: "busy" | "done" | "error", text }

  const viewerRef = useRef(null);
  const canvasRef = useRef(null);
  const timers = useRef({ progress: null, toast: null });
  const urls = useRef(new Set());

  useEffect(() => {
    const t = timers.current;
    const u = urls.current;
    const onFs = () => setFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      clearInterval(t.progress);
      clearTimeout(t.toast);
      request.current?.abort();
      u.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const data = notes ?? SAMPLE;
  const pages = status === "complete" ? buildPages(mode, data) : [];

  // First page of the notes, simplified for the 3D before/after preview.
  const previewPage = useMemo(() => {
    const first = buildPages(mode, data)[0];
    const blocks = first.blocks.flatMap((b) => {
      if (b.type === "heading") return [{ type: "heading", text: b.text }];
      if (b.type === "def" || b.type === "para") return [{ type: "text", text: plain(b.text) }];
      if (b.type === "formula") return [{ type: "formula", text: b.expr, label: b.label }];
      if (b.type === "bullets") return b.items.map((it) => ({ type: "bullet", text: plain(it) }));
      if (b.type === "qa") return [{ type: "heading", text: `Q. ${b.q}` }, { type: "text", text: `A. ${b.a}` }];
      return [];
    });
    return { title: first.title, subtitle: first.subtitle, blocks };
  }, [mode, data]);
  const beforeImage = files.find((f) => f.url)?.url ?? null;
  const total = pages.length;
  const page = Math.min(currentPage, Math.max(1, total));

  /* ----- uploads ----- */
  const addFiles = (list) => {
    const next = [...files];
    const bad = [];
    for (const f of Array.from(list)) {
      const ext = f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")).toLowerCase() : "";
      if (!ACCEPT_EXT.includes(ext)) bad.push(`${f.name}: file type not accepted`);
      else if (f.size > MAX_MB * 1024 * 1024) bad.push(`${f.name}: larger than ${MAX_MB} MB`);
      else if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      else if (next.length >= MAX_FILES) bad.push(`${f.name}: limit of ${MAX_FILES} files reached`);
      else {
        const isImage = IMAGE_EXT.includes(ext);
        const url = isImage ? URL.createObjectURL(f) : null;
        if (url) urls.current.add(url);
        next.push({ id: `${f.name}-${f.size}-${f.lastModified}`, name: f.name, size: f.size, kind: isImage ? "IMG" : "PDF", url, file: f });
      }
    }
    setError(bad.join(". "));
    setFiles(next);
  };
  const removeFile = (file) => {
    if (file.url) {
      URL.revokeObjectURL(file.url);
      urls.current.delete(file.url);
    }
    setFiles(files.filter((f) => f.id !== file.id));
  };

  /* ----- processing ----- */
  // Progress bar: real builds creep towards 90% while the AI works, the sample fills quickly.
  const runProgress = (step, cap, onFull) => {
    let value = 0;
    clearInterval(timers.current.progress);
    timers.current.progress = setInterval(() => {
      value = Math.min(cap, value + step * (1 - value / 110));
      setProgress(Math.round(value));
      if (value >= cap && onFull) {
        clearInterval(timers.current.progress);
        onFull();
      }
    }, 100);
  };
  const finish = () => {
    clearInterval(timers.current.progress);
    setProgress(100);
    setStatus("complete");
    setCurrentPage(1);
  };

  /** Show notes saved in the account in the reader. */
  const openSaved = (saved) => {
    if (!Array.isArray(saved?.topics)) return;
    request.current?.abort();
    setError("");
    setNotes({ subject: saved.subject ?? "", unit: saved.unit ?? "", topics: saved.topics });
    finish();
    triggerSweep();
  };

  const startBuild = async (useFiles) => {
    if (status === "processing") return;
    if (useFiles && files.length === 0) {
      setError("Add at least one photo, screenshot or PDF first");
      return;
    }
    setError("");
    triggerSweep();
    setStatus("processing");
    setProgress(0);

    if (!useFiles) {
      setNotes(null);
      runProgress(6, 100, finish);
      return;
    }

    runProgress(1.2, 90);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const body = new FormData();
    for (const f of files) body.append("files", f.file, f.name);
    body.set("autoClean", String(autoClean));
    try {
      const res = await fetch("/api/notes", { method: "POST", body, signal: controller.signal });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error || "The notes could not be built. Try again.");
      const built = { subject: json.subject, unit: json.unit, topics: json.topics };
      setNotes(built);
      finish();
      // Signed in: keep a copy in the account (does nothing when signed out).
      saveToLibrary("notes", [built.subject, built.unit].filter(Boolean).join(" · ") || "Notes", built);
      const issues = [...(json.unreadable ?? []), ...(json.skipped ?? []).map((n) => `${n} was skipped`)];
      showToast(
        issues.length
          ? { kind: "error", text: `Built from ${json.filesRead} file(s). Note: ${issues.slice(0, 2).join("; ")}` }
          : { kind: "done", text: `Built ${json.topics.length} topics from ${json.filesRead} file(s)` },
        issues.length ? 6000 : 3000,
      );
    } catch (err) {
      if (err.name === "AbortError") return;
      clearInterval(timers.current.progress);
      setProgress(0);
      setStatus(notes ? "complete" : "idle");
      setError(err.message);
    }
  };
  const stage = progress < 45 ? "Reading your files with AI..." : progress < 80 ? "Finding the topics..." : "Structuring pages...";

  /* ----- reader ----- */
  const goTo = (n) => {
    if (!total) return;
    setCurrentPage(Math.max(1, Math.min(total, n)));
    setJumpDraft(null);
    if (canvasRef.current) canvasRef.current.scrollTop = 0;
  };
  const showToast = (next, ms) => {
    clearTimeout(timers.current.toast);
    setToast(next);
    if (ms) timers.current.toast = setTimeout(() => setToast(null), ms);
  };
  const copyPage = async () => {
    const value = pageToText(pages[page - 1], page - 1);
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // Clipboard API is unavailable on plain-http pages or when blocked: fall back to a hidden field.
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      (viewerRef.current ?? document.body).appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }
    showToast(
      ok ? { kind: "done", text: `Page ${page} text copied` } : { kind: "error", text: "Copy was blocked by the browser" },
      ok ? 2200 : 3000,
    );
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewerRef.current?.requestFullscreen?.();
  };

  const [downloading, setDownloading] = useState(false);
  async function handleDownloadPDF() {
    if (!total || downloading) return;
    setDownloading(true);
    showToast({ kind: "busy", text: "Preparing your PDF…" });
    try {
      // keep the spinner on screen long enough to be seen
      await Promise.all([buildPdf(pages, data.subject), new Promise((r) => setTimeout(r, 700))]);
      showToast({ kind: "done", text: `Saved semos-notes.pdf (${total} pages)` }, 3000);
    } catch {
      showToast({ kind: "error", text: "The PDF could not be created. Try again." }, 4000);
    } finally {
      setDownloading(false);
    }
  }

  return (
<>
      <ToolHero
        tag="Notes · Photos to PDF"
        title="Turn Messy Sources Into Clean Notes"
        text="Textbook photos, WhatsApp board screenshots, lecture slides and PDFs go in. Structured, page-by-page notes come out."
        cta="Build my notes"
        scene={<Lazy3D
          Scene={MessyCleanScene}
          props={{ beforeImage, status, progress, page: previewPage }}
          className="h-full w-full" />}
        caption={null}
        cards={[{ icon: ImagePlus, title: "Any source", text: "Photos, slides, PDFs" }, { icon: ListChecks, title: "3 formats", text: "Exam ready, summary, Q&A" }, { icon: FileDown, title: "Download", text: "Page-by-page PDF" }]}
        stats={[{ value: "12", label: "Files per batch" }, { value: "15 MB", label: "Per file" }, { value: "3", label: "Note formats" }, { value: "PDF", label: "Ready to download" }]}
      />
      <ToolBody>
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
      <div className="grid items-start gap-6 xl:grid-cols-[35fr_65fr]">
        {/* LEFT 35%: upload and processing */}
        <section className={`min-w-0 overflow-hidden ${CARD_ACTIVE}`}>
          <WindowBar path="notes/sources.queue" title="Source upload and processing engine" right="Input" />
          <div className="space-y-6 px-4 py-5">
            {/* Upload zone */}
            <div>
              <label
                htmlFor="note-sources"
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
                className={`block cursor-pointer rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-within:border-emerald-400 ${
                  dragOver ? "border-emerald-400 bg-emerald-400/5" : files.length
            ? "border-emerald-400/40 bg-emerald-400/[0.03] hover:border-emerald-400/60"
            : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/40"
                }`}
              >
                <input
                  id="note-sources"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <ImagePlus className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
                <span className="mt-2 block text-sm font-medium text-slate-100">Drop photos, screenshots or PDFs</span>
                <span className="mt-1 block text-xs text-slate-500">or click to browse</span>
                <span className="mt-3 inline-block rounded-lg border border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  .jpg .png .webp .pdf · max {MAX_FILES} files · {MAX_MB} MB each
                </span>
              </label>

              {files.length ? (
                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                  {files.map((f) => (
                    <li key={f.id} className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950 transition-all duration-200 hover:border-slate-700">
                      <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-900">
                        {f.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                          <img src={f.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FileText className="h-7 w-7 text-slate-500" aria-hidden="true" />
                        )}
                      </div>
                      <span
                        className={`absolute left-1 top-1 rounded border px-1 py-0.5 font-mono text-[9px] leading-none ${
                          f.kind === "PDF"
                            ? "border-amber-400/50 bg-slate-950 text-amber-300"
                            : "border-emerald-400/50 bg-slate-950 text-emerald-400"
                        }`}
                      >
                        {f.kind}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f)}
                        aria-label={`Remove ${f.name}`}
                        className="absolute right-1 top-1 inline-flex h-5 w-5 rounded items-center justify-center border border-slate-700 bg-slate-950 text-slate-400 transition-colors hover:text-slate-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <p className="truncate px-1.5 pt-1 font-mono text-[10px] text-slate-300" title={f.name}>
                        {f.name}
                      </p>
                      <p className="px-1.5 pb-1 font-mono text-[9px] text-slate-500">{fmtSize(f.size)}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {files.length ? (
                <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {files.length} file{files.length === 1 ? "" : "s"} in queue
                </p>
              ) : null}
            </div>

            {/* Structuring controls */}
            <fieldset>
              <legend className={LABEL}>Formatting depth</legend>
              <div className="mt-2 space-y-1.5">
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                      mode === m.id ? "border-emerald-400 bg-emerald-400/5" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="depth"
                      value={m.id}
                      checked={mode === m.id}
                      onChange={() => {
                        setMode(m.id);
                        setCurrentPage(1);
                      }}
                      className="mt-1 accent-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-100">{m.label}</span>
                      <span className="block text-xs text-slate-500">{m.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-between gap-4">
              <span id="autoclean-label" className="text-sm text-slate-200">
                Auto-Clean Messy Handwriting / Board Reflection
              </span>
              <Toggle checked={autoClean} onChange={setAutoClean} labelId="autoclean-label" />
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}.
              </p>
            ) : null}

            {/* CTA and progress */}
            <div>
              <button
                type="button"
                onClick={() => startBuild(true)}
                aria-busy={status === "processing"}
                className={`flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400 hover:shadow-[0_0_36px_rgba(16,185,129,0.6)] ${
                  status === "processing" ? "cursor-progress opacity-80" : ""
                }`}
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Building…
                  </>
                ) : (
                  <>
                    Clean &amp; Build Notes
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>

              {status === "processing" ? (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3" role="status">
                  <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                    {["OCR", "Structure"].map((name, i) => {
                      const active = (progress < 60 ? 0 : 1) === i;
                      const done = i === 0 && progress >= 60;
                      return (
                        <li
                          key={name}
                          className={`flex items-center gap-1.5 rounded border px-1.5 py-1 ${
                            active
                              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                              : done
                                ? "border-slate-700 text-slate-300"
                                : "border-slate-800 text-slate-500"
                          }`}
                        >
                          {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <span>{i + 1}</span>}
                          {name}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-2.5 flex items-baseline justify-between gap-3 font-mono text-xs">
                    <span className="text-slate-300">{stage}</span>
                    <span className="tabular-nums text-emerald-400">{progress}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label="Build progress"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)] transition-[width] duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : status === "complete" ? (
                <p className="mt-3 flex items-center gap-2 font-mono text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {total} pages ready in the reader
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-slate-500">
                  No files handy?{" "}
                  <button
                    type="button"
                    onClick={() => startBuild(false)}
                    className="text-slate-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-emerald-400"
                  >
                    See sample notes
                  </button>
                </p>
              )}
            </div>

            <SavedShelf kind="notes" label="notes" onOpen={openSaved} />
          </div>
        </section>

        {/* RIGHT 65%: page viewer */}
        <section
          ref={viewerRef}
          aria-label="Interactive page viewer"
          className={`relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800/80 border-t-white/10 bg-slate-900/40 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_20px_40px_-15px_rgba(0,0,0,0.7)] transition-all duration-300 hover:border-slate-700/80 hover:border-t-white/10 ${fullscreen ? "h-screen" : ""}`}
        >
          <WindowBar
            path={`notes/${slug(data.unit || data.subject || "notes")}.pdf`}
            title="Interactive page viewer"
            right={total ? `${total} pages` : "Reader"}
          />

          {/* Pagination header and toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => goTo(page - 1)} disabled={!total || page <= 1} aria-label="Previous page" className={TOOL}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <label className="flex items-center gap-2 font-mono text-xs text-slate-400">
                Page
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.max(1, total)}
                  disabled={!total}
                  value={jumpDraft ?? (total ? page : "")}
                  onChange={(e) => {
                    setJumpDraft(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= total) {
                      setCurrentPage(n);
                      if (canvasRef.current) canvasRef.current.scrollTop = 0;
                    }
                  }}
                  onBlur={() => setJumpDraft(null)}
                  aria-label="Jump to page"
                  className="h-9 w-14 rounded-lg border border-slate-800 bg-slate-950 px-2 text-center transition-all duration-200 hover:border-slate-700 font-mono text-sm text-emerald-400 focus:border-emerald-400 focus:outline-none disabled:opacity-40"
                />
                of <span className="text-slate-200">{total || "–"}</span>
              </label>
              <button type="button" onClick={() => goTo(page + 1)} disabled={!total || page >= total} aria-label="Next page" className={TOOL}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
                disabled={!total || zoom <= 0.6}
                aria-label="Zoom out"
                className={TOOL}
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-11 text-center font-mono text-xs tabular-nums text-slate-300">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10))}
                disabled={!total || zoom >= 1.6}
                aria-label="Zoom in"
                className={TOOL}
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} className={TOOL}>
                {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button type="button" onClick={copyPage} disabled={!total} className={TOOL}>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Page Text
              </button>
              <button type="button" onClick={handleDownloadPDF} disabled={!total || downloading} className={EXPORT}>
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                {downloading ? "Preparing PDF…" : "Download Notes as PDF"}
              </button>
            </div>
          </div>

          {total && !notes ? (
            <p className="border-b border-slate-800 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-300">
              Sample notes. Add your own photos or PDFs and press Clean &amp; Build Notes to get notes from them.
            </p>
          ) : null}

          {/* Reader canvas */}
          <div
            ref={canvasRef}
            className={`relative isolate overflow-y-auto overflow-x-hidden bg-slate-900/40 ${fullscreen ? "min-h-0 flex-1" : "h-[68vh] min-h-[26rem]"}`}
          >
            <Glow className="inset-x-8 top-8 h-[30rem]" />
            {total ? (
              <div
                className="flex items-start transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{ transform: `translateX(-${(page - 1) * 100}%)` }}
              >
                {pages.map((p, i) => (
                  <div
                    key={i}
                    aria-hidden={i !== page - 1}
                    className={`w-full shrink-0 overflow-x-auto px-3 py-6 sm:px-6 ${i === page - 1 ? "" : "h-0 overflow-hidden"}`}
                  >
                    <PaperPage page={p} index={i} total={total} zoom={zoom} subject={data.subject} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                {status === "processing" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-400" aria-hidden="true" />
                    <p className="mt-3 font-mono text-xs text-slate-300">{stage}</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-7 w-7 text-slate-600" aria-hidden="true" />
                    <p className="mt-3 text-sm text-slate-300">Your notes open here, one page at a time.</p>
                    <p className="mt-1 text-xs text-slate-500">Add sources on the left, then build.</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick navigation and export drawer */}
          <div className="border-t border-slate-800">
            <button
              type="button"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-expanded={drawerOpen}
              aria-controls="page-drawer"
              className="flex w-full items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-100"
            >
              Quick navigation &amp; export
              {drawerOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
            </button>
            {drawerOpen ? (
              <div id="page-drawer" className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-800 px-3 py-3">
                {total ? (
                  <ol className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                    {pages.map((p, i) => (
                      <li key={i} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => goTo(i + 1)}
                          aria-label={`Go to page ${i + 1}`}
                          aria-current={i === page - 1 ? "page" : undefined}
                          className={`block w-[4.5rem] rounded-md border p-1 transition-all duration-200 ${
                            i === page - 1 ? "border-emerald-400" : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span className="block h-20 bg-[#fbf9f1] px-1.5 py-1.5 text-left">
                            <span className="block h-1 w-8 bg-slate-800" />
                            <span className="mt-1.5 block h-px w-full bg-slate-400" />
                            {p.blocks.slice(0, 7).map((b, k) => (
                              <span
                                key={k}
                                className={`mt-1 block h-0.5 ${
                                  b.type === "heading" ? "w-7 bg-slate-700" : b.type === "formula" ? "h-1.5 w-full bg-slate-800" : "w-full bg-slate-300"
                                }`}
                              />
                            ))}
                          </span>
                          <span className={`mt-1 block font-mono text-[10px] ${i === page - 1 ? "text-emerald-400" : "text-slate-400"}`}>
                            Page {i + 1}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="flex-1 text-xs text-slate-500">Page thumbnails appear here after you build.</p>
                )}
                <button type="button" onClick={handleDownloadPDF} disabled={!total || downloading} className={EXPORT}>
                  {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                  {downloading ? "Preparing PDF…" : "Export All Pages as PDF"}
                </button>
              </div>
            ) : null}
          </div>

          {/* Toast (inside the viewer so it also shows in fullscreen) */}
          {toast ? (
            <div
              role="status"
              className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border bg-slate-900/95 px-4 py-3 text-sm shadow-2xl shadow-black/70 backdrop-blur-md ${
                toast.kind === "error" ? "border-red-400/50 text-red-300" : "border-slate-700 text-slate-100"
              }`}
            >
              {toast.kind === "busy" ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden="true" />
              ) : toast.kind === "done" ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              {toast.text}
            </div>
          ) : null}
        </section>
      </div>
    </div>
      </ToolBody>
    </>
  );
}
