import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,#b9ff45_0%,#8bea2d_55%,#66d71f_100%)] text-[#17210f] shadow-[0_5px_14px_rgba(113,211,37,0.22)] hover:bg-[linear-gradient(135deg,#aaf13a_0%,#7ddb25_55%,#59c719_100%)] hover:shadow-[0_6px_16px_rgba(113,211,37,0.3)]",
        secondary: "border border-border bg-white text-foreground hover:bg-surface-soft",
        ghost: "text-muted hover:bg-surface-soft hover:text-foreground",
        focus: "bg-focus text-foreground hover:bg-[#a9df5c]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ asChild, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
