import { ImageResponse } from "next/og";

// The share image for a content page: its title and one line, on the brand colours. Generated at build time, so no image file to keep in step.

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function renderOgImage(title: string, line: string) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0f172a",
        color: "#f8fafc",
        padding: 80,
      }}
    >
      <div style={{ display: "flex", fontSize: 34, letterSpacing: 2, color: "#facc15" }}>CHECKPOINT</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 28, color: "#cbd5e1", maxWidth: 980 }}>{line}</div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#94a3b8" }}>buffrcheckpoint.com</div>
    </div>,
    ogSize,
  );
}
