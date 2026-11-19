import type { Metadata } from "next";
import MastersheetGenerator from "@/components/MastersheetGenerator";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "Mastersheet · SemOS" };

export default function MastersheetPage() {
  return (
    <ToolShell>
      <MastersheetGenerator />
    </ToolShell>
  );
}
