"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Label from "./Label";
import { Stage, Sway, type SceneBase } from "./Stage";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type CleanBlock = { type: "heading" | "text" | "bullet" | "formula"; text: string; label?: string };
export type CleanPage = { title: string; subtitle: string; blocks: CleanBlock[] };

export type MessyCleanProps = {
  beforeImage: string | null; // blob URL of the first uploaded photo, if any
  status: "idle" | "processing" | "complete";
  progress: number; // 0-100
  page: CleanPage;
};

const PAGE_W = 1.5;
const PAGE_H = 2;
const TEX_W = 600;
const TEX_H = 800;

/** Small seeded random generator, so the messy page looks the same on every render. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------------ */
/*  Texture painters                                                   */
/* ------------------------------------------------------------------ */

const SCRIBBLES = [
  "Critical sect. -> only 1 proc!!",
  "Peterson: flag[i]=T ; turn=j",
  "wait(S)  signal(S)  ??",
  "Deadlock = 4 cond.",
  "ME / H&W / no pre / circ wait",
  "monitor -> cond vars x.wait()",
  "bounded buf: mutex=1 empty=n",
  "thrashing = too many PF",
];

/** A photographed, crumpled sheet of hurried handwritten notes. */
function paintMessy(): HTMLCanvasElement {
  const rand = seeded(7);
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;

  // Yellowed paper with uneven lighting.
  g.fillStyle = "#e9e1c7";
  g.fillRect(0, 0, TEX_W, TEX_H);
  const shade = g.createLinearGradient(0, 0, TEX_W, TEX_H);
  shade.addColorStop(0, "rgba(255,255,255,0.15)");
  shade.addColorStop(1, "rgba(60,40,10,0.35)");
  g.fillStyle = shade;
  g.fillRect(0, 0, TEX_W, TEX_H);

  // Ruled lines, slightly crooked.
  g.strokeStyle = "rgba(90,120,170,0.35)";
  g.lineWidth = 2;
  for (let y = 70; y < TEX_H; y += 44) {
    g.beginPath();
    g.moveTo(0, y + rand() * 6);
    g.lineTo(TEX_W, y + 8 + rand() * 6);
    g.stroke();
  }

  // Coffee stain.
  g.strokeStyle = "rgba(120,80,30,0.35)";
  g.lineWidth = 10;
  g.beginPath();
  g.arc(440, 600, 70, 0.2, Math.PI * 1.8);
  g.stroke();

  // Hurried handwriting at random angles, some crossed out.
  g.textBaseline = "middle";
  SCRIBBLES.forEach((line, i) => {
    g.save();
    g.translate(30 + rand() * 40, 90 + i * 84 + rand() * 20);
    g.rotate((rand() - 0.5) * 0.18);
    g.font = `${rand() > 0.5 ? "italic " : ""}${30 + Math.round(rand() * 10)}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`;
    g.fillStyle = rand() > 0.75 ? "#1d4ed8" : "#1f2937";
    g.fillText(line, 0, 0);
    if (rand() > 0.7) {
      g.strokeStyle = "rgba(30,30,30,0.7)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-4, 2);
      g.lineTo(g.measureText(line).width * (0.4 + rand() * 0.5), -4);
      g.stroke();
    }
    g.restore();
  });

  // An arrow and a circled word.
  g.strokeStyle = "#b91c1c";
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(170, 440, 120, 34, -0.08, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(330, 300);
  g.quadraticCurveTo(420, 330, 380, 420);
  g.lineTo(368, 400);
  g.moveTo(380, 420);
  g.lineTo(396, 402);
  g.stroke();

  // Camera glare.
  const glare = g.createRadialGradient(420, 150, 10, 420, 150, 260);
  glare.addColorStop(0, "rgba(255,255,255,0.55)");
  glare.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glare;
  g.fillRect(0, 0, TEX_W, TEX_H);
  return c;
}

/** Wrap text to a width, returning at most `max` lines. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
      if (lines.length === max) break;
    } else line = next;
  }
  if (lines.length < max && line) lines.push(line);
  return lines;
}

/** The clean, structured note page, drawn from the real first page of notes. */
function paintClean(page: CleanPage): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const g = c.getContext("2d")!;
  const M = 44;
  const W = TEX_W - M * 2;

  g.fillStyle = "#fbf9f1";
  g.fillRect(0, 0, TEX_W, TEX_H);
  g.textBaseline = "top";

  g.fillStyle = "#64748b";
  g.font = "600 15px ui-monospace, Consolas, monospace";
  g.fillText("SEMOS  /  NOTES", M, 36);

  g.fillStyle = "#0f172a";
  g.font = "700 30px Georgia, 'Times New Roman', serif";
  let y = 62;
  for (const l of wrap(g, page.title, W, 2)) {
    g.fillText(l, M, y);
    y += 36;
  }
  g.fillStyle = "#475569";
  g.font = "italic 18px Georgia, serif";
  g.fillText(wrap(g, page.subtitle, W, 1)[0] ?? "", M, y + 2);
  y += 34;
  g.fillStyle = "#0f172a";
  g.fillRect(M, y, W, 3);
  g.fillRect(M, y + 6, W, 1.5);
  y += 24;

  for (const b of page.blocks) {
    if (y > TEX_H - 60) break;
    if (b.type === "heading") {
      y += 8;
      g.fillStyle = "#0f172a";
      g.font = "700 17px ui-sans-serif, Arial, sans-serif";
      g.fillText(b.text.toUpperCase(), M, y);
      y += 24;
      g.fillStyle = "#cbd5e1";
      g.fillRect(M, y, W, 1.5);
      y += 10;
    } else if (b.type === "formula") {
      const lines = b.text.split("\n").slice(0, 2);
      const h = 30 + lines.length * 24;
      g.fillStyle = "#0f172a";
      g.fillRect(M, y, W, h);
      g.fillStyle = "#94a3b8";
      g.font = "600 12px ui-sans-serif, Arial, sans-serif";
      g.fillText((b.label ?? "Formula").toUpperCase(), M + 14, y + 10);
      g.fillStyle = "#34d399";
      g.font = "600 18px ui-monospace, Consolas, monospace";
      lines.forEach((l, i) => g.fillText(l, M + 14, y + 30 + i * 24));
      y += h + 14;
    } else {
      const bullet = b.type === "bullet";
      g.fillStyle = "#334155";
      g.font = "18px Georgia, serif";
      const lines = wrap(g, b.text, W - (bullet ? 22 : 0), bullet ? 2 : 3);
      if (bullet) {
        g.fillStyle = "#64748b";
        g.fillRect(M + 2, y + 8, 7, 7);
        g.fillStyle = "#334155";
      }
      lines.forEach((l, i) => g.fillText(l, M + (bullet ? 22 : 0), y + i * 25));
      y += lines.length * 25 + 8;
    }
  }
  return c;
}

