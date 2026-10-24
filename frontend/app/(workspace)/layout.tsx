import type { ReactNode } from "react";
import { Suspense } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

// Protected workspace pages resolve browser-side auth and API state before settling.
export const instant = false;

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
