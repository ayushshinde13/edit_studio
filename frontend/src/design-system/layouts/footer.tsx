"use client";

import * as React from "react";
import Link from "next/link";
import {
  AudioLines,
  Scissors,
  Wand2,
  Eraser,
  Maximize,
  Video,
  Mic2,
  FileAudio,
  Layers,
  Sparkles,
  Sliders,
  Volume2,
  Split,
  FolderHeart,
  Settings,
  ShieldCheck,
  Cpu,
  Zap,
  Lock,
} from "lucide-react";

interface FooterProps {
  onOpenQuickCreate?: () => void;
}

export function Footer({ onOpenQuickCreate }: FooterProps = {}) {
  const audioTools = [
    { label: "AI Stem Separator (2 & 4 Stems)", href: "/stems", badge: "AI" },
    { label: "AI Vocal Remover & Karaoke", href: "/audio/vocal-remover", badge: "Popular" },
    { label: "Audio Waveform Cutter", href: "/audio/cutter" },
    { label: "Video to Audio Extractor", href: "/audio/video-to-audio" },
    { label: "Audio Format Converter", href: "/audio/converter" },
    { label: "Audio Merger & Joiner", href: "/audio/merger" },
    { label: "Audio Splitter by Silence", href: "/audio/split" },
    { label: "Multitrack Audio Mixer", href: "/audio/mix" },
    { label: "Audio Bitrate Compressor", href: "/audio/compress" },
    { label: "Tempo & Pitch Transpose", href: "/audio/speed" },
    { label: "Volume Booster & Normalizer", href: "/audio/volume" },
  ];

  const creativeTools = [
    { label: "Full Photo Editor Canvas", href: "/creative/photo-editor" },
    { label: "Remove Watermark (Inpainting)", href: "/creative/remove-watermark", badge: "AI" },
    { label: "Remove Video Watermark", href: "/creative/remove-video-watermark", badge: "AI" },
    { label: "Background Cutout (U2-Net)", href: "/creative/remove-background", badge: "AI" },
    { label: "Bulk Image Resizer", href: "/creative/resize-image" },
    { label: "Creative Collage Maker", href: "/creative/make-collage" },
    { label: "Cinematic Photo Filters", href: "/creative/apply-effects" },
    { label: "Portrait Face Retouch", href: "/creative/retouch" },
    { label: "Video Clip Trimmer", href: "/creative/video-editor" },
  ];

  const studioFeatures = [
    { label: "Multitrack Studio Workspace", href: "/studio" },
    { label: "Smart Metronome & BPM", href: "/studio" },
    { label: "Lead-In Count-In (1-4 Bars)", href: "/studio" },
    { label: "Live Chord Detection", href: "/studio" },
    { label: "Song Notes & Synced Lyrics", href: "/studio" },
    { label: "1-Click Backing Tracks & Karaoke", href: "/studio" },
    { label: "Pitch Transpose (-12 to +12 st)", href: "/studio" },
    { label: "Local IndexedDB Projects", href: "/studio" },
  ];

  const platformLinks = [
    { label: "100% Secure Privacy Policy", href: "/privacy", icon: ShieldCheck },
    { label: "App Preferences & Engine", href: "/settings" },
    { label: "Local Cache & Models", href: "/settings" },
    { label: "Client-Side Privacy Architecture", href: "/privacy" },
    { label: "Staff Admin Console", href: "/admin/login", icon: Lock },
  ];

  return (
    <footer className="w-full border-t border-[#e5e7eb] dark:border-[#27272a] bg-[#fcfcfd] dark:bg-[#0c0c0e] text-[#111827] dark:text-[#f4f4f5] transition-colors pb-16 md:pb-6">
      {/* Top Banner: Privacy & Architecture Guarantee */}
      <div className="border-b border-[#e5e7eb] dark:border-[#27272a] bg-[#f4f4f5]/60 dark:bg-[#121215]/80 py-3.5 px-4">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#4b5563] dark:text-[#a1a1aa]">
            <ShieldCheck className="h-4 w-4 text-[#10b981] shrink-0" />
            <span>
              <strong className="text-[#111827] dark:text-white font-medium">100% In-Browser Privacy:</strong>{" "}
              Audio, photos, and videos are processed entirely on your device via WebGPU and WebAssembly. Zero media files are uploaded to any server.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[#6b7280] dark:text-[#71717a]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
              WebGPU Ready
            </span>
            <span>•</span>
            <span>v1.2.0</span>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Links Section */}
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand & Studio Bio */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group inline-flex">
              <div className="h-7 w-7 rounded-[5px] bg-[#fb6b6a] flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm group-hover:bg-[#ea5857] transition-colors">
                E
              </div>
              <span className="font-bold text-base tracking-tight text-[#111827] dark:text-white">
                Edito
              </span>
            </Link>

            <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] leading-relaxed">
              The free, browser-based creative suite for musicians, producers, podcasters, and content creators. Powered by client-side AI, WebAudio, and WebAssembly.
            </p>

            <div className="pt-1 flex flex-col gap-2">
              {onOpenQuickCreate && (
                <button
                  type="button"
                  onClick={onOpenQuickCreate}
                  className="w-full h-8 px-3 rounded-[4px] bg-[#fb6b6a] hover:bg-[#ea5857] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Quick Start (Drop File)</span>
                </button>
              )}
              <Link
                href="/studio"
                className="w-full h-8 px-3 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] hover:border-[#fb6b6a] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors text-[#374151] dark:text-[#d4d4d8]"
              >
                <FolderHeart className="h-3.5 w-3.5 text-[#fb6b6a]" />
                <span>Open Multitrack Studio</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Audio Studio */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white flex items-center gap-1.5">
              <AudioLines className="h-3.5 w-3.5 text-[#fb6b6a]" />
              <span>Audio Tools</span>
            </h3>
            <ul className="space-y-2 text-xs">
              {audioTools.map((t) => (
                <li key={t.label}>
                  <Link
                    href={t.href}
                    className="text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a] dark:hover:text-[#fb6b6a] transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{t.label}</span>
                    {t.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-[3px] bg-[#fb6b6a]/10 text-[#fb6b6a] border border-[#fb6b6a]/30 font-medium">
                        {t.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Creative Hub */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>Creative Hub</span>
            </h3>
            <ul className="space-y-2 text-xs">
              {creativeTools.map((t) => (
                <li key={t.label}>
                  <Link
                    href={t.href}
                    className="text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#38bdf8] dark:hover:text-[#38bdf8] transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{t.label}</span>
                    {t.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-[3px] bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 font-medium">
                        {t.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Studio Features */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#a855f7]" />
              <span>Studio Features</span>
            </h3>
            <ul className="space-y-2 text-xs">
              {studioFeatures.map((f) => (
                <li key={f.label}>
                  <Link
                    href={f.href}
                    className="text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#a855f7] dark:hover:text-[#a855f7] transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{f.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Platform & Admin */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-white flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-[#10b981]" />
              <span>Platform & Privacy</span>
            </h3>
            <ul className="space-y-2 text-xs">
              {platformLinks.map((p) => (
                <li key={p.label}>
                  <Link
                    href={p.href}
                    className="text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#10b981] dark:hover:text-[#10b981] transition-colors flex items-center gap-1.5"
                  >
                    {p.icon && <p.icon className="h-3 w-3" />}
                    <span>{p.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-3 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
              <span className="text-[10px] text-[#9ca3af] dark:text-[#71717a] font-mono block">
                Open Source AI Engine
              </span>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-relaxed">
                Demucs v4, Spleeter, LaMa & U2-Net running client-side via ONNX Runtime Web.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer: Copyright & Privacy */}
      <div className="border-t border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#09090b] py-4 px-4">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6b7280] dark:text-[#a1a1aa]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} <strong className="text-[#111827] dark:text-white font-medium">Edito</strong> Studio. All rights reserved.</span>
            <span>•</span>
            <span className="text-[#10b981]">100% Client-Side Private DSP</span>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#fb6b6a] transition-colors font-medium">
              Privacy Policy (100% Zero-Data)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

