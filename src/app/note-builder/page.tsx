import type { Metadata } from "next";
import NoteBuilder from "@/components/NoteBuilder";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "Note Builder · SemOS" };

export default function NoteBuilderPage() {
  return (
    <ToolShell>
      <NoteBuilder />
    </ToolShell>
  );
}
