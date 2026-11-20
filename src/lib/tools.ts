import { BookOpenCheck, CalendarClock, Mic, NotebookText, ScanSearch, Target, UsersRound } from "lucide-react";

/** The tool tabs in every top bar (tool pages and Roadmap). */
export const TOOLS = [
  { href: "/pyq", label: "PYQ Predictor", icon: ScanSearch },
  { href: "/viva", label: "Viva Simulator", icon: Mic },
  { href: "/mastersheet", label: "Mastersheet", icon: BookOpenCheck },
  { href: "/note-builder", label: "Note Builder", icon: NotebookText },
  { href: "/grade-analyzer", label: "Grade Analyzer", icon: Target },
  { href: "/roadmap", label: "Roadmap", icon: CalendarClock },
  { href: "/rooms", label: "Class Rooms", icon: UsersRound },
];
