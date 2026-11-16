import type { Metadata } from "next";
import MastersheetGenerator from "@/components/MastersheetGenerator";
import { Navbar } from "@/components/SemOSLandingPage";

export const metadata: Metadata = { title: "Mastersheet · SemOS" };

export default function MastersheetPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main>
        <MastersheetGenerator />
      </main>
    </div>
  );
}
