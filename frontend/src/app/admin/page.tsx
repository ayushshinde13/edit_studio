"use client";

import * as React from "react";
import {
  Users,
  Eye,
  Cpu,
  Download,
  Activity,
  TrendingUp,
  Globe,
  Zap,
} from "lucide-react";
import { Card } from "@/design-system/primitives/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = React.useState<"today" | "7d" | "30d">("7d");
  const [kpis, setKpis] = React.useState<any>(null);
  const [charts, setCharts] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/v1/admin/summary").then((r) => r.json()),
      fetch("/api/v1/admin/charts").then((r) => r.json()),
    ])
      .then(([summaryData, chartsData]) => {
        setKpis(summaryData);
        setCharts(chartsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  const hasCategoryData = charts?.categoryShare && charts.categoryShare.length > 0;
  const hasToolData = charts?.topTools && charts.topTools.length > 0;
  const hasGeoCountries = charts?.geoCountries && charts.geoCountries.length > 0;
  const hasTopCities = charts?.topCities && charts.topCities.length > 0;

  const totalDev =
    (charts?.deviceSplit?.desktop || 0) +
    (charts?.deviceSplit?.mobile || 0) +
    (charts?.deviceSplit?.tablet || 0);

  const desktopPct = totalDev > 0 ? Math.round(((charts?.deviceSplit?.desktop || 0) / totalDev) * 100) : 0;
  const mobilePct = totalDev > 0 ? Math.round(((charts?.deviceSplit?.mobile || 0) / totalDev) * 100) : 0;
  const tabletPct = totalDev > 0 ? Math.round(((charts?.deviceSplit?.tablet || 0) / totalDev) * 100) : 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Top Banner & Date Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Analytics & Operations Dashboard
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Real-time live telemetry, tool performance, and hardware capability insights.
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-1 bg-[#121215] p-1 rounded-[6px] border border-[#27272a]">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`text-xs h-6 px-2.5 rounded-[4px] capitalize font-medium transition-colors ${
                dateRange === r
                  ? "bg-[#fb6b6a] text-white"
                  : "text-[#a1a1aa] hover:text-white"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards (Zero Mock: pure live counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Total Visitors</span>
            <Eye className="h-3.5 w-3.5 text-[#52525b]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {kpis?.totalVisits ?? 0}
          </div>
          <div className="text-[10px] text-[#a1a1aa] flex items-center gap-1 mt-1 font-mono">
            {kpis?.totalVisits > 0 ? (
              <span className="text-[#10b981] flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> Live traffic
              </span>
            ) : (
              "0 recorded"
            )}
          </div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Unique Users</span>
            <Users className="h-3.5 w-3.5 text-[#52525b]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {kpis?.uniqueUsers ?? 0}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1 font-mono">Hashed IP Salted</div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Tool Operations</span>
            <Cpu className="h-3.5 w-3.5 text-[#52525b]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {kpis?.totalOperations ?? 0}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1 font-mono">In-browser tasks</div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215]">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Successful Exports</span>
            <Download className="h-3.5 w-3.5 text-[#fb6b6a]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {kpis?.successfulExports ?? 0}
          </div>
          <div className="text-[10px] text-[#fb6b6a] font-mono font-medium mt-1">
            {kpis?.exportRate ?? "0.0%"} conversion
          </div>
        </Card>

        <Card className="p-3.5 border-[#27272a] bg-[#121215] col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#a1a1aa] mb-1">
            <span className="text-[11px] font-medium">Active (Last 24h)</span>
            <Activity className="h-3.5 w-3.5 text-[#10b981]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {kpis?.activeLast24h ?? 0}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-1 font-mono">
            {kpis?.activeLast24h > 0 ? "Active today" : "0 active today"}
          </div>
        </Card>
      </div>

      {/* Category Share & Top Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Share Donut Chart */}
        <Card className="p-4 border-[#27272a] bg-[#121215]">
          <span className="text-xs font-semibold text-white mb-2 block">
            Category Share (% Operations)
          </span>
          <div className="h-52 w-full flex items-center justify-center">
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryShare}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    stroke="#121215"
                    strokeWidth={2}
                  >
                    {charts.categoryShare.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181c", borderColor: "#27272a", fontSize: "11px" }}
                    formatter={(val: any) => [`${val}`, "Operations"]}
                  />
                  <Legend verticalAlign="bottom" height={30} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-4">
                <span className="text-xs text-[#a1a1aa] block">No operations recorded yet</span>
                <span className="text-[10px] text-[#52525b] mt-1 block">
                  Category breakdown will display as users process audio, images, or video.
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Top Tools Leaderboard Bar Chart */}
        <Card className="p-4 border-[#27272a] bg-[#121215] lg:col-span-2">
          <span className="text-xs font-semibold text-white mb-2 block">
            Top Tools Activity (Opened vs Processed vs Exported)
          </span>
          <div className="h-52 w-full flex items-center justify-center">
            {hasToolData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topTools}>
                  <XAxis dataKey="tool" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181c", borderColor: "#27272a", fontSize: "11px" }} />
                  <Legend verticalAlign="bottom" height={30} iconSize={8} />
                  <Bar dataKey="opens" name="Opened" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="processes" name="Processed" fill="#a855f7" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="exports" name="Exported" fill="#fb6b6a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-4">
                <span className="text-xs text-[#a1a1aa] block">No tool activity recorded yet</span>
                <span className="text-[10px] text-[#52525b] mt-1 block">
                  Activity per tool (opens, processes, exports) will rank here in real time.
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Operations Trend Line */}
      <Card className="p-4 border-[#27272a] bg-[#121215]">
        <span className="text-xs font-semibold text-white mb-2 block">
          Daily Operations Trend
        </span>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts?.trendLine || []}>
              <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#18181c", borderColor: "#27272a", fontSize: "11px" }} />
              <Legend verticalAlign="bottom" height={30} iconSize={8} />
              <Line type="monotone" dataKey="audio" stroke="#fb6b6a" strokeWidth={2} name="Audio Tools" dot={false} />
              <Line type="monotone" dataKey="image" stroke="#a855f7" strokeWidth={2} name="Photo Tools" dot={false} />
              <Line type="monotone" dataKey="video" stroke="#38bdf8" strokeWidth={2} name="Video Tools" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Geography & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 border-[#27272a] bg-[#121215]">
          <span className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-[#fb6b6a]" />
            Top Countries (Edge Geo Headers)
          </span>
          <div className="space-y-2">
            {hasGeoCountries ? (
              charts.geoCountries.map((c: any) => (
                <div key={c.code} className="flex items-center justify-between text-xs">
                  <span className="text-[#a1a1aa]">{c.code} - {c.name}</span>
                  <span className="font-mono text-white text-[11px]">{c.visits} ({c.percentage}%)</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#a1a1aa] italic py-4 text-center">
                No visitor locations recorded yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 border-[#27272a] bg-[#121215]">
          <span className="text-xs font-semibold text-white mb-3 block">
            Top Cities
          </span>
          <div className="space-y-2">
            {hasTopCities ? (
              charts.topCities.map((c: any) => (
                <div key={c.city} className="flex items-center justify-between text-xs">
                  <span className="text-[#a1a1aa]">{c.city}, {c.country}</span>
                  <span className="font-mono text-[#fb6b6a] text-[11px] font-semibold">{c.visits} hits</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#a1a1aa] italic py-4 text-center">
                No city traffic recorded yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 border-[#27272a] bg-[#121215] space-y-3">
          <span className="text-xs font-semibold text-white block">
            Hardware & Platform Split
          </span>
          {totalDev > 0 ? (
            <div>
              <div className="h-2 w-full bg-[#18181c] rounded-full flex overflow-hidden border border-[#27272a]">
                <div style={{ width: `${desktopPct}%` }} className="bg-[#fb6b6a]" title={`Desktop: ${desktopPct}%`} />
                <div style={{ width: `${mobilePct}%` }} className="bg-sky-400" title={`Mobile: ${mobilePct}%`} />
                <div style={{ width: `${tabletPct}%` }} className="bg-emerald-400" title={`Tablet: ${tabletPct}%`} />
              </div>
              <div className="flex justify-between text-[10px] text-[#a1a1aa] mt-1 font-mono">
                <span>Desktop: {desktopPct}%</span>
                <span>Mobile: {mobilePct}%</span>
                <span>Tablet: {tabletPct}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#a1a1aa] italic py-2 text-center">
              0 device sessions recorded
            </p>
          )}

          <div className="pt-2 border-t border-[#27272a] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#10b981] font-mono text-[11px]">● WebGPU Native (Fast)</span>
              <span className="font-mono text-white text-[11px]">{charts?.webgpuRate?.supported ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400 font-mono text-[11px]">● WASM Fallback (Safe)</span>
              <span className="font-mono text-white text-[11px]">{charts?.webgpuRate?.fallbackWasm ?? 0}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
