"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Trash2,
  HardDrive,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/primitives/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/design-system/primitives/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/design-system/primitives/badge";

export default function AdminSettingsPage() {
  const [retentionDays, setRetentionDays] = React.useState(90);
  const [excludeAdminSession, setExcludeAdminSession] = React.useState(true);
  const [excludedIps, setExcludedIps] = React.useState<string[]>(["127.0.0.1", "103.120.45.10"]);
  const [newIpToExclude, setNewIpToExclude] = React.useState("");
  const [cleanMessage, setCleanMessage] = React.useState<string | null>(null);
  const [isCleaning, setIsCleaning] = React.useState(false);

  const totalRows = 4850;
  const estimatedDbSizeMB = 18.4;
  const maxFreeQuotaMB = 500;
  const quotaUsedPercent = ((estimatedDbSizeMB / maxFreeQuotaMB) * 100).toFixed(1);

  const handleRunCleanup = async () => {
    if (confirm(`Run data retention clean-up now? Purges raw logs older than ${retentionDays} days.`)) {
      setIsCleaning(true);
      try {
        const res = await fetch("/api/v1/admin/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retentionDays }),
        });
        const data = await res.json();
        setCleanMessage(`Purged ${data.purgedCount || 0} old event rows successfully.`);
        setTimeout(() => setCleanMessage(null), 4000);
      } catch (e: any) {
        setCleanMessage("Cleanup failed: " + e.message);
      } finally {
        setIsCleaning(false);
      }
    }
  };

  const handleAddExcludedIp = () => {
    if (newIpToExclude.trim()) {
      setExcludedIps([...excludedIps, newIpToExclude.trim()]);
      setNewIpToExclude("");
    }
  };

  const handleExcludeCurrentIp = () => {
    setExcludedIps([...excludedIps, "Current Client IP (Auto-Hashed)"]);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#27272a]">
        <SettingsIcon className="h-5 w-5 text-[#fb6b6a]" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Retention Policies & Controls
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Manage data purging schedules, database storage quotas, and IP exclusion rules.
          </p>
        </div>
      </div>

      {/* Storage Meter */}
      <Card className="p-4 border-[#27272a] bg-[#121215] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white font-medium">
            <HardDrive className="h-4 w-4 text-[#fb6b6a]" />
            <span>Database Storage Meter (Free 500MB Cap)</span>
          </div>
          <span className="font-mono text-[#fb6b6a] font-semibold text-xs">
            {estimatedDbSizeMB} MB / {maxFreeQuotaMB} MB ({quotaUsedPercent}%)
          </span>
        </div>

        <div className="w-full h-2 bg-[#18181c] rounded-full overflow-hidden border border-[#27272a]">
          <div
            className="h-full bg-[#fb6b6a] rounded-full"
            style={{ width: `${quotaUsedPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-[#a1a1aa] font-mono">
          <span>{totalRows.toLocaleString()} rows logged</span>
          <span>Alert threshold: 80% (400 MB)</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retention Purge */}
        <Card className="p-4 border-[#27272a] bg-[#121215] space-y-3">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-[#27272a]">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            <span>Data Retention Horizon</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#a1a1aa]">Purge Threshold</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setRetentionDays(days)}
                  className={`py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                    retentionDays === days
                      ? "bg-[#fb6b6a] text-white border-transparent"
                      : "border-[#27272a] bg-[#18181c] text-[#a1a1aa]"
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {cleanMessage && (
            <div className="p-2.5 rounded-[4px] border border-[#10b981]/30 bg-[#10b981]/10 text-xs text-[#10b981] flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{cleanMessage}</span>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={handleRunCleanup}
            disabled={isCleaning}
            className="w-full h-8 text-xs font-semibold"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {isCleaning ? "Purging..." : `Purge Logs Older than ${retentionDays} Days`}
          </Button>
        </Card>

        {/* IP Exclusion */}
        <Card className="p-4 border-[#27272a] bg-[#121215] space-y-3">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-[#27272a]">
            <EyeOff className="h-3.5 w-3.5 text-sky-400" />
            <span>Telemetry Exclusions</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-[4px] bg-[#18181c] border border-[#27272a]">
            <div>
              <span className="text-xs font-medium text-white block">
                Admin Session Exclusion
              </span>
              <span className="text-[10px] text-[#a1a1aa]">
                Never log hits from this staff browser window.
              </span>
            </div>
            <Switch
              checked={excludeAdminSession}
              onCheckedChange={setExcludeAdminSession}
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#a1a1aa]">Excluded IP Hashes</Label>
              <button
                onClick={handleExcludeCurrentIp}
                className="text-[10px] text-[#fb6b6a] hover:underline"
              >
                + Exclude My IP
              </button>
            </div>

            <div className="flex gap-1.5">
              <Input
                placeholder="e.g. 192.168.1.1"
                value={newIpToExclude}
                onChange={(e) => setNewIpToExclude(e.target.value)}
                className="h-7 text-xs bg-[#18181c] border-[#27272a]"
              />
              <Button
                size="sm"
                onClick={handleAddExcludedIp}
                className="h-7 text-xs px-2.5"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {excludedIps.map((ip, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] font-mono text-[#a1a1aa]"
                >
                  {ip}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
