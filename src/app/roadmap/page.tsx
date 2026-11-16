import type { Metadata } from "next";
import RoadmapPlanner from "@/components/RoadmapPlanner";
import { Navbar } from "@/components/SemOSLandingPage";

export const metadata: Metadata = { title: "Roadmap · SemOS" };

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main>
        <RoadmapPlanner />
      </main>
    </div>
  );
}
