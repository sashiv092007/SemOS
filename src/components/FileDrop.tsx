"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileText, Upload, X } from "lucide-react";
import { FOCUS } from "./FeatureLayout";

/* Upload box (click or drop) and file row, used by the PYQ Predictor and Viva Simulator. */

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function DropZone({
  label,
  hint,
  multiple,
  onFiles,
  children,
}: {
  label: string;
  hint: string;
  multiple: boolean;
  onFiles: (files: File[]) => void;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFiles(Array.from(e.dataTransfer.files));
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 ${FOCUS} ${
          over ? "border-fuchsia-500 bg-fuchsia-50" : "border-[#5b1065]/20 bg-slate-50 hover:border-fuchsia-400 hover:bg-fuchsia-50"
        }`}
      >
        <Upload className="h-5 w-5 text-fuchsia-600" aria-hidden="true" />
        <span className="text-sm font-bold text-[#3b0a45]">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

export function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-xl bg-fuchsia-50 px-3 py-2 text-sm">
      <FileText className="h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium text-[#3b0a45]">{file.name}</span>
      <span className="shrink-0 text-xs tabular-nums text-slate-500">{mb(file.size)}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className={`grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-red-600 ${FOCUS}`}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}
