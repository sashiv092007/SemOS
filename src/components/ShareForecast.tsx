"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, LoaderCircle, Share2, X } from "lucide-react";
import { currentPlan, deadlineOf, devotedHours } from "@/lib/plan";
import { weatherFromPlan, type AssignmentStatus } from "@/lib/weather";

/*
 * "Share my forecast": draws a story-sized (1080×1920) picture of the student's workload
 * weather, to post on Instagram or WhatsApp status. Every card carries the SemOS link.
 */

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

const LOOK: Record<AssignmentStatus, { label: string; sky: [string, string]; ink: string; soft: string; chip: string }> = {
  sunny: { label: "Clear skies", sky: ["#7dd3fc", "#fef3c7"], ink: "#0f172a", soft: "#334155", chip: "rgba(255,255,255,0.65)" },
  rainy: { label: "Rainy", sky: ["#475569", "#cbd5e1"], ink: "#f8fafc", soft: "#e2e8f0", chip: "rgba(15,23,42,0.35)" },
  stormy: { label: "Stormy", sky: ["#1e1b4b", "#581c87"], ink: "#fdf4ff", soft: "#e9d5ff", chip: "rgba(0,0,0,0.35)" },
};

const LINES: Record<AssignmentStatus, string> = {
  sunny: "On track. Main character energy.",
  rainy: "Bit behind. Still savable.",
  stormy: "Send help (and coffee).",
};

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function stats(now: number) {
  const plan = currentPlan();
  const w = weatherFromPlan(plan, now);
  if (!plan || !plan.items.length) return { status: w.status, reason: w.reason, rows: [] as [string, string][] };
  const open = plan.items.filter((a) => !a.done);
  const total = plan.items.reduce((s, a) => s + a.hours, 0) || 1;
  const done = plan.items.reduce((s, a) => s + Math.min(a.hours, a.done ? a.hours : devotedHours(a)), 0);
  const left = Math.max(0, deadlineOf(plan) - now);
  const rows: [string, string][] = [
    [String(open.length), open.length === 1 ? "assignment left" : "assignments left"],
    [`${Math.round(total - done)}h`, "of work to go"],
    [`${Math.floor(left / 86_400_000)}d ${Math.floor((left % 86_400_000) / 3_600_000)}h`, "until the deadline"],
    [`${Math.round((done / total) * 100)}%`, "done"],
  ];
  return { status: w.status, reason: w.reason, rows };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - 90 * s, y + 20 * s, 70 * s, 0, Math.PI * 2);
  ctx.arc(x, y - 20 * s, 105 * s, 0, Math.PI * 2);
  ctx.arc(x + 100 * s, y + 15 * s, 80 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 160 * s, y + 20 * s, 340 * s, 75 * s);
  ctx.beginPath();
  ctx.arc(x - 160 * s, y + 57 * s, 38 * s, 0, Math.PI * 2);
  ctx.arc(x + 180 * s, y + 57 * s, 38 * s, 0, Math.PI * 2);
  ctx.fill();
}

