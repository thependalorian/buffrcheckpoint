---
name: buffrcheckpoint-design
description: >
  Applies the Buffr Checkpoint design system: light canvas, near-black type, one Sodium Yellow
  accent, hairline cards, ultra-light Archivo headings, no drop shadows, WCAG AA. Use when
  designing, restyling, auditing or polishing any Checkpoint surface (website, visitor pages,
  admin, ops console, Android kiosk), when the user mentions tokens, the theme preset, colours,
  typography, layout, accessibility, empty states, charts, imagery or public copy for Checkpoint,
  or when a screen looks off-brand.
---

# Buffr Checkpoint design

Checkpoint's mood is a clean paper-white control surface with near-black type and one reactive
gold accent. The restraint reads as authority for banks and government offices. The canon is
blueprint section 33 (`buffrcheckpoint.md`); this skill is how to apply it without drifting.

Every surface shares the same tokens. A change is not done until it is true on all of them.

**Colours, type, radius and spacing come only from the Checkpoint theme preset and its tokens.** Nothing in this skill, and nothing taken from a reference, brings in another palette, font or shape.

## Refero is a pattern source, never a palette

The sibling skill `refero-buffr-design-uplift` (Buffr Sandbox) draws on a local crawl of Refero's articles and previews. Checkpoint uses the same crawl the same way: for **structure and principles** (how a dashboard is laid out, how a sidebar groups, how a gate is presented), never for colour, radius, typeface or imagery. What the Sandbox skill locks (blue `#1e6fff`, DM Sans, a sharp 2 px radius) does **not** apply here; Checkpoint's locked values are below and in `reference.md`. The crawl is design reference only: nothing from it is copied into `public/`.

## Canon (read first)

| Source | Role |
|---|---|
| `website/src/styles/presets/buffr-checkpoint.css` | **The** token file. Byte-for-byte copies in `admin/src/styles/presets/` and `ops-console/src/styles/presets/` |
| `kiosk/app/src/main/java/com/buffrcheckpoint/kiosk/ui/theme/Color.kt` | The kiosk mirror of the same values |
| `buffrcheckpoint.md` section 33 | Tokens, type, components, kiosk variant, imagery governance, accessibility and copy |
| `website/src/lib/marketing-layout.ts`, `lib/marketing-visuals.ts` | Shared public-page classes and image slots |
| `website/src/lib/copy/`, `admin/src/lib/copy/` | Every user-facing string |
| `website/CLAUDE.md`, `admin/AGENTS.md` | Next.js 16 and shadcn rules; the shadcn style is `radix-nova`; inspect local `components/ui/` first |

If the blueprint and a file disagree, fix whichever is wrong in the same pass.

## Locked direction

- Light canvas only. Page `#F5F5F5` (cloud), cards white with a hairline border (frost `#D9D9D4`), text carbon `#171717`, secondary text slate `#6B6B6B`.
- **One** saturated colour: Sodium Yellow `#E0B000` for fills (primary buttons, active navigation, at most one or two accent cards per view). Text on yellow is near-black, never white. Yellow as text uses the ink `#8A6B00`. At most about 20 percent of a viewport is yellow.
- Status colours are functional only: live `#15803D`, destructive `#B91C1C`.
- Type: Archivo for display (ultra-light 100 to 300 at 56 to 64 px is the signature), Geist for UI and body, Geist Mono for hashes, serials and references. Product screens use the working scale classes `bc-h-page` and `bc-h-section`.
- No drop shadows. Radius: nav 8, tags 4, cards and buttons 16, large panels 24. Page maximum 1280 px. A list is one flat panel with hairline dividers, never a stack of cards.

Details and the full token table are in `reference.md`.

## Not copying

- A second accent: no blue, teal, navy, indigo, purple or magenta for a button, link or heading. (The visitor check-in form once used a magenta button and purple headings; they are gone, keep it that way.)
- A per-organisation colour or logo in the product chrome.
- Shadows, glows, gradients as decoration, nested cards, pie charts.
- Stock "business team" photography, surveillance or facial-recognition imagery, real visitor data in any screenshot.
- Claims in copy that section 1.4 forbids: "compliant", "certified", "guaranteed", counts of channels, capabilities shown as live that are not.
- Marketing language that hands the work back to the customer; the product's promise is that the privacy work is done for them.

## Verify before calling a pass a redo

Run these first. If they already pass and the screens still look wrong, the problem is layout or copy, not tokens.

