import type { Metadata } from "next";
import Link from "next/link";
import {
  AudioLines,
  Scissors,
  Wand2,
  Eraser,
  Sparkles,
  Maximize,
  Video,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Cpu,
  Mic2,
  FileAudio,
} from "lucide-react";
import { constructMetadata } from "@/lib/seo/metadata";
import { Card } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";

export const metadata: Metadata = constructMetadata({
  title: "Edito — Free Music & Creative Studio",
  description:
    "Ultra-fast browser-based media editor. Separate audio stems, trim waveforms, inpaint watermarks, resize images, and edit photos locally.",
  path: "/",
});

export default function HomePage() {
  const cards = [
    {
      title: "AI Stem Separator",
      subtitle: "Isolate vocals, drums, bass, and accompaniment with local ONNX models.",
      badge: "AI Core",
      href: "/stems",
      icon: AudioLines,
      stats: "2 & 4 Stems • Real-Time Transpose",
    },
    {
      title: "AI Vocal Remover & Karaoke",
      subtitle: "Extract acapellas or remove vocals to create clean karaoke instrumental tracks.",
      badge: "Karaoke",
      href: "/audio/vocal-remover",
      icon: Mic2,
      stats: "Vocal Isolation • Sing in Key",
    },
    {
      title: "Video to Audio Converter",
      subtitle: "Extract clean MP3, WAV, or AAC audio tracks from MP4, WebM, and MOV videos.",
      badge: "Extractor",
      href: "/audio/video-to-audio",
      icon: FileAudio,
      stats: "Lossless • Bitrate & Gain Control",
    },
    {
      title: "Audio Utility Suite",
      subtitle: "Waveform trimmer, format converter, pitch & tempo transposer, volume booster.",
      badge: "8 Tools",
      href: "/audio",
      icon: Scissors,
      stats: "Lossless • Millisecond Precision",
    },
    {
      title: "Photo Canvas Editor",
      subtitle: "Vector crop, rotate, brush drawing, color levels, and real-time aesthetic shaders.",
      badge: "Canvas",
      href: "/creative/photo-editor",
      icon: Wand2,
      stats: "Drawing • Color Levels • Export",
    },
    {
      title: "AI Watermark & Object Remover",
      subtitle: "Brush over unwanted text or watermarks; local inpainting erases them seamlessly.",
      badge: "AI Inpaint",
      href: "/creative/remove-watermark",
      icon: Eraser,
      stats: "Neural Inpaint • Before/After Slider",
    },
    {
      title: "AI Background Remover & Replacer",
      subtitle: "Automatic subject extraction, transparent cutout, and studio color replacement.",
      badge: "AI Cutout",
      href: "/creative/remove-background",
      icon: Sparkles,
      stats: "Transparent PNG • Custom Backdrop",
    },
    {
      title: "Video Watermark & Logo Remover",
      subtitle: "Erase TikTok, Reels, CapCut, timestamps, and TV stamps seamlessly in-browser.",
      badge: "Video AI",
      href: "/creative/remove-video-watermark",
      icon: Video,
      stats: "Real-Time Delogo • 100% Client-Side",
    },
    {
      title: "Bulk Image Resizer & Converter",
      subtitle: "Downscale up to 50 photos, social media dimension presets, and batch ZIP export.",
      badge: "Batch ZIP",
      href: "/creative/resize-image",
      icon: Maximize,
      stats: "Lanczos3 Scaling • Target KB Size",
    },
    {
      title: "Video Clip Studio",
      subtitle: "Browser video trimmer, playback speed rate control, and audio extractor to MP3.",
      badge: "Trimmer",
      href: "/creative/video-editor",
      icon: Video,
      stats: "MP4 • WebCodecs • Rip MP3",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Header / Intro Section */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span>ZERO SERVER UPLOADS • LOCAL EXECUTION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          What would you like to create?
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
          Sleek, high-performance browser studio for audio engineering, image processing, and video trimming. No sign-up, no subscriptions, zero data leaves your device.
        </p>
      </div>

      {/* Primary Hub Cards Grid per Spec 4 & 5 */}
      {/* Mobile: 1-col (grid-cols-1) | Tablet: 2-col (md:grid-cols-2) | Desktop: 3-col (lg:grid-cols-3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-12">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group block rounded-[8px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fb6b6a]"
            >
              <Card
                interactive
                className="h-full p-4 flex flex-col justify-between border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] hover:border-[#fb6b6a] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-center text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] group-hover:border-[#fb6b6a]/50 transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {card.badge}
                    </Badge>
                  </div>

                  <h2 className="text-sm font-semibold text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] transition-colors flex items-center gap-1.5">
                    {card.title}
                  </h2>
                  <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-1 line-clamp-2 leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                  <span className="font-mono text-[10px]">{card.stats}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#52525b] group-hover:text-[#fb6b6a] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Trust & Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-6 border-t border-[#e5e7eb] dark:border-[#27272a]">
        <div className="p-3.5 rounded-[8px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215]">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-[#10b981]" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              100% Device-Level Privacy
            </h3>
          </div>
          <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
            Processing runs in browser memory via Web Audio, WebAssembly, and WebGPU. Audio and photos never leave your device.
          </p>
        </div>

        <div className="p-3.5 rounded-[8px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215]">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="h-4 w-4 text-[#fb6b6a]" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Hardware Acceleration
            </h3>
          </div>
          <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
            Direct WebGPU shader acceleration for neural networks with automatic single- and multi-threaded WASM fallbacks.
          </p>
        </div>

        <div className="p-3.5 rounded-[8px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215]">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="h-4 w-4 text-[#3b82f6]" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Local IndexedDB Storage
            </h3>
          </div>
          <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
            Save your multitrack stem projects, loops, chord detections, and image edits safely in your browser database.
          </p>
        </div>
      </div>
    </div>
  );
}
