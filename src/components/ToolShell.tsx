import type { ReactNode } from "react";
import { Urbanist } from "next/font/google";
import { ToolNav } from "./ToolLayout";
import "@/app/tool-theme.css";

// Same rounded geometric sans as the Roadmap dashboard.
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

/** Grey dashboard canvas with the shared top bar, used by Mastersheet, Grade Analyzer and Note Builder. */
export default function ToolShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${urbanist.className} min-h-screen overflow-x-clip bg-[#faf5fb] pb-16 text-slate-700`}>
      <ToolNav />
      <main>{children}</main>
    </div>
  );
}
