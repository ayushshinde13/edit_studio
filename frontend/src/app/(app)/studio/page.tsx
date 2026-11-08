"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderHeart,
  Trash2,
  Download,
  ExternalLink,
  Plus,
  Music2,
  Image as ImageIcon,
  Clock,
  HardDrive,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";
import { listProjects, deleteProject, clearAllProjects, type StoredProject } from "@/lib/storage/indexeddb";
import { formatBytes } from "@/lib/utils";

export default function StudioPage() {
  const [projects, setProjects] = React.useState<StoredProject[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadProjects = React.useCallback(async () => {
    try {
      const projs = await listProjects();
      setProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = async (id: string) => {
    if (confirm("Delete this saved project from local browser storage?")) {
      await deleteProject(id);
      await loadProjects();
    }
  };

  const handleClearAll = async () => {
    if (confirm("Clear all local projects?")) {
      await clearAllProjects();
      await loadProjects();
    }
  };

  const totalSize = projects.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <FolderHeart className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Local Studio Projects
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Persisted strictly in browser IndexedDB. Accessible offline with zero uploads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-red-500 hover:text-red-400 h-8 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Storage
            </Button>
          )}
          <Button asChild size="sm" className="h-8 text-xs px-3">
            <Link href="/stems">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Storage Meter */}
      <div className="p-3.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-4 w-4 text-[#6b7280] dark:text-[#a1a1aa]" />
          <div>
            <span className="font-medium text-[#111827] dark:text-[#f4f4f5]">
              Local Storage Footprint:{" "}
            </span>
            <span className="font-mono text-[#fb6b6a] font-semibold">{formatBytes(totalSize)}</span>
            <span className="text-[#6b7280] dark:text-[#a1a1aa] ml-2">
              ({projects.length} project{projects.length !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
          Browser-Managed DB
        </span>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#6b7280] dark:text-[#a1a1aa]">
          Loading local workspace...
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215]">
          <FolderHeart className="h-10 w-10 text-[#6b7280] dark:text-[#52525b] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f4f4f5]">
            No saved projects yet
          </h3>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] max-w-sm mx-auto mt-1 mb-4">
            When you separate stems, adjust pitches, or edit audio, tap "Save Mix" to resume your session anytime.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/stems">Open Stem Separator</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/audio/cutter">Open Audio Cutter</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {proj.type}
                  </Badge>
                  <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] truncate">
                  {proj.title}
                </h3>
                <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                  {proj.state.stems ? `${proj.state.stems.length} stems separated` : "Interactive session"}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  {formatBytes(proj.sizeBytes || 0)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(proj.id)}
                    className="p-1 rounded text-red-500 hover:text-red-400"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Button asChild variant="outline" size="sm" className="h-6 text-[11px] px-2">
                    <Link href={proj.type === "stems" ? `/stems?projectId=${proj.id}` : `/audio/cutter`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
