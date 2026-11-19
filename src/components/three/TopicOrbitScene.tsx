"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Label from "./Label";
import { Stage, type SceneBase } from "./Stage";

/** `importance` is 1-10 once the AI has rated the topic, otherwise null. */
export type OrbitTopic = { name: string; importance: number | null };
export type TopicOrbitProps = { topics: OrbitTopic[]; files: number; generating: boolean };

const MAX_TOPICS = 10;
const MAX_SHEETS = 6;

const short = (s: string) => (s.length > 20 ? `${s.slice(0, 19)}…` : s);

/** Colour tiers: must-know, important, minor, not rated yet. */
function tier(importance: number | null) {
  if (importance === null) return { dot: "#64748b", text: "#cbd5e1", glow: 0 };
  if (importance >= 8) return { dot: "#fbbf24", text: "#fde68a", glow: 1 };
  if (importance >= 5) return { dot: "#34d399", text: "#d1fae5", glow: 0.6 };
  return { dot: "#22d3ee", text: "#a5f3fc", glow: 0.3 };
}

function Core({ generating }: { generating: boolean }) {
  const core = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const c = core.current;
    if (!c) return;
    c.rotation.y += delta * (generating ? 2.2 : 0.4);
    c.rotation.x += delta * 0.15;
    c.scale.setScalar(generating ? 1 + Math.sin(state.clock.elapsedTime * 8) * 0.08 : 1);
  });
  return (
    <group ref={core}>
      <mesh>
        <icosahedronGeometry args={[0.46, 1]} />
        <meshStandardMaterial color="#064e3b" emissive="#10b981" emissiveIntensity={generating ? 1.4 : 0.7} roughness={0.3} flatShading />
      </mesh>
      <mesh scale={1.35}>
        <icosahedronGeometry args={[0.46, 1]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Orbit bands, innermost first: must know (8-10), important (5-7), minor (1-4). */
const BANDS = [
  { radius: 1.4, speed: 0.3 },
  { radius: 2.1, speed: 0.2 },
  { radius: 2.8, speed: 0.13 },
];

const bandOf = (t: OrbitTopic, index: number) =>
  t.importance === null ? index % 3 : t.importance >= 8 ? 0 : t.importance >= 5 ? 1 : 2;

function Node({ topic, band, slot, slots, generating }: { topic: OrbitTopic; band: number; slot: number; slots: number; generating: boolean }) {
  const node = useRef<THREE.Group>(null);
  const rated = topic.importance !== null;
  const imp = topic.importance ?? 5;
  const { radius, speed } = BANDS[band];
  // Topics in a band are spaced evenly and move together, so they never bunch up.
  const phase = (slot / slots) * Math.PI * 2 + band * 0.9;
  const size = rated ? 0.05 + imp * 0.011 : 0.07;
  const look = tier(topic.importance);

  useFrame((state) => {
    const n = node.current;
    if (!n) return;
    const a = phase + state.clock.elapsedTime * speed * (generating ? 3 : 1);
    n.position.set(Math.cos(a) * radius, Math.sin(a) * radius * 0.52, Math.sin(a) * radius * 0.45);
  });

  return (
    <group ref={node}>
      <mesh>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial color={look.dot} />
      </mesh>
      {look.glow ? (
        <mesh scale={2.4}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={look.dot} transparent opacity={0.18 * look.glow} depthWrite={false} />
        </mesh>
      ) : null}
      <Label
        text={short(topic.name)}
        color={look.text}
        position={[0, size + 0.22, 0]}
        height={rated ? 0.17 + imp * 0.011 : 0.2}
        weight={rated && imp >= 8 ? 700 : 600}
      />
      {rated ? <Label text={`${imp}/10`} color={look.dot} position={[0, -size - 0.16, 0]} height={0.17} /> : null}
    </group>
  );
}

function Sheets({ files }: { files: number }) {
  const n = Math.min(files, MAX_SHEETS);
  return (
    <group position={[-3.3, -1.45, 0.2]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, i * 0.05, 0]} rotation={[-Math.PI / 2 + 0.3, 0, (i - n / 2) * 0.09]}>
          <boxGeometry args={[0.8, 1.05, 0.012]} />
          <meshStandardMaterial color="#fbf9f1" emissive="#fbf9f1" emissiveIntensity={0.08} roughness={0.9} />
        </mesh>
      ))}
      {files > 0 ? (
        <Label text={`${files} file${files === 1 ? "" : "s"}`} color="#a7f3d0" position={[0, 0.6, 0]} height={0.2} />
      ) : null}
    </group>
  );
}

export default function TopicOrbitScene({ topics, files, generating, ...base }: TopicOrbitProps & SceneBase) {
  const shown = topics.slice(0, MAX_TOPICS);
  const bands = shown.map((t, i) => bandOf(t, i));
  const placed = shown.map((topic, i) => ({
    topic,
    band: bands[i],
    slot: bands.slice(0, i).filter((b) => b === bands[i]).length,
    slots: bands.filter((b) => b === bands[i]).length,
  }));
  return (
    <Stage {...base} camera={{ position: [0, 0.3, 6], fov: 42 }}>
      <group position={[0.2, 0.2, 0]}>
        <Core generating={generating} />
        {/* faint orbit guides for the importance bands */}
        {BANDS.map(({ radius: r }) => (
          <mesh key={r} rotation={[Math.atan2(0.45, 0.52), 0, 0]} scale={[1, Math.hypot(0.52, 0.45), 1]}>
            <torusGeometry args={[r, 0.004, 6, 96]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} />
          </mesh>
        ))}
        {placed.map((p) => (
          <Node key={p.topic.name} topic={p.topic} band={p.band} slot={p.slot} slots={p.slots} generating={generating} />
        ))}
      </group>
      <Sheets files={files} />
    </Stage>
  );
}
