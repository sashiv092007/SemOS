import type { Metadata } from "next";
import GradeAnalyzer from "@/components/GradeAnalyzer";
import { Navbar } from "@/components/SemOSLandingPage";

export const metadata: Metadata = { title: "Grade Analyzer · SemOS" };

export default function GradeAnalyzerPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main>
        <GradeAnalyzer />
      </main>
    </div>
  );
}
