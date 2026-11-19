"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { can3D, useGraphicsSupport } from "@/lib/webgl";

// Three.js is only downloaded in browsers that will actually show the 3D scene.
const HourglassScene = dynamic(() => import("./HourglassScene"), { ssr: false });

/**
 * Shows the 3D hourglass where the browser can handle it, and `fallback`
 * (the flat SVG hourglass) while it loads, without WebGL, or when the
 * viewer has asked for reduced motion.
 */
export default function Hourglass3D({ fallback, className = "" }: { fallback: ReactNode; className?: string }) {
  const support = useGraphicsSupport();
  const use3D = can3D(support);

  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  // Pause rendering while the hourglass is scrolled out of view.
  useEffect(() => {
    if (!use3D || !box.current) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [use3D]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          use3D && ready ? "opacity-0" : "opacity-100"
        }`}
      >
        {fallback}
      </div>
      {use3D ? (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <HourglassScene active={visible} lowPower={support?.lowPower} onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}
