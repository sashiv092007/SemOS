import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import RoadmapPlanner from "@/components/RoadmapPlanner";

export const metadata: Metadata = { title: "Roadmap · SemOS" };

// Rounded geometric sans used across the Roadmap dashboard.
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RoadmapPage() {
  return (
    <div className={`${urbanist.className} min-h-screen bg-[#f4f5f7] text-slate-700`}>
      <RoadmapPlanner />
    </div>
  );
}
