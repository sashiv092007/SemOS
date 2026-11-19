import type { Metadata } from "next";
import MastersheetGenerator from "@/components/MastersheetGenerator";
import { Navbar } from "@/components/SemOSLandingPage";
import AmbientGrid3D from "@/components/AmbientGrid3D";
import ToolTabs from "@/components/ToolTabs";
import { Backdrop } from "@/components/ui";

export const metadata: Metadata = { title: "Mastersheet · SemOS" };

export default function MastersheetPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <Navbar />
      <main className="relative isolate">
        <Backdrop />
        <AmbientGrid3D />
        <ToolTabs wide />
        <MastersheetGenerator />
      </main>
    </div>
  );
}
