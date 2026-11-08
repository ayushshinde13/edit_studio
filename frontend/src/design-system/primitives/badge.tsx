import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[10px] font-mono font-medium tracking-tight uppercase select-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[#fb6b6a]/30 bg-[#fb6b6a]/10 text-[#fb6b6a]",
        outline:
          "border-[#e5e7eb] dark:border-[#27272a] bg-transparent text-[#6b7280] dark:text-[#a1a1aa]",
        secondary:
          "border-[#e5e7eb] dark:border-[#27272a] bg-[#f4f4f5] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]",
        success:
          "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
        warning:
          "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]",
        error:
          "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
        accent:
          "border-transparent bg-[#fb6b6a] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

