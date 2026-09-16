/**
 * Colours for charts (recharts) and inline SVG.
 *
 * Recharts and raw `<svg>` take literal colour values, so Tailwind classes
 * and CSS custom properties in `styles/presets/buffr-checkpoint.css` can't
 * reach them — pasting hex literals at each chart call site is how a brand
 * change quietly misses half the charts in a product. One file instead.
 *
 * Restyled from buffr-intelligence's chartTokens.ts (same file, same
 * purpose, ported the way NamibiaMap was: literals copied then re-picked
 * against this app's own tokens, not the source brand's magenta/plum).
 *
 * **The sodium-yellow brand fill never appears as a chart series.** It's
 * the identity's most recognisable element and encodes nothing on a data
 * axis — reserved for `--primary` UI chrome (buttons, active nav), not data.
 */

/** The single data colour, for charts showing one measure. Sodium-yellow-ink — the
 *  same darkened gold already proven at 4.88:1 on --color-cloud (buffr-checkpoint.css). */
export const DATA = "#8a6403";

/** Carbon — for emphasis text/lines in inline SVG diagrams. */
export const INK = "#171717";

/** A muted companion, for a baseline or a comparison series. */
export const DATA_MUTED = "#d9d9d4";

/** Fill under a line, at low opacity. */
export const DATA_FILL = "#8a6403";
export const DATA_FILL_OPACITY = 0.1;

/**
 * Categorical series, ordered by how distinguishable they are from each
 * other rather than by brand hierarchy — a reader has to tell series three
 * from series four at a glance.
 */
export const SERIES = [
  "#8a6403", // sodium-yellow-ink
  "#171717", // carbon
  "#15803d", // status-live green
  "#2563eb", // info blue (no brand equivalent; generic, not status-red-adjacent)
  "#6b6b6b", // slate
  "#b91c1c", // destructive red
] as const;

/** Chart chrome: axes, gridlines, tooltip borders. */
export const AXIS = "#6b6b6b";
export const GRID = "#f5f4ef";
export const TOOLTIP_BORDER = "#d9d9d4";

/** Reused so tooltips do not drift apart between charts. */
export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: `1px solid ${TOOLTIP_BORDER}`,
  fontSize: 13,
} as const;

/** Placeholder and empty-state line work. */
export const PLACEHOLDER = "#9a9a94";
export const PLACEHOLDER_FILL = "#f5f4ef";

/**
 * Status. Kept outside the brand palette on purpose — must be
 * distinguishable at a glance and never mistaken for brand emphasis.
 * Matches the existing `.status-live`/`.status-targeted` tokens in
 * buffr-checkpoint.css so a status colour means the same thing in a
 * chart as it does in a badge.
 */
export const STATUS = {
  success: "#15803d",
  warning: "#8a6403",
  danger: "#b91c1c",
  info: "#2563eb",
} as const;
