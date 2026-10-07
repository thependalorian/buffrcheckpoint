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