```
cmp website/src/styles/presets/buffr-checkpoint.css admin/src/styles/presets/buffr-checkpoint.css
cmp website/src/styles/presets/buffr-checkpoint.css ops-console/src/styles/presets/buffr-checkpoint.css
grep -rnE "#[0-9a-fA-F]{6}\b" website/src admin/src ops-console/src --include='*.tsx'
grep -rnE "\b(bg|text|border)-(blue|teal|indigo|sky|cyan|purple|violet|fuchsia|pink)-[0-9]{3}" website/src admin/src ops-console/src --include='*.tsx'
grep -rnE "\b(bg|text|border)-(amber|green|emerald|rose|orange|red|yellow)-[0-9]{3}" admin/src website/src ops-console/src --include='*.tsx'
grep -rnE "\bshadow-(sm|md|lg|xl|2xl)\b" website/src admin/src ops-console/src --include='*.tsx' | grep -v components/ui/
```

Baseline on 2026-10-08: the three presets identical; zero colour-family classes and zero palette status classes (status uses `bc-status-*` or `bg-{status}-soft text-{status}-ink`); zero shadows outside the `ui/` primitives; hex literals only where a canvas or image generator cannot read a token (`website/src/lib/og-image.tsx` for share images, `ops-console/src/components/map/NamibiaMap.tsx` for the map, `admin/src/components/qr-code-image.tsx` for QR colours). Any new hex literal in a page is a defect: use a token (`bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-[var(--color-sodium-yellow-ink)]`).

## This is a redo, not a token find-replace: verified structural deltas (2026-10-08)

Changing a colour value alone does not satisfy this skill. These gaps between the blueprint and the shipped UI were found by reading the code; fix the ones that apply to your pass, or the work is a reskin.

1. **Admin navigation had 5 groups; the blueprint (section 6.3) specifies 6.** Billing, Business Verification, Support and Support Access sat inside Operations, which then held 13 items and buried the go-live gates. They are now their own **Account** group (`admin/src/navigation/sidebar/sidebar-items.ts`): Operations 9, Account 4, Site Experience 10, Devices and Credentials 3, Governance and Compliance 8, Access Administration 5. Group labels in the blueprint were changed to match the code. Keep the two in step.
2. **Radius scale does not match the blueprint.** The preset uses 0.5 rem, 0.75 rem and 1 rem; section 33.2 lists 4, 8, 16 and 24 px. Decide which is right the next time the preset is touched and make the blueprint and preset agree; do not add a fifth value.
3. **At most four primary stat tiles per page.** Overview and Analytics show four each. A page with more is a card collage; move the rest behind a panel or tab.
4. **Hex literals** survive only where a canvas cannot read a token (see the verify block). The visitor pages used to carry a magenta and purple palette; any return of it is a regression.
5. **Blueprint and code names must match.** Sidebar labels, token values and the radius scale are checked against section 33 in the success list.

Before marking any step done, diff `sidebar-items.ts`, the preset and the pages you touched: if the diff is only colour values, the redo has not happened.

## Workflow

```
Design pass progress:
- [ ] 1. Run the verify block above; note the numbers
- [ ] 2. Read the section 33 rule for the component you touch (list, status change, chart, state, kiosk) and the Refero-derived principles below
- [ ] 3. Make the change with tokens and shared classes; no new hex, no new colour family
- [ ] 4. States: empty, loading (skeleton), error (with retry), slow network on every list and table
- [ ] 5. Accessibility: contrast at least 4.5:1 for body and 3:1 for large text, visible focus, keyboard path through tables, one main landmark, no skipped heading level, decorative images have empty alt and meaningful ones a short description
- [ ] 6. Copy in lib/copy, active and plain, no emoji, no em dash; run the copy guard test (website/src/lib/copy/marketing.test.ts) and the app's tests
- [ ] 7. Narrow phone, tablet and desktop widths checked; screenshots only from the synthetic demo tenant
- [ ] 8. Update the blueprint section 33 if a rule changed
```

### Surfaces

- **Website and visitor pages.** Public pages use the exports of `marketing-layout.ts`. The visitor pages (`/check-in`, `/check-out`, `/emergency`, `/induction`, `/rate`) are operational: one task, large tap targets, no marketing, no organisation colours.
- **Admin.** 90 percent data, 10 percent brand. Status through the shared `StatusSelect`; a visible approve and reject pair only for a consequential binary decision. Charts take a required `finding` prop so the title states a finding.
- **Ops console.** Same tokens; density is higher. Staff screens never show unredacted visitor data in previews.
- **Kiosk.** Different surface: unfamiliar visitors, bright light, seconds to finish. Minimum text weight 400 and 24 px for instructions, one choice per large tile, privacy reassurance immediately before capture, equal dignity for assisted entry, an offline state that is the main design constraint. Colours mirror `Color.kt`.

## Principles taken from the Refero crawl, applied with Checkpoint's own look

From `pages_markdown/2d394cf648802efe.md` (dashboards) and `196662c1e0d112c8.md` (UI and UX); the full mapping is in `reference.md`.

