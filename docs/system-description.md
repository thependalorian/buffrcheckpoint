# Buffr Checkpoint: system description (SOC 2, DC 200 draft)

**Status:** Draft 1, 2026-10-06. Written from the repository and `buffrcheckpoint.md`. Not reviewed by management and not yet asserted to an auditor. Items marked **TBC** are not verified and must be confirmed before this is given to an auditor. This file is the product's canonical system description; update it in place.

**Programme:** `buffr-ai/BUFFR_SOC2_PROGRAMME.md` (scope: Security and Confidentiality; Buffr ID joins the boundary when Checkpoint relies on it).

## 1. Services provided

Buffr Checkpoint is a visitor check-in and access-compliance service for organisations. It records who entered a site, who they visited, the outcome of any screening, and the audit trail, and it produces evidence packs for the customer's own compliance reviews. Checkpoint is an independent product and brand.

## 2. System components

| Component | Description | Hosting (source) |
|---|---|---|
| Kiosk application | Visitor check-in on a dedicated Android device, with an encrypted local store for offline use (`buffrcheckpoint.md` §6.5, §15.2) | Customer premises. Device management **TBC** |
| Admin web app (`admin/`) | Customer operators and compliance officers | Vercel, `admin.buffrcheckpoint.com` |
| Ops console (`ops-console/`) | Platform staff, separate sign-in audience | Vercel, `ops.buffrcheckpoint.com` |
| Public website (`website/`) | Marketing and enquiries | Vercel, `buffrcheckpoint.com` |
| API (`backend/`) | NestJS modular monolith; one replica in Amsterdam | Railway, `api.buffrcheckpoint.com`, health check `/health` |
| Database | PostgreSQL with Drizzle migrations; tenant and site scoping | Neon, `buffr-checkpoint-eu` (eu-central-1) |
| Object storage | Evidence and artifacts, S3-compatible | Neon Object Storage (Frankfurt); Vercel Blob only as a stated fallback |
| Email | Outbound notifications | SMTP through the Buffr mailbox (D-22); Resend only as a fallback |
| Source and CI | GitHub repository `buffrcheckpoint`; workflow `.github/workflows/ci.yml` (typecheck, tests, build, secrets scan) | GitHub |

## 3. People and access

- **Roles (customer):** visitor, host or staff, front desk operator, site manager, regional manager, compliance or audit officer, system administrator (`buffrcheckpoint.md` §5.1).
- **Platform staff:** separate sign-in audience and front door from customers (`buffrcheckpoint.md` §5.3). Support access to customer data is time-bound, approved and audited (break-glass).
- **Authentication:** custom NestJS authentication with TOTP multi-factor authentication, lockout and challenge tokens. MFA is required for owners and privileged configuration. The seeded platform support account was locked on 2026-10-06 after its demo password was found published (programme section 3.3).
- **Service access:** infrastructure accounts at GitHub, Neon, Railway, Vercel, Namecheap and the email provider. MFA on each is **TBC** (programme P0).

## 4. Data

| Class | Examples | Controls |
|---|---|---|
| Restricted | Visitor records, identity verification outcomes, evidence packs, credentials and secrets | Tenant isolation; encrypted in transit; encrypted at rest in Neon; not in logs or AI prompts |
| Confidential | Customer configuration, site and host lists, audit exports | Role-based access |
| Public | Marketing site content | Approved before publication |

Retention is automatic: every organisation is covered by a standard period (365 days after check-out, a placeholder pending counsel) unless it sets its own, and delivered message content is cleared after 30 days (`buffrcheckpoint.md` §8.5). Platform-level retention for logs and backups is **TBC** (programme decision D3).

## 5. Security-relevant controls in the product

- **Audit trail:** append-only, hash-linked audit events, with immutable export storage (`buffrcheckpoint.md` §14.4).
- **Tenant isolation:** every operational record carries the tenant scope; tests assert it **TBC (list the test files)**.
- **Change management:** pull requests and CI on `main`. Branch protection and required review are **not enabled** today (programme section 3.1).
- **Dependencies:** Dependabot configured with a 7-day cool-down. Automatic security updates are off (programme section 3.1).
- **Vulnerability disclosure:** `team@buffranalytics.com`, `/.well-known/security.txt` (in the website; deploy is **TBC**).

