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
| `--color-success` / `-ink` / `-soft` | `#15803D` / `#166534` / `#E8F2EC` | Success and healthy states; ink on soft is 6.23:1. `--color-status-live` now resolves to `--color-success` |
| `--color-warning` / `-ink` / `-soft` | `#E0B000` / `#7A5F00` / `#FBF4DB` | Attention and pending; the brand yellow family, ink on soft is 5.5:1 |
| `--color-danger` / `-ink` / `-soft` | `#B91C1C` / `#B91C1C` / `#F8E8E8` | Errors and destructive actions (`--destructive` resolves to it); ink on soft is 5.45:1 |
| `--color-info` / `-ink` / `-soft` | `#6B6B6B` / `#171717` / `#E9E7E0` | Neutral notices; deliberately not blue, so status never adds a second hue |
| `--color-focus` | `#171717` | Focus ring (`--ring`); the brand yellow is 1.86:1 on cloud, below the 3:1 a focus indicator needs, carbon is 16.4:1 |
| `--radius-control` / `-card` / `-panel` | `0.5rem` / `1rem` / `1.5rem` | Radius scale (8, 16, 24 px) as tokens; use these, not literals |

Status chips use the classes `bc-status` with `bc-status-success|warning|danger|info`, or the utilities `bg-{status}-soft text-{status}-ink border-{status}/25`. Tailwind palette classes (amber, green, emerald, rose, orange) are not used; the admin count fell from 23 to 0 on 2026-10-08. The duplicated `.dark` block was merged into the root selector, and the hover and success literals are derived from tokens.

Semantic names to use in components: `background`, `foreground`, `card`, `primary`, `primary-foreground`, `muted-foreground`, `border`, `destructive`. White on yellow is about 2.2:1 and near-black on yellow about 9.7:1, so primary text is always near-black.

## Shared admin components (use these, do not hand-roll)

| Component | File | Use |
|---|---|---|
| `DashboardPageHeader` | `admin/src/components/dashboard-page-header.tsx` | Every route: title (Archivo working scale `bc-h-page`), one-line description, optional `status` chip and `action`; stacks on narrow screens |
| `StatusChip` | `admin/src/components/status-chip.tsx` | Every status label; `tone` is success, warning, danger or info; never a hand-built Badge className |
| `TableEmptyRow` | `admin/src/components/dashboard-state.tsx` | Empty list: icon, title, description and optional `action` (name the next step) |
| `BcStatTile` | `admin/src/components/bc-panel.tsx` | KPI tile with optional `hint` line and `href` so the number links to its screen |
| `BcPanel`, `BcStatRow`, `BcSurface` | same | Hairline panel, KPI strip (four at most), flat surface |

## Token architecture (Design System v2, blueprint 33.9)

Three tiers: primitive `--bc-*`, semantic `--surface-*`, `--text-*`, `--border-*`, `--interactive-*`, `--status-*`, `--assurance-*`, `--dv-*`, component `--button-*`, `--input-*`, `--card-*`, `--table-*`. Use semantic or component tokens in components; never a primitive, never a literal. Motion uses `--duration-*` and `--ease-*`; depth is border, ring and scrim (no drop shadows); z-index uses `--z-*`. Text tertiary is neutral-600, input borders are neutral-600, `--dv-1`, `--dv-5` and `--assurance-v2` need a label or shape beside them. Button, Input and Table are on component tokens in all three apps (default control height 40 px; `bc-density-compact` gives 36 px table rows; `data-numeric` on a table cell right-aligns it in mono). Next in line: textarea, select, checkbox, radio, switch, card, tabs, dialogs. Verify with: `cmp` of the three presets, and a check that every `var(--x)` in the preset has a definition.

## Frontend inventory (measured 2026-10-08)

Regenerate the counts with `find`; do not type them.

