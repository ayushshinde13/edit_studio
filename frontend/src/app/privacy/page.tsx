"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Cpu,
  HardDrive,
  EyeOff,
  ServerOff,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Card } from "@/design-system/primitives/card";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 2026";

  const pillars = [
    {
      icon: ServerOff,
      title: "100% In-Browser Execution (Zero Uploads)",
      desc: "All audio stem separation, video-to-audio extraction, waveform trimming, and photo canvas editing happen 100% locally on your machine using WebAssembly (WASM), WebAudio API, and WebGPU. Your media files are NEVER uploaded to any server.",
    },
    {
      icon: Lock,
      title: "Zero Data Retention Guarantee (100% Secure)",
      desc: "Hum kisi ka koi data nahi rakhte. We do not store, view, or retain your audio tracks, video clips, photos, or metadata. Once you close your browser tab or clear your local cache, memory is instantly released.",
    },
    {
      icon: EyeOff,
      title: "No Tracking Cookies or Ad Pixels",
      desc: "We do not sell data, and we do not use invasive third-party tracking cookies, fingerprinting networks, or advertising pixels. No Facebook Pixel, no ad trackers.",
    },
    {
      icon: HardDrive,
      title: "Local IndexedDB Workspace Only",
      desc: "Projects saved in the Multitrack Studio live strictly in your device's browser IndexedDB storage. You have full ownership and can wipe your local project database with a single click in Settings.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a] dark:hover:text-[#fb6b6a] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Studio</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-mono">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>100% Secure • Zero Data Retention</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
          Edito Privacy Policy & Security Architecture
        </h1>

        <p className="text-sm text-[#4b5563] dark:text-[#a1a1aa] leading-relaxed max-w-3xl">
          At Edito, privacy is not an afterthought—it is the foundational architecture of everything we build.
          All audio, video, and image processing is executed entirely client-side on your own device.
        </p>

        <div className="text-[11px] font-mono text-[#6b7280] dark:text-[#71717a]">
          Last Updated: {lastUpdated} • Version 1.2.0
        </div>
      </div>

      {/* Primary 100% Secure Statement Card */}
      <Card className="p-6 border-[#fb6b6a]/30 bg-[#fb6b6a]/5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-[4px] bg-[#fb6b6a] text-white flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              100% Secure Guarantee: Hum kisi ka koi data nahi rakhte
            </h2>
            <p className="text-xs text-[#374151] dark:text-[#d4d4d8] leading-relaxed">
              <strong>English:</strong> We do not keep, store, harvest, or transmit any user data. Your songs, videos, recordings, and images are processed strictly in your computer or phone’s temporary memory (RAM) and are NEVER sent to our servers.
            </p>
            <p className="text-xs text-[#374151] dark:text-[#d4d4d8] leading-relaxed font-mono">
              <strong>हिंग्लिश / हिंदी:</strong> Edito 100% सुरक्षित है। हम किसी का कोई भी डेटा या मीडिया फाइल्स (ऑडियो, वीडियो, फोटो) अपने सर्वर पर नहीं रखते हैं। सब कुछ सीधे आपके ब्राउज़र में लोकली प्रोसेस होता है।
            </p>
          </div>
        </div>
      </Card>

      {/* 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.title}
              className="p-5 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2.5"
            >
              <div className="h-7 w-7 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-white">
                {p.title}
              </h3>
              <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] leading-relaxed">
                {p.desc}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Detailed Technical Sections */}
      <div className="space-y-6 pt-4 border-t border-[#e5e7eb] dark:border-[#27272a] text-xs text-[#4b5563] dark:text-[#a1a1aa] leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">
            1. How Media Processing Works (Client-Side DSP & WebGPU)
          </h3>
          <p>
            Unlike traditional cloud SaaS tools that force you to upload gigabytes of audio and video to remote data centers, Edito utilizes the modern WebAssembly (WASM), WebGPU, and Web Audio APIs. AI models (Demucs v4, Spleeter, LaMa, and U2-Net) run as local neural weights directly within your browser’s execution sandbox.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">
            2. What We Collect (And What We Never Collect)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-[4px] border border-red-800/30 bg-red-950/10 space-y-1">
              <span className="font-semibold text-red-400 block flex items-center gap-1">
                ✕ What We NEVER Collect:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-300">
                <li>Your audio, video, or photo files</li>
                <li>File names, tags, or media contents</li>
                <li>Names, personal emails, or passwords</li>
                <li>Payment details or credit cards</li>
                <li>Precise GPS location</li>
              </ul>
            </div>

            <div className="p-3 rounded-[4px] border border-[#10b981]/30 bg-[#10b981]/10 space-y-1">
              <span className="font-semibold text-[#10b981] block flex items-center gap-1">
                ✓ Anonymous Telemetry Only:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#10b981]">
                <li>Hashed, salted IP for rate limiting</li>
                <li>Country & city derived from edge headers</li>
                <li>Tool feature used (e.g. Stem Separator)</li>
                <li>Hardware WebGPU vs WASM fallback rate</li>
                <li>Device class (Desktop vs Mobile)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">
            3. Privacy Opt-Out
          </h3>
          <p>
            You can disable anonymous telemetry at any time by toggling "Opt-Out" in your{" "}
            <Link href="/settings" className="text-[#fb6b6a] underline underline-offset-2">
              App Settings
            </Link>{" "}
            or enabling "Do Not Track" in your browser.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">
            4. Contact
          </h3>
          <p>
            If you have questions about our zero-data architecture or client-side privacy model, reach out via the in-app feedback modal or at{" "}
            <span className="font-mono text-[#111827] dark:text-white">privacy@edito.studio</span>.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-between">
        <Link href="/" className="text-xs text-[#fb6b6a] hover:underline font-medium">
          ← Return to Edito Studio
        </Link>
        <Button
          onClick={() => {
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          variant="outline"
          className="h-7 text-xs"
        >
          Top ↑
        </Button>
      </div>
    </div>
  );
}
