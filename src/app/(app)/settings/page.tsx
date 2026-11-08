"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Zap,
  Trash2,
  Shield,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/primitives/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { detectCapabilities, type SystemCapabilities } from "@/lib/capabilities/capabilities";
import { analytics } from "@/lib/analytics/tracker";
import { clearAllProjects } from "@/lib/storage/indexeddb";

export default function SettingsPage() {
  const [capabilities, setCapabilities] = React.useState<SystemCapabilities | null>(null);
  const [optOut, setOptOut] = React.useState(false);
  const [performanceMode, setPerformanceMode] = React.useState<"fast" | "safe">("fast");
  const [clearedNotice, setClearedNotice] = React.useState(false);

  React.useEffect(() => {
    detectCapabilities().then((cap) => {
      setCapabilities(cap);
      setPerformanceMode(cap.recommendedMode);
    });
    setOptOut(analytics.getOptOut());
  }, []);

  const handleToggleOptOut = (checked: boolean) => {
    setOptOut(checked);
    analytics.setOptOut(checked);
  };

  const handleClearData = async () => {
    if (confirm("Clear all locally cached models and IndexedDB projects?")) {
      await clearAllProjects();
      localStorage.clear();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 4000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <SettingsIcon className="h-5 w-5 text-[#fb6b6a]" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
            Application Preferences
          </h1>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Configure client-side execution parameters, telemetry toggles, and cache retention.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Diagnostics Card */}
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-[#fb6b6a]" />
            <h2 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Hardware Diagnostics
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">WebGPU Acceleration</span>
              <div className="text-xs font-semibold mt-1 flex items-center gap-1.5 text-[#111827] dark:text-[#f4f4f5]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    capabilities?.webgpu ? "bg-[#10b981]" : "bg-[#6b7280]"
                  }`}
                />
                {capabilities?.webgpu ? "Available" : "WASM Safe Mode"}
              </div>
            </div>

            <div className="p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">SharedArrayBuffer</span>
              <div className="text-xs font-semibold mt-1 flex items-center gap-1.5 text-[#111827] dark:text-[#f4f4f5]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    capabilities?.sharedArrayBuffer ? "bg-[#10b981]" : "bg-[#f59e0b]"
                  }`}
                />
                {capabilities?.sharedArrayBuffer ? "Multi-Threaded" : "Single-Thread"}
              </div>
            </div>

            <div className="p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">Hardware Threads</span>
              <div className="text-xs font-semibold mt-1 text-[#111827] dark:text-[#f4f4f5] font-mono">
                {capabilities?.hardwareConcurrency || 4} Cores
              </div>
            </div>

            <div className="p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">Device Class</span>
              <div className="text-xs font-semibold mt-1 capitalize text-[#111827] dark:text-[#f4f4f5]">
                {capabilities?.deviceClass || "Desktop"}
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Mode */}
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                Fast Mode (WebGPU Acceleration)
              </Label>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                Leverages GPU tensor pipelines for faster-than-realtime stem isolation and inpainting.
              </p>
            </div>
            <Switch
              checked={performanceMode === "fast"}
              onCheckedChange={(c) => setPerformanceMode(c ? "fast" : "safe")}
            />
          </div>
        </Card>

        {/* Privacy & Diagnostics */}
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                Opt-out of Anonymous Diagnostic Counts
              </Label>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                Disable anonymous tool action counters. File contents and file names are never tracked.
              </p>
            </div>
            <Switch checked={optOut} onCheckedChange={handleToggleOptOut} />
          </div>
        </Card>

        {/* Storage Reset */}
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Local Storage Purge
            </h3>
            <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
              Reset cached neural model weights, saved projects, and preferences in this browser.
            </p>
            {clearedNotice && (
              <span className="text-[11px] text-[#10b981] flex items-center gap-1 mt-1 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Browser storage purged.
              </span>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearData}
            className="h-8 text-xs shrink-0"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Purge Storage
          </Button>
        </Card>
      </div>
    </div>
  );
}
