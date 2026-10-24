import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold", {
  variants: {
    variant: {
      default: "bg-foreground text-white",
      green: "bg-[#d9efdf] text-[#17633f]",
      yellow: "bg-[#ffedb0] text-[#765311]",
      pink: "bg-[#f9d9e8] text-[#913f68]",
      muted: "bg-[#e8ebe7] text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
