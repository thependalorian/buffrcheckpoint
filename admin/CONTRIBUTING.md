# Contributing to Buffr Checkpoint Admin

Internal contribution notes for the Buffr Checkpoint customer admin app
(`buffrcheckpoint/admin`). Product requirements and architecture live in
`../buffrcheckpoint.md` (DNS runbook: **§11.7.8**).

## Stack

Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui. Backend is NestJS in
`../backend`.

## Production hosts (`buffrcheckpoint.com`)

Namecheap Advanced DNS (verified against live panel):

| Role | Hostname | DNS | Platform |
|---|---|---|---|
| Marketing / public check-in | `buffrcheckpoint.com`, `www.buffrcheckpoint.com` | `@` A → `64.29.17.1` + `216.198.79.1`; `www` CNAME → Vercel | Vercel `buffrcheckpoint-website` |
| **This admin app** | `https://admin.buffrcheckpoint.com` | `admin` CNAME → `5532354d6fa6cd3b.vercel-dns-017.com` | Vercel `buffrcheckpoint-admin` |
| API | `https://api.buffrcheckpoint.com` | `api` CNAME → `yc9j25fm.up.railway.app` | Railway `buffrcheckpoint` / `api` |
| Ops console | `https://ops.buffrcheckpoint.com` | `ops` CNAME → `d7a75fef5a47cd2c.vercel-dns-017.com` | Vercel ops project |
| Transactional email | `mail.buffrcheckpoint.com` | `send.mail` / `rsend.mail` CNAMEs + `resend._domainkey.mail` TXT | Resend |

Admin env in Vercel (not local `.env`):

```text
BACKEND_API_URL=https://api.buffrcheckpoint.com
API_URL=https://api.buffrcheckpoint.com
NEXT_PUBLIC_WEBSITE_URL=https://buffrcheckpoint.com
```

Do not put `DATABASE_URL`, `RESEND_*`, or artifact-store secrets on the
admin Vercel project — those belong on Railway `api`.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Point `BACKEND_API_URL` at a running API (`http://localhost:3001`).
Local defaults: admin `:3000`, API `:3001`, website `:3002`.

## Conventions

- Domain folders under `src/app/(main)/dashboard/` and
  `src/components/features/<domain>/` — no template demo verticals.
- Home route is `/dashboard/overview` (not `/dashboard/default`).
- Account is `/dashboard/account` (not `/dashboard/profile`).
- No emojis in UI copy. Prefer `lib/copy/` for user-facing strings.
- Run `npm run check` and `npm run build` before merging.

## Pull requests

Keep PRs focused. Update `buffrcheckpoint.md` when routes, storage, DNS,
or auth behaviour change.
