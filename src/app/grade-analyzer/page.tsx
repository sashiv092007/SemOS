import type { Metadata } from "next";
import GradeAnalyzer from "@/components/GradeAnalyzer";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "Grade Analyzer · SemOS" };

export default function GradeAnalyzerPage() {
  return (
    <ToolShell>
      <GradeAnalyzer />
    </ToolShell>
  );
}