## 6. Subservice organisations (carve-out method)

| Vendor | Service | Assurance report on file |
|---|---|---|
| Neon | Database and object storage | **TBC** |
| Railway | API hosting | **TBC** |
| Vercel | Web hosting | **TBC** |
| GitHub | Source control and CI | **TBC** |
| Namecheap | DNS and domains | **TBC** |
| Resend | Email delivery | **TBC** |

## 7. Complementary user entity controls (customers must run)

- Manage their own users and remove leavers promptly.
- Enable and enforce MFA for their administrators.
- Set retention periods that match their legal obligations.
- Review their audit exports and evidence packs.
- Keep kiosk devices managed, patched and physically secured.

## 8. Incidents, changes and boundaries

- **Incidents in the period:** one recorded on 2026-10-06, a published demo credential for the platform support account (contained, no support sessions, reset tokens or MFA challenges found). Details in the programme.
- **Known boundary note:** a demo tenant runs in production under the name "Buffr Analytics"; separate it or describe it here (programme P0 list, item 10).
- **Not in this boundary:** Buffr ID until Checkpoint relies on it, and every other Buffr product.

## 9. Record of processing activities (REG-ROPA-01)

Kept for the draft Data Protection Bill, s20. Checkpoint acts as **processor** for visitor and customer-staff data (the customer is the controller) and as **controller** for its own sales, billing and platform-staff data. Reviewed whenever a release adds a data category.

| Activity | Role | Purpose | Data subjects | Categories | Recipients | Erasure |
|---|---|---|---|---|---|---|
| Visitor check-in and sign-out | Processor | Know who is on site, notify the host, keep an access record | Visitors | Name, mobile number, company, optional email, host, purpose, times, channel; optional ID or vehicle only if the form allows (encrypted) | Customer staff by role; hosts; providers in section 6 | Automatic: 365 days after check-out by default; legal hold excepted |
| Host and staff directory | Processor | Route arrivals to the right person | Hosts, customer staff | Name and contact (encrypted), department | Customer staff | With the account or on request |
| Queued email and text messages | Processor | Deliver notifications | Visitors, hosts, staff | Address or mobile number, message text | Mail and text providers | Recipient and text cleared 30 days after delivery |
| Audit trail and evidence packs | Processor | Show who viewed or changed records | Visitors, customer staff | Actor, action, resource, time, hashes | Customer compliance staff; auditors the customer names | Kept with the account; immutable |
| Data-subject requests | Processor | Answer access, correction and deletion requests | Requesters | Reference, request type, status log | Customer compliance staff | With the organisation's record |
| Analytics roll-ups | Processor | Reporting without personal data | None (no personal data) | Counts by site, day, hour, channel | Customer admins; ops (cells under 5 suppressed) | Not personal data |
| Sales, billing and support | Controller | Run the service commercially | Customer contacts, enquirers | Name, work email, organisation, invoices, proof of payment, tickets | Staff; bank and card page provider | Per contract and tax rules |
| Platform staff accounts | Controller | Operate and secure the service | Buffr staff | Work email, role, sign-in and support-session audit | Staff | On leaving, subject to audit retention |

## 10. Subprocessors and cross-border transfer register

Source of truth in code: `backend/src/common/privacy/subprocessors.ts` (a test compares it with the Privacy Policy copy). Draft Bill s18(4) needs the processor to use no other processor without the controller's authorisation, and s24 needs a documented safeguards assessment for each transfer outside Namibia. Reviewed quarterly.

| Provider | Purpose | Where | Visitor data | Assessment status |
|---|---|---|---|---|
| Neon | Database and encrypted document storage | Frankfurt, Germany | Yes | Safeguards assessment to be written; assurance report to be placed on file |
| Railway | Application server | Amsterdam, Netherlands | Yes | As above |
| Vercel | Website, admin, ops hosting | Global edge | No | Not required for visitor data |
| Namecheap Private Email | Service email | Not confirmed | Yes | Region to be confirmed with the provider |
| BulkSMS Namibia | Text messages (optional add-on) | Not confirmed | Yes | Region and delivery terms to be confirmed with the provider |
| Adumo Online | Card page for subscription invoices | Not confirmed | No | Not required for visitor data |
| Sentry | Scrubbed error reports | Not confirmed | No | Scrubber tested; region to be confirmed |
| PostHog | Consent-gated analytics, codes and counts | United States | No | Not required for visitor data |

