import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Edito - Free In-Browser Music & Creative Studio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
            padding: "6px 16px",
            borderRadius: 4,
            backgroundColor: "#18181c",
            border: "1px solid #27272a",
          }}
        >
          <span style={{ fontSize: 14, color: "#fb6b6a", fontWeight: "bold" }}>● 100% PRIVATE</span>
          <span style={{ fontSize: 14, color: "#52525b" }}>|</span>
          <span style={{ fontSize: 14, color: "#a1a1aa" }}>ZERO SERVER UPLOADS</span>
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: 20,
            letterSpacing: "-0.03em",
          }}
        >
          Browser-Based Music & <br />
          <span style={{ color: "#fb6b6a" }}>
            Creative Studio
          </span>
        </h1>

        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          AI Stem Separator • Waveform Audio Cutter • Watermark Inpainting • Photo Canvas • Video Tools
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 6,
              backgroundColor: "#fb6b6a",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Open Studio Free
          </div>
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 6,
              backgroundColor: "#18181c",
              border: "1px solid #27272a",
              color: "#f4f4f5",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            No Account Required
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
