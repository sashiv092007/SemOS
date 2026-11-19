"use client";

import { useEffect, useRef } from "react";
import type { AssignmentStatus } from "@/lib/weather";

/**
 * Full-screen landscape behind the home page: a grassy hill under a sky that follows
 * the workload. Sunny is clear with swaying grass; rainy brings clouds and rain;
 * stormy darkens everything, adds heavy rain, lightning and a red tint.
 *
 * Drawn on one canvas (no video files), so it stays sharp at any size and costs no
 * download. Colours and effects ease between states, so switching never jumps.
 */

type RGB = [number, number, number];

type Look = {
  skyTop: RGB;
  skyBottom: RGB;
  hillBack: RGB;
  hillFront: RGB;
  bladeLight: RGB;
  bladeDark: RGB;
  cloud: RGB;
  sun: number;
  clouds: number;
  rain: number;
  wind: number;
  flowers: number;
};

const LOOKS: Record<AssignmentStatus, Look> = {
  sunny: {
    skyTop: [196, 222, 238],
    skyBottom: [243, 244, 236],
    hillBack: [156, 196, 98],
    hillFront: [104, 160, 64],
    bladeLight: [184, 216, 120],
    bladeDark: [72, 124, 44],
    cloud: [255, 255, 255],
    sun: 1,
    clouds: 0.35,
    rain: 0,
    wind: 1,
    flowers: 1,
  },
  rainy: {
    skyTop: [112, 126, 142],
    skyBottom: [186, 194, 200],
    hillBack: [112, 140, 96],
    hillFront: [74, 104, 64],
    bladeLight: [128, 156, 104],
    bladeDark: [48, 78, 42],
    cloud: [150, 158, 170],
    sun: 0,
    clouds: 0.9,
    rain: 0.55,
    wind: 1.9,
    flowers: 0.25,
  },
  stormy: {
    skyTop: [24, 20, 32],
    skyBottom: [74, 42, 52],
    hillBack: [46, 60, 44],
    hillFront: [28, 40, 30],
    bladeLight: [66, 86, 58],
    bladeDark: [18, 28, 20],
    cloud: [52, 46, 60],
    sun: 0,
    clouds: 1,
    rain: 1,
    wind: 3.2,
    flowers: 0,
  },
};

const mixN = (a: number, b: number, t: number) => a + (b - a) * t;
const mixC = (a: RGB, b: RGB, t: number): RGB => [mixN(a[0], b[0], t), mixN(a[1], b[1], t), mixN(a[2], b[2], t)];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Hill outlines as a fraction of the viewport: a big slope rising to the right, and a front hill on the left.
const backEdge = (x: number, w: number, h: number) => h * (0.86 - 0.36 * smooth(0.3, 1.05, x / w)) + Math.sin(x / 140) * 6;
const frontEdge = (x: number, w: number, h: number) => h * (0.7 + 0.34 * smooth(-0.05, 0.62, x / w)) + Math.sin(x / 90) * 4;

type Blade = { x: number; y: number; len: number; width: number; shade: number; phase: number; hill: 0 | 1 };
type Drop = { x: number; y: number; speed: number; len: number };
type Flower = { x: number; y: number; r: number };
type Cloud = { x: number; y: number; r: number; speed: number };

function lookFor(status: AssignmentStatus): Look {
  return LOOKS[status];
}

