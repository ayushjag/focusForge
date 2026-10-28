import { FocusScreen } from "@/components/focus/focus-screen";
import { Suspense } from "react";

export default function FocusPage() {
  return <Suspense fallback={<p className="p-8 text-sm text-muted">Loading focus room...</p>}><FocusScreen /></Suspense>;
}
