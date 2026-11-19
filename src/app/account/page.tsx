import type { Metadata } from "next";
import AccountPanel from "@/components/AccountPanel";
import ToolShell from "@/components/ToolShell";

export const metadata: Metadata = { title: "Account · SemOS" };

export default function AccountPage() {
  return (
    <ToolShell>
      <AccountPanel />
    </ToolShell>
  );
}
