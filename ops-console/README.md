# Buffr Checkpoint — Platform Ops Console

Internal Buffr Checkpoint operations app — never customer-facing, never linked
from `admin/`'s sidebar. See `buffrcheckpoint.md` Section 11.9.1a for the
full build notes (product decisions, what's built, known gaps).

## What this is

A separate Next.js app for Buffr's own `platform_support` staff: portfolio
dashboards (no customer PII by default), CRM, billing (manual EFT + POP
review), KYB review, capability status (dual-approval), incidents, support
tickets, churn/health analytics, and the break-glass support-access flow —
requesting, and *governing*, time-boxed access to a specific customer org.

It does not duplicate `admin/`'s screens. When a platform user needs to
actually edit a customer org's data under an approved grant, this app mints
a short-lived session token and hands off to `admin/` itself
(`admin/src/app/support-session/page.tsx`) under a persistent "acting on
behalf of" banner — see `backend/src/modules/support-sessions/`.

## Running locally

```bash
npm install
npm run dev   # http://localhost:3003
```

Requires the `backend/` NestJS API running (default `http://localhost:3001`,
override with `BACKEND_API_URL`) and `admin/` running if you want to
exercise the support-session hand-off (`NEXT_PUBLIC_ADMIN_APP_URL`, default
`http://localhost:3000`).

### UI direction

Same design system as `admin/` (§11.5 / §11.6): `buffr-checkpoint.css` tokens,
shadcn/ui primitives, sidebar shell, loading/error states, MFA login, and
optional PostHog. Ops keeps its own IA (control-plane nav) and never duplicates
customer admin screens — break-glass still hands off to `admin/`.

### Env vars

| Var | Default | Purpose |
|---|---|---|
| `BACKEND_API_URL` | `http://localhost:3001` | Server-side only — every page/action calls the backend directly, never from the browser (same pattern as `admin/`). |
| `NEXT_PUBLIC_ADMIN_APP_URL` | `http://localhost:3000` | Where "Open in admin" (Support Access screen) deep-links a minted support-session token. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `HOST` | unset | Optional consent-gated analytics. |

### Logging in

No self-registration — a `platform_support` account is provisioned
directly in the database. A demo one exists in the dev DB:
`platform-ops-demo@buffrcheckpoint.test` (see
`backend/db/seed/0017_platform_support_demo.sql` for how to create another).

## Structure

- `src/app/(console)/` — one route per capability, each with a co-located
  `_components/` and `actions.ts` (server actions calling the backend).
- `src/components/ui/` — shared primitives (`Button`, `Input`, `Select`,
  `Textarea`, `Badge`, `Card`/`CardForm`). Use these instead of hand-rolling
  Tailwind strings — that was a real, fixed problem here once already (10+
  duplicated button strings, 5+ duplicated inputs).
- `src/components/map/` — the Namibia regional choropleth, ported from
  `buffr-intelligence/frontend/src/components/illustration/NamibiaMap.tsx`
  (region geometry copied verbatim; component rewritten against this app's
  own brand tokens).
- `src/lib/api.ts` — server-side fetch helper, attaches the session JWT.
- `src/lib/auth/session.ts` — the `bc_ops_session` httpOnly cookie.

## Known gaps (not silently missing — see buffrcheckpoint.md §11.9.1a)

- No automated tests yet (frontend or the backend `platform-control-plane`
  split — see `backend/src/modules/{billing,crm,kyb,...}`).
- v2 churn model (logistic regression / random forest) is documented, not
  built — no labeled churn history exists yet to train on safely.
- No PSP integration — billing is manual EFT + Proof of Payment by design,
  no processor partnership exists yet.
