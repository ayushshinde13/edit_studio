import type { Metadata } from "next";
import Link from "next/link";
import {
  Scissors,
  FileAudio,
  RefreshCw,
  Layers,
  Minimize2,
  Gauge,
  Volume2,
  Disc,
  ArrowRight,
  ShieldCheck,
  Mic2,
  Video,
  SlidersHorizontal,
} from "lucide-react";
import { Card } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Audio Utility Suite & Music Tools Hub",
  description:
    "Free client-side audio utilities: waveform cutter, format converter, speed and tempo transposer, volume amplifier, and silence generator.",
  path: "/audio",
});

export default function AudioHubPage() {
  const tools = [
    {
      title: "AI Vocal Remover",
      slug: "vocal-remover",
      href: "/audio/vocal-remover",
      desc: "Isolate vocals, create karaoke tracks, and extract acapella with local AI.",
      icon: Mic2,
      badge: "AI Powered",
    },
    {
      title: "Video to Audio Converter",
      slug: "video-to-audio",
      href: "/audio/video-to-audio",
      desc: "Extract clean audio tracks from MP4, WebM, MOV, and AVI videos to MP3 or WAV.",
      icon: Video,
      badge: "Extractor",
    },
    {
      title: "Audio Converter",
      slug: "converter",
      href: "/audio/converter",
      desc: "Convert between MP3, WAV, AAC, FLAC, and OGG formats with bitrate control.",
      icon: RefreshCw,
      badge: "Transcode",
    },
    {
      title: "Audio Merger",
      slug: "merger",
      href: "/audio/merger",
      desc: "Combine and join multiple audio tracks with smooth crossfades.",
      icon: Layers,
      badge: "Multi-Track",
    },
    {
      title: "Split Audio",
      slug: "split",
      href: "/audio/split",
      desc: "Split tracks into equal parts or by silence intervals with ZIP export.",
      icon: Scissors,
      badge: "ZIP Export",
    },
    {
      title: "Mix Audio",
      slug: "mix",
      href: "/audio/mix",
      desc: "Overlay multiple audio tracks with volume, offset, and mute/solo.",
      icon: SlidersHorizontal,
      badge: "Multi-Layer",
    },
    {
      title: "Compress Audio",
      slug: "compress",
      href: "/audio/compress",
      desc: "Reduce file size with targeted bitrates or file size limits in KB.",
      icon: Minimize2,
      badge: "Lossless/Bitrate",
    },
    {
      title: "Audio Speed & Tempo",
      slug: "speed",
      href: "/audio/speed",
      desc: "Change tempo from 0.5x to 2.0x with optional pitch lock.",
      icon: Gauge,
      badge: "Time-Stretch",
    },
    {
      title: "Adjust Volume",
      slug: "volume",
      href: "/audio/volume",
      desc: "Boost loudness by +20dB, normalize peaks, and apply fades.",
      icon: Volume2,
      badge: "DSP Normalizer",
    },
    {
      title: "Blank Audio",
      slug: "blank",
      href: "/audio/blank",
      desc: "Generate silent WAV and MP3 files with millisecond precision.",
      icon: Disc,
      badge: "Generator",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mb-3">
          <ShieldCheck className="h-3 w-3 text-[#10b981]" />
          <span>WEB AUDIO DSP • 100% IN-BROWSER</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          Audio Engineering Toolbox
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
          Manipulate, trim, and convert audio tracks in memory. Zero uploads, zero telemetry on file contents.
        </p>
      </div>

      {/* Featured Card: Audio Cutter */}
      <div className="mb-6">
        <Link href="/audio/cutter" className="block group">
          <Card
            interactive
            className="p-5 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] hover:border-[#fb6b6a] transition-colors"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-[6px] border border-[#fb6b6a]/30 bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center shrink-0">
                  <Scissors className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#f4f4f5]">
                      Audio Waveform Cutter & Trimmer
                    </span>
                    <Badge variant="default">Featured</Badge>
                  </div>
                  <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] max-w-xl">
                    Interactive dual-handle waveform, millisecond scrubbing, fade-in/fade-out, and instant lossless export.
                  </p>
                </div>
              </div>
              <Button size="sm" className="h-8 text-xs shrink-0">
                Open Cutter
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        </Link>
      </div>

      {/* Two-Column Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.slug} href={tool.href} className="group block">
              <Card
                interactive
                className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] hover:border-[#fb6b6a] transition-colors h-full flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="h-7 w-7 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-center text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] transition-colors">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {tool.badge}
                    </Badge>
                  </div>
                  <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1 leading-normal">
                    {tool.desc}
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                  <span className="font-mono text-[10px]">Client-Side DSP</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#52525b] group-hover:text-[#fb6b6a] transition-colors" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
