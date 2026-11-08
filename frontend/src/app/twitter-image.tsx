import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Edito - Free In-Browser Music & Creative Studio";
export const size = {
  width: 1200,
  height: 600,
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
            fontSize: 20,
            color: "#f43f5e",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 16,
          }}
        >
          Edito Studio
        </div>

        <h1
          style={{
            fontSize: 58,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          Private In-Browser AI Media Suite
        </h1>

        <p
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Zero uploads. 100% Client-side. Free Forever.
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
