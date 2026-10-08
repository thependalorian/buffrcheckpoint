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
grep -rnE "\bshadow-(sm|md|lg|xl|2xl)\b" website/src admin/src ops-console/src --include='*.tsx' | grep -v components/ui/
```

Baseline on 2026-10-08: the three presets identical; zero colour-family classes; zero shadows outside the `ui/` primitives; hex literals only where a canvas or image generator cannot read a token (`website/src/lib/og-image.tsx` for share images, `ops-console/src/components/map/NamibiaMap.tsx` for the map, `admin/src/components/qr-code-image.tsx` for QR colours). Any new hex literal in a page is a defect: use a token (`bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-[var(--color-sodium-yellow-ink)]`).

## Workflow

```
Design pass progress:
- [ ] 1. Run the verify block above; note the numbers
- [ ] 2. Read the section 33 rule for the component you touch (list, status change, chart, state, kiosk)
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
- [ ] Section 33 of the blueprint still describes what is shipped
