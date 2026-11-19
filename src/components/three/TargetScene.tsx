"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Label from "./Label";
import { Stage, Sway, type SceneBase } from "./Stage";

export type TargetProps = { target: number; subjects: { label: string; pct: number }[] };

const SEGMENTS = 48;
const MAX_PILLARS = 8;

const pillarColor = (pct: number) => (pct >= 80 ? "#34d399" : pct >= 60 ? "#22d3ee" : pct >= 40 ? "#fbbf24" : "#f87171");

function Ring({ target }: { target: number }) {
  const ring = useRef<THREE.Group>(null);
  const valid = target > 0 && target <= 10;
  const lit = valid ? Math.round((target / 10) * SEGMENTS) : 0;

  useFrame((state) => {
    if (ring.current) ring.current.position.y = 0.55 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
  });

  return (
    <group ref={ring} position={[0, 0.55, 0]}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        // Fill clockwise from the top.
        const a = Math.PI / 2 - (i / SEGMENTS) * Math.PI * 2;
        const on = i < lit;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.13, ((Math.PI * 2 * 0.95) / SEGMENTS) * 0.7, 0.12]} />
            <meshStandardMaterial
              color={on ? "#34d399" : "#1e293b"}
              emissive={on ? "#10b981" : "#000000"}
              emissiveIntensity={on ? 1 : 0}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      <Label text={valid ? target.toFixed(1) : "–"} color="#f1f5f9" position={[0, 0.1, 0.1]} height={0.5} weight={700} />
      <Label text="TARGET SGPA" color="#6ee7b7" position={[0, -0.3, 0.1]} height={0.15} />
    </group>
  );
}

function Pillar({ x, pct, label }: { x: number; pct: number; label: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const h = Math.max(0.04, (Math.min(100, pct) / 100) * 1.1);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    m.scale.y = THREE.MathUtils.damp(m.scale.y, h, 6, delta);
    m.position.y = -1.45 + m.scale.y / 2;
  });
  const color = pillarColor(pct);
  return (
    <group position={[x, 0, 0.6]}>
      <mesh ref={mesh} scale={[1, 0.001, 1]} position={[0, -1.45, 0]}>
        <boxGeometry args={[0.32, 1, 0.32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.35} />
      </mesh>
      <Label text={`${Math.round(pct)}%`} color="#e2e8f0" position={[0, -1.45 + h + 0.18, 0]} height={0.15} />
      <Label text={label} color="#94a3b8" position={[0, -1.68, 0.2]} height={0.13} />
    </group>
  );
}

export default function TargetScene({ target, subjects, ...base }: TargetProps & SceneBase) {
  const shown = subjects.slice(0, MAX_PILLARS);
  const gap = 0.55;
  return (
    <Stage {...base} camera={{ position: [0, 0.05, 4.9], fov: 40 }}>
      <Sway amount={0.35}>
        <Ring target={target} />
        {shown.map((s, i) => (
          <Pillar key={i} x={(i - (shown.length - 1) / 2) * gap} pct={s.pct} label={s.label} />
        ))}
        <mesh position={[0, -1.5, 0.6]}>
          <boxGeometry args={[Math.max(1.4, shown.length * gap + 0.4), 0.06, 0.7]} />
          <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.6} />
        </mesh>
      </Sway>
    </Stage>
  );
}
