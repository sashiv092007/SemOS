import type { Metadata } from "next";
import PyqPredictor from "@/components/PyqPredictor";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "PYQ Predictor · SemOS" };

export default function PyqPage() {
  return (
    <ToolShell>
      <PyqPredictor />
    </ToolShell>
  );
}
