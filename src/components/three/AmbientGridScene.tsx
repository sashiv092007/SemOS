"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneBase } from "./Stage";

const SWEEP_SECONDS = 1.8;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uSweep;
  varying float vGlow;
  void main() {
    vec3 p = position;
    float wave = sin(p.x * 0.32 + uTime * 0.55) * 0.28 + cos(p.z * 0.42 + uTime * 0.38) * 0.22;
    float d = distance(p.xz, uMouse);
    float ripple = exp(-d * d * 0.06);
    float front = uSweep * 70.0 - 35.0;
    float sweep = uSweep >= 0.0 ? exp(-pow(p.x - front, 2.0) * 0.12) : 0.0;
    p.y += wave + ripple * 0.7 + sweep * 1.4;
    vGlow = 0.22 + ripple * 0.7 + sweep * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.6 + ripple * 1.2 + sweep * 3.0) * (22.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vGlow;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, r);
    vec3 base = vec3(0.06, 0.73, 0.51);
    vec3 hot = vec3(0.45, 0.95, 0.92);
    gl_FragColor = vec4(mix(base, hot, clamp(vGlow - 0.22, 0.0, 1.0)), a * min(vGlow, 1.0) * 0.75);
  }
`;

function Grid({ lowPower }: { lowPower: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2(0, -6));
  const sweepStart = useRef(-1);
  const clock = useRef(0);

  const geometry = useMemo(() => {
    const step = lowPower ? 1.5 : 1;
    const pts: number[] = [];
    for (let x = -34; x <= 34; x += step) for (let z = -24; z <= 6; z += step) pts.push(x, -3, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [lowPower]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, -6) }, uSweep: { value: -1 } }),
    [],
  );

  useEffect(() => {
    // The canvas sits behind the page, so it listens on the window instead of its own events.
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current.set(nx * 18, -4 + ny * 9);
    };
    const onSweep = () => {
      sweepStart.current = clock.current;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("semos:sweep", onSweep);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("semos:sweep", onSweep);
    };
  }, []);

  useFrame((_, delta) => {
    const m = material.current;
    if (!m) return;
    clock.current += Math.min(delta, 0.1);
    m.uniforms.uTime.value = clock.current;
    (m.uniforms.uMouse.value as THREE.Vector2).lerp(mouse.current, 0.06);
    const since = sweepStart.current < 0 ? -1 : (clock.current - sweepStart.current) / SWEEP_SECONDS;
    if (since > 1) sweepStart.current = -1;
    m.uniforms.uSweep.value = since >= 0 && since <= 1 ? since : -1;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function AmbientGridScene({ active = true, lowPower = false, onReady }: SceneBase) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={1}
      camera={{ position: [0, 1.2, 9], fov: 55 }}
      gl={{ antialias: false, alpha: true }}
      onCreated={({ camera }) => {
        camera.lookAt(0, -2.4, -4);
        onReady?.();
      }}
      aria-hidden="true"
    >
      <Grid lowPower={lowPower} />
    </Canvas>
  );
}
