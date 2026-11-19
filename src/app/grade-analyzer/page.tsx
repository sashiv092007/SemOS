import type { Metadata } from "next";
import GradeAnalyzer from "@/components/GradeAnalyzer";
import { Navbar } from "@/components/SemOSLandingPage";
import AmbientGrid3D from "@/components/AmbientGrid3D";
import ToolTabs from "@/components/ToolTabs";
import { Backdrop } from "@/components/ui";

export const metadata: Metadata = { title: "Grade Analyzer · SemOS" };

export default function GradeAnalyzerPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <Navbar />
      <main className="relative isolate">
        <Backdrop />
        <AmbientGrid3D />
        <ToolTabs />
        <GradeAnalyzer />
      </main>
    </div>
  );
}
