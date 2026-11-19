"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Timing                                                             */
/* ------------------------------------------------------------------ */

const DRAIN = 14; // seconds for the top bulb to empty
const FLIP = 1.4; // seconds for the glass to turn over

/* ------------------------------------------------------------------ */
/*  Shape                                                              */
/* ------------------------------------------------------------------ */

// Outline of the upper bulb as [radius, height]; the neck sits at height 0.
const HALF: [number, number][] = [
  [0.07, 0],
  [0.12, 0.06],
  [0.3, 0.2],
  [0.58, 0.45],
  [0.74, 0.78],
  [0.72, 1.05],
  [0.6, 1.3],
  [0.45, 1.45],
];

/** Glass radius at height |y| (same for both bulbs). */
function radiusAt(y: number) {
  const h = Math.abs(y);
  for (let i = 1; i < HALF.length; i++) {
    const [r0, y0] = HALF[i - 1];
    const [r1, y1] = HALF[i];
    if (h <= y1) return r0 + ((h - y0) / (y1 - y0)) * (r1 - r0);
  }
  return HALF[HALF.length - 1][0];
}

/** Solid of revolution following the inside of one bulb, between two heights. */
function sandBody(from: number, to: number, inset: number) {
  const steps = 24;
  const pts = [new THREE.Vector2(0, from)];
  for (let i = 0; i <= steps; i++) {
    const y = from + ((to - from) * i) / steps;
    pts.push(new THREE.Vector2(radiusAt(y) * inset, y));
  }
  pts.push(new THREE.Vector2(0, to));
  return new THREE.LatheGeometry(pts, 48);
}

const TOP_FULL = 1.08; // sand surface in the top bulb when full
const TOP_EMPTY = 0.05;
const BOTTOM_EMPTY = -1.38;
const BOTTOM_FULL = -0.52;
const INSET = 0.9; // sand sits slightly inside the glass wall
const GRAINS = 36;
const DOWN = new THREE.Vector3(0, -1, 0);

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/* ------------------------------------------------------------------ */
/*  Hourglass                                                          */
/* ------------------------------------------------------------------ */

