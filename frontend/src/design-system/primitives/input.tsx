import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] px-2.5 py-1 text-xs text-[#111827] dark:text-[#f4f4f5] placeholder:text-[#6b7280] dark:placeholder:text-[#52525b] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fb6b6a] focus-visible:border-[#fb6b6a] disabled:cursor-not-allowed disabled:opacity-40 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

