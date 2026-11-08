"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors select-none rounded-[6px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fb6b6a] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        // Solid Accent Brand Button (Soft Coral / Sunset Red)
        default:
          "bg-[#fb6b6a] text-white hover:bg-[#ea5857] active:bg-[#d94746] border border-transparent shadow-none",
        // Crisp 1px Outline Button
        outline:
          "border border-[#e5e7eb] dark:border-[#27272a] bg-transparent text-[#111827] dark:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#18181c] hover:border-[#d1d5db] dark:hover:border-[#3f3f46]",
        // Flat Secondary Surface
        secondary:
          "bg-[#f4f4f5] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5] border border-[#e5e7eb] dark:border-[#27272a] hover:bg-[#e5e7eb] dark:hover:bg-[#27272a]",
        // Ghost Variant
        ghost:
          "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#18181c]",
        // Destructive Flat Red
        destructive:
          "bg-[#ef4444] text-white hover:bg-[#dc2626] border border-transparent",
        // Subtle Accent Flat
        subtle:
          "bg-[#fb6b6a]/10 text-[#fb6b6a] border border-[#fb6b6a]/20 hover:bg-[#fb6b6a]/20",
      },
      size: {
        default: "h-8 px-3 text-xs",
        sm: "h-7 px-2.5 text-[11px]",
        lg: "h-10 px-4 text-sm font-semibold",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