function Hourglass({ grains }: { grains: number }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const topCap = useRef<THREE.Mesh>(null);
  const bottomCap = useRef<THREE.Mesh>(null);
  const mound = useRef<THREE.Mesh>(null);
  const stream = useRef<THREE.Mesh>(null);
  const points = useRef<THREE.Points>(null);
  const clock = useRef(0);

  const geo = useMemo(() => {
    const glassPts = [
      ...HALF.slice().reverse().map(([r, y]) => new THREE.Vector2(r, -y)),
      ...HALF.slice(1).map(([r, y]) => new THREE.Vector2(r, y)),
    ];
    return {
      glass: new THREE.LatheGeometry(glassPts, 64),
      topSand: sandBody(0.03, 1.3, INSET),
      bottomSand: sandBody(-1.42, -0.03, INSET),
      disc: new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      mound: new THREE.ConeGeometry(1, 1, 32),
      stream: new THREE.CylinderGeometry(0.012, 0.012, 1, 8).translate(0, -0.5, 0),
      cap: new THREE.CylinderGeometry(0.98, 0.98, 0.12, 64),
      rim: new THREE.TorusGeometry(0.98, 0.014, 8, 96).rotateX(Math.PI / 2),
      post: new THREE.CylinderGeometry(0.035, 0.035, 2.94, 12),
    };
  }, []);

  const mats = useMemo(() => {
    // Clipping planes in the glass's own space; copied into world space each frame.
    const planes = {
      topLocal: new THREE.Plane(new THREE.Vector3(0, -1, 0), TOP_FULL),
      bottomLocal: new THREE.Plane(new THREE.Vector3(0, -1, 0), BOTTOM_EMPTY),
      top: new THREE.Plane(),
      bottom: new THREE.Plane(),
    };
    const sand = {
      color: "#10b981",
      emissive: "#047857",
      emissiveIntensity: 0.45,
      roughness: 0.85,
      side: THREE.DoubleSide,
    };
    return {
      planes,
      glass: new THREE.MeshPhysicalMaterial({
        color: "#dbeafe",
        transparent: true,
        opacity: 0.17,
        roughness: 0.06,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      topSand: new THREE.MeshStandardMaterial({ ...sand, clippingPlanes: [planes.top] }),
      bottomSand: new THREE.MeshStandardMaterial({ ...sand, clippingPlanes: [planes.bottom] }),
      surface: new THREE.MeshStandardMaterial(sand),
      stream: new THREE.MeshBasicMaterial({ color: "#6ee7b7", transparent: true, opacity: 0.85 }),
      grains: new THREE.PointsMaterial({ color: "#a7f3d0", size: 0.035, transparent: true, opacity: 0.9, depthWrite: false }),
      frame: new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.65, roughness: 0.35 }),
      rim: new THREE.MeshBasicMaterial({ color: "#34d399", transparent: true, opacity: 0.75 }),
    };
  }, []);

  const grainData = useMemo(() => {
    const seeds = Array.from({ length: grains }, (_, i) => ({
      offset: i / grains,
      dx: (Math.sin(i * 12.9898) * 0.5) * 0.05,
      dz: (Math.cos(i * 78.233) * 0.5) * 0.05,
    }));
    return { seeds, positions: new Float32Array(grains * 3) };
  }, [grains]);

  useFrame((state, delta) => {
    const o = outer.current;
    const g = inner.current;
    if (!o || !g) return;

    clock.current = (clock.current + Math.min(delta, 0.1)) % (DRAIN + FLIP);
    const t = clock.current;
    const draining = t < DRAIN;
    const p = draining ? t / DRAIN : 1; // drain progress
    const flip = draining ? 0 : ease((t - DRAIN) / FLIP);

    // Slow turn, tilt toward the pointer, flip at the end of each cycle.
    o.rotation.y += delta * 0.25;
    o.rotation.x = THREE.MathUtils.lerp(o.rotation.x, state.pointer.y * 0.18, 0.05);
    o.rotation.z = THREE.MathUtils.lerp(o.rotation.z, -state.pointer.x * 0.12, 0.05);
    g.rotation.z = flip * Math.PI;

    // Sand levels.
    const top = THREE.MathUtils.lerp(TOP_FULL, TOP_EMPTY, p);
    const bottom = THREE.MathUtils.lerp(BOTTOM_EMPTY, BOTTOM_FULL, Math.sqrt(p));

    g.updateMatrixWorld(true);
    const { planes } = mats;
    planes.topLocal.set(DOWN, top);
    planes.bottomLocal.set(DOWN, bottom);
    planes.top.copy(planes.topLocal).applyMatrix4(g.matrixWorld);
    planes.bottom.copy(planes.bottomLocal).applyMatrix4(g.matrixWorld);

    // Flat sand surfaces that close the clipped bodies.
    const tc = topCap.current;
    if (tc) {
      const r = radiusAt(top) * INSET;
      tc.visible = top > TOP_EMPTY + 0.02;
      tc.position.y = top;
      tc.scale.set(r, 1, r);
    }
    const bc = bottomCap.current;
    if (bc) {
      const r = radiusAt(bottom) * INSET;
      bc.visible = bottom > BOTTOM_EMPTY + 0.02;
      bc.position.y = bottom;
      bc.scale.set(r, 1, r);
    }
    const m = mound.current;
    if (m) {
      const r = radiusAt(bottom) * INSET * 0.55;
      const h = Math.min(0.16, 0.04 + p * 0.3);
      m.visible = bottom > BOTTOM_EMPTY + 0.04;
      m.position.y = bottom + h / 2;
      m.scale.set(r, h, r);
    }

    // Falling stream and grains, only while sand is running.
    const running = draining && p < 0.985;
    const s = stream.current;
    if (s) {
      s.visible = running;
      s.position.y = 0.02;
      s.scale.y = Math.max(0.01, 0.02 - bottom);
    }
    const pts = points.current;
    if (pts) {
      pts.visible = running;
      const fall = 0.02 - bottom;
      const arr = grainData.positions;
      grainData.seeds.forEach((seed, i) => {
        const k = (state.clock.elapsedTime * 1.6 + seed.offset) % 1;
        arr[i * 3] = seed.dx * k * 2;
        arr[i * 3 + 1] = 0.02 - k * k * fall;
        arr[i * 3 + 2] = seed.dz * k * 2;
      });
      pts.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        {/* Sand */}
        <mesh geometry={geo.topSand} material={mats.topSand} />
        <mesh geometry={geo.bottomSand} material={mats.bottomSand} />
        <mesh ref={topCap} geometry={geo.disc} material={mats.surface} />
        <mesh ref={bottomCap} geometry={geo.disc} material={mats.surface} />
        <mesh ref={mound} geometry={geo.mound} material={mats.surface} />
        <mesh ref={stream} geometry={geo.stream} material={mats.stream} />
        <points ref={points} material={mats.grains}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[grainData.positions, 3]} />
          </bufferGeometry>
        </points>

        {/* Glass (drawn after the sand so it layers on top) */}
        <mesh geometry={geo.glass} material={mats.glass} renderOrder={1} />

        {/* Frame */}
        <mesh geometry={geo.cap} material={mats.frame} position={[0, 1.53, 0]} />
        <mesh geometry={geo.cap} material={mats.frame} position={[0, -1.53, 0]} />
        <mesh geometry={geo.rim} material={mats.rim} position={[0, 1.465, 0]} />
        <mesh geometry={geo.rim} material={mats.rim} position={[0, -1.465, 0]} />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
          return (
            <mesh
              key={i}
              geometry={geo.post}
              material={mats.frame}
              position={[Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86]}
            />
          );
        })}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas                                                             */
/* ------------------------------------------------------------------ */

export default function HourglassScene({
  active = true,
  lowPower = false,
  onReady,
}: {
  active?: boolean;
  lowPower?: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={lowPower ? 1 : [1, 1.75]}
      camera={{ position: [0, 0.1, 6.9], fov: 34 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        onReady?.();
      }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[0, 0.2, 1.6]} intensity={7} distance={6} color="#34d399" />
      <pointLight position={[-3, -2, -2]} intensity={4} distance={8} color="#22d3ee" />
      <Hourglass grains={lowPower ? 16 : GRAINS} />
    </Canvas>
  );
}
