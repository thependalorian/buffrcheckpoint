// Ops Console chart/map color tokens — same design-token PATTERN as
// buffr-intelligence's chartTokens.ts (a single DATA color + muted/status
// variants for charts and maps), but built from Buffr Checkpoint's own
// brand palette rather than that product's "Signal Arc" gradient, which
// belongs to a different product. See buffr-checkpoint.css preset for the
// underlying hex values (already fixed for WCAG AA this session).
export const DATA = "#8a6403"; // --color-sodium-yellow-ink
export const DATA_MUTED = "#c0b2b8";
export const PLACEHOLDER_FILL = "#f6f1f2";
export const INK = "#171717"; // --color-carbon
export const STATUS = {
  low: "#15803d", // --color-status-live equivalent (healthy / low risk)
  medium: "#8a6403", // sodium-yellow-ink (watch)
  high: "#b91c1c", // --destructive (at risk)
};
