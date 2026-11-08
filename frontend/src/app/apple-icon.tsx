import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#121215",
          border: "5px solid #fb6b6a",
          borderRadius: 38,
          color: "#fb6b6a",
          fontWeight: 900,
          fontSize: 105,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        E
      </div>
    ),
    {
      ...size,
    }
  );
}

