import { Suspense } from "react";
import type { Metadata } from "next";
import ClassRooms from "@/components/ClassRooms";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "Class Rooms · SemOS" };

export default function RoomsPage() {
  return (
    <ToolShell>
      {/* The room and invite code come from the URL, which is only known in the browser. */}
      <Suspense fallback={null}>
        <ClassRooms />
      </Suspense>
    </ToolShell>
  );
}
