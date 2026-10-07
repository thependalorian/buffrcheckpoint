# Buffr Checkpoint: system description (SOC 2, DC 200 draft)

**Status:** Draft 1, 2026-10-06. Written from the repository and `buffrcheckpoint.md`. Not reviewed by management and not yet asserted to an auditor. Items marked **TBC** are not verified and must be confirmed before this is given to an auditor. This file is the product's canonical system description; update it in place.

**Programme:** `buffr-ai/BUFFR_SOC2_PROGRAMME.md` (scope: Security and Confidentiality; Buffr ID joins the boundary when Checkpoint relies on it).

## 1. Services provided

Buffr Checkpoint is a visitor check-in and access-compliance service for organisations. It records who entered a site, who they visited, the outcome of any screening, and the audit trail, and it produces evidence packs for the customer's own compliance reviews. Checkpoint is an independent product and brand.

## 2. System components

| Component | Description | Hosting (source) |
|---|---|---|
| Kiosk application | Visitor check-in on a dedicated Android device, with an encrypted local store for offline use (`buffrcheckpoint.md` 11.2) | Customer premises. Device management **TBC** |
| Admin web app (`admin/`) | Customer operators and compliance officers | Vercel, `admin.buffrcheckpoint.com` |
| Ops console (`ops-console/`) | Platform staff, separate sign-in audience | Vercel, `ops.buffrcheckpoint.com` |
| Public website (`website/`) | Marketing and enquiries | Vercel, `buffrcheckpoint.com` |
| API (`backend/`) | NestJS modular monolith; one replica in Amsterdam | Railway, `api.buffrcheckpoint.com`, health check `/health` |
| Database | PostgreSQL with Drizzle migrations; tenant and site scoping | Neon, `buffr-checkpoint-eu` (eu-central-1) |
| Object storage | Evidence and artifacts, S3-compatible | Neon Object Storage (Frankfurt); Vercel Blob only as a stated fallback |
| Email | Outbound notifications | Resend today; moving to Buffr Mail (`BUFFR_ID_AND_DOMAINS.md` A3) |
| Source and CI | GitHub repository `buffrcheckpoint`; workflow `.github/workflows/ci.yml` (typecheck, tests, build, secrets scan) | GitHub |

## 3. People and access

- **Roles (customer):** visitor, host or staff, front desk operator, site manager, regional manager, compliance or audit officer, system administrator (`buffrcheckpoint.md` 9.1).
- **Platform staff:** separate sign-in audience and front door from customers (`buffrcheckpoint.md` 9.2a). Support access to customer data is time-bound, approved and audited (break-glass).
- **Authentication:** custom NestJS authentication with TOTP multi-factor authentication, lockout and challenge tokens. MFA is required for owners and privileged configuration. The seeded platform support account was locked on 2026-10-06 after its demo password was found published (programme section 3.3).
- **Service access:** infrastructure accounts at GitHub, Neon, Railway, Vercel, Namecheap and the email provider. MFA on each is **TBC** (programme P0).

## 4. Data

| Class | Examples | Controls |
|---|---|---|
| Restricted | Visitor records, identity verification outcomes, evidence packs, credentials and secrets | Tenant isolation; encrypted in transit; encrypted at rest in Neon; not in logs or AI prompts |
| Confidential | Customer configuration, site and host lists, audit exports | Role-based access |
| Public | Marketing site content | Approved before publication |

Retention is configured per customer in the product (`buffrcheckpoint.md` 8.9). Platform-level retention for logs and backups is **TBC** (programme decision D3).

## 5. Security-relevant controls in the product

- **Audit trail:** append-only, hash-linked audit events, with immutable export storage (`buffrcheckpoint.md` 11.2).
- **Tenant isolation:** every operational record carries the tenant scope; tests assert it **TBC (list the test files)**.
- **Change management:** pull requests and CI on `main`. Branch protection and required review are **not enabled** today (programme section 3.1).
- **Dependencies:** Dependabot configured with a 7-day cool-down. Automatic security updates are off (programme section 3.1).
- **Vulnerability disclosure:** `security@buffrcheckpoint.com`, `/.well-known/security.txt` (in the website; deploy is **TBC**).

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