- **Clarity and focus.** The top three or four indicators; everything else behind progressive disclosure (panels, tabs, tooltips).
- **Hierarchy and layout.** Most important widget top left; whitespace guides the eye; the 12-column helper (`bc-grid-marketing`, `bc-span-*`) keeps alignment. Do not claim a 12-column grid on a layout that is an auto-fill grid.
- **Consistency and affordance.** One panel language (`bc-panel`, `List`, `ListRow`); controls show they are actionable (hover and focus).
- **Semantic colour.** Green for live and healthy, red for failure, never a new hue; trends read from text and an arrow, not colour alone.
- **Role-based views.** The admin sidebar and home summarise by role; Front Desk sees today, Compliance sees evidence.
- **Charts.** Lines for trends, ranked bars for categories, never pies (section 33.3).
- **Real-time and alerts.** Live roster and alert badges use the server-sent roster stream already in the product; show state changes without a reload and mark stale data.
- **Feedback.** Every action answers at once: pending state, success, or a specific error with a retry.

### Structure cues (pattern only)

- Sidebar: labelled groups, soft active fill (`bc-active-soft` in Sodium Yellow tint with carbon text), sticky, no bottom bar.
- Home and Overview: one row of at most four stat tiles with a small "last N days" line, then panels of one chart or table each at a consistent padding and a hairline border.
- Marketing: one job per section, generous vertical rhythm; first viewport is brand, one headline, one supporting line, one call-to-action group and one dominant visual (the product frame), never a card grid.

### Gates and pricing (from the Refero paywall article, applied honestly)

The go-live gate (business verification and payment) is Checkpoint's paywall. Show it from the first screen as "Before you go live", say plainly what the customer gains, keep it out of the way until needed, use the same look as the rest of the product, and make it accessible. No dark patterns, no countdowns, no hidden fees; EFT is the default and the cost of every channel is shown.

## File touch list (Checkpoint)

```
website/src/styles/presets/buffr-checkpoint.css      # tokens (copy byte-for-byte to admin and ops-console)
kiosk/app/src/main/java/com/buffrcheckpoint/kiosk/ui/theme/Color.kt
website/src/lib/marketing-layout.ts, marketing-visuals.ts, og-image.tsx
website/src/lib/copy/ , admin/src/lib/copy/            # all strings
website/src/app/(marketing)/**                          # public pages
website/src/app/{check-in,check-out,emergency,induction,rate}/**   # visitor pages
admin/src/navigation/sidebar/sidebar-items.ts           # grouping
admin/src/components/bc-panel.tsx                       # panels and stat tiles
admin/src/app/(main)/dashboard/**                       # product screens
ops-console/src/app/(console)/**                        # staff screens
buffrcheckpoint.md section 33                           # keep in step
```

Out of scope: another brand's tokens, third-party palettes or logos, anything under another product's folder, shipping crawl images.

## Visual QA script

1. Desktop (1200 px and wider): count the primary stat tiles on Overview and Analytics (four at most); confirm the grouped sidebar with a soft active fill, not a solid bar or a pill.
2. Mobile (about 375 px): tiles stack; tables scroll or collapse without clipping the sidebar; visitor pages are one column with large tap targets.
3. Website home: the first viewport is brand, one headline, one support line, one call-to-action group and one dominant visual, with no card grid.
4. Grep new CSS and pages for `#` hex outside the preset: empty, except the listed canvas exceptions.
5. Grep for `border-radius` values and Tailwind `rounded-*` that are not from the radius scale: empty.
6. Contrast of any new text and background pair: at least 4.5:1 body, 3:1 large.

## Anti-slop checklist (before commit)

- [ ] No purple, magenta, navy, teal or cream and terracotta defaults anywhere
- [ ] No card grid in the first viewport of a marketing page
- [ ] No multi-layer glow or drop shadow; elevation is white surface plus a hairline
- [ ] No third-party screenshots or crawl images in `public/`
- [ ] Navigation active state is the soft fill, not a pill and not a solid bar
- [ ] The `git diff` shows structure changed (grouping, tile count, states), not only colour values

## Constraints (non-negotiable)

- No emojis anywhere; no em dashes or semicolon chains in interface copy.
- Screens always show the latest state; no stale data on back navigation.
- Exact dependency versions; no new UI library without a reason written in the blueprint.
- Never edit the preset in one app only. Edit the website file, copy it byte-for-byte, `cmp` all three, and update `Color.kt` if a value changed.

## Success check

- [ ] `cmp` of the three presets reports identical; `Color.kt` matches the token table
- [ ] The verify block shows no new hex literal, colour-family class or shadow
- [ ] Every touched list or table has empty, loading and error states
- [ ] Contrast figures for any new text and background pair are stated and meet the thresholds
- [ ] `tsc --noEmit`, the app's tests and, for the website, `npm run build` pass; the copy guard test passes
- [ ] The admin sidebar has the six groups of section 6.3 and no page shows more than four primary stat tiles
- [ ] The anti-slop checklist above is clear
- [ ] Section 33 of the blueprint still describes what is shipped
