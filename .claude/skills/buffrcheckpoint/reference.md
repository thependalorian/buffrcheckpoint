# Buffr Checkpoint reference

Companion to `SKILL.md`. Generated from a fresh `tree` and from the blueprint; when they disagree, the blueprint and the code win.

## Tree, depth 3

Command used: `tree -L 3 -I 'node_modules|.next|dist|.git|archive|generated-evidence-packs|generated-packages|build|exports|*.png|*.jpg|*.jpeg|*.webp|*.pdf|*.docx|*.tsbuildinfo|package-lock.json' --dirsfirst .`

```
.
├── admin
│   ├── media
│   ├── public
│   ├── scripts
│   │   └── verify-onboarding-copy.mjs
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── config
│   │   ├── data
│   │   ├── hooks
│   │   ├── lib
│   │   ├── navigation
│   │   ├── scripts
│   │   ├── server
│   │   ├── stores
│   │   ├── styles
│   │   ├── instrumentation-client.ts
│   │   ├── instrumentation.ts
│   │   ├── next-env.d.ts
│   │   ├── proxy.test.ts
│   │   └── proxy.ts
│   ├── AGENTS.md
│   ├── CONTRIBUTING.md
│   ├── LICENSE
│   ├── README.md
│   ├── biome.json
│   ├── components.json
│   ├── next-env.d.ts
│   ├── next.config.mjs
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── sentry.edge.config.ts
│   ├── sentry.server.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.scripts.json
│   └── vitest.config.mts
├── backend
│   ├── buffrcheckpoint
│   │   └── e2e-screenshots
│   ├── db
│   │   ├── maintenance
│   │   ├── migrations
│   │   └── seed
│   ├── scripts
│   │   ├── audit-route-policy.cjs
│   │   ├── copy-vercel-blob-to-neon-s3.cjs
│   │   ├── journey-smoke.ts
│   │   ├── kyb-pipeline-check.ts
│   │   ├── ops-auth-verify.ts
│   │   └── send-test-email.ts
│   ├── src
│   │   ├── common
│   │   ├── db
│   │   ├── modules
│   │   ├── test
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── instrument.ts
│   │   └── main.ts
│   ├── test
│   │   ├── app.e2e-spec.ts
│   │   ├── auth.e2e-spec.ts
│   │   ├── jest-e2e.json
│   │   ├── mfa-after-go-live.e2e-spec.ts
│   │   ├── onboarding.e2e-spec.ts
│   │   ├── site-notices.e2e-spec.ts
│   │   └── visitor-journey.e2e-spec.ts
│   ├── README.md
│   ├── biome.json
│   ├── drizzle.config.ts
│   ├── nest-cli.json
│   ├── package.json
│   ├── railpack.json
│   ├── railway.toml
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── branding
│   ├── README.md
│   ├── app-icon-charcoal.svg
│   ├── app-icon-light.svg
│   ├── app-icon-mustard.svg
│   ├── build_exports.py
│   ├── email-signature.html
│   ├── email-signature.txt
│   └── icon.svg
├── dbn-innovation-awards-2026
│   ├── submission
│   │   ├── assets
│   │   ├── pdf
│   │   ├── 00_Entry_Submission.html
│   │   ├── 00_sources.md
│   │   ├── 01_Business_Model.html
│   │   ├── 02_Product_Technical_Specifications.html
│   │   ├── 03_CV_Etuna_Nekwaya.html
│   │   ├── 03_CV_George_Nekwaya.html
│   │   ├── 04_Vision_Essay_Excerpt.html
│   │   ├── 05_Evidence_and_Sources.html
│   │   ├── 06_Independent_Auditor_Thomas_Paavo_Hamata.html
│   │   └── render_pdfs.mjs
│   ├── BUSINESS_MODEL_CANVAS.md
│   └── ENTRY_ANSWERS.md
├── docs
│   ├── cimso-innterchange
│   │   ├── INNterchange_Specifications_3_June_2026_a
│   │   ├── raw
│   │   ├── INNterchange_Specifications_3_June_2026_a.7z
│   │   ├── NDA_PACKAGE_NOTES.md
│   │   ├── README.md
│   │   ├── REGISTRATION_ANSWERS.md
│   │   ├── backoffice.cimso.com_api_registration.txt
│   │   ├── enlistgroup.com_software_cimso_interfaces.txt
│   │   ├── www.cimso.com.txt
│   │   ├── www.cimso.com_cimso-launches-new-product.txt
│   │   ├── www.cimso.com_developing-an-api-for-hotel-management-software.txt
│   │   ├── www.cimso.com_software_innkeeper.txt
│   │   ├── www.cimso.com_software_innterchange.txt
│   │   └── www.cimso.com_software_interfaces.txt
│   ├── incident-response.md
│   └── system-description.md
├── kiosk
│   ├── app
│   │   ├── src
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── gradle
│   │   ├── wrapper
│   │   ├── gradle-daemon-jvm.properties
│   │   └── libs.versions.toml
│   ├── scripts
│   │   └── rebuild-and-run.sh
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── local.properties
│   └── settings.gradle.kts
├── ops-console
│   ├── public
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   ├── navigation
│   │   ├── styles
│   │   ├── instrumentation-client.ts
│   │   └── instrumentation.ts
│   ├── README.md
│   ├── biome.json
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── sentry.edge.config.ts
│   ├── sentry.server.config.ts
│   ├── tsconfig.json
│   └── vitest.config.mts
├── scripts
│   ├── acceptance
│   │   ├── checklist.json
│   │   └── state.json
│   ├── compliance
│   │   └── collect-evidence.mjs
│   ├── e2e
│   │   ├── buffr-id-setup.mjs
│   │   └── checkpoint-buffr-id-e2e.mjs
│   ├── acceptance-gate.sh
│   ├── capture-marketing-screenshots.mjs
│   ├── neon-daily-snapshot.sh
│   ├── run-all-tests.sh
│   └── smoke-production.sh
├── shared
│   ├── src
│   │   ├── form-rules.ts
│   │   ├── identity-assurance-level.ts
│   │   ├── index.ts
│   │   └── visit-status.ts
│   ├── package.json
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── website
│   ├── public
│   │   ├── branding
│   │   ├── email
│   │   ├── marketing
│   │   └── screenshots
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── lib
│   │   ├── styles
│   │   ├── instrumentation-client.ts
│   │   └── instrumentation.ts
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── README.md
│   ├── biome.json
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── sentry.edge.config.ts
│   ├── sentry.server.config.ts
│   ├── tsconfig.json
│   └── vitest.config.mts
├── README.md
├── SECURITY.md
└── buffrcheckpoint.md

72 directories, 138 files
```

