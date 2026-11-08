import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AI Stem Separator Online Free - Edito";
export const size = { width: 1200, height: 630 };
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
            fontSize: 14,
            color: "#fb6b6a",
            fontWeight: 700,
            letterSpacing: "0.15em",
            marginBottom: 20,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          Free In-Browser AI Audio Separation
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: 24,
          }}
        >
          AI Stem Separator Online Free
        </h1>

        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          Isolate Vocals, Drums, Bass & Accompaniment • Key & Tempo Control • 100% Client-Side
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
            Zero Server Uploads
          </div>
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 6,
              backgroundColor: "#18181c",
              color: "#f4f4f5",
              border: "1px solid #27272a",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            2-Stem & 4-Stem ONNX
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
