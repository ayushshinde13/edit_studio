import type { Metadata } from "next";
import Link from "next/link";
import {
  Wand2,
  Maximize,
  Eraser,
  Sparkles,
  Grid,
  Video,
  FileAudio,
  ShieldCheck,
  Flame,
  ArrowRight,
  Smile,
} from "lucide-react";
import { Card } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Creative Photo & Video Studio Hub",
  description:
    "Free client-side visual tools: Canvas Photo Editor, Bulk Image Resizer, AI Watermark Remover, Background Replacer, Collage Maker, and Video Trimmer.",
  path: "/creative",
});

export default function CreativeHubPage() {
  const tools = [
    {
      title: "Photo Canvas Editor",
      href: "/creative/photo-editor",
      desc: "Crop, rotate, adjust levels (brightness, contrast, saturation), and draw on canvas.",
      icon: Wand2,
      badge: "Canvas",
    },
    {
      title: "Bulk Image Resizer",
      href: "/creative/resize-image",
      desc: "Batch resize up to 50 photos, Lanczos3 downscaling, social presets, and ZIP export.",
      icon: Maximize,
      badge: "Batch ZIP",
    },
    {
      title: "AI Watermark & Object Remover",
      href: "/creative/remove-watermark",
      desc: "Brush mask unwanted watermarks; local inpainting erases marks seamlessly.",
      icon: Eraser,
      badge: "AI Inpaint",
    },
    {
      title: "AI Video Watermark Remover",
      href: "/creative/remove-video-watermark",
      desc: "Erase TikTok, Reels, CapCut, timestamps, and logos with real-time client-side inpainting.",
      icon: Video,
      badge: "Video AI",
    },
    {
      title: "Background Remover & Replacer",
      href: "/creative/remove-background",
      desc: "Automatic subject extraction, transparent PNG export, and studio color replacement.",
      icon: Sparkles,
      badge: "Cutout",
    },
    {
      title: "Photo Collage Maker",
      href: "/creative/make-collage",
      desc: "Grid templates, customizable spacing, border radius, and framing palettes.",
      icon: Grid,
      badge: "Grid Layout",
    },
    {
      title: "Aesthetic Effects & Filters",
      href: "/creative/apply-effects",
      desc: "Real-time canvas shaders: Vintage 1980, Cyberpunk Neon, Vignette, and RGB Glitch.",
      icon: Flame,
      badge: "Shaders",
    },
    {
      title: "Face & Skin Retouch",
      href: "/creative/retouch",
      desc: "Smooth skin texture, reduce blemishes, brighten eyes and smile with interactive before/after split.",
      icon: Smile,
      badge: "Portrait",
    },
    {
      title: "Video Trimmer & Speed Editor",
      href: "/creative/video-editor",
      desc: "Trim video clips, adjust playback rate, mute audio, and export MP4.",
      icon: Video,
      badge: "Trimmer",
    },
    {
      title: "Extract Audio from Video",
      href: "/creative/video-to-audio",
      desc: "Rip clean MP3 or WAV audio tracks from video files with zero wait time.",
      icon: FileAudio,
      badge: "Rip MP3",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mb-3">
          <ShieldCheck className="h-3 w-3 text-[#10b981]" />
          <span>CANVAS & NEURAL MODELS • ZERO UPLOADS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          Creative Photo & Video Studio
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
          High-precision visual manipulation tools running privately inside your browser memory.
        </p>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.title} href={tool.href} className="group block">
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
                  <span className="font-mono text-[10px]">Browser-Accelerated</span>
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
