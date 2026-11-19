"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { can3D, useGraphicsSupport } from "@/lib/webgl";
import type { SceneBase } from "./Stage";

/**
 * Mounts a 3D scene (pass one created with next/dynamic and ssr:false, so
 * Three.js only downloads where it runs). Shows `fallback` without WebGL or
 * with reduced motion, fades the scene in once ready, and pauses it off-screen.
 */
export default function Lazy3D<P extends object>({
  Scene,
  props,
  className = "",
  fallback = null,
}: {
  Scene: ComponentType<P & SceneBase>;
  props: P;
  className?: string;
  fallback?: ReactNode;
}) {
  const support = useGraphicsSupport();
  const use3D = can3D(support);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!use3D || !box.current) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [use3D]);

  if (!use3D) return fallback ? <div className={className}>{fallback}</div> : null;

  return (
    <div ref={box} aria-hidden="true" className={`relative ${className}`}>
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
        <Scene {...props} active={visible} lowPower={support?.lowPower} onReady={() => setReady(true)} />
      </div>
    </div>
  );
}
