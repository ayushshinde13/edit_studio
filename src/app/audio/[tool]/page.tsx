import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AudioToolbox from "@/features/audio-tools/AudioToolbox";
import { AUDIO_TOOLS } from "@/config/tools";
import { constructMetadata } from "@/lib/seo/metadata";
import { generateHowToSchema, generateSoftwareApplicationSchema } from "@/lib/seo/schema";
import { Card } from "@/design-system/primitives/card";

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
  const howToSchema = generateHowToSchema({
    title: `How to use ${tool.name} Online for Free`,
    description: tool.description,
    steps: tool.steps || [
      "Select your audio file from your device",
      "Adjust the tool parameters and preview output",
      "Export and download your audio track instantly",
    ],
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
          {tool.title}
        </h1>
        <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-1">
          {tool.description}
        </p>
      </div>

      {/* Interactive Tool UI */}
      <AudioToolbox toolId={tool.id} toolName={tool.name} />

      {/* SEO HowTo Block */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#a1a1aa]">
          How to Use {tool.name} in Browser
        </h2>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#111827] dark:text-[#f4f4f5]">
          {(tool.steps || [
            "Upload or drag an audio file into the box above.",
            "Use the sliders and controls to tune your preferences.",
            "Click Export Audio to download the processed file to your device.",
          ]).map((step, idx) => (
            <li key={idx}>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
          <strong>Privacy guarantee:</strong> Audio processing is executed 100% locally in your browser through Web Audio and WebAssembly. Your files are never uploaded to any remote server.
        </div>
      </Card>
    </div>
  );
}