| Surface | Routes | Layouts | Shared components (non-ui) | ui primitives | Copy modules | CSS |
|---|---|---|---|---|---|---|
| Website | 14 | 2 | 19 | 10 | 15 | `app/globals.css`, preset |
| Admin | 60 | 3 | 23 | 62 | 20 | `app/globals.css`, preset, `styles/flag-icons/flags.css` |
| Ops console | 29 | 2 | 14 | 20 | n/a | `app/globals.css`, preset |
| Kiosk | n/a | n/a | Compose screens | n/a | strings.xml | `ui/theme/Color.kt` |

### Website routes
`/`, `/about`, `/check-in`, `/check-out`, `/contact`, `/developers`, `/emergency`, `/induction`, `/platform`, `/pricing`, `/privacy`, `/rate`, `/status`, `/terms`

### Admin routes
`/`, `/auth/check-email`, `/auth/forgot-password`, `/auth/login`, `/auth/mfa/challenge`, `/auth/mfa/setup`, `/auth/register`, `/auth/reset-password`, `/auth/verify-email`, `/dashboard`, `/dashboard/[...not-found]`, `/dashboard/account`, `/dashboard/analytics`, `/dashboard/analytics/feedback`, `/dashboard/anomalies`, `/dashboard/audit`, `/dashboard/billing`, `/dashboard/billing/[id]`, `/dashboard/calendar`, `/dashboard/compliance`, `/dashboard/compliance/legal-holds`, `/dashboard/compliance/privacy-requests`, `/dashboard/credentials`, `/dashboard/devices`, `/dashboard/devices/[id]`, `/dashboard/devices/compliance`, `/dashboard/emergency`, `/dashboard/evidence`, `/dashboard/front-desk`, `/dashboard/hosts`, `/dashboard/kyb`, `/dashboard/organisation`, `/dashboard/organisation-directory`, `/dashboard/organisation/notifications`, `/dashboard/overview`, `/dashboard/policies/access`, `/dashboard/policies/forms`, `/dashboard/policies/forms/[definitionId]`, `/dashboard/policies/retention`, `/dashboard/reports`, `/dashboard/roles`, `/dashboard/schedule`, `/dashboard/site-experience/capabilities`, `/dashboard/site-experience/cimso`, `/dashboard/site-experience/escalation`, `/dashboard/site-experience/kiosk`, `/dashboard/site-experience/notices`, `/dashboard/site-experience/qr`, `/dashboard/sites`, `/dashboard/support`, `/dashboard/support-access`, `/dashboard/support/[id]`, `/dashboard/users`, `/dashboard/visitors`, `/onboarding`, `/onboarding/[step]`, `/onboarding/launch-route`, `/onboarding/waiting`, `/support-session`, `/unauthorized`

### Ops console routes
`/`, `/analytics`, `/audit`, `/audit/[id]`, `/billing`, `/billing/[id]`, `/capability-status`, `/configuration`, `/crm`, `/crm/[dealId]`, `/crm/contacts/[id]`, `/devices`, `/devices/[id]`, `/incidents`, `/incidents/[id]`, `/kyb`, `/kyb/[id]`, `/login`, `/login/mfa`, `/login/mfa-setup`, `/organisations`, `/organisations/[id]`, `/search`, `/sites`, `/sites/[id]`, `/staff`, `/support-access`, `/tickets`, `/tickets/[id]`

