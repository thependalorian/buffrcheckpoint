import { ImageResponse } from "next/og";

// The share image for a content page: its title and one line, on the brand colours. Generated at build time, so no image file to keep in step.

// An image generator cannot read CSS variables, so the brand values are repeated here from the theme preset
// (website/src/styles/presets/buffr-checkpoint.css). Light canvas, carbon type, one Sodium Yellow accent.
const TOKEN = {
  cloud: "#F5F5F5",
  carbon: "#171717",
  slate: "#6B6B6B",
  frost: "#D9D9D4",
  sodiumYellow: "#E0B000",
  sodiumYellowInk: "#8A6B00",
} as const;

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
        background: TOKEN.cloud,
        color: TOKEN.carbon,
        padding: 80,
      }}
    >
      <div style={{ display: "flex", fontSize: 34, letterSpacing: 2, color: TOKEN.sodiumYellowInk, fontWeight: 600 }}>CHECKPOINT</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 28, color: TOKEN.slate, maxWidth: 980 }}>{line}</div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: TOKEN.slate }}>buffrcheckpoint.com</div>
    </div>,
    ogSize,
  );
}
