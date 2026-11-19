"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Lazy3D from "./three/Lazy3D";

const AmbientGridScene = dynamic(() => import("./three/AmbientGridScene"), { ssr: false });

/** Reactive 3D particle grid behind a page. Pauses while the browser tab is hidden. */
export default function AmbientGrid3D() {
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-70">
      {tabVisible ? <Lazy3D Scene={AmbientGridScene} props={{}} className="h-full w-full" /> : null}
    </div>
  );
}
