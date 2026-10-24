"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Progress({ className, value = 0, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-black/10", className)} {...props}>
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-foreground transition-transform duration-500"
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value ?? 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