### Shared components outside `ui/`
- Website: `analytics/AnalyticsProviders.tsx`, `brand-logo.tsx`, `breadcrumb-auto.tsx`, `capability-status-badge.tsx`, `contact-form.tsx`, `json-ld.tsx`, `marketing/channel-convergence-visual.tsx`, `marketing/marketing-bottom-cta.tsx`, `marketing/marketing-closing-visual.tsx`, `marketing/marketing-cta.tsx`, `marketing/marketing-hero.tsx`, `marketing/marketing-page-close.tsx`, `marketing/marketing-product-screenshot.tsx`, `marketing/phone-product-frame.tsx`, `marketing/privacy-managed-section.tsx`, `marketing/reporting-figure.tsx`, `site-footer.tsx`, `site-header.tsx`, `turnstile-widget.tsx`
- Admin: `analytics/AnalyticsProviders.tsx`, `bc-panel.tsx`, `calendar/event-calendar-views.tsx`, `charts/busy-hours-heatmap.tsx`, `charts/figure.tsx`, `charts/share-bars.tsx`, `charts/trend-with-forecast.tsx`, `dashboard-list-skeleton.tsx`, `dashboard-page-header.tsx`, `dashboard-state.tsx`, `date-range-picker.tsx`, `features/sites/site-select.tsx`, `features/visits/roster-live-refresh.tsx`, `features/visits/visit-roster-table/columns.tsx`, `features/visits/visit-roster-table/table.tsx`, `features/visits/visit-roster-table/visit-ops-actions.tsx`, `onboarding-config-banner.tsx`, `qr-code-image.tsx`, `simple-icon.tsx`, `status-chip.tsx`, `support-session-banner.tsx`, `support-session-countdown.tsx`, `turnstile-widget.tsx`
- Ops console: `analytics/AnalyticsProviders.tsx`, `app-sidebar.tsx`, `bc-panel.tsx`, `bulk-queue-list.tsx`, `charts/ScoreScatter.tsx`, `charts/ShareBars.tsx`, `charts/TrendChart.tsx`, `dashboard-state.tsx`, `integration-health-panel.tsx`, `logout-button.tsx`, `map/NamibiaMap.tsx`, `org-filter.tsx`, `org-select.tsx`, `service-targets-panel.tsx`

### Layout and token files
`website/src/lib/marketing-layout.ts` (section shells and surface class names), `website/src/styles/presets/buffr-checkpoint.css` (canonical; copies in admin and ops console), each app's `app/globals.css` (`@theme inline` exposure of tokens), `kiosk/.../ui/theme/Color.kt`. Layout rules: marketing sections use `marketingWideSection` / `marketingNarrowSection`; every call to action is `MarketingCta`; dashboards use `DashboardPageHeader`, `BcStatRow`/`BcStatTile` (with `href` and `hint`), `BcPanel`, `StatusChip`, `TableEmptyRow` (with `EmptyActionLink` as the next step); visitor pages sit in `CheckInShell` (cloud canvas, card header and footer, 44 px inputs).

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