Open for the owner: the written safeguards assessment for Neon and Railway (the two providers that hold visitor data outside Namibia), and the three unconfirmed regions that apply to visitor data.

## 11. Data protection impact assessment triggers

A DPIA is completed before any of these go live for an organisation: processing special-category information at scale (clinics, faith-based and community organisations are flagged by sector, and the standard form already treats the purpose of the visit as sensitive for them); systematic monitoring of a publicly accessible area at scale; any profiling feature; enabling photo or ID capture for a site; adding a subprocessor outside Namibia. Each DPIA records the processing and purpose, why it is necessary and proportionate, the risks to people, and the measures that address them.

## 12. Security Framework summary and tolerances (standard GV-1, GV-3, GV-4)

Status: draft for the owner's approval. Nothing here is approved until the owner signs and dates it in the governance record. The Framework is the Buffr Security Standard (`buffr-ai/BUFFR_SECURITY_STANDARD.md`) applied to Checkpoint; the requirement-by-requirement state is Annex E of `buffrcheckpoint.md`.

| Tolerance | Value | Measured by |
|---|---|---|
| Availability of critical systems | 99.9 percent | Uptime monitor on `/health` (planned, blueprint 32.4) |
| Recovery time | 2 hours | Restore rehearsal record (none yet) |
| Recovery point | 5 minutes within the last 6 hours | Neon point-in-time history |
| Recovery tests | 2 successful a year | Dated records (none yet) |
| Time to first response | Sev 1 within 1 hour, Sev 2 within 4 hours | Incident log |

Roles: the owner is the board and top management and approves the Framework; the security officer role reports to the owner directly (GV-2); a named privacy lead is an owner appointment (GP-2) not yet made. The risk profile goes to the owner four times a year (GV-4); no entry has been recorded yet. Scope (GV-6): the Checkpoint service as described in section 2 and the interfaces in section 6; other Buffr products are outside it.

## 13. Vendor and processor register fields (VD-1, DL-12)

Section 6 and section 10 above list the vendors. Each critical vendor row also needs: tier, whether a data processing agreement is on file, assurance report status, last review date. Until a document is in hand the cell says "not confirmed". Today: Neon, Railway (critical, holding visitor data), Vercel, GitHub, Namecheap, the mailbox provider, Sentry, PostHog, BulkSMS Namibia, Adumo, Cloudflare Turnstile and Collexia: agreement and report **not confirmed** for all. Owner action: request each agreement and report and file them.

## 14. AI inventory and classification (AIG-1, AIG-2, AI-1)

| System | Purpose | Tier | Data | Controls |
|---|---|---|---|---|
| Form AI (`FormAiService`, Neon AI Gateway) | Suggests and translates check-in form field definitions for administrators | Internal assistance (minimal) | Field definitions typed by the administrator; never visitor data | No tools; never publishes; admin only; kill switch `FORM_AI_ENABLED`; audit actions `check_in_form.ai_suggest_fields` and `check_in_form.ai_translate_field` with no prompt or response stored |

No other AI feature exists. KYB document reading is classical OCR (Tesseract, PaddleOCR) on the platform; it suggests values and a person confirms them. No automated decision about a person is made (blueprint 3.2).

## 15. Clock synchronisation and records access (LG-9, GV-9)

All servers are managed platforms that synchronise time; authoritative timestamps are UTC. Regulator access to records (PSD-12 paragraph 14) is met by the evidence pack and audit export; retrieval within one working day has not been tested.

## 16. Complementary user entity controls (AS-8)

Customers run these for the service to be secure: enforce MFA for their administrators; remove leavers the day they leave; set retention periods that match their obligations; review audit exports and evidence packs; keep kiosk devices managed, patched and physically secured; use the privacy notice Checkpoint supplies unchanged or adjust it with their counsel.

## 17. Risk register and scoring (GV-5)

