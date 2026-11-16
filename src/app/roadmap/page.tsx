import type { Metadata } from "next";
import RoadmapPlanner from "@/components/RoadmapPlanner";
import { Navbar } from "@/components/SemOSLandingPage";
import ToolTabs from "@/components/ToolTabs";
import { Backdrop } from "@/components/ui";

export const metadata: Metadata = { title: "Roadmap · SemOS" };

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200">
      <Navbar />
      <main className="relative isolate">
        <Backdrop />
        <ToolTabs />
        <RoadmapPlanner />
      </main>
    </div>
  );
}
