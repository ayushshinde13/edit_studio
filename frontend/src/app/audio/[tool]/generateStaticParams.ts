import { AUDIO_TOOLS } from "@/config/tools";

export function generateStaticParams() {
  return AUDIO_TOOLS.map((tool) => ({
    tool: tool.slug,
  }));
}