function draw(canvas: HTMLCanvasElement, host: string) {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = stats(Date.now());
  const look = LOOK[s.status];

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, look.sky[0]);
  sky.addColorStop(1, look.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Weather symbol
  const cx = W / 2;
  const cy = 520;
  if (s.status === "sunny") {
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 220, cy + Math.sin(a) * 220);
      ctx.lineTo(cx + Math.cos(a) * 290, cy + Math.sin(a) * 290);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 170, 0, Math.PI * 2);
    ctx.fill();
  } else {
    if (s.status === "rainy") {
      ctx.strokeStyle = "#93c5fd";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const x = cx - 180 + i * 60;
        const y = cy + 160 + (i % 2) * 50;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 22, y + 90);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy + 90);
      ctx.lineTo(cx - 70, cy + 270);
      ctx.lineTo(cx + 5, cy + 270);
      ctx.lineTo(cx - 40, cy + 430);
      ctx.lineTo(cx + 110, cy + 220);
      ctx.lineTo(cx + 30, cy + 220);
      ctx.lineTo(cx + 90, cy + 90);
      ctx.closePath();
      ctx.fill();
    }
    cloud(ctx, cx, cy, 1.25, s.status === "rainy" ? "#e2e8f0" : "#3b0764");
  }

  // Text
  ctx.textAlign = "center";
  ctx.fillStyle = look.soft;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("MY SEMESTER FORECAST", cx, 170);

  ctx.fillStyle = look.ink;
  ctx.font = `800 150px ${FONT}`;
  ctx.fillText(look.label, cx, 1030);
  ctx.font = `600 50px ${FONT}`;
  ctx.fillStyle = look.soft;
  ctx.fillText(LINES[s.status], cx, 1110);

  let y = 1200;
  if (s.rows.length) {
    const colW = 440;
    s.rows.forEach(([value, label], i) => {
      const x = cx + (i % 2 === 0 ? -colW / 2 - 15 : colW / 2 + 15);
      const top = y + Math.floor(i / 2) * 210;
      ctx.fillStyle = look.chip;
      ctx.beginPath();
      ctx.roundRect(x - colW / 2, top, colW, 180, 44);
      ctx.fill();
      ctx.fillStyle = look.ink;
      ctx.font = `800 76px ${FONT}`;
      ctx.fillText(value, x, top + 95);
      ctx.fillStyle = look.soft;
      ctx.font = `600 34px ${FONT}`;
      ctx.fillText(label, x, top + 145);
    });
    y += 440;
  } else {
    ctx.fillStyle = look.soft;
    ctx.font = `500 44px ${FONT}`;
    for (const l of wrap(ctx, s.reason, 860)) {
      ctx.fillText(l, cx, y + 40);
      y += 60;
    }
  }

  // Footer
  ctx.fillStyle = look.chip;
  ctx.beginPath();
  ctx.roundRect(cx - 400, H - 250, 800, 150, 75);
  ctx.fill();
  ctx.fillStyle = look.ink;
  ctx.font = `800 54px ${FONT}`;
  ctx.fillText("SemOS", cx, H - 172);
  ctx.fillStyle = look.soft;
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText(`Get your forecast at ${host}`, cx, H - 125);
}

export default function ShareForecast({ className = "", label = "Share my forecast" }: { className?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const open = () => {
    const c = canvas.current;
    if (!c) return;
    draw(c, window.location.host);
    dialog.current?.showModal();
    c.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], "semos-forecast.png", { type: "image/png" });
      setFile(f);
      setUrl(URL.createObjectURL(blob));
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
    }, "image/png");
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `My semester forecast on SemOS. Get yours: ${window.location.origin}` });
    } catch {
      // cancelled
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // blocked: nothing to do
    }
  };

  return (
    <>
      <button type="button" onClick={open} className={className}>
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      <canvas ref={canvas} className="hidden" aria-hidden="true" />
      <dialog
        ref={dialog}
        aria-label="Share your forecast"
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[1.75rem] bg-white p-5 text-slate-700 shadow-2xl backdrop:bg-black/50"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#3b0a45]">Your forecast card</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className={`grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 ${FOCUS}`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 grid aspect-[9/16] max-h-[60vh] place-items-center overflow-hidden rounded-2xl bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          {url ? <img src={url} alt="Your semester forecast card" className="h-full w-full object-contain" /> : <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />}
        </div>
        <p className="mt-3 text-xs text-slate-500">Post it as a story or status. It shows your weather and progress, not your assignment names.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canShare ? (
            <button type="button" onClick={share} className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#3ee07a] px-4 py-2.5 text-sm font-bold text-[#2a0730] hover:bg-[#5cf091] ${FOCUS}`}>
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share
            </button>
          ) : null}
          <a
            href={url || undefined}
            download="semos-forecast.png"
            className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#5b1065] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#741a80] ${FOCUS}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </a>
          <button type="button" onClick={copyLink} className={`inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#5b1065] ring-1 ring-[#5b1065]/15 hover:bg-fuchsia-50 ${FOCUS}`}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </dialog>
    </>
  );
}
