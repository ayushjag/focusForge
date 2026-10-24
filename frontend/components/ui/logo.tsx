import { TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-focus">
        <TimerReset aria-hidden="true" size={20} strokeWidth={2.4} />
      </span>
      {!compact && <span className="text-lg font-bold text-foreground">FocusForge</span>}
    </div>
  );
}
