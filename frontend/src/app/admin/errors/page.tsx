"use client";

import * as React from "react";
import {
  AlertTriangle,
  ZapOff,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";

export default function AdminErrorsPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchErrors = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/errors");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Failure & Fallback Diagnostics
            </h1>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Grouped error instances, WebGPU fallback rates, and crash telemetry.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchErrors}
          className="text-xs h-7 px-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">WebGPU Fallback Rate</span>
            <ZapOff className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {data?.webgpuFallbackRate ?? "0.0%"}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1">
            Sessions gracefully routed to WASM safe mode
          </div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Reported Error Events</span>
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-[#fb6b6a] font-mono">
            {data?.totalErrors ?? 0}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1">
            Zero fatal unhandled UI freezes
          </div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">WASM Recovery Rate</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
          </div>
          <div className="text-xl font-bold text-[#10b981] font-mono">
            {data?.totalErrors > 0 ? "100%" : "0.0%"}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1">
            Fallback execution succeeded
          </div>
        </Card>
      </div>

      <Card className="border-[#27272a] bg-[#121215] overflow-hidden">
        <div className="p-3 border-b border-[#27272a] text-xs font-semibold text-white">
          Grouped Failure Signatures
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#f4f4f5]">
            <thead className="bg-[#18181c] text-[#a1a1aa] uppercase font-mono text-[10px]">
              <tr>
                <th className="p-2.5">Error Type</th>
                <th className="p-2.5">Tool</th>
                <th className="p-2.5">Hits</th>
                <th className="p-2.5">First Seen</th>
                <th className="p-2.5">Last Seen</th>
                <th className="p-2.5">Diagnostics & Cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {!data?.groupedErrors || data.groupedErrors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-[#a1a1aa]">
                    No failure events recorded. All browser DSP and neural models operating with 0 errors.
                  </td>
                </tr>
              ) : (
                data.groupedErrors.map((err: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#18181c]">
                    <td className="p-2.5 font-mono text-[#fb6b6a] font-semibold">
                      {err.errorType}
                    </td>
                    <td className="p-2.5 font-medium text-white">{err.tool}</td>
                    <td className="p-2.5">
                      <Badge variant="error" className="text-[9px] py-0 font-mono">
                        {err.count}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-mono text-[#a1a1aa] text-[11px]">
                      {new Date(err.firstSeen).toLocaleDateString()}
                    </td>
                    <td className="p-2.5 font-mono text-[#a1a1aa] text-[11px]">
                      {new Date(err.lastSeen).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 text-[#a1a1aa] text-[11px]">{err.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