Likelihood and consequence are each scored 1 to 5 (blueprint 19.4) and multiplied: 1 to 5 low, 6 to 12 medium, 13 to 25 high. Owner of every row is the owner until a second person is named. Reviewed each quarter and on a new data category, subprocessor, region or incident.

| Risk | L | C | Score | Treatment | Residual | Review |
|---|---|---|---|---|---|---|
| Personal data readable through a known encryption key | 1 | 5 | 5 | Key ring, envelopes re-encrypted 2026-10-09, key removed from the source of truth | Low | 2027-01 |
| Signing secret forged sessions | 1 | 5 | 5 | EdDSA keys in the database, 90 day rotation, legacy secret window ends 2026-10-09 19:20 UTC | Low | 2027-01 |
| Cross-tenant read through a missing scope | 2 | 5 | 10 | Two guard layers, tenant-scope ratchet, isolation e2e; row-level security proposed (AZ-4) | Medium | 2027-01 |
| Audit rows edited by the application | 1 | 4 | 4 | Append-only grants checked in CI and on production; daily chain verifier | Low | 2027-01 |
| Public repository exposes design detail | 4 | 2 | 8 | Secret scan with history, push protection; visibility decision is the owner's (IN-5) | Medium | 2026-11 |
| Mail spoofing of the product domain (no DMARC) | 3 | 3 | 9 | Add DMARC and DKIM (IN-4) | Medium | 2026-11 |
| No tested restore | 2 | 4 | 8 | Replay procedure and script written; drill blocked by the branch limit (RC-3) | Medium | 2026-11 |
| Single API replica outage | 3 | 3 | 9 | Redeploy within the two hour target; second replica needs the shared event bus | Medium | 2027-01 |
| Vendor without agreement or report on file | 4 | 3 | 12 | Request agreements and reports (VD-1, VD-2) | Medium | 2026-12 |

## 18. Asset and account inventory (GV-14)

| Asset | Kind | Owner | Data class | Environment | Last review |
|---|---|---|---|---|---|
| Source repository `thependalorian/buffrcheckpoint` | Source code | Owner | Internal | GitHub | 2026-10-09 |
| Railway project `buffrcheckpoint`, service `api` | Compute and secrets | Owner | Restricted | Production | 2026-10-09 |
| Vercel projects `buffrcheckpoint-website`, `-admin`, `-ops-console` | Compute | Owner | Internal | Production | 2026-10-09 |
| Neon project `buffr-checkpoint-eu` (`falling-frog-15538162`) | Database and object storage | Owner | Restricted | Production and branches | 2026-10-09 |
| Neon project `steep-credit-81607786` | Workspace operations records | Owner | Internal | Operations | 2026-10-09 |
| Namecheap: `buffrcheckpoint.com`, `buffranalytics.com`, Private Email | DNS, domains, mailbox | Owner | Internal | Production | 2026-10-09 |
| Secrets in Railway: signing keys are in the database; `PERSONAL_DATA_KEY`, peppers, `DELETION_TOMBSTONE_PEPPER`, SMTP, Adumo, Turnstile | Keys and credentials | Owner | Restricted | Production | 2026-10-09 |
| Sentry, PostHog, Cloudflare Turnstile, BulkSMS Namibia, Adumo | Third-party services | Owner | Internal | Production | 2026-10-09 |
| AI gateway key (Neon AI Gateway) for Form AI | Provider key, one per service | Owner | Restricted | Production | 2026-10-09 |

## 19. Regimes by whose data is processed (GP-1)

| Product | Namibia | South Africa | EU or EEA |
|---|---|---|---|
| Buffr Checkpoint | Yes: visitors and customer staff at Namibian sites; the draft Data Protection Bill applies when enacted | Only if a customer site hosts visitors from South Africa as data subjects of that customer: the customer is the responsible party and Checkpoint its operator | Only if a customer site is in the EU: no such customer exists today, so no representative is appointed |

Re-checked when a customer outside Namibia signs (GP-8). The privacy lead (GP-2) and registrations (GP-7) are owner appointments.

## 20. Technical debt register (DC-11)

