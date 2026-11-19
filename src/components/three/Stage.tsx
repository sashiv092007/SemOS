"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type SceneBase = { active?: boolean; lowPower?: boolean; onReady?: () => void };

/** Canvas with the shared lighting used by the header visuals. */
export function Stage({
  active = true,
  lowPower = false,
  onReady,
  camera,
  children,
}: SceneBase & { camera: { position: [number, number, number]; fov: number }; children: ReactNode }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={lowPower ? 1 : [1, 1.75]}
      camera={camera}
      gl={{ antialias: !lowPower, alpha: true }}
      onCreated={() => onReady?.()}
      aria-hidden="true"
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 5]} intensity={1.4} />
      <pointLight position={[0, 0.5, 3]} intensity={6} distance={9} color="#34d399" />
      <pointLight position={[-4, -2, -2]} intensity={3} distance={10} color="#22d3ee" />
      {children}
    </Canvas>
  );
}

/** Group that drifts gently and leans toward the mouse. */
export function Sway({ children, amount = 0.3, spin = 0 }: { children: ReactNode; amount?: number; spin?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const group = g.current;
    if (!group) return;
    const drift = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    if (spin) group.rotation.y += delta * spin;
    else group.rotation.y = THREE.MathUtils.damp(group.rotation.y, drift + state.pointer.x * amount, 3, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -state.pointer.y * amount * 0.35, 3, delta);
  });
  return <group ref={g}>{children}</group>;
}
