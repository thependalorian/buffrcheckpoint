# Buffr Checkpoint design reference

Companion to `SKILL.md`. Source: blueprint section 33 and `website/src/styles/presets/buffr-checkpoint.css`. If a value here differs from the preset, the preset wins.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--color-sodium-yellow` | `#E0B000` | The only saturated action colour: primary fills, active navigation, accent card |
| `--color-sodium-yellow-ink` | `#8A6B00` | Text-safe yellow for labels and links on light surfaces (4.88:1 on cloud) |
| `--color-carbon` | `#171717` | Text and ink; never pure black |
| `--color-charcoal` | `#111111` | Inverted chips and fills, mark core |
| `--color-cloud` | `#F5F5F5` | Page background |
| `--color-pure-white` | `#FFFFFF` | Elevated card, sidebar, popover |
| `--color-graphite` | `#E9E7E0` | Secondary surface fill |
| `--color-frost` | `#D9D9D4` | Borders, hairlines |
| `--color-slate` | `#6B6B6B` | Secondary text (passes 4.5:1 on white) |
| `--color-ash` | `#9A9A94` | Tertiary and disabled text; fails as body text |
| `--color-status-live` | `#15803D` | Verified, live and healthy |
| `--destructive` | `#B91C1C` | Errors (5.88:1) |
| `--color-lime-pulse` | `#00FF1A` | Editorial emphasis only; unused today |

Semantic names to use in components: `background`, `foreground`, `card`, `primary`, `primary-foreground`, `muted-foreground`, `border`, `destructive`. White on yellow is about 2.2:1 and near-black on yellow about 9.7:1, so primary text is always near-black.

## Type and spacing

| Family | Role | Weights |
|---|---|---|
| Archivo | Display and headings | 100, 300, 400 |
| Geist | UI and body | 300 to 600 |
| Geist Mono | Hashes, serials, evidence references | 400, 600 |

Scale: caption 14, body 16, subheading 20, heading-sm 24, heading 32, heading-lg 56, display 64. Product screens use `bc-h-page` (clamp 1.5rem to 2rem, weight 400) and `bc-h-section` (1.125rem, weight 500) because ultra-light loses legibility at small sizes. Base unit 8 px; spacing 8, 16, 24, 32, 40, 48, 64, 80, 96; section gap 64; card padding 24 to 32.

Heading and mono tokens must pass through to the preset: a hard-coded fallback silently renders headings in the body face.

## Components and patterns

- Primary call to action: filled Sodium Yellow, near-black text, 16 px radius. Accent card: yellow fill, one or two per view. Content card: white with a hairline border.
- Lists: one flat panel with hairline dividers (`List`, `ListRow`). Status changes: shared `StatusSelect` ("Change status..."). Conversation threads are the one place for chat bubbles.
- Sidebar: left, with the yellow active state; no bottom bar in a data-dense admin.
- Charts (`recharts` with `chartTokens`): `TrendChart`, `ShareBars` (ranked bars, never pies), `ScoreScatter`, `TrendWithForecast`, `BusyHoursHeatmap` (empty cells stay blank). A required `finding` prop. Server components pass serialisable data only.
- Utility classes: `bc-panel`, `bc-stat-tile`, `bc-active-soft`, `bc-grid-marketing`, `bc-span-*`, `bc-stat-row`, `bc-surface`, `bc-marketing-eyebrow`, `bc-marketing-lead`. At most four primary stat tiles.
- States: empty, loading (skeleton, never a spinner-only blank), error (retry, never a raw stack trace), slow network. The kiosk offline state is core, not an edge case.
- Scores and predictions: confidence label or range, its backtest error, a cited source, the inputs that drove the score, and a one-sentence reason.

## Kiosk variant

White or near-white canvas, text `#1A1A1A` or carbon, Sodium Yellow `#E0B000` for primary actions with near-black text, border `#D0D0D0` or frost, muted `#6B6B6B`, status green `#15803D`. Minimum weight 400, instructions at least 24 px, one choice per large tile, icons with plain words, no decorative photography in the flow. Values live in `Color.kt` (`BuffrCloud`, `BuffrCarbon`, `BuffrCharcoal`, `BuffrSlate`, `BuffrFrost`, `BuffrWhite`, `BuffrSodiumYellow`, `BuffrRed`).

## Imagery governance

| Asset | Rule |
|---|---|
| Product screenshots | Highest priority; synthetic demo tenant only: non-identifiable names, masked phone numbers, no ID numbers, non-functional QR codes |
| System diagrams | Preferred over stock images for technical buyers |
| Contextual photography | Real, consented, non-sensitive Namibian and African settings; closing bands use their own files, never the hero asset |
| Hardware photography | The approved hardware or a labelled concept render; no tablet price until CRAN approval (section 23.1) |
| Data visualisations | Never invented metrics or decorative charts |
| Decorative images | Empty alt text; meaningful images get a short description |

Client logos, testimonials and customer-site photos need written permission. Emergency-roster and audit-log screenshots are synthetic with redacted actors. Share images for content pages are generated (`website/src/lib/og-image.tsx`, `opengraph-image.tsx` beside the page).

## Copy rules for interface text

Plain, direct, active, human. No emoji, no em dash, plain words over corporate ones. Page titles are the page name only; the layout template adds the site name once. Legal pages are precise and unembellished. Public claims follow blueprint section 1.4, and the copy guard test (`website/src/lib/copy/marketing.test.ts`) enforces the forbidden words, channel counts and hand-back wording. Strings live in `lib/copy/`; the legal documents (`/terms`, `/privacy`) keep their text with the page because they are versioned as documents.

## Known pitfalls from past passes

- A status page that printed "Operational" as typed text; status is read from a live check.
- A heading that counted channels ("six ways in"); no counts that the product does not keep.
- The visitor form carrying a magenta button and purple headings from another palette; tokens only.
- Biome `--write` over a folder re-wrapping legal pages; format only the files you touched and confirm with `git diff -w`.
