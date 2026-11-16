import type { Metadata } from "next";
import NoteBuilder from "@/components/NoteBuilder";
import { Navbar } from "@/components/SemOSLandingPage";

export const metadata: Metadata = { title: "Note Builder · SemOS" };

export default function NoteBuilderPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main>
        <NoteBuilder />
      </main>
    </div>
  );
}
