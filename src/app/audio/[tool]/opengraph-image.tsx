import { ImageResponse } from "next/og";
import { AUDIO_TOOLS } from "@/config/tools";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const resolvedParams = await params;
  const tool = AUDIO_TOOLS.find((t) => t.slug === resolvedParams.tool) || AUDIO_TOOLS[0];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: "#fb6b6a",
            fontWeight: 700,
            letterSpacing: "0.15em",
            marginBottom: 20,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          Free Online Audio Toolbox • Edito
        </div>

        <h1
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          {tool.title}
        </h1>

        <p
          style={{
            fontSize: 22,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          {tool.description}
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
