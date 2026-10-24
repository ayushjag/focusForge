"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn("flex h-11 w-full items-center justify-between rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50", className)} {...props}>
      {children}
      <SelectPrimitive.Icon><ChevronDown size={16} /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn("z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-black/10 bg-white p-1 shadow-xl", className)} position="popper" sideOffset={6} {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn("relative flex cursor-default select-none items-center rounded px-8 py-2.5 text-sm outline-none focus:bg-surface-soft data-[disabled]:opacity-50", className)} {...props}>
      <span className="absolute left-2.5"><SelectPrimitive.ItemIndicator><Check size={15} /></SelectPrimitive.ItemIndicator></span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
