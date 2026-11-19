"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Camera-facing text drawn onto a canvas texture, so no font files are needed. */
export default function Label({
  text,
  color,
  position,
  height = 0.32,
  weight = 600,
}: {
  text: string;
  color: string;
  position: [number, number, number];
  height?: number;
  weight?: number;
}) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = `${weight} 64px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.font = font;
    const w = Math.max(32, Math.ceil(ctx.measureText(text).width) + 24);
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
  }, [text, color, weight]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
