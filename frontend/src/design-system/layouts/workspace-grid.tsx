import * as React from "react";
import { cn } from "@/lib/utils";

interface WorkspaceGridProps {
  sidebar?: React.ReactNode;
  main: React.ReactNode;
  inspector?: React.ReactNode;
  className?: string;
}

export function WorkspaceGrid({
  sidebar,
  main,
  inspector,
  className,
}: WorkspaceGridProps) {
  return (
    <div
      className={cn(
        "w-full max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4",
        className
      )}
    >
      {/* Left Utility Palette (Desktop: 3 cols = ~260px) */}
      {sidebar && (
        <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          {sidebar}
        </aside>
      )}

      {/* Central Stage (Waveform or Canvas) */}
      <section
        className={cn(
          "space-y-4 order-1 lg:order-2",
          sidebar && inspector
            ? "lg:col-span-6"
            : sidebar || inspector
            ? "lg:col-span-8"
            : "lg:col-span-12"
        )}
      >
        {main}
      </section>

      {/* Right Inspector / Parameters Pane (Desktop: 3 or 4 cols = ~320px) */}
      {inspector && (
        <aside
          className={cn(
            "space-y-4 order-3",
            sidebar ? "lg:col-span-3" : "lg:col-span-4"
          )}
        >
          {inspector}
        </aside>
      )}
    </div>
  );
}

