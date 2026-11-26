import * as React from "react";
import type { Metadata } from "next";
import Link from "next/navigation";
import { notFound } from "next/navigation";
import AudioToolbox from "@/features/audio-tools/AudioToolbox";
import { AUDIO_TOOLS } from "@/config/tools";
import { constructMetadata } from "@/lib/seo/metadata";
import {
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
} from "@/lib/seo/schema";
import { Card } from "@/design-system/primitives/card";
import { ShieldCheck, Zap, Lock, ChevronRight, HelpCircle } from "lucide-react";

export { generateStaticParams } from "./generateStaticParams";

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = AUDIO_TOOLS.find((t) => t.slug === slug);
  if (!tool) return { title: "Tool Not Found" };

  return constructMetadata({
    title: tool.title,
    description: tool.description,
    path: tool.route,
    keywords: tool.keywords,
  });
}

export default async function AudioToolSlugPage({ params }: ToolPageProps) {
  const { tool: slug } = await params;
  const tool = AUDIO_TOOLS.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  const appSchema = generateSoftwareApplicationSchema(tool);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Audio Tools", path: "/audio" },
    { name: tool.name, path: tool.route },
  ]);

  const defaultFaqs = [
    {
      q: `Is Edito's ${tool.name} completely free to use?`,
      a: `Yes, ${tool.name} on Edito is 100% free with no subscription, no watermark, and no artificial file size restrictions.`,
    },
    {
      q: "Are my audio files uploaded or stored on any server?",
      a: "No! All audio processing runs 100% locally in your web browser using WebAssembly and Web Audio API. Your files never touch a remote server.",
    },
    {
      q: `What audio formats are supported by ${tool.name}?`,
      a: "Edito supports all standard audio formats including MP3, WAV, AAC, M4A, FLAC, OGG, and WebM, as well as MP4 video extracts.",
    },
  ];
  const activeFaqs = tool.faqs && tool.faqs.length > 0 ? tool.faqs : defaultFaqs;
  const faqSchema = generateFAQSchema(activeFaqs);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Visual Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6b7280] dark:text-[#a1a1aa]">
        <a href="/" className="hover:text-[#fb6b6a] transition-colors">Home</a>
        <ChevronRight className="h-3 w-3" />
        <a href="/audio" className="hover:text-[#fb6b6a] transition-colors">Audio Tools</a>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#111827] dark:text-[#f4f4f5] font-medium">{tool.name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          {tool.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Interactive Tool UI */}
      <React.Suspense fallback={<div className="py-12 text-center text-xs text-[#6b7280] dark:text-[#a1a1aa]">Loading Audio Tool...</div>}>
        <AudioToolbox toolId={tool.id} toolName={tool.name} />
      </React.Suspense>

      {/* AEO: Direct Answer & Instructions Block */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#a1a1aa]">
          How to Use {tool.name} in Browser
        </h2>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#111827] dark:text-[#f4f4f5]">
          {(tool.steps || [
            "Upload or drag an audio file into the workspace above.",
            "Use the sliders and controls to tune your preferences.",
            "Click Export Audio to download the processed file instantly to your device.",
          ]).map((step, idx) => (
            <li key={idx}>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {/* Client-Side Privacy Guarantee */}
        <div className="pt-3 border-t border-[#e5e7eb] dark:border-[#27272a] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#10b981]" />
            <span>100% Client-Side Private</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#fb6b6a]" />
            <span>Instant WebAssembly Speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>Zero Remote Storage</span>
          </div>
        </div>
      </Card>

      {/* AEO: Frequently Asked Questions */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
          <HelpCircle className="h-3.5 w-3.5 text-[#fb6b6a]" />
          <span>Frequently Asked Questions</span>
        </div>
        <div className="space-y-2.5 pt-1">
          {activeFaqs.map((faq, idx) => (
            <div key={idx} className="p-2.5 rounded-[4px] bg-[#fbfbfb] dark:bg-[#18181c] border border-[#e5e7eb] dark:border-[#27272a] space-y-1">
              <h3 className="text-xs font-medium text-[#111827] dark:text-[#f4f4f5]">{faq.q}</h3>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
