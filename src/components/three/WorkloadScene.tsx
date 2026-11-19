"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Label from "./Label";
import { Stage, Sway, type SceneBase } from "./Stage";

export type WorkloadProps = { days: number; items: { name: string; hours: number }[] };

const PALETTE = ["#34d399", "#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#60a5fa", "#fb923c", "#4ade80"];
const HOURS_PER_DAY = 8; // a comfortable study day
const MAX_SEGMENTS = 30;
const TOWER_H = 2.6;

const capacityEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 1, 0.96));

const fmt = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));

/* ---------- Day ring: one lit segment per day ---------- */

function DayRing({ days }: { days: number }) {
  const ring = useRef<THREE.Group>(null);
  const shown = Math.max(1, Math.min(MAX_SEGMENTS, Math.round(days) || 1));
  const total = Math.max(shown, 12);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z -= delta * 0.15;
  });

  return (
    <group position={[-1.75, 0.15, 0]}>
      <group ref={ring}>
        {Array.from({ length: total }, (_, i) => {
          const a = (i / total) * Math.PI * 2;
          const lit = i < shown;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.1, ((Math.PI * 2 * 1.05) / total) * 0.72, 0.16]} />
              <meshStandardMaterial
                color={lit ? "#34d399" : "#1e293b"}
                emissive={lit ? "#10b981" : "#000000"}
                emissiveIntensity={lit ? 0.9 : 0}
                roughness={0.4}
              />
            </mesh>
          );
        })}
      </group>
      <Label text={days > 0 ? `${fmt(days)}` : "–"} color="#f1f5f9" position={[0, 0.12, 0.1]} height={0.55} weight={700} />
      <Label text={days === 1 ? "DAY" : "DAYS"} color="#6ee7b7" position={[0, -0.32, 0.1]} height={0.2} />
    </group>
  );
}

/* ---------- Workload tower: one block per assignment vs capacity ---------- */

function Block({ bottom, height, color, over }: { bottom: number; height: number; color: string; over: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, Math.max(height, 0.001), 7, delta);
    m.position.y = THREE.MathUtils.damp(m.position.y, bottom, 7, delta);
  });
  return (
    <mesh ref={mesh} scale={[1, 0.001, 1]} position={[0, bottom, 0]}>
      <boxGeometry args={[0.82, 1, 0.82]} />
      <meshStandardMaterial
        color={over ? "#f87171" : color}
        emissive={over ? "#dc2626" : color}
        emissiveIntensity={0.45}
        roughness={0.35}
        metalness={0.2}
      />
    </mesh>
  );
}

function Tower({ days, items }: WorkloadProps) {
  const capacity = Math.max(0, days) * HOURS_PER_DAY;
  const total = items.reduce((s, it) => s + it.hours, 0);
  const scale = TOWER_H / Math.max(capacity, total, 1);
  const capH = capacity * scale;

  const blocks: { key: number; bottom: number; height: number; color: string; over: boolean }[] = [];
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    const h = items[i].hours * scale;
    blocks.push({ key: i, bottom: -1.3 + cursor + h / 2, height: h, color: PALETTE[i % PALETTE.length], over: cursor + h > capH + 1e-6 });
    cursor += h;
  }

  return (
    <group position={[1.55, 0, 0]}>
      {/* Capacity outline */}
      <lineSegments position={[0, -1.3 + capH / 2, 0]} scale={[1, Math.max(capH, 0.001), 1]}>
        <primitive object={capacityEdges} attach="geometry" />
        <lineBasicMaterial color="#64748b" transparent opacity={0.6} />
      </lineSegments>
      {blocks.map((b) => (
        <group key={b.key} position={[0, 0, 0]}>
          <Block bottom={b.bottom} height={b.height * 0.96} color={b.color} over={b.over} />
        </group>
      ))}
      {/* Base */}
      <mesh position={[0, -1.36, 0]}>
        <boxGeometry args={[1.3, 0.08, 1.3]} />
        <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.6} />
      </mesh>
      <Label
        text={`${fmt(total)}h / ${fmt(capacity)}h`}
        color={total > capacity ? "#fca5a5" : "#a7f3d0"}
        position={[0, -1.3 + Math.max(capH, cursor) + 0.3, 0]}
        height={0.24}
      />
    </group>
  );
}

export default function WorkloadScene({ days, items, ...base }: WorkloadProps & SceneBase) {
  return (
    <Stage {...base} camera={{ position: [0, 0.35, 4.7], fov: 38 }}>
      <Sway amount={0.35}>
        <DayRing days={days} />
        <Tower days={days} items={items} />
      </Sway>
    </Stage>
  );
}