export default function DynamicWeatherBackground({ status }: { status: AssignmentStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const target = useRef<Look>(lookFor(status));
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    target.current = lookFor(status);
    redraw.current();
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let blades: Blade[] = [];
    let drops: Drop[] = [];
    let flowers: Flower[] = [];
    let clouds: Cloud[] = [];
    const cur: Look = JSON.parse(JSON.stringify(target.current));
    let flash = 0;
    let bolt: [number, number][] = [];
    let nextStrike = performance.now() + 2500;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(1500, w * (w < 640 ? 0.8 : 1.05)));
      blades = [];
      for (let i = 0; i < count; i++) {
        const hill: 0 | 1 = Math.random() < 0.55 ? 0 : 1;
        const x = Math.random() * (w + 40) - 20;
        const edge = hill === 0 ? backEdge(x, w, h) : frontEdge(x, w, h);
        if (edge > h + 10) continue;
        // More blades near the ridge so it reads as a grassy outline.
        const depth = Math.pow(Math.random(), 1.8);
        const y = edge + depth * (h - edge + 30);
        const near = Math.min(1, (y - h * 0.4) / (h * 0.6));
        blades.push({
          x,
          y,
          len: 10 + near * 34 + Math.random() * 12,
          width: 1 + near * 1.8,
          shade: Math.random(),
          phase: Math.random() * Math.PI * 2,
          hill,
        });
      }
      blades.sort((a, b) => a.hill - b.hill || a.y - b.y);

      flowers = Array.from({ length: Math.round(w / 18) }, () => {
        const x = Math.random() * w;
        const edge = frontEdge(x, w, h);
        return { x, y: edge + Math.random() * (h - edge), r: 1.2 + Math.random() * 1.8 };
      }).filter((f) => f.y < h);

      drops = Array.from({ length: 420 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 900 + Math.random() * 600,
        len: 12 + Math.random() * 16,
      }));

      clouds = Array.from({ length: 9 }, (_, i) => ({
        x: (i / 9) * w * 1.3 - w * 0.15,
        y: h * (0.04 + Math.random() * 0.22),
        r: 120 + Math.random() * 160,
        speed: 6 + Math.random() * 10,
      }));
    }

    function makeBolt() {
      const pts: [number, number][] = [];
      let x = w * (0.25 + Math.random() * 0.6);
      let y = 0;
      const ground = backEdge(x, w, h);
      while (y < ground) {
        pts.push([x, y]);
        x += (Math.random() - 0.5) * 60;
        y += 25 + Math.random() * 40;
      }
      pts.push([x, ground]);
      return pts;
    }

    function draw(time: number, dt: number) {
      // Ease the current look toward the target.
      const k = reduced ? 1 : Math.min(1, dt * 1.6);
      const t = target.current;
      (Object.keys(cur) as (keyof Look)[]).forEach((key) => {
        const v = cur[key];
        const goal = t[key];
        if (Array.isArray(v)) (cur[key] as RGB) = mixC(v, goal as RGB, k);
        else (cur[key] as number) = mixN(v as number, goal as number, k);
      });
      const s = time / 1000;

      // Sky
      const sky = ctx!.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, css(cur.skyTop));
      sky.addColorStop(1, css(cur.skyBottom));
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, h);

      // Sun glow
      if (cur.sun > 0.01) {
        const sx = w * 0.74;
        const sy = h * 0.1;
        const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.55);
        g.addColorStop(0, `rgba(255,251,226,${0.95 * cur.sun})`);
        g.addColorStop(0.25, `rgba(255,246,206,${0.45 * cur.sun})`);
        g.addColorStop(1, "rgba(255,246,206,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, w, h);
      }

      // Clouds: soft drifting blobs
      if (cur.clouds > 0.01) {
        for (const c of clouds) {
          const x = ((c.x + s * c.speed * (0.6 + cur.wind * 0.4)) % (w * 1.4)) - w * 0.2;
          for (let j = 0; j < 3; j++) {
            const cx = x + (j - 1) * c.r * 0.7;
            const cy = c.y + (j === 1 ? -c.r * 0.2 : 0);
            const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, c.r);
            g.addColorStop(0, css(cur.cloud, 0.55 * cur.clouds));
            g.addColorStop(1, css(cur.cloud, 0));
            ctx!.fillStyle = g;
            ctx!.fillRect(cx - c.r, cy - c.r, c.r * 2, c.r * 2);
          }
        }
      }

      // Lightning flash lights the sky before the ground is drawn.
      if (flash > 0.01) {
        ctx!.fillStyle = `rgba(235,230,255,${flash * 0.35})`;
        ctx!.fillRect(0, 0, w, h);
      }

      // Hills
      for (const hill of [0, 1] as const) {
        const edge = hill === 0 ? backEdge : frontEdge;
        const base = hill === 0 ? cur.hillBack : cur.hillFront;
        ctx!.beginPath();
        ctx!.moveTo(0, h);
        for (let x = 0; x <= w + 20; x += 20) ctx!.lineTo(x, edge(x, w, h));
        ctx!.lineTo(w, h);
        ctx!.closePath();
        const g = ctx!.createLinearGradient(0, h * 0.4, 0, h);
        g.addColorStop(0, css(mixC(base, [255, 255, 255], 0.12)));
        g.addColorStop(1, css(mixC(base, [0, 0, 0], 0.18)));
        ctx!.fillStyle = g;
        ctx!.fill();
      }

      // Grass blades
      const gust = Math.sin(s * 0.7) * 0.5 + Math.sin(s * 1.9) * 0.25;
      ctx!.lineCap = "round";
      for (const b of blades) {
        const sway = reduced ? 0.12 : (Math.sin(s * (1.2 + cur.wind * 0.5) + b.x * 0.012 + b.phase) * 0.18 + gust * 0.22) * cur.wind;
        const tipX = b.x + (sway + 0.1) * b.len;
        const tipY = b.y - b.len * (1 - Math.abs(sway) * 0.25);
        const col = mixC(cur.bladeDark, cur.bladeLight, b.shade * 0.8 + (b.hill === 0 ? 0.2 : 0));
        ctx!.strokeStyle = css(col);
        ctx!.lineWidth = b.width;
        ctx!.beginPath();
        ctx!.moveTo(b.x, b.y);
        ctx!.quadraticCurveTo(b.x, b.y - b.len * 0.55, tipX, tipY);
        ctx!.stroke();
      }

      // Little white flowers in good weather
      if (cur.flowers > 0.02) {
        ctx!.fillStyle = `rgba(255,255,255,${0.85 * cur.flowers})`;
        for (const f of flowers) {
          ctx!.beginPath();
          ctx!.arc(f.x + Math.sin(s * 1.3 + f.x) * 1.5 * cur.wind, f.y, f.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Rain
      if (cur.rain > 0.02) {
        const n = Math.round(drops.length * cur.rain);
        const slant = 0.12 + cur.wind * 0.06;
        ctx!.strokeStyle = `rgba(220,228,240,${0.25 + 0.3 * cur.rain})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        for (let i = 0; i < n; i++) {
          const d = drops[i];
          if (!reduced) {
            d.y += d.speed * dt;
            d.x += d.speed * dt * slant;
            if (d.y > h) {
              d.y = -d.len;
              d.x = Math.random() * w * 1.2 - w * 0.2;
            }
          }
          ctx!.moveTo(d.x, d.y);
          ctx!.lineTo(d.x - d.len * slant, d.y - d.len);
        }
        ctx!.stroke();
      }

      // Lightning bolt
      if (flash > 0.05 && bolt.length) {
        ctx!.strokeStyle = `rgba(255,255,255,${flash})`;
        ctx!.lineWidth = 2.5;
        ctx!.shadowColor = "rgba(200,190,255,0.9)";
        ctx!.shadowBlur = 18;
        ctx!.beginPath();
        bolt.forEach(([x, y], i) => (i ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y)));
        ctx!.stroke();
        ctx!.shadowBlur = 0;
      }
    }

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (target.current === LOOKS.stormy && now > nextStrike) {
        bolt = makeBolt();
        flash = 1;
        nextStrike = now + 2500 + Math.random() * 5000;
      }
      flash = Math.max(0, flash - dt * 2.2);
      if (flashRef.current) flashRef.current.style.opacity = String(flash * 0.4);

      draw(now, dt);
      raf = requestAnimationFrame(frame);
    }

    build();
    if (reduced) {
      redraw.current = () => draw(performance.now(), 1);
      redraw.current();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      build();
      if (reduced) redraw.current();
    };
    const onVisibility = () => {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      redraw.current = () => {};
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Ambient tint: none when sunny, cool grey when rainy, red when stormy. */}
      <div
        className={`absolute inset-0 transition-opacity duration-[1500ms] ${status === "stormy" ? "opacity-100" : "opacity-0"}`}
        style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(190,18,60,0.28), transparent 60%)" }}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-[1500ms] ${status === "rainy" ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(180deg, rgba(71,85,105,0.18), transparent 55%)" }}
      />
      {/* Soft vignette keeps text readable over the scene. */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(130% 90% at 50% 30%, transparent 55%, rgba(15,23,42,0.18))" }} />
      {/* Dark theme: the same weather at night (styled in dark-theme.css). */}
      <div className="semos-night absolute inset-0" />
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0" />
    </div>
  );
}