Hidden folders such as `.claude/skills/` hold project skills (this one, `buffrcheckpoint-design`, and `data-warehouse-source-setup`).

## Backend modules (`backend/src/modules/`)

access-policies, access-reviews, analytics, analytics-etl, anomaly-rules, audit, auth, billing, capability-status, compliance, contact, credentials, crm, devices, documents, dsar, emergency, evidence, host-notification-escalation, hosts, identity-verification, integration-health, integrations, invitations, kiosk-experience, kyb, legal, legal-holds, notifications, onboarding, onboarding-state, organisation-directory, organisation-health, organisation-standards, organisations, platform-configuration, platform-dashboard, platform-incidents, platform-search, platform-staff, rbac, regions, retention-disposition, retention-policy, schedule, scheduled-reports, security-zones, site-notices, site-qr-references, sites, support-sessions, support-tickets, type-definitions, visit-survey, visitor-policy, visitor-wait-queue, visitors, visits. Cross-cutting code is in `backend/src/common/` (audit chain, crypto, data protection, privacy register, turnstile, artifacts, RBAC decorators, guards-static tests).

## Environment

Names only, never values. The full table per service is blueprint **section 32**; do not copy it here. Additions since that table was written: `TURNSTILE_SECRET_KEY` (Railway, API) and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel, website and admin). Read names with `railway variables --service api --kv | cut -d= -f1` and `vercel env ls production`.

## Commands

| Task | Command |
|---|---|
| All suites | `scripts/run-all-tests.sh` (backend unit and e2e, website, admin, kiosk; `SMOKE_PRODUCTION=1` adds the live smoke) |
| Backend typecheck, tests | `cd backend && npx tsc --noEmit && npx jest` |
| Route policy audit | `node backend/scripts/audit-route-policy.cjs` |
| Web apps | `cd <app> && npx tsc --noEmit && npx vitest run`; website build `npm run build` |
| Lint touched files | `npx biome check --write <files>` (never over a whole folder: it rewraps legal pages) |
| Neon dev branch string | `neonctl connection-string dev-local --project-id falling-frog-15538162 --role-name neondb_owner` (use in a variable, never print) |
| Production string | same without a branch name |
| Deploy API | `cd backend && railway up --service api --detach`, then `railway deployment list --service api` |
| Deploy web | `cd <app> && vercel --prod --yes` |
| Smoke | `scripts/smoke-production.sh` |
| KYB end to end | `backend/scripts/kyb-pipeline-check.ts` (development database only) |
| Real branded mail | `backend/scripts/send-test-email.ts` |
| Daily Neon snapshot | `.github/workflows/neon-snapshot.yml` (secret `NEON_API_KEY`) |

TypeScript scripts run with `npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node","resolvePackageJsonExports":false}' <script>`.

## Gotchas that cost time

- **zsh:** an unquoted `--include=*.ts` fails with "no matches found"; use plain `grep -r` or quote. An `echo "=== x"` starting with `=` is treated as a command.
- **Tools on the path:** use absolute paths such as `/usr/bin/curl` and `/usr/bin/sort` if a command is "not found" inside a loop.
- **Waiting:** `sleep` in a foreground command is blocked; use an `until` loop on the thing you wait for.
- **Railway:** `variables --set` redeploys; add `--skip-deploys` to stage a change. Builds use Railpack, so a Nixpacks file is ignored.
- **Vercel:** `env add` marks values sensitive by default and `env pull` then returns nothing readable; add `--no-sensitive` for public values. `NEXT_PUBLIC_*` is fixed at build time.
- **Neon:** the branch count limit is real. Do not delete branches without asking. `neonctl` needs `--project-id` and, with two roles, `--role-name`.
- **Biome `--write`** rewrites whole files; on a legal page that is a large diff. Use `git diff -w` to confirm only the intended words changed.
- **Dependencies:** `sharp` is pinned by an override in `backend/package.json`; the OCR package runs in a child process because a page can take over a gigabyte.
- **Retention:** the worker runs once at start and then daily; `RETENTION_DISPOSITION_MODE` is live in production.
- **Never** print or commit a secret; the Turnstile secret appeared once in a tool result and should be rotated if that matters.

## Public routes worth knowing

`GET /health`, `GET /public/pricing`, `GET /public/capability-status`, `POST /public/contact` (Turnstile, throttled), `POST /onboarding/organisation-admin` (sign-up, Turnstile), `POST /auth/login` and `POST /auth/password-reset/request` (Turnstile), the visitor routes under `/public/check-in`, `/public/emergency-info`, `/public/induction` (never behind Turnstile).