/* ------------------------------------------------------------------ */
/*  Pages                                                              */
/* ------------------------------------------------------------------ */

/** Crumpled sheet: a plane pushed in and out with a few overlapping folds. */
function crumpled() {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 30, 40);
  const pos = geo.attributes.position;
  const rand = seeded(21);
  const folds = Array.from({ length: 6 }, () => ({ a: rand() * Math.PI, f: 2 + rand() * 5, amp: 0.02 + rand() * 0.05 }));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = 0;
    for (const fold of folds) z += Math.abs(Math.sin((x * Math.cos(fold.a) + y * Math.sin(fold.a)) * fold.f)) * fold.amp;
    z += (x * x + y * y) * -0.04; // curl at the edges
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function MessyPage({ beforeImage, scanning }: { beforeImage: string | null; scanning: boolean }) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => crumpled(), []);
  const painted = useMemo(() => makeTexture(paintMessy()), []);
  const [photo, setPhoto] = useState<THREE.Texture | null>(null);

  // Use the student's own photo when one was uploaded, cropped to the page shape.
  useEffect(() => {
    if (!beforeImage) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(beforeImage, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      const img = tex.image as { width: number; height: number };
      const pageAspect = PAGE_W / PAGE_H;
      const imgAspect = img.width / img.height;
      if (imgAspect > pageAspect) {
        tex.repeat.set(pageAspect / imgAspect, 1);
        tex.offset.set((1 - tex.repeat.x) / 2, 0);
      } else {
        tex.repeat.set(1, imgAspect / pageAspect);
        tex.offset.set(0, (1 - tex.repeat.y) / 2);
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      loaded = tex;
      setPhoto(tex);
    });
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [beforeImage]);

  useEffect(() => () => painted.dispose(), [painted]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (g) {
      g.rotation.z = 0.12 + Math.sin(t * 0.7) * 0.03;
      g.position.y = 0.1 + Math.sin(t * 0.9) * 0.04;
    }
    const b = beam.current;
    if (b) b.position.x = Math.sin(t * 2.4) * (PAGE_W / 2);
  });

  const map = beforeImage && photo ? photo : painted;

  return (
    <group position={[-1.3, 0.1, 0]} rotation={[0, 0.38, 0]}>
      <group ref={group}>
        <mesh geometry={geometry}>
          <meshStandardMaterial map={map} roughness={0.95} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.18} />
        </mesh>
        {scanning ? (
          <mesh ref={beam} position={[0, 0, 0.12]}>
            <planeGeometry args={[0.05, PAGE_H * 1.05]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}

function CleanPageMesh({ page, reveal, done }: { page: CleanPage; reveal: number; done: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => makeTexture(paintClean(page)), [page]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state, delta) => {
    const m = mat.current;
    if (m) m.opacity = THREE.MathUtils.damp(m.opacity, reveal, 4, delta);
    const gl = glow.current;
    if (gl) gl.opacity = done ? 0.18 + Math.sin(state.clock.elapsedTime * 2) * 0.06 : 0;
  });

  return (
    <group position={[1.3, 0.1, 0]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0, -0.02]} scale={[1.08, 1.06, 1]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial ref={glow} color="#34d399" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial ref={mat} map={texture} transparent opacity={reveal} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle stream from messy to clean                                */
/* ------------------------------------------------------------------ */

const STREAM = 70;

function Stream({ intensity }: { intensity: number }) {
  const points = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const rand = seeded(99);
    return {
      seeds: Array.from({ length: STREAM }, () => ({ off: rand(), y: (rand() - 0.5) * 1.4, z: (rand() - 0.5) * 0.5 })),
      positions: new Float32Array(STREAM * 3),
    };
  }, []);

  useFrame((state) => {
    const p = points.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime * (0.25 + intensity * 0.6);
    data.seeds.forEach((s, i) => {
      const k = (t + s.off) % 1;
      arr[i * 3] = -0.6 + k * 1.2;
      arr[i * 3 + 1] = s.y * (1 - Math.sin(k * Math.PI) * 0.6) + Math.sin(k * Math.PI) * 0.15;
      arr[i * 3 + 2] = s.z + Math.sin(k * Math.PI) * 0.4;
    });
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#6ee7b7" size={0.045} transparent opacity={0.4 + intensity * 0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export default function MessyCleanScene({ beforeImage, status, progress, page, ...base }: MessyCleanProps & SceneBase) {
  const reveal = status === "complete" ? 1 : status === "processing" ? 0.15 + (progress / 100) * 0.85 : 0.45;
  return (
    <Stage {...base} camera={{ position: [0, 0.15, 4.6], fov: 40 }}>
      <Sway amount={0.25}>
        <MessyPage beforeImage={beforeImage} scanning={status === "processing"} />
        <Stream intensity={status === "processing" ? 1 : status === "complete" ? 0.2 : 0.4} />
        <CleanPageMesh page={page} reveal={reveal} done={status === "complete"} />
        <Label text={beforeImage ? "BEFORE · your upload" : "BEFORE"} color="#fca5a5" position={[-1.3, 1.38, 0]} height={0.17} />
        <Label
          text={status === "complete" ? "AFTER" : status === "processing" ? `AFTER · ${progress}%` : "AFTER · preview"}
          color="#6ee7b7"
          position={[1.3, 1.38, 0]}
          height={0.17}
        />
      </Sway>
    </Stage>
  );
}
