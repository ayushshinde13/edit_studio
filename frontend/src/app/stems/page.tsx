import type { Metadata } from "next";
import StemStudio from "@/features/stems/StemStudio";
import { constructMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationSchema, generateHowToSchema, generateFAQSchema } from "@/lib/seo/schema";
import { TOOLS } from "@/config/tools";
import { Sparkles, Shield, Cpu, Zap } from "lucide-react";
import { Card } from "@/design-system/primitives/card";

const stemTool = TOOLS.find((t) => t.id === "stems")!;

export const metadata: Metadata = constructMetadata({
  title: stemTool.title,
  description: stemTool.description,
  path: "/stems",
  keywords: stemTool.keywords,
});

export default function StemSeparatorPage() {
  const appSchema = generateSoftwareApplicationSchema(stemTool);
  const howToSchema = generateHowToSchema({
    title: "How to Separate Stems Online with AI for Free",
    description: "Step-by-step guide to isolating vocals and backing tracks locally in your browser.",
    steps: stemTool.steps || [],
  });
  const faqSchema = generateFAQSchema(stemTool.faqs || []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Header Banner */}
      <div className="max-w-2xl mb-6">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#121215] text-[11px] font-mono text-[#6b7280] dark:text-[#a1a1aa] mb-2">
          <Sparkles className="h-3 w-3 text-[#fb6b6a]" />
          <span>ONNX NEURAL INFERENCE • WEBGPU ACCELERATED</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          AI Stem Separator Online Free
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1 leading-relaxed">
          Isolate vocals, accompaniment, drums, and bass with in-browser AI. Pitch transpose, tempo control, and chroma chord detection without server uploads.
        </p>
      </div>

      {/* Main Studio Console */}
      <StemStudio />

      {/* Programmatic SEO Guides & FAQ */}
      <div className="mt-12 pt-8 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <Shield className="h-4 w-4 text-[#10b981] mb-2" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] mb-1">
              Zero File Uploads
            </h3>
            <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
              Unlike cloud-based stem separators that store your private tracks on third-party servers, Edito runs ONNX models directly inside your browser memory.
            </p>
          </Card>

          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <Cpu className="h-4 w-4 text-[#fb6b6a] mb-2" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] mb-1">
              WebGPU & WASM Speed
            </h3>
            <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
              Leverages modern GPU shaders to decode and split audio chunks with faster-than-realtime execution on supported devices.
            </p>
          </Card>

          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <Zap className="h-4 w-4 text-[#f59e0b] mb-2" />
            <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] mb-1">
              Moises-Style Practice
            </h3>
            <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] leading-normal">
              Includes full practice suite: real-time transpose (-12 to +12 semitones), speed presets (0.75x, 0.9x), metronome click, and chroma chord detection.
            </p>
          </Card>
        </div>

        {/* How-To Steps */}
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#a1a1aa] mb-2">
            How to use the Free Online Stem Separator
          </h2>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#111827] dark:text-[#f4f4f5]">
            {stemTool.steps?.map((step, idx) => (
              <li key={idx}>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#a1a1aa]">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {stemTool.faqs?.map((faq, idx) => (
              <Card key={idx} className="p-3 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
                <h3 className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] mb-1">
                  {faq.q}
                </h3>
                <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
