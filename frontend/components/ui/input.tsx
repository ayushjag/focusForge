import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground outline-none transition placeholder:text-[#96a098] focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
