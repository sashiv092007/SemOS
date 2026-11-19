"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Bar3D = { key: number; label: string; value: string; hours: number; isToday: boolean; isFuture: boolean };

const GAP = 1.25; // distance between bar centres
const WIDTH = 0.78; // bar width and depth
const MAX_H = 3; // world height of the tallest possible bar

/* ------------------------------------------------------------------ */
/*  Text labels drawn onto canvas textures (no font files needed)      */
/* ------------------------------------------------------------------ */

function Label({ text, color, position, height = 0.32 }: { text: string; color: string; position: [number, number, number]; height?: number }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "600 64px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.width = w;
    canvas.height = 96;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, 50);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: w / 96 };
  }, [text, color]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
/*  One bar                                                            */
/* ------------------------------------------------------------------ */

const unitBox = new THREE.BoxGeometry(WIDTH, 1, WIDTH).translate(0, 0.5, 0);
const unitEdges = new THREE.EdgesGeometry(unitBox);

function BarMesh({ bar, x, height, hovered, onHover }: { bar: Bar3D; x: number; height: number; hovered: boolean; onHover: (key: number | null) => void }) {
  const mesh = useRef<THREE.Mesh>(null);
  const edges = useRef<THREE.LineSegments>(null);

  // Grow towards the target height.
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const next = THREE.MathUtils.damp(m.scale.y, Math.max(height, 0.001), 6, delta);
    m.scale.y = next;
    if (edges.current) edges.current.scale.y = next;
  });

  const color = bar.isToday ? "#f59e0b" : hovered ? "#64748b" : "#475569";

  return (
    <group position={[x, 0, 0]}>
      {bar.isFuture ? (
        // Upcoming day: a ghost outline.
        <lineSegments ref={edges} geometry={unitEdges} scale={[1, 0.001, 1]}>
          <lineBasicMaterial color="#64748b" transparent opacity={0.55} />
        </lineSegments>
      ) : null}
      <mesh
        ref={mesh}
        geometry={unitBox}
        scale={[1, 0.001, 1]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(bar.key);
        }}
        onPointerOut={() => onHover(null)}
      >
        {bar.isFuture ? (
          <meshStandardMaterial color="#1e293b" transparent opacity={0.25} depthWrite={false} />
        ) : (
          <meshStandardMaterial
            color={color}
            emissive={bar.isToday ? "#f97316" : "#0f172a"}
            emissiveIntensity={bar.isToday ? 0.75 : 0.2}
            metalness={0.25}
            roughness={0.45}
          />
        )}
      </mesh>

      {bar.hours > 0 ? (
        <Label
          text={bar.value}
          color={bar.isToday ? "#fcd34d" : hovered ? "#e2e8f0" : "#94a3b8"}
          position={[0, height + 0.32, 0]}
          height={hovered ? 0.36 : 0.3}
        />
      ) : null}
      <Label
        text={bar.label}
        color={bar.isToday ? "#fcd34d" : "#94a3b8"}
        position={[0, 0.2, WIDTH / 2 + 0.42]}
        height={0.28}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

function CameraRig({ halfWidth }: { halfWidth: number }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const fit = (halfWidth + 1.2) / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect);
    const dist = Math.max(6.4, fit);
    cam.position.lerp(new THREE.Vector3(0, dist * 0.55, dist), 0.1);
    cam.lookAt(0, 0.95, 0);
  });
  return null;
}

function Chart({ bars, target, scale, targetLabel }: { bars: Bar3D[]; target: number; scale: number; targetLabel: string }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const halfWidth = ((bars.length - 1) * GAP) / 2;
  const platformW = bars.length * GAP + 0.6;
  const targetY = (target / scale) * MAX_H;
  const todayIndex = bars.findIndex((b) => b.isToday);
  const todayX = (todayIndex - (bars.length - 1) / 2) * GAP;
  const outlines = useMemo(
    () => ({
      platform: new THREE.EdgesGeometry(new THREE.BoxGeometry(platformW, 0.001, 2.2)),
      target: new THREE.EdgesGeometry(new THREE.BoxGeometry(platformW, 0.001, 2.0)),
    }),
    [platformW],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const sway = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, sway + state.pointer.x * 0.35, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.08, 3, delta);
  });

  return (
    <>
      <CameraRig halfWidth={halfWidth} />
      <group ref={group}>
        {/* Platform */}
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[platformW, 0.12, 2.2]} />
          <meshStandardMaterial color="#0b1220" metalness={0.4} roughness={0.6} />
        </mesh>
        <lineSegments geometry={outlines.platform}>
          <lineBasicMaterial color="#34d399" transparent opacity={0.35} />
        </lineSegments>

        {/* Bars */}
        {bars.map((bar, i) => {
          const h = bar.hours > 0 ? (bar.hours / scale) * MAX_H : bar.isFuture ? 0.36 : 0.06;
          return (
            <BarMesh
              key={bar.key}
              bar={bar}
              x={(i - (bars.length - 1) / 2) * GAP}
              height={h}
              hovered={hovered === bar.key}
              onHover={setHovered}
            />
          );
        })}

        {/* Daily target plane */}
        <mesh position={[0, targetY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[platformW, 2.0]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <lineSegments position={[0, targetY, 0]} geometry={outlines.target}>
          <lineBasicMaterial color="#34d399" transparent opacity={0.7} />
        </lineSegments>
        <Label text={targetLabel} color="#6ee7b7" position={[platformW / 2 - 0.7, targetY + 0.22, 1.0]} height={0.26} />

        {/* Glow on today's bar */}
        {todayIndex >= 0 ? (
          <pointLight position={[todayX, 1.2, 1.2]} intensity={5} distance={4} color="#f97316" />
        ) : null}
      </group>
    </>
  );
}

export default function ProgressChart3D({
  bars,
  target,
  scale,
  targetLabel,
  active = true,
  lowPower = false,
  onReady,
}: {
  bars: Bar3D[];
  target: number;
  scale: number;
  targetLabel: string;
  active?: boolean;
  lowPower?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={lowPower ? 1 : [1, 1.75]}
      camera={{ position: [0, 3.2, 8], fov: 38 }}
      gl={{ antialias: !lowPower, alpha: true }}
      onCreated={() => onReady?.()}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <pointLight position={[-5, 3, -2]} intensity={3} distance={12} color="#22d3ee" />
      <Chart bars={bars} target={target} scale={scale} targetLabel={targetLabel} />
    </Canvas>
  );
}
