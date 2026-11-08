"use client";

import * as React from "react";
import {
  ListOrdered,
  Search,
  Filter,
  Download,
  Pause,
  Play,
  RotateCcw,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Badge } from "@/design-system/primitives/badge";
import { Card } from "@/design-system/primitives/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AdminLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [timezone, setTimezone] = React.useState<"UTC" | "IST">("IST");
  const [isPaused, setIsPaused] = React.useState(false);

  const [toolFilter, setToolFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [countryFilter, setCountryFilter] = React.useState("all");
  const [ipSearch, setIpSearch] = React.useState("");

  const [selectedRow, setSelectedRow] = React.useState<any | null>(null);

  const fetchLogs = React.useCallback(async () => {
    if (isPaused) return;
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        pageSize: "50",
        tool: toolFilter,
        category: categoryFilter,
        action: actionFilter,
        country: countryFilter,
        ipSearch,
      });

      const res = await fetch(`/api/v1/admin/logs?${q.toString()}`);
      const data = await res.json();
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
  }, [page, toolFilter, categoryFilter, actionFilter, countryFilter, ipSearch, isPaused]);

  React.useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const formatTimestamp = (isoString: string) => {
    const d = new Date(isoString);
    if (timezone === "UTC") {
      return d.toISOString().replace("T", " ").substring(0, 19);
    } else {
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  };

  const handleExport = (format: "csv" | "json") => {
    window.open(`/api/v1/admin/logs/export?format=${format}`, "_blank");
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Live Activity Stream
            </h1>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Real-time feed with masked IP addresses and zero file content exposure.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={() => setTimezone((tz) => (tz === "UTC" ? "IST" : "UTC"))}
          >
            <Clock className="h-3 w-3 mr-1" />
            {timezone}
          </Button>

          <Button
            size="sm"
            variant={isPaused ? "default" : "outline"}
            className="text-xs h-7 px-2"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={() => handleExport("csv")}
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={() => handleExport("json")}
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <Card className="p-3 border-[#27272a] bg-[#121215]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#52525b] absolute left-2.5 top-2.5" />
            <Input
              placeholder="Filter IP or Hash..."
              value={ipSearch}
              onChange={(e) => setIpSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-[#18181c] border-[#27272a]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-[6px] bg-[#18181c] border border-[#27272a] px-2 text-xs text-[#f4f4f5] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="audio">Audio Tools</option>
            <option value="creative">Creative Hub</option>
            <option value="video">Video Studio</option>
            <option value="general">General</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-8 rounded-[6px] bg-[#18181c] border border-[#27272a] px-2 text-xs text-[#f4f4f5] focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="page_view">Page View</option>
            <option value="tool_open">Tool Open</option>
            <option value="process">Process File</option>
            <option value="export">Export File</option>
            <option value="error">Error</option>
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-8 rounded-[6px] bg-[#18181c] border border-[#27272a] px-2 text-xs text-[#f4f4f5] focus:outline-none"
          >
            <option value="all">All Countries</option>
            <option value="US">United States (US)</option>
            <option value="IN">India (IN)</option>
            <option value="GB">United Kingdom (GB)</option>
            <option value="DE">Germany (DE)</option>
            <option value="JP">Japan (JP)</option>
          </select>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setToolFilter("all");
              setCategoryFilter("all");
              setActionFilter("all");
              setCountryFilter("all");
              setIpSearch("");
            }}
            className="text-xs h-8 text-[#a1a1aa] hover:text-white"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Log Activity Table */}
      <Card className="border-[#27272a] bg-[#121215] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#f4f4f5]">
            <thead className="bg-[#18181c] text-[#a1a1aa] border-b border-[#27272a] uppercase font-mono text-[10px]">
              <tr>
                <th className="p-2.5">Timestamp ({timezone})</th>
                <th className="p-2.5">Masked IP</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Tool Used</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Metadata Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#a1a1aa]">
                    No activity logs recorded yet. Events will appear here in real time as visitors use Edito tools.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedRow(log)}
                    className="hover:bg-[#18181c] cursor-pointer transition-colors"
                  >
                  <td className="p-2.5 font-mono text-[#a1a1aa] whitespace-nowrap">
                    {formatTimestamp(log.ts)}
                  </td>
                  <td className="p-2.5 font-mono text-[#fb6b6a] whitespace-nowrap">
                    {log.ip_masked}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    {log.country_code} ({log.city})
                  </td>
                  <td className="p-2.5 capitalize">{log.category}</td>
                  <td className="p-2.5 font-semibold text-white whitespace-nowrap">
                    {log.tool}
                  </td>
                  <td className="p-2.5">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-[#18181c] border border-[#27272a] text-[#a1a1aa] font-mono text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {log.ok ? (
                      <Badge variant="success" className="text-[9px] py-0">
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="error" className="text-[9px] py-0">
                        {log.error_type || "Error"}
                      </Badge>
                    )}
                  </td>
                  <td className="p-2.5 font-mono text-[10px] text-[#a1a1aa] max-w-xs truncate">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#27272a] flex items-center justify-between text-xs text-[#a1a1aa] bg-[#18181c]/50">
          <span>
            Page <strong className="text-white font-mono">{page}</strong> of{" "}
            <strong className="text-white font-mono">{totalPages}</strong> ({total} events)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs px-2"
            >
              <ChevronLeft className="h-3 w-3 mr-0.5" />
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs px-2"
            >
              Next
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Row Detail Dialog */}
      {selectedRow && (
        <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
          <DialogContent className="max-w-md p-4 border border-[#27272a] bg-[#121215] text-[#f4f4f5] rounded-[8px]">
            <DialogHeader className="pb-2 border-b border-[#27272a]">
              <DialogTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Event Telemetry Detail</span>
                {selectedRow.ok ? (
                  <Badge variant="success">OK</Badge>
                ) : (
                  <Badge variant="error">{selectedRow.error_type}</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="font-mono text-[10px] text-[#a1a1aa]">
                ID: {selectedRow.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 text-xs pt-2">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[6px] bg-[#18181c] border border-[#27272a]">
                <div>
                  <span className="text-[#a1a1aa] text-[10px]">Tool:</span>
                  <div className="text-white font-medium">{selectedRow.tool}</div>
                </div>
                <div>
                  <span className="text-[#a1a1aa] text-[10px]">Action:</span>
                  <div className="text-white font-medium uppercase font-mono">{selectedRow.action}</div>
                </div>
                <div>
                  <span className="text-[#a1a1aa] text-[10px]">Masked IP:</span>
                  <div className="text-[#fb6b6a] font-mono">{selectedRow.ip_masked}</div>
                </div>
                <div>
                  <span className="text-[#a1a1aa] text-[10px]">Location:</span>
                  <div className="text-white">
                    {selectedRow.city}, {selectedRow.country_code}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[#a1a1aa] text-[10px] block mb-1">
                  Metadata (Zero file content):
                </span>
                <pre className="p-2.5 rounded-[6px] bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-[#10b981] overflow-x-auto">
                  {JSON.stringify(selectedRow.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
