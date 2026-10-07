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
`backend/db/seed/demo/0017_platform_support_demo.sql` for how to create another).
Its home org FK is Buffr Analytics (`b51f0704-…`) after seed `0018` —
platform_support never acts on that home org directly; real work is
cross-tenant aggregate reads or grant-gated support sessions.

## Signup-first GTM (ops playbook)

Primary marketing CTA is **Create account** →
`https://admin.buffrcheckpoint.com/auth/register`; the secondary link is
“See pricing”. The paid Paper Register Exposure Review offer is retired (§17.1). New org registration emails `CONTACT_OPS_EMAIL`
(`team@buffranalytics.com`) with an outreach checklist.

### When you get a “New org signup” email

Reply to the Owner-Operator (from `team@`):

1. Can they complete onboarding themselves, or do they want a Paper Register
   Exposure Review / assisted setup?
2. Choose Core / Professional / Verify; pay by EFT; upload proof of payment
   under Admin → Billing (or grant **trial** for design-partner A1).
3. After POP (+ KYB) review, set subscription **active**. Go-live and
   operational dashboard routes require `active` or `trial`.

### Onsite / design-partner script (e.g. first hospitality pilot)

> Create your organisation at https://admin.buffrcheckpoint.com/auth/register,
> confirm the email, finish onboarding with us on site, and we will print your
> site QR. Payment is EFT + proof of payment in Billing; we activate production
> use after POP review (or a short trial). Ask if you want a full paper-register
> review later — Contact stays available. CiMSO / PMS connect is a later step.

Park PMS Connect until host/port/credentials and network path exist; keep
platform capability `cimso_innterchange` at **Targeted**.

## Production cutover note

Full-stack production readiness (2026-09-25) includes Neon migration **0038**,
Railway `PUBLIC_*` / CORS (apex + `www`) / Resend / `ARTIFACT_STORE=neon_s3` /
`LOCAL_DEV_DATA_KEY` / billing letterhead env, and redeploys of API + website +
admin + this ops-console. CiMSO stays **Targeted** (no live TCP sell). Prod DB
is Frankfurt (`eu-central-1`) — do not claim Namibia hosting.

## Branded notification templates

Ops → **Configuration** lists every `platform_notification_template` row
(migration `0038_branded_notification_templates.sql`), grouped by category.
Bodies are plain text with `{{token}}` placeholders; the backend wraps them
in the mustard/charcoal Buffr Checkpoint email shell before Resend delivery
(via the notification outbox).

**Send test to ops inbox** uses `CONTACT_OPS_EMAIL` and sample tokens.

Document downloads (invoice / receipt PDF):

- `GET /platform/billing/invoices/:id/document`
- `GET /platform/billing/invoices/:id/receipt`
- `POST /platform/billing/invoices/:id/remind` — unpaid reminder email

Human email signature (Gmail/Outlook): `branding/email-signature.html`.

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
- `src/lib/auth/session.ts` — the `bc_ops_session` httpOnly cookie (2h, matching the ops token),
  plus the short-lived MFA challenge and MFA enrolment cookies.

## Sign-in (separate from customers)

The console signs in through its own endpoints, never the customer `/auth/login`
(buffrcheckpoint.md §9.2a):

1. `/login` posts to `POST /auth/platform/login`. Only `platform_support` accounts get past it;
   anyone else sees "Invalid email or password".
2. Staff with MFA go to `/login/mfa`, which posts to `POST /auth/platform/mfa/challenge/verify`.
3. Staff without MFA go to `/login/mfa-setup`: scan the QR code, confirm a code, save the 10
   recovery codes. The enrolment token lasts 15 minutes and can do nothing else.

Ops tokens only work on the ops API surface. To act inside a customer tenant, use Support Access
(customer-approved, time-boxed grant); that mints a separate customer-scoped session.

## Known gaps (not silently missing — see buffrcheckpoint.md §11.9.1a)

- No automated tests yet (frontend or the backend `platform-control-plane`
  split — see `backend/src/modules/{billing,crm,kyb,...}`).
- v2 churn model (logistic regression / random forest) is documented, not
  built — no labeled churn history exists yet to train on safely.
- No PSP integration — billing is manual EFT + Proof of Payment by design,
  no processor partnership exists yet.
- Dormant templates (`visitor_prereg_invite`, `credit_note_issued`,
  `support_ticket_ack`) are seeded for ops editing but have no product
  trigger until those features ship.
