import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, Target, Map, BookOpen, Terminal, Sparkles, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

export default function SemosShowcase() {
  return (
    <div id="features" className="flex min-h-screen w-full scroll-mt-14 items-center justify-center bg-[#030712] p-4 font-sans text-[#f1f5f9] sm:p-8">
      <div className="glass-container w-full max-w-5xl overflow-hidden rounded-2xl">
        {/* Chrome top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1 font-mono text-[11px] text-slate-400">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="truncate">demos/semos-workspace.v1.tsx</span>
          </div>
          <div className="hidden rounded border border-emerald-800/50 bg-emerald-950/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-400 sm:block">
            SYSTEM READY
          </div>
        </div>

        {/* Workspace body */}
        <div className="p-6 sm:p-8">
          <Tabs defaultValue="mastersheet" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/90 p-1.5 sm:grid-cols-4">
              <TabsTrigger
                value="mastersheet"
                className="py-2.5 font-mono text-xs transition-all duration-300 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"
              >
                <Zap className="mr-2 h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Mastersheets
              </TabsTrigger>
              <TabsTrigger
                value="grade-analyzer"
                className="py-2.5 font-mono text-xs transition-all duration-300 data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400"
              >
                <Target className="mr-2 h-3.5 w-3.5 text-cyan-400" aria-hidden="true" /> CDP Scanner
              </TabsTrigger>
              <TabsTrigger
                value="roadmaps"
                className="py-2.5 font-mono text-xs transition-all duration-300 data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-400"
              >
                <Map className="mr-2 h-3.5 w-3.5 text-indigo-400" aria-hidden="true" /> Roadmaps
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="py-2.5 font-mono text-xs transition-all duration-300 data-[state=active]:bg-slate-800 data-[state=active]:text-purple-400"
              >
                <BookOpen className="mr-2 h-3.5 w-3.5 text-purple-400" aria-hidden="true" /> Note Builder
              </TabsTrigger>
            </TabsList>

            {/* Mastersheet tab */}
            <TabsContent value="mastersheet" className="mt-6 animate-showcaseIn">
              <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-2xl backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
                      Instant Mastersheet Engine
                      <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-400">
                      Auto-extracts formulas, 2-mark definitions, and key exam concepts.
                    </CardDescription>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                    Revision Mode
                  </span>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="academic-paper relative rounded-xl p-6 font-serif sm:p-8">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-300 pb-3">
                      <div>
                        <h4 className="font-sans text-sm font-bold uppercase tracking-wide text-stone-800">CS301: Operating Systems</h4>
                        <p className="font-sans text-[11px] text-stone-600">Unit II: Process Scheduling &amp; CPU Optimization</p>
                      </div>
                      <span className="shrink-0 rounded bg-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-700">PAGE 1 / 4</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 font-sans text-xs md:grid-cols-2">
                      <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-sm">
                        <span className="mb-1 block font-mono text-[10px] font-bold text-emerald-700">FORMULA #01</span>
                        <p className="font-mono text-xs font-bold text-slate-950">Turnaround Time (TAT) = CT - AT</p>
                        <p className="mt-1 text-[11px] text-stone-500">Completion Time minus Arrival Time.</p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-sm">
                        <span className="mb-1 block font-mono text-[10px] font-bold text-emerald-700">FORMULA #02</span>
                        <p className="font-mono text-xs font-bold text-slate-950">Waiting Time (WT) = TAT - BT</p>
                        <p className="mt-1 text-[11px] text-stone-500">Turnaround Time minus Burst Time.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between gap-3 border-t border-slate-800/80 pt-4 font-mono text-xs text-slate-400">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span className="truncate">Parsed from CS301_Syllabus.pdf</span>
                  </div>
                  <Link
                    href="/mastersheet"
                    className="flex shrink-0 items-center gap-1 font-sans font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    Export Sheets <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* CDP grade scanner tab */}
            <TabsContent value="grade-analyzer" className="mt-6 animate-showcaseIn">
              <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-2xl backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <CardTitle className="text-lg font-semibold tracking-tight text-white">CDP Relative Grade Scanner</CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-400">
                      Real-time OCR extraction and relative score mapping.
                    </CardDescription>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                    Target: A Grade
                  </span>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="relative flex min-h-[220px] items-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-6">
                    <div
                      aria-hidden="true"
                      className="animate-laser-scan pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                    />
                    <div className="relative z-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-center">
                        <span className="block font-mono text-[10px] uppercase text-slate-400">Current Score</span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-white">74.5%</span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-center">
                        <span className="block font-mono text-[10px] uppercase text-slate-400">Class Average</span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-amber-400">62.0%</span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-center">
                        <span className="block font-mono text-[10px] uppercase text-slate-400">EndSem Target</span>
                        <span className="mt-1 block font-mono text-2xl font-bold text-cyan-400">38 / 50</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roadmaps tab */}
            <TabsContent value="roadmaps" className="mt-6 animate-showcaseIn">
              <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-2xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">Assignment Roadmaps</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Milestone tracking for course deliverables.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span className="text-slate-200">Phase 1: Environment Setup &amp; API Specs</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span className="text-slate-200">Phase 2: Database Schema &amp; Authentication</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Note Builder tab */}
            <TabsContent value="notes" className="mt-6 animate-showcaseIn">
              <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-2xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">Smart Note Builder</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Structured formula parser &amp; exam note generator.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
                    <code>const note = await semos.generateSummary(syllabusPDF);</code>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