| Item | Owner | Risk | Cost to fix | Raised | Review |
|---|---|---|---|---|---|
| 270 exported backend units without a comment above them | Owner | Low | Spread over normal edits (ratchet falls) | 2026-10-09 | 2027-01 |
| 24 source files over 400 lines | Owner | Low | Split on the next change to each | 2026-10-09 | 2027-01 |
| 77 banned words in public copy | Owner | Low | Rewrite copy modules in tranches | 2026-10-09 | 2027-01 |
| About 17 pre-existing accessibility and hook lint findings in the web apps | Owner | Low | One focused pass | 2026-10-09 | 2026-11 |
| 56 backend files not formatted to Biome | Owner | Low | One formatting commit | 2026-10-09 | 2026-11 |
| 127 queries flagged by the tenant-scope scan | Owner | Medium | Add the organisation predicate to each, file by file | 2026-10-08 | 2026-11 |

## 21. Purposes, lawful basis and minimisation (PR-1 to PR-3, PR-6)

Checkpoint is a processor for visitor and staff data, so the lawful basis for a visitor record is the controller's. The table states the basis the product is built to support and what the customer confirms in the contract.

| Purpose | Data | Basis the product supports | Customer confirms |
|---|---|---|---|
| Know who is on site and keep an access record | Name, mobile number, company, host, times | Legitimate interest in site security and safety, or a legal duty on the customer | The basis in the customer's own notice |
| Reach a visitor and host during a visit | Mobile number, optional email | Same as above | Same |
| Emergency roll call | Who is on site now | Legal duty or vital interests | Same |
| Visit survey and rating | Rating, optional comment | Consent, given per survey, never required to leave | Same |
| Billing and support for the customer | Customer contacts, invoices | Contract | n/a (Checkpoint is controller) |

Field-by-field justification (PR-2): the standard check-in form (`organisation-standards/standard-defaults.ts`) gives a purpose note for every field, and the form builder will not publish any field above the basic class without a purpose note of at least ten characters (migration 0082, `visitor-data-minimisation.service.spec.ts`). The note is stored on the field, so the justification travels with the form version.

Special categories (PR-6): none is collected by default. A clinic, faith-based or community organisation sets the purpose-of-visit field to the sensitive class, because the fact of the visit can reveal health or belief. Identity documents and photographs are high-risk fields, off by default, and need an approval reference as well as a purpose note to publish. The register of such fields is the set of published form fields at class sensitive or above, listed with their purpose note and approval reference by the form version API.

## 22. Change record and emergency changes (GV-11)

Every production change is a pull request with the template filled in; the pull request is the change record. An emergency change (an incident fix that cannot wait for review) is merged by the owner with the reason written in the pull request body under the heading "Emergency change", then reviewed after the fact within two working days and the review noted on the same pull request. Emergency changes are counted in the monthly review figures (`scripts/review-metrics.mjs`).

## 23. Evidence for a court (ER-5)

For a person in control of the system to swear an affidavit, keep these facts for each release: the repository and commit hash deployed, the deploy log from the platform, the software list (the CycloneDX bill of materials produced by CI), any alteration to stored records (none is possible on audit rows; corrections are new rows), the audit chain verification result for the period, and the qualifications of the person swearing. The evidence pack already carries the chain result; the rest comes from the pull request and CI run of the release.

## 24. Measured security objectives (GV-12)

Measured 2026-10-09. Values are re-measured at each quarterly review.

| Objective | Target | Measured | Source |
|---|---|---|---|
| Audit chains verify clean | 100 percent | Production, 5 organisations and 118 events: 5 verify clean, 0 breaks. 4 pre-index forks and 28 merge-moved events are registered (migrations 0083 and 0084); the proof is in D-47 | `backend/scripts/verify-audit-chains.ts` |
| Payment reconciliation breaks | 0 unexplained | 0 on dev-local | `backend/scripts/run-payment-reconciliation.ts` |
| Tests | Floor cannot fall | backend 699, admin 66, website 63, ops console 5 | `scripts/test-floor.json` |
| Secrets present and strong in production | Verified at every deploy | Verified at boot by the production config guard | `production-config-guard.ts` |
| Change review | Monthly figures | 1 merged pull request in 30 days, 0 reviewed (sole maintainer) | `scripts/review-metrics.mjs` |