- **The preset's element rules are unlayered, so they beat Tailwind utilities.** `h1`, `h2`, `h3` in `buffr-checkpoint.css` set the public site's display scale (h1 up to 72 px, h2 up to 48 px) and `section` gets 6rem padding. A utility such as `text-2xl` on an `h1` loses. Product screens fix it in the app stylesheet (`admin` and `ops-console` `globals.css`: working scale and zero section padding); visitor pages use `.bc-visitor-shell` in the website `globals.css`. Opt-in sizes use a class with higher specificity (`h1.bc-display`).
- **Font variables belong on `<html>`.** `--font-sans` is declared on `:root`, so the `next/font` variables must be on `<html>` too; on `<body>` the stack is invalid and the browser falls back to a serif. Check a screenshot, not the code.
- **Replacing a ring with a border breaks `ring-0` overrides.** Card forms that used `ring-0` to drop the outline now need `border-0`.
- **Do not remove assets to fix a layout.** Hero photographs stay; fix contrast and structure around them. Cards get better, not removed.
- **Review with screenshots.** Playwright is installed in `website/node_modules`; a local stub API on a free port (3001 may be the owner's dev backend) with fake data shows every admin, ops and visitor screen, mobile included. Strings reaching users must never carry browser errors, blueprint section numbers or internal terms.

- A status page that printed "Operational" as typed text; status is read from a live check.
- A heading that counted channels ("six ways in"); no counts that the product does not keep.
- The visitor form carrying a magenta button and purple headings from another palette; tokens only.
- Biome `--write` over a folder re-wrapping legal pages; format only the files you touched and confirm with `git diff -w`.

## Refero crawl to Checkpoint mapping

Local root: `LifeCompass/crawl4AI-agent-v2/refero_sitemap_crawl/` (read-only design reference; never copy `images.refero.design` assets or crawl screenshots into any app). Contents: `pages_markdown/` (six articles), `screenshots/` (one per page), `images/` (about 80 thumbnails), `manifests/` (`pages.json`, `images.json`, `crawl_summary.json`, `article_urls.json`).

| Page | Title | Used for |
|---|---|---|
| `2d394cf648802efe.md` | Dashboard UI | Dashboard principles (table below) |
| `196662c1e0d112c8.md` | UI UX Design | General principles (table below) |
| `c19bd3de3a9fdddd.md` | Paywall Examples | The go-live gate and pricing page |
| `0bb26a5282b3cc5a.md`, `50e1596165e83569.md`, `fc048ad556de110f.md` | Articles index and two gallery landings | Navigation of the library only; no principles |

### Dashboard principles (`2d394cf648802efe.md`)

| Refero principle | Checkpoint application |
|---|---|
| Clarity and focus: the top three or four indicators; progressive disclosure | Overview and Analytics: four stat tiles; the rest in panels, tabs and tooltips |
| Visual hierarchy: top-left prominence, whitespace, 12-column grid | `PageHeader`, stat row, then panels; `bc-grid-marketing` and `bc-span-*` for public pages |
| Consistency and affordance: uniform charts, controls, navigation; hover states | `bc-panel`, `List`, `ListRow`, shared `StatusSelect`; focus ring from the preset |
| Readability and typography: clean heading face, neutral body, H2 to paragraph hierarchy | Archivo headings, Geist body, `bc-h-page` and `bc-h-section` on product screens |
| Colour and accessibility: semantic green and red, neutral base, WCAG contrast | Status live `#15803D`, destructive `#B91C1C`, ink variant of the yellow for text |
| Responsive and mobile first: collapse charts to summaries, hide less critical elements behind toggles | Visitor pages and the website are phone first; admin tables scroll |
| Chart choice: lines for trends, bars for categories, heatmaps and sparklines for dense data; no default pies | `TrendChart`, `ShareBars`, `BusyHoursHeatmap`; no pies |
| Interaction and microinteractions: filters, drill-downs, tooltips, animated reloads that keep context | Roster filters and export; skeletons that keep layout while loading |
| Role-based, customisable dashboards | Role-filtered sidebar; summaries by role |
| Real-time data and alerts: sockets or server-sent events, badges and colour-coded thresholds | The roster stream and anomaly alerts; mark when data is stale |

### UI and UX principles (`196662c1e0d112c8.md`)

| Principle | Checkpoint application |
|---|---|
| Clarity over complexity | Plain labels, one task per visitor screen, no jargon in copy |
| Consistency | One shell, one panel language across admin, ops console and website |
| Feedback and response | Pending, success and error states on every action; specific errors with a retry |
| Hierarchy and prioritisation | One primary action per view, filled Sodium Yellow; the rest secondary |
| Accessibility and inclusivity | WCAG AA; keyboard through tables; assisted entry is equal, not a fallback |
| Process: research, wireframe, prototype, test, hand off | Pilot sites (blueprint 29.2) as the usability test; measure task success, time on task and error rate by channel |

### Paywall principles (`c19bd3de3a9fdddd.md`) applied to the go-live gate

Seamless integration with the brand; clear value messaging; responsive; minimal intrusion; consistent aesthetics; accessibility first; test and iterate with data (drop-off at each gate step). Checkpoint's gate is a hard gate for paid plans, shown from the start, and never a surprise at the end.

## Other facts for QA

- Sidebar groups and items (2026-10-08): Operations 9, Account 4, Site Experience 10, Devices and Credentials 3, Governance and Compliance 8, Access Administration 5.
- Radius values in the preset today: 0.5 rem, 0.75 rem, 1 rem (the blueprint lists 4, 8, 16, 24 px: reconcile).
- Primary stat tiles: Overview 4, Analytics 4.
