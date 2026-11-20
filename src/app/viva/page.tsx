import type { Metadata } from "next";
import ToolShell from "@/components/ToolShell";
import VivaSimulator from "@/components/VivaSimulator";

export const metadata: Metadata = { title: "Viva Simulator · SemOS" };

export default function VivaPage() {
  return (
    <ToolShell>
      <VivaSimulator />
    </ToolShell>
  );
}
