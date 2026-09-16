// Light-only by decision (buffrcheckpoint.md Section 11.5, v0.5 correction —
// was dark-only pre-v0.5). The Buffr Checkpoint preset's tokens are keyed
// off [data-theme-preset="buffr-checkpoint"], not .dark, so the
// light/dark/system cycle in theme-switcher.tsx has never changed this
// preset's colors — it only toggles the <html> .dark class and
// documentElement.style.colorScheme (theme-boot.tsx), which affects native
// form-control chrome (scrollbars, checkbox rendering) but not the page's
// palette. Left in place rather than removed: it's inert for this preset
// but still meaningful groundwork if a future non-buffr-checkpoint preset
// is ever added back. ThemeMode itself stays the original three-value
// union because theme-utils.ts and preferences-provider.tsx still
// reference "light"/"system" for their system-preference-resolution
// logic; narrowing the type here would be a much larger, riskier change
// than this fix needs.
export const THEME_MODE_VALUES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ResolvedThemeMode = "light" | "dark";

// NOTE: originally CLI-generated (`npm run generate:presets`) from every
// file in src/styles/presets/. Hand-fixed to a single, non-switchable
// preset per Section 11.5's dark-only decision — the generator script and
// the other preset CSS files are left in place, unused; re-running the
// generator would resurrect the light-mode presets removed here.
export const THEME_PRESET_OPTIONS = [
  {
    label: "Buffr Checkpoint",
    value: "buffr-checkpoint",
    primary: {
      light: "oklch(0.72 0.15 75)",
      dark: "oklch(0.72 0.15 75)",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"];
