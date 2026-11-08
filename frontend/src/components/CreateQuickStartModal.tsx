"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileAudio,
  Video,
  Image as ImageIcon,
  AudioLines,
  Mic2,
  Scissors,
  Wand2,
  Sparkles,
  Eraser,
  Maximize,
  Smile,
  ArrowRight,
  X,
  RefreshCw,
  FolderArchive,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/design-system/primitives/button";
import { Card } from "@/design-system/primitives/card";
import { formatBytes } from "@/lib/utils";

interface CreateQuickStartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateQuickStartModal({ open, onOpenChange }: CreateQuickStartModalProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileType, setFileType] = React.useState<"audio" | "video" | "image" | "unknown" | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith("audio/")) {
      setFileType("audio");
    } else if (file.type.startsWith("video/")) {
      setFileType("video");
    } else if (file.type.startsWith("image/")) {
      setFileType("image");
    } else {
      setFileType("unknown");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSelectTool = (route: string) => {
    onOpenChange(false);
    setSelectedFile(null);
    setFileType(null);
    router.push(route);
  };

  const audioTools = [
    { name: "Stem Separator", route: "/stems", desc: "Isolate vocals, drums, bass & accompaniment", icon: AudioLines },
    { name: "AI Vocal Remover", route: "/audio/vocal-remover", desc: "Create karaoke instrumental or acapella", icon: Mic2 },
    { name: "Audio Cutter", route: "/audio/cutter", desc: "Trim audio waveforms with millisecond precision", icon: Scissors },
    { name: "Audio Converter", route: "/audio/converter", desc: "Transcode to MP3, WAV, AAC, FLAC", icon: RefreshCw },
    { name: "Split Audio", route: "/audio/split", desc: "Split into equal parts or by silence intervals", icon: FolderArchive },
    { name: "Audio Merger", route: "/audio/merger", desc: "Join multiple audio tracks with crossfade", icon: Layers },
  ];

  const videoTools = [
    { name: "Video to Audio Converter", route: "/audio/video-to-audio", desc: "Rip clean MP3 or WAV from video clips", icon: FileAudio },
    { name: "Video Watermark Remover", route: "/creative/remove-video-watermark", desc: "Erase TikTok, Reels & logos from video", icon: Video },
    { name: "Video Clip Trimmer", route: "/creative/video-editor", desc: "Cut clips and adjust playback speed", icon: Video },
  ];

  const imageTools = [
    { name: "Photo Canvas Editor", route: "/creative/photo-editor", desc: "Crop, rotate, brush drawing, and adjustments", icon: Wand2 },
    { name: "Face & Skin Retouch", route: "/creative/retouch", desc: "Smooth skin, reduce blemishes, brighten smile", icon: Smile },
    { name: "Remove Watermark", route: "/creative/remove-watermark", desc: "Brush mask unwanted logos or text", icon: Eraser },
    { name: "Background Remover", route: "/creative/remove-background", desc: "Transparent cutout or studio color replacement", icon: Sparkles },
    { name: "Bulk Image Resizer", route: "/creative/resize-image", desc: "Lanczos downscaling, target KB, social presets", icon: Maximize },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden rounded-[8px] shadow-none">
        <DialogHeader className="p-4 pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-semibold text-[#111827] dark:text-[#f4f4f5]">
                Quick Create & File Routing
              </DialogTitle>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                Drop any file to instantly see recommended client-side tools.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-4 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] text-center transition-colors"
          >
            {selectedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="h-8 w-8 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                    {fileType === "audio" ? (
                      <FileAudio className="h-4 w-4" />
                    ) : fileType === "video" ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] block truncate max-w-[280px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                      {formatBytes(selectedFile.size)} • Detected as {fileType?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileType(null);
                  }}
                  className="h-6 text-[10px] px-2"
                >
                  Change File
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="h-6 w-6 text-[#6b7280] dark:text-[#a1a1aa] mx-auto mb-1.5" />
                <span className="text-xs font-medium text-[#111827] dark:text-[#f4f4f5] block">
                  Drag & Drop any audio, video, or image file
                </span>
                <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] block mt-0.5">
                  or click to browse your local device (100% private)
                </span>
                <input
                  type="file"
                  accept="audio/*,video/*,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Suggested Tools Section */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] block">
              {fileType === "audio"
                ? "Recommended Audio Tools"
                : fileType === "video"
                ? "Recommended Video Tools"
                : fileType === "image"
                ? "Recommended Photo & Image Tools"
                : "Or Choose a Tool to Open Directly"}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(fileType === "audio"
                ? audioTools
                : fileType === "video"
                ? videoTools
                : fileType === "image"
                ? imageTools
                : [...audioTools.slice(0, 3), ...videoTools.slice(0, 1), ...imageTools.slice(0, 2)]
              ).map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleSelectTool(tool.route)}
                    className="flex items-center justify-between p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] hover:border-[#fb6b6a] text-left group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-[4px] bg-white dark:bg-[#121215] border border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-center text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] group-hover:border-[#fb6b6a]/50 transition-colors shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] transition-colors truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] truncate">
                          {tool.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#52525b] group-hover:text-[#fb6b6a] group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

