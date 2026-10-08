# Buffr Checkpoint

## Product and Operating Blueprint

**Version 1.0, greenfield rewrite, 2026-10-07**

> **What this document is.** The target-state specification for Buffr Checkpoint: what the product is, how it behaves, how it is built, how it is secured and governed, how it is sold, and how it is operated. It states rules and designs, not progress. Build status, deployment records and acceptance state live in `scripts/acceptance/state.json`, the workspace-ops database and `docs/`. The previous version (v0.34, 14,211 lines, with its full change history) is archived unchanged at `docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md`.

### How to read it

- Values that are configuration (prices, plan names, sector lists, permission grants, retention days, thresholds) are owned by the database seeds and settings. This document states the rule and the current value for orientation; if they disagree, the seed wins and this document is corrected.
- **Gated** means a capability exists in design but must not be offered, marketed or shown as live until the capability register says so (§24.4).
- **Owner decision** marks an item only the owner, counsel or a named external party can close. They are collected in §31.
- Section references use the form §N.M. The crosswalk from the v0.34 numbering is Annex D.
- Standards language is fixed by §1.4: Checkpoint is designed to support and aligned to named frameworks. It is not described as certified, compliant or verified unless an independent party has said so in writing.

### Contents

| Part | Sections |
|---|---|
| 1 Positioning | 1 Thesis and claim rules |
| 2 Product | 2 Channels, 3 Assurance and risk, 4 Journeys, 5 Access control |
| 3 Surfaces and features | 6 Surfaces, 7 Onboarding, 8 Forms, policies and retention, 9 Notifications and messaging, 10 Analytics and reporting, 11 Billing and payments, 12 Integrations |
| 4 Architecture and data | 13 Architecture, 14 Data model, 15 Devices, offline capture and credentials, 16 Hosting and recovery |
| 5 Security, privacy and standards | 17 Security baseline, 18 Namibia Data Protection Bill, 19 ISO/IEC 27001:2022, 20 Asset management, 21 Governance and assurance |
| 6 Regulatory and government | 22 Law map, 23 CRAN and devices, 24 DigiNam, NPKI and e-ID, 25 Electronic Transactions Act, 26 Public sector |
| 7 Commercial | 27 Strategy, 28 Packaging and pricing, 29 Go-to-market and acceptance, 30 Roadmap and risks, 31 Decisions required |
| 8 Operations and design | 32 Hostnames, environments and runbook, 33 Design system, 34 Engineering rules, 35 Decision log |
| Annexes | A Out of scope by decision, B Statement of Applicability, C Data Protection Bill crosswalk, D Section crosswalk |

---

# Part 1: Positioning

## 1. Thesis and claim rules

### 1.1 The problem

A paper visitor register is an everyday privacy and governance failure. It shows names, phone numbers, identification numbers, employers, hosts, vehicle registrations and visit purposes to every person who signs the page afterwards. It leaves no reliable access history, cannot enforce retention, cannot answer a data-subject request, and cannot show who viewed or removed a page.

| Paper process | Consequence |
|---|---|
| Visitors write in a shared book | The next visitor reads earlier visitors' personal information |
| Handwritten entries | Incomplete, inaccurate, hard to search or report |
| Pages kept in drawers or security booths | No retention control, retrieval standard or physical access log |
| A page is lost, photographed, copied or damaged | No forensic trail and no recovery |
| Sign-in is separate from host approval | Reception does not know whether the visit was expected or permitted |
| Registers are treated as administration | The register is really a live information-security control |
| Rural and offline sites fall back to paper | Poor connectivity forces a false choice between continuity and privacy |

### 1.2 What Checkpoint is

Buffr Checkpoint is an independent, Namibia-built digital visitor and access-management platform. It replaces shared paper registers with isolated, encrypted visitor records, risk-based identity and access controls, role-based access, retention automation and audit evidence. It serves any organisation that needs governed presence: banks, government, healthcare, critical infrastructure, corporate offices, hospitality, education, faith-based and community organisations. Go-to-market may sequence regulated buyers first (§27), but neither packaging nor schema is tied to one vertical.

It promises four outcomes:

1. **Protect.** No visitor sees another visitor's details.
2. **Verify proportionately.** The identity assurance level matches the risk of the site, visit and zone.
3. **Operate anywhere.** Check-in continues through outages and low bandwidth.
4. **Prove control.** The organisation can evidence access, retention, permissions, exceptions and control performance to management, auditors, customers and regulators.

Design principle: every visitor can check in. The channel changes; the data-protection standard does not. Where an organisation already runs a system of record (property management, directory, access control), Checkpoint integrates at the boundary and does not replace it (§12).

### 1.3 Standalone brand

Checkpoint is an independent company and product with no parent-brand linkage of any kind: no "By Buffr" badge, no "A Buffr Product" footer, no copy that refers to another Buffr product, and no bundled comparison with one. Regulated buyers must be able to answer "who is behind this product and what else do they do" without a side conversation. Trademark and company-name clearance is a pre-launch legal gate (**Owner decision**, §31). Customer mail is signed "Buffr Checkpoint" with the mailbox owner described in §9.2.

**Accepted exception: the mail domain.** Checkpoint's mailbox is `team@buffranalytics.com`, because `buffrcheckpoint.com` has no mail (§9.2). That address appears as the sender, reply-to and published contact (website footer, contact page, privacy and terms pages, `security.txt`, billing messages), so the contact domain is the legal entity's trading name, not a Checkpoint name. This is an accepted trade-off while one mailbox serves the product (**Owner decision**, revisit before regulated-sector pitches). The rule it bends is "no copy that refers to another Buffr product": the address names the company, not a product, and the footer, signatures and body copy still say only "Buffr Checkpoint". The fix is a `buffrcheckpoint.com` mailbox on the same settings (§9.2): change the variables, redeploy and edit the static text; no code change. Tests assert the footer never contains the words "Buffr Analytics".

### 1.4 Claim rules

These rules bind the website, the product UI, sales material, tenders and contracts.

| Never say | Say instead | Evidence needed before the stronger claim |
|---|---|---|
| "We make you compliant" or "certified" | "Checkpoint takes care of the data protection work for you: the privacy notice, retention and disposal, data requests and their deadlines, breach notices and the evidence, built in and on from day one." Every item is something the product does and can show (§1.5) | A "compliant" or "certified" label needs an independent assessment or a regulator's word in writing |
| "PSD-12 compliant" | "Designed to support PSD-12-aligned controls" | A formal scope assessment confirming PSD-12 applies directly, with every requirement evidenced |
| "Data Protection Act compliant" | "Designed to support the draft Namibia Data Protection Bill" (§18) | Enactment, commencement, and a legal assessment |
| "ISO 27001 certified" or "compliant" | "Aligned to ISO/IEC 27001:2022; Statement of Applicability maintained" (§19) | A certificate from an accredited certification body covering the stated scope |
| "SOC 2 compliant" | "Operating a SOC 2-aligned control programme" | An issued assurance report |
| "DigiNam verified" or "DigiNam integrated" | "Built to support DigiNam/NPKI verification where formally enabled" | Approved relying-party arrangement, tested interface, evidence-backed `live` status and a real verification transaction (§24) |
| "National e-ID supported" | "Targeted; not live" until the register says otherwise | Ministry confirmation of national circulation, Buffr interoperability testing, `live` status |
| "Legally binding e-signatures" | "Visitor acknowledgements are kept as audit evidence" (§25.3) | Accredited certification service provider path and counsel approval |
| "Data hosted in Namibia" | "Designed for Namibian data-protection requirements", with the real processing regions named in the privacy policy | Evidence for the full chain: database, backups, object storage, key management, logs, messaging, support tooling, subprocessors |
| "Integrates with accredited certification service providers" | The design posture only | Written relying-party onboarding note |
| Any capability shown live | The public status badge, read from the register | `public_display_status = live` with evidence (§24.4) |
| "Buy a Checkpoint tablet" or any tablet price | "Planned"; customer-supplied approved devices are supported today | CRAN type approval held for the exact model, recorded in the Device Compliance Register (§23.1) |

The legal roles (the organisation is the controller, Checkpoint its processor, §18.2) are stated once, in the Terms and the Privacy Policy, where a contract needs them. They are not repeated as a disclaimer on every page, footer or setup step: the product's value is that it does this work (§1.5), and copy that hands the work back contradicts it. Confident and specific, never "compliant" or "guaranteed".

Visual rule: do not use imagery to make Checkpoint look more advanced than it is. Every visual reads from the same governed capability model as the product and the website copy (§33.6).

### 1.5 Privacy managed for the customer

Data privacy protection and management is the value proposition (D-35). An organisation should not have to think or worry about it, so every control below is on from the first day and needs nothing configured; the customer only decides things that are genuinely theirs (who may see what, which legal holds apply).

| Duty | What happens without anyone acting | Proof on demand |
|---|---|---|
| Keep data no longer than needed | Disposal runs by default at the platform retention (365 days, a placeholder pending counsel) for any organisation or site with no policy of its own; legal holds are skipped (§8.5) | Retention report and disposal run in the evidence pack |
| Do not keep message traces | Outbox recipients and message text are redacted 30 days after delivery (§9.1, D-36) | Redaction setting in the evidence pack |
| Answer data requests in time | Every request carries a received date and a one-month due date, with due-soon and overdue counts on the Compliance dashboard and in the ops and weekly summaries (§8.5, §18.4) | Data-request clock in the evidence pack |
| Treat sensitive sectors carefully | Clinics, faith-based bodies and non-profits start with special-category purposes classed sensitive and a notice that says so (§7.3) | The accepted standards and notice version |
| Be able to prove all of it | The evidence pack opens with a privacy posture: retention in force, last disposal run, holds, request clock, redaction, and the subprocessor and processing-region list (§10.2) | The pack itself |
| Tell customers fast if something goes wrong | A seeded `customer_breach_notice` template, sent by support, so notifying customers is not drafted under pressure (§9.2) | Audit event per send |

Checkpoint does this work as the customer's processor and says so in the contract (§1.4). It claims no certification and no legal compliance: it claims what it does, and each item above is on by default and can be shown in the evidence pack.

---

# Part 2: Product

## 2. Channels

### 2.1 Channel set

All channels write to one encrypted visit record. A channel proves possession of something, never identity by itself (§3.1).

| Channel | Who it serves | Assurance | Offline | Role in packaging |
|---|---|---|---|---|
| **Public site QR, phone web check-in** | Visitors with a smartphone at the door | Link possession | Needs network to submit | **Default self-service channel.** Admin creates, rotates and prints it; no tablet needed |
| **Assisted front-desk check-in** | Anyone: no phone, basic phone, low literacy, disability | Staff-observed, V0 | Yes | **Permanent inclusion path.** In every plan; never a stop-gap |
| QR pre-registration invitation | Expected visitors | Link possession, optional OTP | Limited | Network and Assure plans |
| NFC badge or token | Contractors, repeat visitors, staff | V2 | Yes | Optional fast lane, plan entitlement plus capability |
| NFC phone credential | Smartphone users | V2 | Depends | Optional fast lane |
| Kiosk or tablet | High-volume doors, accessibility-led sites | V0 or V2 | Yes | Optional device experience with MDM |
| SMS | Visitors who prefer a text | Possession of a number, V1 | Needs GSM | Add-on, billed by use (§9.3) |
| Email | Any visitor who typed an address | Possession of an address | n/a | Free to us; the default way to reach a visitor |
| DigiNam credential | Visitors with an enabled digital identity | V3 | Online | **Gated** (§24) |
| National e-ID by NFC | Cardholders | V4 | Online | **Gated** (§24) |
| Printed one-time code | Anyone during an outage | Site presence | Yes | Kiosk or guard fallback |

### 2.2 Inclusion rules

- Visitors without a usable smartphone are always served by assisted check-in. Reception checks them in at no per-visit cost and with no telecom dependency.
- Smartphone ownership is 28.5% of Namibians; in rural areas feature-phone ownership (25.4%) exceeds smartphone ownership (15.1%). A product that assumes a smartphone, NFC or mobile data would exclude most of the people at the clinics, branches and public offices that most need a secure check-in. Assisted entry is therefore part of every plan.
- A national e-ID, DigiNam credential or NFC capability is never a condition of entry for ordinary Tier 1 and Tier 2 visits.
- The kiosk never shows a capability that is not available. An unavailable option is absent, not greyed out: absent reads as "not offered here", disabled reads as "broken".

### 2.3 NFC standard

NFC is a premium fast lane: sub-second tap, no line of sight, short read range, reusable credentials.

- A tag holds only an opaque random reference. Never a name, ID number, visit purpose or access right.
- A static NFC UID is never an authentication factor. Validation is server-side against the credential's status, holder, site, time window and expiry (§15.3).
- Low-risk check-in may use a random token mapped server-side. Higher-risk access needs a credential that supports cryptographic challenge and response or mutual authentication, with revocation and expiry.
- Cheap writable stickers are acceptable for low-risk convenience, not for restricted zones.
- Physical badges land at roughly USD 0.20 to 0.40 each (NTAG213 or NTAG215) at moderate volume.
- Reader hardware is subject to CRAN assessment (§23).

## 3. Assurance and risk

### 3.1 Identity assurance levels

Persisted codes are `V0` to `V4` in `type_definition` domain `identity_assurance_level`. Never display "Verified" without the level name.

| Code | Name | Meaning | Typical method |
|---|---|---|---|
| V0 | Self-asserted identity | The visitor typed details; nothing was confirmed | Assisted or self-service entry |
| V1 | Contact-channel possession | The visitor controls the stated phone or address | SMS one-time code |
| V2 | Site-issued credential possession | A valid organisation-issued credential was presented | NFC badge mapped to a profile |
| V3 | DigiNam or NPKI verified identity | Approved relying-party flow returned a valid result | Gated |
| V4 | Official e-ID cryptographic validation | Government e-ID validated under an approved protocol | Gated |

Four axes are never collapsed into one field:

| Axis | Question |
|---|---|
| Identity assurance (`V0` to `V4`) | How strongly do we know who this is? |
| Signature class | Was a statutory electronic signature created? (§25.3) |
| Certificate role | Who issued or trusts a PKI credential? |
| Access decision | May this person enter? |

A V3 result is not a recognised electronic signature. A kiosk acknowledgement is not a V3 claim. A national CSP accreditation is not Checkpoint's capability status. Numeric equivalence to NIST SP 800-63-4 IAL, AAL or FAL, or to ISO/IEC 29115 levels, is not claimed; those are mapping aids only.

Staff always see the difference:

```text
Visitor: Anna N.
Check-in status: V1, contact-channel possession
Identity verification: not performed
Access decision: host approval required
```

### 3.2 Risk-based approach

"RBA" means both a risk-based approach to controls and data collection, and risk-based access decisions by site, visit and zone. Principle: collect the least data and apply the lowest-friction verification that safely meets the purpose of the visit.

| Tier (`risk_tier`) | Example | Minimum check-in | Verification | Access decision |
|---|---|---|---|---|
| 1 Open | Small office, public reception | Name, host, arrival time | V0 or V1 | Reception approval |
| 2 Standard controlled | Corporate office, clinic, branch | Name, host, purpose category, contact | V1 or pre-registration | Host notified |
| 3 Sensitive | Government office, bank, health administration | Pre-registration, purpose, confidentiality notice | V1 or V2; V3 where enabled | Host approval before entry |
| 4 Restricted | Data centre, payment operations, critical infrastructure | Pre-registration, zone, sponsor, safety terms | V3 or V4 where supported | Explicit approval, badge, escort |
| 5 Critical | Security operations, highly restricted facilities | Tailored facility workflow | V4 plus physical procedure | Security-led decision |

Guardrails:

- No automated access denial based on a personal-data risk score.
- No facial recognition or biometric matching.
- No blacklist by default.
- A human override needs a reason, role authority and an audit event.
- The RBA is documented in a customer-approved site access policy.
- Higher assurance is never an excuse for indiscriminate collection of identity data.
- Alerts (§9.5) inform people and never block, delay or deny a visitor.

### 3.3 Access decisions

- Roles decide who may act (RBAC, §5). The RBA decides whether this visitor may enter this site or zone, from visitor type, risk tier, assurance level, policy, credential status, host approval and emergency state.
- A visit is held in `pending_approval` when the zone requires host approval, until the host approves (`admitted`) or rejects (`entry_rejected`). A rejection reason is logged and never shown to the visitor.
- Host escalation: after a configured wait, a policy applies one of: notify an alternate contact, hold entry, or admit automatically for low-risk visitors. Tier 3 and above default to hold.
- High-assurance requirements are never silently downgraded offline. If a site requires live digital identity verification, the check-in may be recorded offline, physical entry stays pending, host or security approval is required, and no "verified" outcome is created.

## 4. Journeys

Each journey ends with an encrypted, isolated record and an audit event.

### 4.1 Walk-in visitor

Arrival, then public site QR or assisted entry, then privacy notice, then only the fields the active form requires, then assurance level recorded, then record encrypted, host notified, optional badge, sign-out, retention timer starts.

### 4.2 Pre-registered visitor

Host creates an invitation, the visitor receives a neutral link by email or text, arrives, scans or opens the link, the invitation matches exactly one visit, the host is notified, the access decision is recorded, sign-out starts retention. The QR holds a short-lived opaque token, never a name, phone number, ID number or access right.

### 4.3 NFC contractor

Contractor enrolled once, random reference assigned and mapped server-side, tap at the entrance, site and schedule and expiry checked, entry recorded, credential expires automatically at the end of the contract.

### 4.4 DigiNam verification (gated)

Visitor opts in, only the necessary attributes are requested through the approved relying-party flow, the response confirms credential status, only the outcome and a reference are kept, the visit is marked V3. Never store the credential payload, biometrics or unneeded attributes.

### 4.5 Offline capture

Outage, then the kiosk records an encrypted local entry, shows "Check-in recorded. Host notification pending.", reconnects, drains the queue idempotently, the server records acceptance and capture time, the notification is sent, the local personal data is deleted after confirmed sync, and the audit trail shows both offline creation and sync time. The system never says "host notified" while offline. For approval-required sites the site policy defines the offline route: radio or phone escalation, guard approval with a recorded reason, delayed entry or restricted entry.

### 4.6 Emergency

An authorised role activates emergency mode. The live on-site roster appears by site and zone, hosts and coordinators are notified, roll-call status is recorded, a report is exported, and access to the roster is audited. This turns visitor management from a compliance cost into a safety asset.

### 4.7 Sign-out

The visitor proves they own the record they are closing: a signed personal link from the receipt, NFC tap, a reference, or staff-assisted lookup. No visitor ever browses a list of other visitors. The system closes exactly one open visit, offers an optional one-tap rating, flags unresolved escort or badge items for the desk, and starts the retention timer.

### 4.8 Host notification and screening

A check-in event alerts the host with name, visitor type, purpose category and assurance level. On screening-enabled sites the host approves or rejects before the visitor passes reception. If the host does not respond, the escalation rule applies (§3.3). Screening is an access decision and is never conflated with identity assurance.

### 4.9 Data lifecycle and deletion

A record is tagged with the retention policy version in force. The timer starts at check-out (or at creation for records never closed, flagged stale). At the threshold the record is disposed of or held under an active legal hold. Every archive, hold and disposal is audited. A data-subject deletion request is routed to the Compliance or Audit Officer, who verifies the requester, executes or explains a lawful exception, and logs the outcome (§8.5).

### 4.10 Compliance review

The Compliance or Audit Officer signs in with MFA, pulls the audit log for a period and site, checks that controls operate (isolation, encryption, retention, RBAC, offline sync), exports an evidence pack, and records the review as a completed control test (§21).

## 5. Access control

### 5.1 Roles

Role codes live in `type_definition` domain `role_code`; permission grants live in `role_permission_grants`. Organisations assign roles from this fixed catalogue and cannot invent permissions.

| Role code | Who | Scope |
|---|---|---|
| `owner_operator` | Single-site owner: union of front desk, site manager, compliance and system administrator grants | One organisation or site; the only admin role on the smallest plan |
| `front_desk_operator` | Reception | Assigned site |
| `host_staff` | Employee hosting visitors | Own hosted visitors |
| `site_manager` | Site or facilities manager | Assigned sites |
| `regional_manager` | Multi-site manager | Assigned region |
| `compliance_audit_officer` | Compliance, audit | Organisation-wide read and assurance |
| `system_administrator` | IT or configuration owner | Organisation configuration |
| `platform_support` | Buffr staff (ops console only) | Platform; customer data only through a consented support session |
| `visitor` | Check-in subject | Own confirmation; not an admin account |
| `diginam_verification_adapter` | Service principal | Verification request fields only; no human access |

Regional manager has no meaning below multi-site scale and is not in the Owner-Operator bundle. The bundle is a permission union assigned to one identity. It weakens no boundary: every enforcement rule in §5.2 applies to it unchanged. About 91% of recorded Namibian businesses have ten or fewer employees and 63% are sole proprietorships (Namibia Statistics Agency census), so for most buyers one person covers several roles; the granular split exists for regulated and multi-site buyers.

Permission codes are dot-notation and grouped:

| Group | Codes |
|---|---|
| Visits | `visit.arrival.record`, `visit.departure.record`, `visit.roster.read_live`, `visit.history.read`, `visit.hosted.read_own`, `visit.access.approve`, `credential.validate` |
| Configuration | `site.configure`, `device.provision`, `retention.configure`, `integration.configure` (platform only) |
| Governance | `visitor.data_request.manage`, `legal_hold.manage`, `audit_log.read`, `evidence_pack.generate`, `access_review.manage` |
| Access administration | `role.assign`, `membership.manage`, `organisation.onboarding.manage`, `organisation.kyb.submit`, `support_ticket.customer.manage`, `support_access.grant.review` |
| Platform (ops only, never customer roles) | `platform.dashboard.read`, `platform.org_health.read`, `platform.incident.manage`, `platform.ticket.manage`, `platform.support_session.request`, `platform.support_session.mint`, `platform.support.break_glass`, `platform.billing.manage`, `platform.crm.manage`, `platform.kyb.review`, `platform.configuration.manage`, `platform.staff.manage`, `platform.device.manage`, `platform.onboarding.manage`, `platform.retention.manage`, `organisation.provision` |

### 5.2 Rules

1. Access is enforced in the API and database layer, never only in the interface. The admin sidebar may hide items; every endpoint re-checks role, scope and tenant.
2. Every record carries the tenant column (`organisation_id`); site-scoped records also carry `site_id`.
3. Every sensitive read, export, correction and deletion writes an immutable audit event.
4. Support access is exceptional, time-bound, customer-approved, reason-coded and fully logged (§5.4).
5. A site manager cannot reach another site by changing a URL or request.
6. Compliance officers have broad read and assurance access but no routine ability to alter visitor records.
7. A role change on an existing account, or splitting an Owner-Operator into separate roles, is a high-risk event with approval and audit evidence. Initial assignment at account creation is logged but does not trigger approval, which would create noise on every small-customer signup.
8. Privileged actions need a verified email. MFA is optional while an organisation is being set up and required for every customer user once the organisation is live (D-20). Platform staff need MFA from the first sign-in.
9. State-changing routes deny by default. Every POST, PATCH, PUT and DELETE declares a permission, is explicitly public, or carries an explicit own-account opt-out; missing policy metadata is a 403. Onboarding step completion and go-live need `organisation.onboarding.manage` and a verified email.
10. A user's own activation (email verification, MFA) never changes organisation-level state.

### 5.3 Separate front doors

Customers and Buffr staff sign in through different endpoints and receive tokens that work only on their own surface.

| Rule | Customer admin and kiosk | Platform ops console |
|---|---|---|
| Sign-in | `POST /auth/login`, `POST /auth/mfa/challenge/verify` | `POST /auth/platform/login`, `POST /auth/platform/mfa/challenge/verify` |
| Who may sign in | Any role except `platform_support` | `platform_support` only |
| Wrong kind of account | `401 Invalid email or password`, identical to a bad password (no enumeration) | Same |
| MFA | Required after go-live | Mandatory; without it a 15-minute enrolment-only token is issued |
| Token audience | `admin` (support sessions are also `admin`) | `ops` |
| Session length | 8 hours | 2 hours |
| Attempt limit per IP | 10 per 5 minutes | 5 per 15 minutes, separate bucket |
| Reachable routes | Any customer route; never a `platform.*` permission | `/platform/*`, `/type-definitions`, `/capability-status`, `/public/*`, `/health`, `/auth/me`, `/auth/platform/*`, `/auth/mfa/enroll/*` |

Customer accounts also lock for 5 minutes after 3 failed passwords in 5 minutes; a successful sign-in or password-reset confirmation clears the lock. Enforcement lives in the global session-audience guard, which runs after authentication and before tenant and RBAC guards; the rules are unit-tested and exercised over HTTP by `backend/scripts/ops-auth-verify.ts`.

### 5.4 Support access (break-glass)

Routine ops work (dashboard, CRM, billing, incidents) needs no grant. Acting inside a customer organisation needs one:

1. A platform user requests a grant for a target organisation with a reason code (`incident_response`, `customer_request`, `maintenance`). The grant is created inert, `pending_customer_approval`.
2. Every administrator of the target organisation is notified. An authorised user there (`support_access.grant.review`) approves or denies it. The requester can never approve their own request.
3. After approval the platform user mints a short-lived support-session token scoped to that organisation and acts in the admin app under the Owner-Operator permission set, with a persistent live countdown banner. Never a silent impersonation.
4. Every request re-verifies that the specific grant is still active, unrevoked and scoped to that organisation. Every write lands in a separate platform-support audit table with before and after values.
5. Revoking the grant makes a still-held token fail on its next request.

---

# Part 3: Surfaces and features

## 6. Surfaces

### 6.1 Operating model

Checkpoint is one connected product with five deployable parts.

| Surface | Primary user | Purpose | Cannot do |
|---|---|---|---|
| Visitor kiosk (`kiosk/`) | Visitor, contractor, delivery driver | Complete a private arrival or departure | Browse other visitors, edit policy, open reports |
| Public web check-in (`website/`) | Visitor on a phone | Same journey from the printed site QR | Show any other visitor's data |
| Organisation admin (`admin/`) | Owner-Operator, reception, host, site manager, compliance officer | Configure and run the organisation's visitor process | Change platform capability status |
| Platform ops console (`ops-console/`) | Buffr staff | Platform health, billing review, verification review, support, capability governance | Read customer data without a consented support session |
| API (`backend/`) | All of the above | One NestJS modular monolith holding every rule | n/a |

Principle: the organisation owns the visitor process; Checkpoint provides the control system behind it. Custom branding (logos, colours, welcome text, backgrounds) is not part of the product (D-18). Check-in and the kiosk use Checkpoint's own look and show the organisation and site names. The kiosk's privacy notice is the organisation's published `privacy_notice` policy. The customer is the controller of its visitor data and Checkpoint is the processor (§18.2).

### 6.2 Website

Marketing pages: Home, Platform, Pricing, About, Contact, Developers, Status, Privacy Policy, Terms and Conditions, and a branded 404. Operational pages are noindex and never in the sitemap: `/check-in`, `/check-out`, `/rate`, `/emergency`, `/induction`, plus the short links `/o/{token}` (sign out) and `/r/{token}` (rate), which redirect to the long pages.

- Home has one primary call to action, **Create account**, which goes to the admin registration page. The secondary link is **See pricing**. No page carries competing primary buttons.
- Capability badges (Not live, Targeted, Live) appear only on Status and in the Platform architecture section, read live from the public capability endpoint with a "Not live" fallback on any failure.
- Pricing shows the three plans only. Add-ons are in the ops catalogue.
- Privacy Policy states controller and processor roles, data collected, use, retention and deletion, security, subprocessors with their real processing regions, cookies and the route for rights requests. It never claims anything the schema and controls do not implement.
- Terms are scoped to the customer role model and plans and carry the processor terms of §18.2. Counsel review before publication is a pre-launch gate (**Owner decision**).
- Contact posts to the API (honeypot, throttling, durable record, acknowledgement email), never a third-party form embed.
- `/check-in?site=&ref=` loads site context from the API and fails closed with "Ask reception for a fresh QR" when the site or reference is missing, wrong or rotated. The page collects name, required phone, company, visitor type, host, purpose, optional email, ID and vehicle (only when the form allows them) and a required privacy acknowledgement. Extra fields live inside the encrypted personal-data envelope. A language picker (English, Afrikaans, Portuguese) and `?lang=` reload the effective form with translated labels.
- Missing hosts: "No hosts are configured for this site yet. Please see reception."
- Security headers on every route: frame denial, content-type sniffing off, strict referrer policy, camera/microphone/geolocation denied, and a baseline content security policy. A full script policy comes later in report-only mode first (D-12).

**Website audit, 2026-10-08.** Every marketing page, component and copy module was read against the claim rules (§1.4), the product and the value proposition (§1.5). Found and fixed in the same pass:

| Found | Fixed |
|---|---|
| The status page showed "Operational" for the API, admin and kiosk sync as typed words, whatever was running | Each row is a live check made when the page loads: the API and its database from `/health`, the admin by a request to it. A service that does not answer is "Unavailable" and one with a failing part is "Degraded", in the warning colour. The kiosk row is gone because nothing measures it (`lib/status.ts`, tested) |
| "Six ways in" and "Six ways to check in" counted channels the product does not count: the six listed items were not all channels, and the real set differs by plan and capability status (§2.1) | No count anywhere. Home says "Built for every visitor and every door"; Platform says "However they arrive, one encrypted record"; the Platform channel list names the site QR on the visitor's phone, which was missing from it, and marks SMS as an add-on. A test fails on any "N ways" or "N channels" |
| The value proposition (the privacy work is done for the customer) was on no public page | A "Privacy, handled" section on Home from `lib/copy/privacy-managed.ts`, six items each backed by something the product does (§1.5); About's "Privacy by design" became "Privacy done for you" |
| The footer ended with a hand-back disclaimer and a vague tagline ("Built for Africa's Compliance") | Replaced with what Checkpoint does for the customer; the tagline is gone. The Terms keep the controller and processor roles stated once |
| The sign-up steps, the pricing "How to start", the Contact steps and four page closes went straight from account to payment and omitted business verification, which gates going live (§7.5) | A "Verify your business" step before payment, naming the documents, in all of them; a test checks it comes before "Go live" |
| The Developers page promised "full OpenAPI publication and sandbox keys during onboarding" and a close said "Need sandbox credentials?"; neither exists (the public API reference is on the roadmap) | Says there is no public API reference yet and that an integration is agreed with the customer by email |
| The Terms listed "DigiNam verifier workflow" as an Assure feature, which §1.4 forbids until it is live | "DigiNam or e-ID verification where formally enabled for the organisation" |
| Decorative hero and closing photographs carried screen-reader text such as "Warm skyline suggesting Namibia-built compliance software" | Empty alternative text: a screen reader skips them |
| The contact address was typed into the Privacy Policy and Terms | Both read the same `PUBLIC_CONTACT_EMAIL` as the rest of the site |
| About said "retention runs on a schedule" and Home "Retention: Site policy" | "A retention period applies from the first day" and "Set for you". The wording describes the setting in force, not an enforcement that waits for the live switch (§8.5) |
| This section said the contact page posts to the API, but the page held only mail links, so no enquiry was ever recorded and nothing was acknowledged | A contact form posts to `POST /public/contact` (honeypot, throttle of five per five minutes, a durable record with its status log, an ops email and an acknowledgement to the sender). A throttled sender is told to wait, a failed send is told the address to write to. The topic list kept as a selector |
| Page copy was written into the page files | Lists, headlines and lead paragraphs of Home, Platform, About, Developers, Contact, Pricing and Status are in `lib/copy/marketing.ts` and `lib/copy/privacy-managed.ts`. The Terms and the Privacy Policy keep their text with the page: a legal document is versioned as a document (`legal-documents.ts`) and is not edited as interface copy |

`lib/copy/marketing.test.ts` now guards the public site: no "compliant", "certified" or "guarantee"; no hand-back wording; no channel counts; no sandbox, published API reference or tablet price; no emoji or em dash; verification before go-live in the sign-up steps. The Terms and Privacy Policy wording changed on 2026-10-08 (the roles stated once, Checkpoint's duties stated as duties) and the document versions were not bumped, so no customer was asked to re-accept; counsel reviews them (§31 item 6) and the version moves when they do.

### 6.3 Admin navigation

| Group | Items |
|---|---|
| Operations | Overview, Analytics, Visit Feedback, Front Desk, Visitors, Schedule, Calendar, Emergency Roster, Anomaly Alerts |
| Account | Billing, Business Verification, Support, Support Access |
| Site Experience | Sites and Zones, Hosts and Departments, Organisation Directory, Kiosk Experience, Capability Enablement, existing-system integration (CiMSO INNterchange), Site QR Codes, Host Escalation, Site Notices, Visitor Types and Forms |
| Devices and Credentials | Devices, Device Compliance Register, Credentials |
| Governance and Compliance | Compliance Dashboard, Privacy Requests, Legal Holds, Access Policies, Retention Policies, Audit Log, Evidence Packs, Scheduled Reports |
| Access Administration | Organisation Settings, Notifications, Users, Roles and Access, My Account |

Rules: every page shows its real table or panel with an inline "nothing here yet" row when empty (never a page swapped for a placeholder); a genuine 401, 403 or network failure replaces the page with an error state that says which; no demo data, no fake users, no static roles. Platform capability status and platform support never appear in the customer sidebar. The code was found on 2026-10-08 with five groups (the four Account items sat inside Operations, which held thirteen); Account is now its own group, so code and blueprint both have six, with the labels above.

### 6.4 Ops console

Overview (health and service levels against targets), Organisations (directory and per-organisation detail with rollup, CRM, billing, KYB, devices and sites tabs), CRM (pipeline board by deal stage), Billing (proof-of-payment review, payment register), KYB review, Devices, Sites, Capability Status (dual approval), Support Access, Incidents, Tickets (threaded with the organisation), Analytics (ETL health, arrival statistics, churn queue ranked by expected value), Search, Audit, Platform Staff, Configuration (notification templates, scoring weights). It runs on its own host and front door (§5.3), has no session replay, no local-variable capture in error reports, and scrubs organisation names, amounts, KYB, bank and support-session fields before anything leaves the app.

### 6.5 Kiosk

Native Android application in Kotlin and Compose, one visitor at a time. Screens: setup (base URL and site), staff sign-in, welcome, maintenance, privacy notice, manual and assisted check-in (form driven by the effective published form), QR scan (invitation), NFC check-in (when live), check-in success, visitor sign-out with rating, on-site roster, read-only device list, About and debug.

```text
Welcome
 ├── Tap NFC badge          (shown only when the capability is live and enabled)
 ├── Scan invitation
 ├── Check in on this screen
 ├── I need help            (assisted entry, always reachable)
 ├── Language
 ├── Privacy
 └── Accessibility
```

Within a journey: category, privacy notice, arrival channel, required fields, acknowledgement, access decision, confirmation or badge, then an automatic clear and return to welcome. Behaviour:

- **Privacy first.** The notice appears before any personal data is captured. QR and NFC paths are gated the same way. The notice is acknowledged server-side before the form opens.
- **Session privacy.** After an idle timeout (default 120 seconds, warning at 30) the session is cancelled, visible input cleared, unsubmitted drafts and pending outbox drafts deleted, and the welcome screen returns.
- **Staff roster is staff-only.** Tapping "Staff" always forces a fresh credential challenge, even on a device that is already signed in. The kiosk never becomes a public directory.
- **Offline.** Encrypted local capture and a transactional outbox drain on reconnect (§15.2). The banner states pending, syncing and failed honestly.
- **Maintenance mode.** A branded unavailable screen with the message and the assisted-entry direction. Five taps on the headline open staff sign-in for a technician.
- **Device list is read-only.** No activation control exists on the device.
- **Honest capability gating.** Tiles read `GET /capability-enablement/effective`, which intersects the platform status with the organisation's enablement. National e-ID and DigiNam have no tile until both are live.
- **Local-only attestation.** The Android Keystore signature is described as device-side attestation, never server-verified.
- **Accessibility.** Touch targets at least 48dp, large-text mode, language selector, plain language beside every icon, calm confirmation ("Check-in recorded. Your host has been notified.").
- **Contingency.** Each critical site keeps a secure non-paper continuity kit: privacy screen, spare MDM-enrolled tablet, power bank or UPS where justified, sealed single-use contingency cards, numbered tamper-evident envelopes, a printed emergency procedure, a named contingency owner and a controlled later-digitisation process. Never an open shared notebook.

## 7. Onboarding

### 7.1 North star

Within 10 to 15 minutes of verifying their email, an Owner-Operator has a working site, a published privacy-safe check-in form, a printed QR code and a visible test arrival. The product should be useful before any setup, defer configuration until it is needed, show honest progress, and prove value before asking for payment. The measure of success is not wizard completion. It is how quickly a new organisation can prove that a real visitor can check in safely.

### 7.2 Flow

```text
Sign up, accept Terms and Privacy Policy (recorded)
  -> confirm email (lands straight on setup; no MFA wall)
  -> Setup home: site, first host, standard check-in form, public QR, standard privacy notice and retention already exist
  -> three required steps on QR-first:
       1. Review your standards (accept Checkpoint's notice, retention and form, or edit them first)
       2. Try your check-in (scan the QR; the first-value moment)
       3. Go live (one confirmation; plan and business verification shown from the start)
  -> everything else is "Add later", reachable and never required
```

The checklist is state in the database, not a fixed wizard.

| Concept | Rule |
|---|---|
| Step codes | 13 `onboarding_step_code` values: `organisation_profile`, `site_hierarchy`, `hosts_departments`, `launch_route`, `notices_retention`, `visitor_categories`, `check_in_channels`, `risk_identity_approval`, `devices_mdm`, `flow_tests`, `role_training`, `cran_evidence`, `golive_approval` |
| Requirement per launch route | Each step is `required`, `auto`, `recommended`, `conditional` or `not_applicable` for the route, from one requirement matrix in the backend. QR-first requires `notices_retention`, `flow_tests`, `golive_approval`; the rest are `auto`, `recommended` or conditional. The kiosk route also requires kiosk configuration and device registration |
| `auto` | The system completes the step from defaults through the same services the screens use. The owner is told it is done and can review it. It reappears as a to-do if its evidence is later removed (for example the only site is deleted). Defaults never overwrite anything the organisation already has |
| Progress | Monotonic: current step is the first required incomplete step. Completion is idempotent. Optional steps can be skipped and the skip is logged. Updates use optimistic concurrency |
| Organisation status | Forward-only: `pending_email_verification`, `email_verified`, `in_progress`, `ready_for_golive`, `live`; `suspended` is ops-only. Backward moves happen only through audited ops routes with a reason. User activation advances the organisation only from early states |
| Authority | Step completion and go-live need `organisation.onboarding.manage` and a verified email. Invited staff without it see a waiting page, not the wizard |

### 7.3 The Checkpoint standard

Setup defaults come from this blueprint, not from ad hoc choices.

| Standard | Default |
|---|---|
| Visitor privacy notice | Organisation is controller, Buffr Checkpoint is processor. Lists exactly the data the default form collects; use limited to visitor access, host notification, audit and retention; encrypted in transit and at rest; rights requests go to the organisation; ID numbers, photos, health and biometric data are off by default |
| Check-in form | Full name, mobile number, company, optional email, who you are visiting, purpose category, and a vehicle registration field shown only when the purpose is vehicle. No ID or passport field |
| Retention | The "Standard" tier as a platform setting. The day count is a placeholder (365 days: one annual review cycle, then disposal) pending the owner and counsel (**Owner decision**). Disposal runs by default from creation (§8.5); the organisation need not accept anything for it to apply |
| Sector | For `healthcare`, `religious_faith_based` and `ngo_nonprofit` the standard form classes the purpose category as sensitive and the notice names special-category handling (`standard-defaults.ts`; a config rule, not a branch per sector) |
| Wording | "Checkpoint writes your privacy notice, sets how long records are kept and handles data requests for you. The wording is yours to adjust." No compliance claim and no hand-back disclaimer |

### 7.4 Agreements

The owner accepts the Terms and Privacy Policy at sign-up (a required checkbox; the API refuses an account without it) and the organisation standards at go-live or earlier. Each acceptance is an audit event carrying the document and version (`agreement.accepted:<document>:<version>`). Versions live in a platform setting so legal can bump one without a deploy; when a version changes the owner is asked to accept the new one, and go-live needs the current versions. A dedicated acceptance table is a schema decision for the owner; the audit rows can be migrated into one later.

### 7.5 Business verification and billing

Business verification (KYB) is business-identity verification at onboarding only: registration number, registered name, address and authorised signatory, optionally the registration document. Buffr staff review it by hand in the ops console (verify or reject with a note, single or bulk, with an email to the organisation). It is required only to activate a paid subscription; a design-partner trial does not need it. Proof of payment is the second human review. Both are visible from the first screen under "Before you go live", prefilled where possible, instead of surfacing as a refusal at the end.

**The pipeline (migration 0071).**

1. **Upload first.** The organisation uploads its founding statement (CC1), amended founding statement (CC2) or registration certificate, and the rest of the required pack (below). Other supporting documents can be added: a register of directors, a beneficial ownership declaration, a letter or resolution of authority. The file type is decided from the first bytes (PDF, PNG or JPEG), never the name; 1 KB to 10 MB at the API, 4.4 MB through the admin because Vercel caps a request body at 4.5 MB.
2. **Read on the platform.** The text layer of a digital PDF is used when there is one; a scan is rendered (bounded to 3,200 pixels on the long side, because a 4 MB scan can hold A0-sized pages) and read by Tesseract. Poppler and Tesseract run on the API through fixed argument lists, one document at a time, so nothing leaves the platform (D-37). If the tools are missing the document is simply not read and the person types the details.
3. **Suggest, never decide.** Registration number, business name, registered office, postal address, email, principal business, financial year end, type of business and the members with their shares are suggested with a confidence level. A scanned PDF is read twice: by Tesseract (good word spacing) and, as a second reading in its own short-lived process, by PaddleOCR (better at handwritten digits and emails, but it loses spaces between words, so it is used only for the registration number, identity numbers and email). On the two real filings tested, Tesseract alone misread a handwritten registration number (`24109322`) and an email (`BUFER.AI`); PaddleOCR read both correctly. A registration number is rebuilt from the digits near its label only when neither reading has an explicit `CC/yyyy/nnnn`, because the repair assumes a five-digit sequence and once turned a correct `CC/2006/0278` into a wrong `CC/2020/60278` before that rule. An identity number is suggested only when exactly 11 digits are read; boxed handwriting often drops one, and a number with a digit missing is ignored.
4. **Fill and edit.** The admin form fills only the empty fields, labels each as "from your document, please check", "hard to read, please check carefully" or "edited by you", re-fills on request, and checks every field against the server as the person types. A submission is refused with field messages unless the details are valid and a registration document is on file.
5. **Validate.** A registered office that is a street address and not a post office box, a first name and surname, 11-digit identity numbers (length and digits only; the structure is not published, so no birth date is ever derived), member shares between 0 and 100 and totalling 100 for a close corporation (members and shareholders only, not directors), a juristic member with its registration number, a known role, a phone number, a tax number and a registration date that is not in the future. Registration numbers are normalised (`CC/2024/09322`, `CC/2006/0278`, `2013/0456`) but an unusual format is only a warning: the BIPA field dictionary found no published specification, so a strict pattern would turn real businesses away. Warnings are for a person to look at, never silent passes. The organisation is always the caller's own, never taken from the request.
6. **Review.** Ops open one screen per submission, with ownership analysis against the configured thresholds (BIPA 25 percent or greater, FIA 20 percent or greater, kept separate, in the platform setting `kyb_rules`) that flags company holders to be traced to the people behind them, a checklist of what should be on file, and: the details with their issues and how each was entered, a comparison of what was typed against what the document says (match, differs, not read), every document with open, accept and reject (a reason is required to reject), and the history. Approval needs correct details and at least one accepted registration document; a submission already decided or replaced cannot be decided again.
7. **Ask or decide.** Ops can approve, reject, or **ask for information** naming the fields to correct, with a note. The organisation sees the request on its page, the named fields are marked, and it corrects them and resubmits. A resubmission replaces the open one (status `superseded`), so the ops queue holds one entry per organisation; a "waiting on the organisation" list shows requests that are out.
8. **Tell them.** Submitted, needs information, approved and rejected each send a branded email (`kyb_submitted_ack`, `kyb_needs_info`, `kyb_verified`, `kyb_rejected`). A failed send is logged with its reason rather than swallowed.

**Reading engine, and the upgrade path.** Today: Poppler plus the Tesseract command line, chosen because it is self-hosted, has no per-page cost and reads printed forms well. It struggles with handwriting and a poor photo, which is why every suggestion is confirmed and the reviewer sees the document beside the details. Options found by public search on 2026-10-08, not benchmarked here: PaddleOCR through ONNX runtimes for Node (`paddleocr.js`, `@gutenye/ocr-node`) for better handwriting and layout, still self-hosted; Docling as a self-hosted converter for complex layouts; `unpdf` (PDF.js for any runtime) if text extraction moves in-process; and hosted services (Mistral OCR, Azure Document Intelligence, Amazon Textract), which are rejected for now under D-37. The reader sits behind one service, so a better engine replaces it without touching the pipeline, the schema or the screens; compare candidates on a set of real, redacted filings before changing.

**What must be on file (owner decision 2026-10-08, D-38).** Verification requires proof that the business is registered with BIPA, who the owners are, a bank confirmation letter, a passport or identity document for each owner, and proof of address (a lease agreement or a utility bill). Good standing is not required and a tax good-standing certificate is no longer offered. In detail:

| Required | Rule |
|---|---|
| Registered with BIPA | A founding statement, amended founding statement or registration certificate is accepted by a person, and the reviewer confirms they checked the registration number on the BIPA register (there is no API, so the approval records "Registration checked on the BIPA register by the reviewer") |
| Who the owners are | At least one owner (a member, shareholder or proprietor) for every business, each with their share, phone number and email. A company also lists its directors. A company that holds a share is traced to the people behind it. An owner is anyone at or above the FIA threshold (20 percent) |
| Bank confirmation letter | One accepted document |
| Passport or identity document of each owner | One accepted document per owner at or above the FIA threshold, and at least one; a certified copy is best, certified within the last 6 months |
| Proof of address | One accepted document: a lease agreement or utility bill |

All of it must be uploaded before the pack can be sent, and every item accepted before approval. Approval is one submission at a time; bulk can only send back. Owner phone numbers and emails are held as protected envelopes with the members (§14.3) and are read from the document where it carries them (a CC1 or CC2 gives each member's email).

**Coverage against the BIPA field dictionary.** `kyb-requirements.ts` registers all 47 requirements the dictionary draws from BO1, CC1, CC7, CM2, CM5, CM22, CM29, CM31, CM44C and CM46, and says where each is met. Measured by `kyb-requirements.spec.ts`: 35 are met (20 by a captured field, 8 by a document type, 3 by configuration, 4 by validation) and 12 are out of scope, each with a stated reason. That is 74.5 percent of the dictionary and 100 percent of what the owner requires. The 12 are the particulars of the people behind the business that only a BIPA beneficial-ownership filing needs (previous name, birth details, nationality, addresses, tax number, workplace, residency), the eight BO1 ownership types and the 7-day change filing (the customer's own duty to BIPA), country of incorporation (every customer is Namibian), appointment dates, FIC registration (accountable institutions only), and sanctions and Prominent Influential Person screening (AML monitoring, which this onboarding verification deliberately does not do). Collecting the person particulars would add personal data of third parties for no use Checkpoint has, against the data-minimisation promise (§1.5); it is an owner decision, not an omission (§31 item 22). A test fails the build if a field the register claims is not in the submission contract.

Stored: each document in the artifact store (Neon Object Storage in production) with its SHA-256; the address, signatory, members and the text read from a document as protected envelopes (§14.3); one status log per submission and one per document. Verification of a registration against the BIPA register is not automated: there is no public API, so a reviewer checks it by hand (**Owner decision**: a BIPA data arrangement, §31).

### 7.6 Launch route

The route is a real decision, asked after the first site exists and before channel configuration, shown as a comparison with consequences.

| QR-first (recommended) | Dedicated kiosk |
|---|---|
| Printed QR, visitors use their own phones | Android tablet at reception |
| No tablet required | Offline capture, optional NFC fast lane |
| Includes assisted check-in | Requires device setup and governance |
| Fastest route to launch | Best for high-volume doors |

"You can change this later. Your records, policies and staff setup stay the same." QR-first carries the Recommended marker because it is the Core path; the kiosk card never reads as the lesser option. While no site exists the route card renders blocked and names the prerequisite.

### 7.7 Statuses and the step template

Four visible statuses: **ready** (primary action), **blocked** (muted, with the prerequisite and its fix), **complete** (check and "Review"), **not needed or add later** (neutral explanation). Not-applicable work is explained and never hidden: under QR-first the kiosk device and CRAN evidence cards stay visible with "Not needed for your QR-first launch. Choose the kiosk route later if your site needs a dedicated visitor tablet." No control is disabled without its reason and fix.

Every step page has the same template: why it matters, what you will need, what "done" means, the task, "Save and return". A blocked variant names what is missing and offers the action that clears it. No evidence key, UUID, step code or schema term appears on screen; a test greps rendered copy for them.

### 7.8 Test arrival

Test arrival is the activation event, not a checkbox. "Create test visit" records a visit on the `onboarding_test` arrival channel at the organisation's site and host. It appears in the Front Desk roster, is excluded from analytics, anomaly rules, reports and billing counts, stays open until the owner checks it out, and satisfies the flow-test evidence on creation.

### 7.9 Launch acknowledgement

One owner acknowledgement is never presented as organisation-wide staff training. The Owner-Operator launch acknowledgement ("I understand the visitor flow") is given on the go-live confirmation and completes `role_training`. The competence matrix of §21.4 is a separate post-launch requirement that this acknowledgement does not satisfy. Contractor safety induction is a different product workflow (§8.6).

### 7.10 Waiting page and collaboration

- **Invited staff** see "Your organisation is being set up", what happens next in three steps, a quiet refresh every 45 seconds, a manual Check status button and Sign out. Never a dead end and never a step they cannot complete.
- **Two admins** setting up at once: the API's conflict response carries who changed it and when, and the UI shows "Setup changed by {email} a moment ago. We refreshed this page with the latest launch readiness." The actor is shown by email because there is no display-name column. A second advisory notice says when another admin is editing a step (an in-process presence map, valid for a single API instance). Never "version conflict".

### 7.11 UX acceptance and metrics

| Journey | Criterion |
|---|---|
| QR-first owner | Creates site, QR and test arrival without meeting kiosk or CRAN requirements presented as required |
| Blocked action | Every blocked or disabled action names its prerequisite and fix |
| Test arrival | The user can see and close the test visit |
| Invited host | Never sees a setup step they cannot complete |
| Multi-admin collision | Human explanation and refreshed state, never a raw 409 |
| Mobile | The readiness home works at 320 to 375 px with no card-grid overload |
| Performance | Navigation shows a skeleton or pending state within 100 ms |

Ten north-star measures, from consent-gated events with codes and timestamps only: first site created; first active public QR; first successful test arrival; time from verified owner to first test arrival; required-step completion by launch route; blocked-step frequency by blocker; launch-route distribution; go-live conversion; waiting-page resolution; p95 click-to-visible-feedback.

## 8. Forms, policies and retention

### 8.1 Visitor categories

A visitor category determines fields, risk level, verification, approval workflow, retention rule and notifications. Seeded `visitor_type` values: general, pre-registered, contractor, delivery, interview candidate, government official or VIP, healthcare visitor, event attendee, temporary staff, restricted-site visitor. Purposes are a configurable high-level category (business, personal, delivery, interview, government, medical, maintenance, event, meeting, vehicle, other), never free text by default.

### 8.2 Form builder: privacy by design

The platform does not let an organisation build an unlimited data-harvesting form.

| Field class (`field_class`) | Examples | Default |
|---|---|---|
| core | Host, arrival time, check-out time, visitor type | Available |
| basic | Name, phone, organisation | Configurable |
| sensitive | Vehicle registration, contractor employer, zone | Only for justified types |
| high_risk | National ID, photo, health, biometric | Off; compliance approval required |
| verification_evidence | Verification outcome, credential reference | Result and reference only |
| free_text | Reason for visit, staff notes | Restricted |

- Field types: text, textarea, single choice, multiple choice, date, boolean, phone, email. Choice options live in the validation schema.
- Visibility and requirement rules are JSON on the field row: `visibility_rule` (empty means always visible) and `validation_schema.requiredIf`, with conditions `equals`, `in` and `notEmpty` joined by `and` or `or`. One shared evaluator is used by API, website and kiosk; the server is authoritative.
- Translations live in `check_in_form_field_translations` (label and help per language); the default stays on the field.
- The builder is drag-and-drop with a field library and `custom_<slug>` fields, a classification picker that warns on high-risk classes, a visual rule builder and per-field translations. Create makes a draft; publishing is explicit.
- **Publish gate.** At least one field. Any `high_risk` or `verification_evidence` field needs a non-empty `approval_reference`.
- **Check-in gate.** The server resolves the effective published form for organisation, site and visitor type; rejects unknown field codes and a mismatched form version; enforces required and `requiredIf` on visible fields only; applies length, pattern and option rules; persists only validated answers. With no published form, clients show a static fallback and the server invents no allow-list.
- An optional admin-only AI assist (§12.3) can suggest and translate field definitions. It never sees visitor data and never publishes.

Special-category risk (draft Data Protection Bill s7, §18.3): the visit itself can reveal health or religious belief at a clinic or a faith-based organisation. For `healthcare`, `religious_faith_based` and `ngo_nonprofit` organisations the purpose and free-text fields default to restricted, the privacy notice names the special-category handling, and a data protection impact assessment is triggered before large-scale use (§18.3).

### 8.3 Returning visitors

A visitor proves they own a credential or reference; they never search a list of previous visitors. Approved methods: NFC badge, pre-registration QR, a visit reference with a one-time code, staff-assisted lookup, DigiNam where enabled. A public name lookup would reveal who visits a bank, clinic or law firm, and presence there can itself be sensitive.

### 8.4 Policies and acknowledgements

Privacy notices, safety policies and induction texts are versioned documents (`visitor_policy_documents`, `visitor_policy_versions`) with a content hash and language. An acknowledgement records the policy version, language, display and acceptance times, method, channel, device, site, visitor reference and content hash.

| `acknowledgement_method` | Meaning |
|---|---|
| `kiosk_tap` | On-screen tap on the kiosk |
| `phone_tap` | Acknowledged on the visitor's own phone |
| `printed_form` | Printed form, logged by staff |
| `verbal_witnessed` | Spoken, witnessed by staff |
| `digital_signature` | Reserved for a future recognised-signature path (§25.3) |

`legal_basis_code` distinguishes a **mandatory notice** (ordinary visitor management, not revocable consent) from **optional consent** (marketing, optional photo use, optional survey, optional analytics), which is genuinely revocable. A visitor forced to "consent" as a condition of entry has not given free consent (draft Bill s5(7)).

### 8.5 Retention, legal holds and data requests

- **Retention policies** are versioned and never edited in place once a visit references them; a change is a new row with the next version. A site policy overrides the organisation default. The public-sector tenant policy is the organisation default policy for organisations whose sector is `government`: it is a row in the same table, never a separate table, and no code branches on sector.
- **Retention tiers by visitor category:** Standard (general, appointment), Short (delivery), Restricted (interview), Special (VIP or government official), contract policy (contractor) and security policy (restricted-zone visitor). The blueprint specifies no day counts; they are settings.
- **Platform default retention.** A visit with no site or organisation policy is governed by the platform default (`STANDARD_RETENTION_DAYS`, 365, in the `organisation_defaults` setting), recorded with its `retention_policy_version`. Every organisation is therefore covered from creation, whether or not its owner has accepted the standards.
- **Disposition worker** (on by default, D-35): disposes visits past the effective policy, skips active legal holds (unreadable hold scopes fail closed), crypto-shreds personal data of subjects with no live visits or credentials, redacts the notification outbox (§9.1), reconciles candidates equal to disposed plus held, and writes an audit event per run. `RETENTION_DISPOSITION_ENABLED=false` turns it off; `RETENTION_DISPOSITION_MODE` is `dry_run` (count only) or `live` (default). Because disposal is irreversible, a production rollout starts in `dry_run`, the counts are reviewed, and only then is `live` set (D-10 as amended). **Production record:** three dry-run passes on 2026-10-07 and 2026-10-08 covered five organisations each and found 0 candidates (no visit was old enough to reach 365 days); the owner approved the switch and production has run in `live` since 2026-10-08.
- **Legal holds** have precedence over scheduled deletion; current state is the latest status event (no mutable `active` flag).
- **Data requests** (`dsar_request_type`: data export, correction, account deletion; statuses pending, in review, completed, rejected) route to the Compliance or Audit Officer. An export is packaged (JSON, CSV, manifest), scoped to the one subject through the keyed phone lookup (never the whole organisation), and audited. Target response: within one month of receipt, extendable once by a further month with reasons (draft Bill s8(3)). The clock is derived from the status log, never a stored field: received is the first log row, due is one month later, and a log row whose reason starts `extension:` adds one month (`POST /dsar/:id/extend`, allowed once, reason required). The list shows `receivedAt`, `dueAt`, `daysLeft` and a state (on time, due soon, overdue).
- **Account deletion** is a DSAR of type account deletion, so it inherits review, identity verification and audit.
- Evidence of disposal is the audit trail plus the run record; the satisfaction rating and PII-free analytics facts survive disposal because they hold no personal data.

### 8.6 Site notices and QR types

Emergency information and contractor induction are stored as versioned, published policy documents (an optional per-site text overrides the all-sites text). The public pages return the site name and the notice text only.

- **Induction acknowledgement** needs a valid induction QR for the site, an open contractor visit at that site matched by phone, and the currently published version (a version replaced while the contractor reads is refused with 409 and reloaded). One acknowledgement per visit and version; a general visitor is refused with the reason. There is no expiry per contractor. A full induction workflow (courses, quizzes, expiry per person) is a roadmap item (§30).

| QR type (`site_qr_type`) | Purpose | Control |
|---|---|---|
| `public_site_checkin` | Opens the phone check-in | Site-bound reference and active rotation; no visitor identity in the code |
| `pre_registration` | Matches one scheduled visit | One-time, short-lived opaque token (a signed link, not a site reference) |
| `sign_out` | Closes one visit | Personal signed link, 24 hours, one visit (never a shared QR) |
| `emergency_info` | Non-sensitive instructions | No visitor data |
| `contractor_induction` | Opens the approved induction | Site scope, rotation expiry, acknowledgement required |
| `device_support` | Lets a technician identify a device | Not a site reference: a link to an admin page behind sign-in and `device.provision`, so the printed code reveals nothing (D-28) |

A static public QR that is photographed and reused may begin a controlled journey only. It never proves identity, grants access or reveals visitor data. Rotation is append-only: a new row per rotation, never an update.

## 9. Notifications and messaging

### 9.1 Outbox and events

Every message is written first and delivered second.

- `NotificationsService.send()` persists the message in `notification_delivery_instructions` with status `pending` and returns. A worker drains due rows on an interval (`NOTIFICATION_DISPATCH_INTERVAL_MS`, default 15 seconds), moves them to `sent` or back to `pending` for retry, and appends every transition to `notification_delivery_status_events`.
- Retry uses exponential backoff (30 seconds, doubling, capped at 1 hour), up to 5 attempts, then `failed`. A failed row shows in the ops integration-health panel.
- Channels are `email` and `sms` (a `notification_channel` config list). An unknown or retired channel is refused with 400.
- The one in-process domain event is `visit.checked_in`: the visit service emits it after commit and the notification listener enqueues the host alert. It is in-memory decoupling only. No message broker is used: Postgres as the queue fits single-service scale. If volume or multiple API instances outgrow one polling worker, swap the poller for `SELECT ... FOR UPDATE SKIP LOCKED` or a real queue; the outbox table shape does not change.
- **Outbox redaction.** After `NOTIFICATION_REDACTION_DAYS` (default 30) from `sent` or `failed`, the retention worker overwrites `message`, `html`, the attachments reference and `recipient_reference` with a redaction marker, so sign-out and rating link tokens do not outlive their use. Status events are kept (they hold no recipient or text). Dry run counts only; a repeat run finds nothing to redact (D-36).
- A missing provider never fails a check-in. Delivery is recorded honestly as `failed`, never faked as `sent`.
- The roster stream (`GET /visits/roster/stream`, server-sent events, ids only, tenant-filtered) triggers Front Desk and Emergency refresh. It uses an in-process emitter, so it is valid for one API instance (D-11); with more, move to a shared bus.

### 9.2 Email

- **Sender.** All mail goes over SMTP through the Buffr mailbox (`team@buffranalytics.com`, Namecheap Private Email, port 465, TLS), the Buffr Analytics team mailbox (D-22). Resend remains only as a fallback (`EMAIL_TRANSPORT=resend`, or no SMTP credentials). From is `Buffr Checkpoint <team@buffranalytics.com>`; replies go to the same address. Every message carries `Auto-Submitted: auto-generated`, a Message-ID on `buffr.ai`, no tracking pixels and no rewritten links. Subjects and recipients are cleaned so a typed value cannot add a header.
- **One mailbox.** The product domain `buffrcheckpoint.com` has no mail. The Checkpoint mailbox is `team@buffranalytics.com` (Namecheap Private Email, `mail.privateemail.com`, port 465, TLS): sender, reply-to and every published contact, security, privacy and legal address. No `@buffrcheckpoint.com` address is published, because it would bounce. The address is a setting, not code (set in production on 2026-10-07): on the API `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `PUBLIC_CONTACT_EMAIL` and `CONTACT_OPS_EMAIL`; on the website and admin `NEXT_PUBLIC_CONTACT_EMAIL`; the static `security.txt`, privacy and terms pages and `SECURITY.md` carry it as text. Role aliases (`security@`, `privacy@`, `legal@`, `billing@`, `support@`) can be added as aliases of this mailbox when wanted, and public copy switches to them then (**Owner decision**). The inbox agent, if pointed at this mailbox, must skip security, privacy and authentication aliases; it is not verified that the original alias survives in delivered headers, so test each alias first.
- **Send budget.** At most `EMAIL_MAX_PER_HOUR` (60) and `EMAIL_MAX_PER_DAY` (300). Over budget, mail waits for the next window and is not counted as a failed attempt. Raise the caps only after confirming the plan limits with the mailbox provider. Bulk visitor mail would need a transactional provider.
- **Templates** are plain text in `platform_notification_template`, editable by ops. The layout reads the shape already in the text: a lone link becomes a button, consecutive `Label: value` lines a facts table, `1)` or `-` lines a list, "If you did not..." a security callout. Plain text is canonical.
- **Personalisation and signature.** "Hello Maria," when a name is known, otherwise "Hello,". Customer mail is signed "Kind regards," then the part of Buffr Checkpoint writing (the team, Billing, or Support). Internal alerts to ops have neither greeting nor signature. Checkpoint identity only (mustard `#E0B000`, charcoal `#111111`, light `#F5F5F5`); the black wordmark travels on its own light plate so dark mode cannot make it illegible. Organisations cannot customise mail.
- **Catalog.** `template-catalog.ts` lists every email: trigger, recipient, action label, signer and whether anything sends it. A test keeps catalog, seeded templates and source codes in step, so an email cannot be added without being described.

| Category | Examples (recipient) |
|---|---|
| Account security | email verification, password reset, password changed, account lockout, MFA enabled (user); platform staff invitation |
| Onboarding | organisation welcome (owner) |
| Billing | invoice issued and reminder, proof received and rejected, payment confirmed, receipt, subscription activated, suspension warning, credit note (organisation admins; PDF attached where stated) |
| Verification | KYB submitted, verified, rejected (organisation) |
| Visitor flow | host visitor arrived and host escalation (host or contact), website enquiry acknowledgement (enquirer) |
| Support | ticket acknowledgement and reply (requester), support access request (organisation admins) |
| Ops internal | new organisation, contact enquiry, proof received (no greeting, no signature) |
| Reports | ops daily summary, site manager weekly digest, board and compliance monthly pack |
| Visitor, optional | pre-registration invitation, visit receipt, sign-out thanks |

- **Visitor mail rule.** A visitor is emailed only at an address they typed (check-in form) or a host typed for them (pre-registration). The pre-registration address is used once and not stored. The receipt links to a signed personal sign-out; the thank-you links to the rating page. Each message says why it was sent.
- **Switches.** An organisation can switch off the optional visitor emails (`GET/PUT /notifications/preferences`, permission `site.configure`; stored as an audited setting). Security, billing and verification mail cannot be switched off.
- **Support replies.** When staff comment on a ticket the requester is emailed, signed "Buffr Checkpoint Support". A named-staff signature needs a display-name column that users do not have; where that lives is an owner decision.
- **Host search** for the manual picker: `GET /hosts?siteId=&q=&limit=`, ranked prefix then contains then department, accent and case insensitive, capped at 100.

- **Customer breach notice.** `customer_breach_notice` is a seeded template (migration 0069, always sent, signed by Support). `POST /platform/incidents/breach-notice` (platform staff only, `platform.incident.manage`) sends it to one customer's administrators and writes an audit event; staff decide, nothing sends automatically, so notifying customers is a reviewed template, not copy drafted under pressure (`docs/incident-response.md`).

### 9.3 SMS (add-on, billed by use)

SMS mirrors the first two visitor emails and the third once pre-registration captures a mobile number (the template exists; the capture does not).

- **Provider.** BulkSMS Namibia (a Namibian credit gateway for MTC and TN Mobile). `POST /api/v1/send {to, message}` answers `{success, messageId, to, creditsUsed, creditsRemaining}`; `GET /api/v1/balance`; `X-API-Key` header. 1 credit is 1 SMS and credits do not expire. The provider publishes no API reference, and delivery receipts, sender-ID rules and rate limits are undocumented: ask the provider before relying on them.
- **Templates** (`platform_notification_template`, channel `sms`, ops-editable): visit receipt, sign-out thanks, pre-registration invitation.
- **Content rules**, enforced in code and tests: neutral (organisation name, reference and a link only; never a visitor's name, ID, host or purpose, because a text shows on a lock screen); one segment (at most 160 characters, GSM 7-bit only, accents folded, emoji dropped); only the organisation name is ever shortened to fit, never a link or reference; if it still does not fit, nothing is sent.
- **Short links.** A fixed-width 41-character signed token (kind, visit id, expiry, 72-bit signature) at `/o/<token>` (sign out) and `/r/<token>` (rate). A sign-out token is never accepted as a rating token. Same 24-hour life and single-visit scope as the long links.
- **Pricing.** Email costs us nothing. Each text costs N$0.30 to N$0.50 from the provider, so the organisation pays **N$1.00 per text sent** (setting `sms_unit_price:default`, per-organisation override `sms_unit_price:<organisation id>`). The `sms` add-on has no monthly fee; a month with no texts costs nothing.
- **Four gates.** The API has `BULK_SMS_API_KEY`; the `bulksmsnam` arrangement is active; the `sms_contact_confirmation` capability is approved `live` (dual approval with evidence); the organisation has the `sms` add-on attached. Per text, also: the organisation's own switch, a month under the safety limit (default 1,000 texts, `sms_limit:default` or per organisation; it stops a runaway and is not an allowance), a Namibian mobile number and a one-segment message. A refused text never reaches the provider and spends no credit; the refusal is recorded (`addon_not_active`, `monthly_limit_reached`).
- **Billing.** `POST /platform/billing/sms-usage-invoices {organisationId, month}` invoices one finished month: texts handed to the provider times the price. The invoice number is fixed per organisation and month (`SMS-<org>-<YYYYMM>`) and unique, so a repeat or concurrent call returns the existing invoice; a month that has not ended is refused; a month with no texts creates nothing. Months run on Windhoek time. Counting comes from the immutable `sms_contact_confirmation_events` log, so invoice and log reconcile. A scheduler (`SMS_USAGE_INVOICING_ENABLED`, every 6 hours, last three finished months, one organisation failing never stops the others) runs the same sweep. The recipient is stored only as a keyed hash; the text is never stored.

### 9.4 Anomaly alerts

Two rules run on every check-in: `repeat_phone_window` (same phone lookup HMAC N times within M minutes at one site; default 3 in 30) and `after_hours_restricted_zone` (check-in to a tier 3 or above zone outside visitor hours; default 07:00 to 18:00 site-local). Per-site overrides sit in `site_anomaly_rule_configurations`; a site without a row uses the defaults, so no site is unmonitored. `anomaly_alert_events` is append-only and holds references only (rule, site, visit id, lookup HMAC, non-personal context). One alert per subject per window. Staff acknowledge, dismiss or reopen an alert through `anomaly_alert_status_events`; the current state is the latest row, none meaning open. Alerts never block a visitor (§3.2), appear on the admin Anomaly Alerts page for the organisation's own staff (site-scoped users see only their site), and are not emailed (D-15).

### 9.5 Scheduled reports

| Report | Recipients | Format | When (Africa/Windhoek) |
|---|---|---|---|
| Ops daily summary | Ops inbox | Email plus CSV of integration checks | Daily from 07:00 |
| Site manager weekly digest | Verified users holding `owner_operator` or `site_manager` (default) | PDF | Mondays from 07:00, previous week |
| Board and compliance monthly pack | Verified users holding `owner_operator` or `compliance_audit_officer` (default) | PDF with audit and retention figures | 1st of the month from 07:00 |

Recipients are roles resolved to verified users of the same organisation at send time, never visitors, hosts or typed addresses (D-16). Addresses on reserved test domains (RFC 2606 and 6761 names) are skipped. Content is totals only from fact tables and counts. `scheduled_report_run` claims each report, organisation and period once, so a restart or second instance never sends twice (D-17); an organisation with no verified recipients is recorded as `skipped` with the reason. Organisations switch reports off or change recipient roles on the Scheduled Reports page (`membership.manage`). The worker is opt-in (`SCHEDULED_REPORTS_ENABLED`).

## 10. Analytics and reporting

### 10.1 Analytics pipeline

Customer reporting and platform statistics read from PII-free rollups, never from visitor rows.

| Table | Holds |
|---|---|
| `visit_daily_fact` | Check-ins, check-outs, offline captures and dwell totals per organisation, site, local date, visitor type, arrival channel and purpose |
| `visit_hourly_fact` | Check-ins per organisation, site, local date and local hour |
| `visit_survey_daily_fact` | Survey ratings rolled up by site and local date |
| `analytics_etl_run` and `analytics_etl_run_status_log` | One row per refresh (kind, window, counts, status); run history is never edited after it finishes |

Statuses (`etl_run_status`: running, succeeded, failed) and kinds (`etl_run_kind`: incremental, backfill) are config rows. Fact rows are derived and recomputed in place.

1. The worker runs an incremental refresh 60 seconds after boot, then every `ANALYTICS_ETL_INTERVAL_MS` (default 1 hour).
2. The window is the last `ANALYTICS_ETL_LOOKBACK_DAYS` local days (default 3), widened to cover any day touched by a visit accepted since the last successful run (late offline syncs).
3. One batch in one transaction: zero the window's fact rows, then upsert fresh aggregates. Dates use each site's `sites.timezone`, so a 01:00 Windhoek check-in counts on that Windhoek day.
4. **Reconciliation.** Raw non-deleted visits in the window must equal `sum(check_in_count)` in `visit_daily_fact`; any difference fails the run with both numbers recorded. The survey rollup reconciles the same way.
5. Ops can rebuild all history (`POST /platform/analytics/etl-runs/backfill`, `platform.analytics.manage`). Backfills count live visits only, so disposed history drops out.

Cross-organisation statistics suppress any cell under `ANALYTICS_MIN_CELL` (default 5), returned as null with `suppressed: true`, never zero (D-09).

**Forecast.** Mean of the same weekday over the last 8 weeks, a band of plus or minus 1.96 standard deviations of the backtest residuals, and MASE over the last 28 days against a seasonal-naive baseline. Under 28 days of history the endpoint returns `insufficient_history`. Days before the scope's first recorded day are never zero-filled.

### 10.2 Exports, evidence and surveys

- **Exports** (CSV and XLSX): roster, visit history, analytics, audit log, payment register. All go through one helper and are audit-logged. Text cells starting with `=`, `+`, `-` or `@` are prefixed so a visitor-supplied name cannot run as a formula (D-13). Audit export includes the hash-chain columns so the chain can be verified outside the product.
- **Roster search and export.** `GET /visits/roster/search` takes a real date range with keyset pagination over `(timestamp, id)`, never OFFSET on a growing append-only table, and `GET /visits/roster/export` returns CSV or XLSX. "Everyone who visited last Tuesday" is answerable in minutes.
- **Evidence pack.** JSON from `GET /evidence/:id/download`, stored through the artifact store. It holds the RBAC matrix, retention report, audit extract (most recent 500 events, time-ordered) and an optional visitor-access extract for a date range. `GET /evidence/:id/report` renders an auditor-readable HTML view, printable to PDF, with visits in period, audited actions, people with access, retention and an audit hash-chain check. The chain check treats a row as linked when its predecessor hash matches any hash in the extract (concurrent requests can share a predecessor: a fork, not tampering). The footer prints the SHA-256 of the exact JSON. There is no server-rendered PDF.
- **Privacy posture.** Sections 5 and 6 of the report state the retention policy in force, the last disposal run and its counts, legal holds, the data-request clock summary, the outbox redaction period, and the subprocessor and processing-region list. The list is one typed constant (`common/privacy/subprocessors.ts`) that also feeds the Privacy page, so the two cannot drift. Regions not yet confirmed with a provider are shown as unconfirmed, never guessed.
- **What a pack for regulated clients should grow to include:** architecture diagram, data-flow map, device inventory, patch and MDM compliance, offline-sync exceptions, incident register, vulnerability summary, supplier register, disaster-recovery test evidence, identity-verification configuration status, annual control-effectiveness report (§21.2).
- **Satisfaction survey.** Offered only at visitor sign-out (web `/check-out`, kiosk sign-out screen with Skip and a 20-second return), never at check-in and never on emergency sign-out. A rating of 1 to 5 stars with an optional comment of up to 1,000 characters. The comment is stored only as an encrypted envelope; figures need `visit.history.read`, comments need `site.configure` (D-27). Proof of the visit is a signed survey token (24 hours, records the channel), so no table or visitor data is needed. One response per visit; a repeat is accepted and ignored. The response holds no personal data outside the envelope, so the rating survives visit disposal. Target: average at least 4.0 over 28 days, judged only with 10 or more ratings.

### 10.3 Dashboards and targets

| Dashboard | Audience | Content | Refresh |
|---|---|---|---|
| Front Desk | Reception | On site now, pending approval, expected today, check-out actions | Live |
| Overview | Admin | Four KPIs, 90-day visit activity, on-site roster preview | Live |
| Analytics | Admin | KPIs, arrivals trend with forecast band, busy-hours heatmap, channel and visitor-type shares | Hourly |
| Compliance | Compliance officer | Retention actions due, open data requests with due-soon and overdue counts, privileged-access events, offline-sync exceptions | Live |
| Device register | System administrator | Model, CRAN status, MDM status, firmware, review date | Live |
| Emergency roster | Security | On site by site and zone, host, roll-call status | Live |
| Ops | Platform support | Health, churn queue, CRM, billing, KYB, ETL health, arrival statistics | Live and hourly |

Layout rules: one chart, one message, with a finding as the title; actual before forecast; at most four KPI tiles in a row with one primary metric; mix KPIs, chart and table in a viewport; top-down reading order; group by task; five to seven panels per screen at most; ranked horizontal bars, never pie charts. Each analytics panel states its question, a finding computed from the data, why it matters and the next step (copy in `admin/src/lib/copy/analytics.ts`). Charts show a confidence band or range where a model output is shown, cite their source, and say plainly when data is insufficient.

Service-level targets (targets, not measured results; the ops overview shows each against its live value, and "no data" is never shown as met):

| Area | Metric | Target |
|---|---|---|
| Visitor flow | Check-in completion | 90% or more |
| Visitor flow | Median check-in duration | 2 minutes or less |
| Visitor flow | Host notification delivered | 95% or more (ops overview uses 98% over 4 weeks) |
| Visitor flow | Offline sync success | 99% or more |
| Compliance | Retention actions within policy window | 100% |
| Compliance | Data request resolution | within one month |
| Compliance | Audit events with hash chain intact | 100% |
| Compliance | Devices approved before activation | 100% |
| Platform | API availability | 99.9% or more |
| Platform | Analytics reconciliation difference | 0 |
| Platform | Open incidents | 0 |
| Satisfaction | Average rating, 28 days | 4.0 or more with at least 10 ratings |

Targets live in `ops-console/src/lib/targets.ts`; change one there, not in a page.

### 10.4 Reports table

| Report | Audience | Format | Frequency |
|---|---|---|---|
| Visitor roster | Reception, security | Live screen, CSV, XLSX | Real time |
| Visitor history | Site manager, compliance | Date-range search, CSV, XLSX | On demand |
| Compliance dashboard | Compliance officer | Live screen | Live |
| Device compliance register | System administrator | Live screen | Live |
| Emergency roll call | Security | Live screen | Real time |
| Evidence pack | Auditor, regulator | JSON and HTML report | On demand |
| Analytics | Admin | Live screen, CSV, XLSX (aggregates, audited) | Hourly |
| Platform analytics | Ops | Live screen | Hourly |
| Scheduled reports | Role-resolved users | Email, PDF | Daily, weekly, monthly |

No machine-learning model runs in production. The health score is a transparent weighted scorecard (visit volume trend, admin login recency, notification failure rate, device offline rate) with its inputs stored on each snapshot, ranked by expected value (risk times monthly revenue). A trained model needs labelled churn history first and must follow CRISP-DM, holdout evaluation by precision and recall, and the explainability and graceful-failure rules of §33.5.

## 11. Billing and payments

### 11.1 Plans and catalog

Plans and add-ons share one catalog table (`subscription_catalog_item`) with `kind_code` `plan` or `addon`, `monthly_amount NUMERIC(15,2)`, `currency_code`, `included_sites` and `extra_site_monthly_amount`. Ops read the full catalog (`GET /platform/billing/catalog`); `GET /public/pricing` returns plans only. MRR on `organisation_subscription` is computed in application code from plan code, site quantity and attached add-ons (price snapshot on `organisation_subscription_addon`), never from a client-supplied amount. Site creation is refused once active sites reach the licensed quantity; before the first subscription there is no cap. Site quantity changes are logged (`organisation_subscription_site_quantity_log`). Plan names, prices and entitlements are in §28.

### 11.2 Default payment: EFT and proof of payment

Invoice with the bank details and the invoice number as the payment reference; customer pays off-platform; uploads proof of payment; platform support reviews and confirms; a `payment_reconciliation_log` row records the outcome. Invoice bank details come from `BILLING_BANK_*`; if missing the API logs an error at start-up, ops integration health shows "Invoice bank details: down", and the admin invoice page tells the customer to contact the team. A confirmed payment makes the invoice paid, issues a receipt and activates the subscription through the go-live path.

- **Credit notes** (`invoice_credit_note`, immutable, numbered `CN-<invoice>-NN`) are capped at what is outstanding. Crediting a paid invoice would be a refund, a different money movement, and is refused. Amounts are whole cents in code. A snapshot column for reconciliation is an owner schema decision.

### 11.3 Card payments (Adumo Online Virtual)

The merchant posts a signed form to Adumo's hosted page; the cardholder enters card details on Adumo's page, so Checkpoint never handles card data and stays out of card-data scope (D-06).

- Credentials live only in environment variables (`ADUMO_MERCHANT_ID`, `ADUMO_APPLICATION_ID`, `ADUMO_JWT_SECRET`, `ADUMO_BASE_URL`). Sandbox test values are never committed.
- The amount posted comes from the server-side invoice (invoice less confirmed payments and credit notes). A `payment_transaction` is created at `initiated`, method `card`; its id is the Adumo merchant reference.
- A result is trusted only from Adumo's signed token (D-07): signature, merchant and application ids and expiry verified; reference and amount matched to the transaction; applied once through a conditional update from `initiated` to `confirmed` or `failed`, so the browser return and the Adumo notification webhook cannot both apply it. `_RESULT` alone is never enough.
- Confirmed: reconciliation row (automated reviewer), invoice paid, receipt email. Failed: reconciliation row `rejected`, invoice stays open.
- Stored: Adumo transaction index, status, result code, masked PAN (first 6 and last 4). Nothing else.
- The card button shows only when the API reports card payments configured and the invoice is not paid or void. A Namibian merchant account authorises in NAD. Recurring tokens are a later item. Until credentials are set the result route answers 503.

### 11.4 Go-live gates

Go-live and operational use need an `active` subscription (`trial` is an ops-set status for design partners, not offered publicly) and, for a paid plan, verified KYB (§7.5). Money is `NUMERIC(15,2)` with `currency_code`; rates are `NUMERIC(15,4)`. Every money movement leaves a reconciliation artefact (§14.1).

### 11.5 Debit-order collection of subscriptions (Collexia EnDO)

EFT with proof of payment (§11.2) and card (§11.3) are built. A third way, collecting the subscription by debit order, would remove the monthly chase for an invoice. The provider quoted is **Collexia Payments (Pty) Ltd, Windhoek**, product **EnDO (debit orders)**. The quote on file (dated 2 October 2026, all amounts NAD excluding VAT) is **not signed**, and it was issued to *Buffr Financial Servicess CC* (the name the owner says the company now has, to become Buffr Analytics, §30.3 item 6), industry *Micro-Lending*, pricing code FNBC07, so it needs reissuing in the final name and under a software-as-a-service industry. It is used here only to size the cost. Checkpoint needs its own quote, in the name of the entity that invoices its customers, after the rename (**Owner decision**, §31 item 25).

| Fee | Amount |
|---|---|
| Monthly merchant subscription | 430.00 |
| Monthly user fee, per user | 73.00 |
| Training | none |
| Per transaction submitted | 4.99 |
| Tracking, per day, charged from day 1 | 2.30 |
| Per successful dispute | 150.00 |
| Per transaction recalled | 200.00 |
| Ad valorem on a successful collection, 0 to 999 transactions a month | 1.50 percent (falls in bands to 1.43, 1.39, 1.35, 1.31, 1.28, 1.24, 1.22 and 1.20 percent at 70,000 or more) |
| SMS notification (optional, opt in) | 0.95 each |

What one collection costs at the 1.50 percent band, with three days of tracking (the days depend on how long a debit takes to settle, so this is an assumption to replace with the real figure):

| Plan | Collected | Submitted | Tracking, 3 days | 1.50 percent | Total | Share of the amount |
|---|---|---|---|---|---|---|
| Site | 1,500.00 | 4.99 | 6.90 | 22.50 | **34.39** | 2.29 percent |
| Network | 4,500.00 | 4.99 | 6.90 | 67.50 | **79.39** | 1.76 percent |
| Assure | 9,500.00 | 4.99 | 6.90 | 142.50 | **154.39** | 1.63 percent |

A debit that fails still costs the submission and tracking fees (about N$11.89 at three days) and earns nothing; a dispute adds 150.00 and a recall 200.00. The fixed N$503 a month (the subscription and one user) is N$100.60 per subscriber at 5 subscribers, N$50.30 at 10, N$25.15 at 20 and N$8.38 at 60. The fee grows with the plan's price, so it is cheapest relative to the large plans and heaviest on the Site plan.

Recommendations. (1) Keep EFT the default and offer debit order as an option once there are about 20 paying sites, when the fixed fee falls below 2 percent of a Site subscription. (2) Do not add a surcharge at first; the Site plan's cost of about 2.3 percent is smaller than the labour of chasing an unpaid invoice, and a surcharge would make the cheapest plan look dearer. Revisit if volumes stay low. (3) Build it as a third payment method on the existing payment table (`method` `debit_order`) with the same rules as every money path (§14.1): the customer's signed mandate is stored as evidence, each collection is its own transaction with a reconciliation row, a failed or recalled debit never silently leaves an invoice marked paid, and a dispute or recall is a new row, not an edit. Mandates and the new states need a schema sign-off before any code (§30.1). (4) Ask Collexia in the Checkpoint quote how long a debit takes to settle (the tracking days), whether a mandate can be captured online, and what happens to the fees on an unsuccessful debit. (5) The fee is a cost of collecting revenue and belongs in the contribution calculation of §28.1.

## 12. Integrations

### 12.1 Existing-system adapters

Where a site already runs an operational system of record, Checkpoint integrates at the boundary and does not replace it. The first adapter is **CiMSO INNterchange** (property management): a fixed 32-byte header plus JSON payload, optionally Zlib-compressed, over TCP with optional TLS. Relevant messages: Get Bookings (1101/1102), Get Booking (1103/1104), Set Booking (1105/1106), Unit Type Info (6/7), Get Facilities (501/502), Get Staff (58/59). It synchronises expected arrivals, hosts and room assignments into tenant-namespaced `pms_*` tables with a run log, connection status log and external entity links. Configuration is in `CIMSO_*` environment variables and the admin integration page. Further adapters (HR directory, access control) follow the same pattern when applicable.

### 12.2 Identity adapters

Identity verification sits behind a `DigitalIdentityVerificationProvider` port. DigiNam and the national e-ID providers are fail-closed: until approved, they return "unavailable" and never a truthy verified result. Banned from every adapter: raw credential payloads, certificate chains, biometric templates, chip contents. Stored: provider reference, outcome code, assurance level, timestamp, expiry, released attribute codes (§24.3).

### 12.3 Form AI (optional, admin only)

Neon AI Gateway behind `FormAiService` (`FORM_AI_ENABLED`, gateway URL and key) suggests and translates field definitions. It never sees visitor check-in traffic.

1. **Classification ownership.** AI may suggest classes including `high_risk`, with warnings. Suggestions are never auto-published; the admin owns the final class and the publish gate (§8.2) still applies.
2. **Logging.** Audit actions `check_in_form.ai_suggest_fields` and `check_in_form.ai_translate_field` only; raw prompts and responses are not retained. Pasting visitor data into the panel is an operator policy violation.
3. **Cost.** Prepaid gateway credits; no per-organisation metering. `FORM_AI_ENABLED` is the kill switch.

### 12.4 Telecom providers

Checkpoint is not a telecom operator. SMS goes through a contracted, authorised provider (`telecommunications_provider_arrangements`: licensing evidence, contract status, escalation reference). Provider choice stays substitutable behind the notification adapter. The provider's data-processing location is mapped before any residency statement (§16.2).

### 12.5 Later integrations

Teams and Slack notifications, HR directory sync, SSO (OIDC or SAML through an enterprise identity provider), access-control connectors, event registration, badge printers and emergency-management platforms are roadmap items (§30), each behind its own capability gate and threat model. Sign-in with Buffr ID is covered in §35 (D-23).

---

# Part 4: Architecture and data

## 13. Architecture

### 13.1 Principle

One secure visitor-record service, several inclusion channels, zero shared records.

```text
        VISITOR CHANNELS
 Public site QR · Assisted · Kiosk · NFC · SMS
                  |
   SITE EDGE (optional): Android kiosk
   encrypted local store · NFC reader · MDM
                  |
        online sync | offline encrypted queue
                  |
        API AND IDENTITY GATEWAY
 sessions · permissions · rate limits · idempotency
          |                      |
 Identity adapters        Core application
 DigiNam/NPKI, e-ID       visits · workflow · RBAC
 (gated)                  retention · data requests
                                 |
      +--------------------------+----------------------+
      |                          |                      |
 PostgreSQL (Neon,         Notification outbox     Append-only, hash-linked
 Frankfurt)                email · SMS              audit log, evidence exports
 tenant and site scoped            
      |
 Encrypted object store (evidence, KYB, proof of payment, exports)
```

The visitor-facing kiosk, the organisation admin and the API are one connected product, not three apps. The kiosk's channels, forms, policies, notifications, credentials and emergency rules are configured through the admin by authorised customer users.

### 13.2 Stack

| Layer | Choice | Reason |
|---|---|---|
| Kiosk | Native Android, Kotlin, Compose, Hilt, Retrofit, encrypted Room (SQLCipher), WorkManager | Best NFC support, offline operation, device control |
| Admin and ops console | Next.js 16 (React 19, Tailwind v4, shadcn/ui, TanStack Table) | Data-dense dashboards; shared brand preset |
| Website | Next.js, static-first; `/check-in` dynamic | SEO for marketing; query-driven operational page |
| API | NestJS modular monolith in TypeScript | Guards, interceptors and modules map to RBAC, audit and state machines; one language across admin and API |
| Database | PostgreSQL 18 on Neon, Drizzle ORM | Relational integrity, tenant scoping, SQL-first audit and retention queries |
| Build and OS packages | Railway builds the API with Railpack (the build log says so, whatever `railway.toml` once named). `backend/railpack.json` lists the runtime apt packages `tesseract-ocr` and `poppler-utils`; the API logs one line at start-up saying whether they and the PaddleOCR runtime are ready (checked in production on 2026-10-08) | A Nixpacks file was ignored and left the tools missing until this was found from that log line |
| Object storage | Neon Object Storage (S3-compatible, `ARTIFACT_STORE=neon_s3`); Vercel Blob only as an explicit degrade | Evidence packs, KYB, proof of payment, exports; storage branches with the database |
| Authentication | Custom NestJS auth: TOTP MFA, lockout, challenge tokens; sign-in with Buffr ID (D-23) | Managed auth plugins lack TOTP and lockout parity |
| Audit | Append-only hash-linked event chain, immutable exports | Tamper evidence without blockchain |
| Messaging | SMTP through the Buffr mailbox; BulkSMS Namibia for SMS | Free email, usage-billed text, substitutable adapter |
| Observability | Sentry (API, web, kiosk), consent-gated PostHog, structured logs, uptime monitor | Operations and assurance |
| Source and CI | GitHub; typecheck, tests, build, secrets scan on every push; migration replay into an empty Postgres | Delivery evidence |
| Shared contracts | `@buffrcheckpoint/shared`: visit status, identity assurance levels, form-rules evaluator | UI forms and API DTOs stay aligned; mirrored in `admin/src/lib/canonical-codes.ts` and kiosk `Enums.kt` because Vercel and Railway deploy roots exclude `shared/` |
| Deferred | Neon Functions (NestJS keeps all compute), managed Better Auth | No second compute plane before a scale need; managed plugin set lacks TOTP and lockout |

Neon object storage, AI gateway and database location is `aws-eu-central-1`. It is not Namibian hosting (§16.2).

### 13.3 Modules

Modules, services and routes are named for the business capability, security role or decision they perform, never for their folder, framework or a CRUD verb. Test: a reader who sees only the name can say what it does, which process it belongs to and which risk it controls. `NotificationDispatchWorkerService`, `VisitorDataMinimisationService` and `ScopedPermissionEvaluationService` pass; `DevicesService` or `JobsService` would not.

Backend modules (`backend/src/modules/`): access-policies, access-reviews, analytics, analytics-etl, anomaly-rules, audit, auth, billing, capability-status, compliance, contact, credentials, crm, devices, documents, dsar, emergency, evidence, host-notification-escalation, hosts, identity-verification, integration-health, integrations, invitations, kiosk-experience, kyb, legal, legal-holds, notifications, onboarding, onboarding-state, organisation-directory, organisation-health, organisation-standards, organisations, platform-configuration, platform-dashboard, platform-incidents, platform-search, platform-staff, rbac, regions, retention-disposition, retention-policy, schedule, scheduled-reports, security-zones, site-notices, site-qr-references, sites, support-sessions, support-tickets, type-definitions, visit-survey, visitor-policy, visitor-wait-queue, visitors, visits.

### 13.4 Request pipeline

Global guards run in a fixed order: authentication, session audience (§5.3), tenant scope, RBAC. Tenant scope checks any `organisationId` or `siteId` in the path or query against the caller's own scope. Ops routes already gated by a `platform.*` permission opt out with an explicit `@PlatformScoped()` decorator, which is verified both ways: a platform user can read a foreign organisation through those routes, and a customer route still returns 403 for the same user. Cross-cutting: DTO validation with unknown fields rejected, per-route throttling, `helmet` headers, an audit interceptor for sensitive reads, exports, corrections and deletions, and an empty-body rule (a controller that can return "no data" responds with explicit JSON `null`, because the framework treats `null` and `undefined` as an empty body that clients cannot parse).

### 13.5 Core vertical slice: visitor arrival

Every channel resolves to this transaction. It is real persistence, never a stub.

```text
Authenticate operator session, kiosk device credential or public QR reference
  -> derive organisation and site from the principal, never from the request body
  -> check permission and scope
  -> validate answers against the active published form version
  -> resolve visitor category and access policy
  -> validate host (active, this site), invitation, credential, required assurance
  -> encrypt permitted personal data in an envelope (§14.3)
  -> create or safely resolve the visitor subject
  -> create the visit, its status event, retention policy version and acknowledgement
  -> create the access decision
  -> write the audit event in the same database transaction
  -> enqueue the host-notification outbox row
  -> return a minimum-data confirmation
```

Invariants: a checked-out visit cannot be checked out twice; the same idempotency key cannot check in twice; a host must be active and authorised for the site; a restricted visit cannot bypass its required assurance; a legal hold overrides scheduled deletion; every status transition creates an audit event; a public kiosk never searches visitors by name; any visitor record shown to an operator is scoped by organisation, site and permission. Tests run against a dedicated test database. Retention date is calculated at creation.

## 14. Data model

### 14.1 Rules (Wiebe schema rules, non-negotiable)

1. Never create a table for something that is the same kind of thing as an existing table under a different label. Use a `type_code` column and a config row.
2. Never hardcode a type, status or category as an enum or CHECK list. Fixed lists live in `type_definition` (`domain` plus `code`). Adding a value is an INSERT, not a migration.
3. Every stateful entity gets a `_status_log` or `_status_events` companion created in the same migration. Log and ledger rows are immutable: no `updated_at`, no UPDATE; corrections are new rows. Structurally append-only tables (audit events, credential use events, emergency roll-call entries, SMS events) are exempt because they are the log.
4. No database triggers, no stored procedures for business logic, no `ON DELETE CASCADE`. All transitions and cascade effects live in application code. Declarative row-level security policies are allowed.
5. Money is `NUMERIC(15,2)` (rates `NUMERIC(15,4)`) with a `currency_code CHAR(3)` alongside. Floating point on money is a critical defect.
6. UUID primary keys, generated client-side before the write, so retries are idempotent. The one exception is `type_definition`, an admin-seeded config table never written by a request path.
7. Soft deletes only (`deleted_at TIMESTAMPTZ NULL`). Never hard-delete operational records. Single-use security tokens (email verification, password reset, MFA challenge) are not operational records and are deleted once consumed or expired.
8. Every operational table carries the tenancy column (`organisation_id`). Every index starts with it. Active-record indexes are partial: `WHERE deleted_at IS NULL`.
9. Core schema, tenancy architecture, ledger structure and permission models are designed by a human or Fable, never by an executing model. New tables in this document are proposals until signed off.
10. Authoritative timestamps are UTC. Each site keeps an IANA timezone (for example `Africa/Windhoek`) for presentation and for local-date analytics. Browser time is never legal or audit time.
11. Every mutable table carries `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`; append-only log and event tables carry `occurred_at` instead. Migration 0070 added `created_at` to the 79 tables that had neither; rows that pre-date it hold the migration time, except organisations, visits, invitations and data requests, which were backfilled from their earliest honest evidence (first audit or onboarding event, check-in time, validity start, first status row).

Guards: migrations 0001 to the latest contain no trigger or function, no `ON DELETE CASCADE`, no CHECK list and no floating-point money column; CI replays every migration into an empty Postgres on each push and diffs the result against expectations. A static test fails the build when a business-key lookup on a soft-deletable table ignores `deleted_at`, with two documented exceptions (staff reinstatement, and registration where the email unique index spans deleted rows). Every table with an `organisation_id` has an index that leads with it.

### 14.2 Table families

About 130 live tables, grouped by what they do. Each stateful family has its status companion.

| Family | Tables |
|---|---|
| Configuration | `type_definition`, `permission_definitions`, `role_definitions`, `role_permission_grants`, `platform_configuration_setting` (+ status log), `platform_notification_template` (+ status log) |
| Tenancy and access | `organisations`, `organisation_settings`, `regions`, `sites`, `security_zones`, `site_checkin_code`, `organisation_units` (+ status events), `application_users`, `organisation_memberships` (+ status log), `membership_scopes`, `privileged_access_grants` (+ status events), `organisation_access_review_log`, `email_verification_tokens`, `password_reset_tokens`, `mfa_challenge_tokens`, `mfa_recovery_codes` |
| Onboarding | `organisation_onboarding_states` (+ status log), `staff_training_acknowledgements` |
| Visitors and visits | `visitor_subjects`, `visitor_personal_data`, `visitor_identity_assessments`, `visitor_visits`, `visit_status_events`, `visit_form_answers`, `visit_invitations` (+ status events), `visitor_wait_queue_entries` (+ status events), `site_hosts`, `visitor_categories` |
| Forms, policy and consent | `check_in_form_definitions`, `check_in_form_versions`, `check_in_form_fields`, `check_in_form_field_translations`, `visitor_policy_documents`, `visitor_policy_versions`, `visitor_policy_acknowledgements`, `kiosk_privacy_pre_checkin_acknowledgements`, `access_policy`, `retention_policies`, `legal_holds` (+ status events), `retention_disposition_run` (+ status log) |
| Data requests and evidence | `privacy_requests` (+ status log), `evidence_pack` (+ status log) |
| Credentials | `access_credentials`, `credential_site_entitlements`, `credential_status_events`, `credential_use_events`, `reader_sessions` |
| Devices and experience | `managed_kiosk_devices`, `device_operational_status_log`, `kiosk_experience_configurations`, its versions and version channels |
| Site references and escalation | `site_qr_references`, `site_qr_reference_rotations`, `host_notification_escalation_policies` (+ versions), `host_notification_escalation_events` |
| Emergency | `emergency_roll_call_events`, `emergency_roll_call_entries` |
| Notifications | `notification_delivery_instructions`, `notification_delivery_status_events`, `sms_contact_confirmation_events`, `telecommunications_provider_arrangements` |
| Audit | `audit_events`, `platform_support_audit_events`, `platform_support_session` |
| Analytics, alerts, reports | `visit_daily_fact`, `visit_hourly_fact`, `visit_survey_responses` (+ status events), `visit_survey_daily_fact`, `analytics_etl_run` (+ status log), `anomaly_alert_events` (+ status events), `site_anomaly_rule_configurations`, `scheduled_report_configurations`, `scheduled_report_run` (+ status log), `organisation_health_snapshot` |
| Billing | `subscription_catalog_item`, `organisation_subscription` (+ status events, site-quantity log), `organisation_subscription_addon` (+ status log), `invoice`, `invoice_line_item`, `invoice_credit_note`, `payment_transaction`, `payment_reconciliation_log` |
| Platform operations | `platform_incident` (+ affected organisations, status events), `support_ticket` (+ comments, status events), `crm_contact`, `crm_deal` (+ status events), `crm_activity_log`, `organisation_kyb_verification` (+ status events), `organisation_kyb_document` (+ status events), `contact_enquiries` (+ status log), `organisation_capability_enablement`, `platform_capability_approvals` |
| Existing-system integration | `pms_integration_connections` (+ status log), `pms_external_entity_links`, `pms_room_zone_mappings`, `pms_sync_run_log` |

Selected shapes:

- `visitor_visits`: organisation, site, optional zone, visitor subject, optional host, visitor category, arrival channel (`capture_channel`), status, assurance level, check-in, server-accepted and check-out times, offline flag, retention policy version, idempotency key (unique per organisation), `onboarding_test` channel marker.
- `visit_status_events`: the visit's lifecycle history; visit status (`visit_status`) is `pending_sync`, `checked_in`, `checked_out`, `synced_ack`, `pending_approval`, `admitted`, `entry_rejected`.
- `site_hosts`: host name and contact are protected envelopes, so a host can exist without a dashboard account.
- `security_zones`: risk tier and `host_approval_required`.
- `audit_events`: organisation, optional site, actor type and principal, action code, resource, outcome, reason, request id, previous and current event hash.

New customer-facing assurance tables (risk register, control definitions, implementations, effectiveness tests, findings, remediation actions, resilience exercises, supplier assessments) are roadmap items that need schema sign-off (§30). The organisation's own ISMS records live outside the product (§19.6).

### 14.3 Personal-data protection

Visitor personal data never sits in plaintext columns.

- **Separation.** `visitor_subjects` is PII-free (a stable reference). `visitor_personal_data` holds one protected envelope plus keyed lookup digests. Phone, name and host contact are never indexed in the clear.
- **Envelope.** `{ encryptionAlgorithm: AES_256_GCM, keyManagementReference, keyVersion, encryptedDataKey, initializationVector, ciphertext, authenticationTag }`. The payload holds only fields permitted by the active form and policy version (name, mobile number, organisation name, vehicle registration, an approved photo artifact id). Never: raw DigiNam credentials, raw e-ID chip data, biometric templates, certificate chains, unprotected national ID numbers, unrestricted staff notes.
- **Lookup digests** (`name_lookup_hmac`, `phone_lookup_hmac`, email) are keyed HMACs with a server-side secret, named for their purpose and never called a "hash". A plain hash of a name or phone number is dictionary-attackable. Phone numbers are normalised before the digest so `+264 81 111 9029`, `+264811119029` and `264811119029` match.
- **Key management requirements.** Encryption sits behind one service (`PersonalDataProtectionService`) so a managed key service can be adopted by changing that file, not the schema or callers. The design requires: a data key per subject wrapped by a managed master key; key versioning and rotation; fail-closed behaviour (in production the data key, lookup peppers and token peppers are read through `requiredSecret`, which throws when a value is unset or under 16 characters; the development fallbacks apply only outside production); separate keys for data, lookup digests, token peppers and MFA secrets; no key material in logs, prompts or error reports. Which key service to use is an **Owner decision** (§31).
- **Disposal.** Retention disposition (§8.5) overwrites the encrypted payload with a tombstone and clears the lookup digests in the live table, then soft-deletes the subject. The same worker redacts the notification outbox (§9.1). With per-subject data keys, disposal can also destroy the key, which makes copies in backups unreadable. Until then copies persist in backups until they age out (§16.3), and the privacy notice and processor terms say so.
- **Never trust the browser** for any identifier that selects a tenant, a storage prefix or a key. Storage keys are generated server-side: `organisation/{organisationId}/evidence/{resourceType}/{resourceId}/{artifactId}`.

### 14.4 Audit chain

`audit_events` is append-only and hash-linked per organisation. Each event stores the previous event's hash and its own. The chain tip is the event that no other event names as its predecessor (`chainTip`), not "newest by timestamp", because two events in one millisecond would tie and a retry would then point at a predecessor that already has a successor. A unique index on the predecessor (migration 0057) means no new fork can be written, and the verifier (`verifyChain`) follows links, not timestamps. Background jobs and gateway callbacks write to the same chain through `common/audit/audit-chain.ts`. Rows are immutable: any pre-index fork is disclosed to an auditor and never rewritten. The audit export includes hashes so the chain can be checked outside the product.

The production runtime role `buffr_checkpoint_runtime` has no UPDATE or DELETE on `audit_events` or any status-log table (UPDATE is granted only where a flow needs it, such as closing an emergency roll call and notification outbox status). Migrations run as the database owner from an operator machine, never from the API (D-21). After any change to `DATABASE_URL`, re-run the privilege check: `has_table_privilege` on `audit_events` must show UPDATE false, DELETE false, INSERT true.

### 14.5 Migrations

Forward-only and additive. Test every migration on a disposable Neon branch of production, apply it twice (it must be idempotent), then apply to production, then deploy the API, then the web apps. A destructive migration needs a named restore point and the deploy order that avoids breaking the running API. Never rename tables in one step while code still reads the old names. `0001` to the latest are checked in CI by replaying them into an empty database.

## 15. Devices, offline capture and credentials

### 15.1 Device deployability gate

A device is a managed asset with a lifecycle (§20.3). The `cran_compliance_status` sequence is:

```text
unassessed -> supplier_evidence_received -> exemption_assessed
  -> cran_certificate_confirmed -> mdm_enrolled -> approved_for_deployment -> retired
```

Enforcement is application code in the devices service: an activation or check-in request is rejected unless the device resolves to `approved_for_deployment`. Operational status (`device_status`: operational, maintenance, retired) is separate and logged in `device_operational_status_log`. "No unregistered device is deployable."

The Device Compliance Register holds: manufacturer, model or SKU, serial number, site, radio features (Wi-Fi, Bluetooth, NFC, cellular), CRAN certificate number or exemption assessment, supplier evidence, firmware version, warranty and support expiry, MDM enrolment, disposal or secure-wipe evidence.

### 15.2 Offline capture

- The kiosk stores each arrival in an encrypted Room database (SQLCipher, passphrase from the Android Keystore) as a transactional outbox, and a WorkManager job drains it until empty on reconnect.
- The visit id is a client-generated UUID and the server inserts with `onConflictDoNothing`, so a retried sync never creates a duplicate. A device retries the same id, never mints a new one.
- Capture time and server-acceptance time are both kept. After confirmed sync the local personal data is deleted.
- Kiosk authentication works around the server's 8-hour access token with no refresh endpoint: an authenticator re-posts the stored credentials on a 401.
- The banner shows pending, syncing or failed honestly and never "host notified".
- Consent state, drafts and pending outbox rows are wiped when a session is abandoned (§6.5).
- **Hardening path (gated, not required for the default route).** For high-risk sites: device-held signing keys never stored in the database; a canonical signed payload with `event_id`, `visit_id`, `captured_at`, policy version, ciphertext, digest, signature and key id; the backend derives organisation, site and device from the enrolled device, rejects unknown or revoked devices, prevents replay by `event_id`, records conflict outcomes and never accepts a client-chosen tenant. Provisioning then runs register, CRAN assessment, MDM, site assignment, short-lived device credential.

### 15.3 Credentials

`access_credentials` holds the credential type (NFC badge, NFC phone, and others), holder, a keyed digest of the credential reference (`credentialReferenceHmac`), validity window and security profile. Status changes are `credential_status_events` (`active`, `revoked`, `expired`); `credential_site_entitlements` bind a credential to sites and zones; every use writes a `credential_use_events` row; `reader_sessions` tie a validation to an enrolled reader.

`POST /credentials/validate` (permission `credential.validate`, narrower than `site.configure`) runs: look up by organisation and reference digest ignoring soft-deleted rows, so a revoked credential can never shadow a live one with the same reference; check the latest status event, validity window, site entitlement and reader session; record the use; return a typed result (`valid` with holder and type, or `not_found`, `revoked`, `expired`) and no fall-through to check-in on failure. The tag holds a random reference, never PII. A lost-or-stolen workflow revokes with a reason and optionally a replacement. Anti-passback only where the operating model supports it.

### 15.4 Emergency data

`emergency_roll_call_events` (activation, reason, activated by, closed at) and `emergency_roll_call_entries` (one per on-site visit, with status and confirmer). The runtime role may UPDATE events (closing sets `closed_at`) and never DELETE. The roster is the live on-site list by site and zone and its access is audited.

## 16. Hosting and recovery

### 16.1 Where things run

| Part | Host | Region | Hostname |
|---|---|---|---|
| Website | Vercel project `buffrcheckpoint-website` | Vercel edge | `buffrcheckpoint.com`, `www` |
| Admin | Vercel project `buffrcheckpoint-admin` | Vercel edge | `admin.buffrcheckpoint.com` |
| Ops console | Vercel project `buffrcheckpoint-ops-console` | Vercel edge | `ops.buffrcheckpoint.com` |
| API | Railway service `api` | EU region, one replica (Amsterdam) | `api.buffrcheckpoint.com` |
| Database and object storage | Neon project `buffr-checkpoint-eu` | `aws-eu-central-1` (Frankfurt), PostgreSQL 18 | n/a |
| DNS and domain | Namecheap | n/a | `buffrcheckpoint.com` |
| Mail | Namecheap Private Email (Buffr mailbox) | n/a | `team@buffranalytics.com` |

### 16.2 Residency and cross-border transfer

No page, deck or contract says "hosted in Namibia" until the whole chain is evidenced: exact database region, backup location, object-storage location, key-management location, monitoring and logging location, messaging-provider processing location, support-access location and subprocessor agreements. Today the processing chain is in Germany and the Netherlands, so use "Designed for Namibian data-protection requirements". Under the draft Data Protection Bill, processing outside Namibia is a cross-border transfer needing an appropriate level of protection and a documented assessment (§18.5). A pilot that needs a Namibian residency promise needs an explicit infrastructure decision first (**Owner decision**: shared Namibia-hosted cloud, private cloud, on-premise or a hybrid for regulated clients).

**Option, priced 2026-10-08: colocation at Armada (Paratus), near Windhoek.** From Paratus's price list and its Armada page, as stated by the vendor and not verified by us: a facility 20 km north of Windhoek, Tier III by design, with ISO 9001 and ISO 27001 certification, a PCI-DSS registration, 72 hours of backup power, and the Trans-Kalahari fibre and the Equiano cable landing in the building. It is **colocation, not hosting**: rack space and power, billed monthly, where Checkpoint would install and run its own servers. Cabinet prices per month: uncaged half cabinet (0.5 kVA) N$8,060; uncaged cabinet (1 kVA) N$12,680; caged cabinet N$13,280. Servers, switches, internet transit, a second site, the people to run them and the evidence an auditor wants are not in that price. Consequences if chosen: (1) a Namibian primary database also needs the API in Namibia, because a query from Amsterdam to Windhoek would repeat the latency problem that moved the API next to Neon (`railway.toml`); (2) Neon would become the disaster-recovery copy, fed by logical replication from the Windhoek primary (Neon can be the subscriber), but a copy in Frankfurt means "hosted in Namibia" is still not a true statement, and the accurate wording is "primary database in Namibia, encrypted recovery copy in the EU"; (3) Checkpoint takes on operating Postgres, patching, monitoring and restore tests, which Neon and Railway do today. It is not recommended now: no customer or tender requires it, and one half cabinet costs more per month than the current hosting before any hardware. Revisit when a regulated customer or a tender requires Namibian residency in writing. The first question to Paratus then is whether it offers managed virtual machines or a managed cloud, which would remove the hardware and operations burden that colocation leaves with us (**Owner decision**, §31 item 2).

### 16.3 Recovery

| Item | Target | Basis |
|---|---|---|
| RTO, API and web | 4 hours | Railway redeploy of the previous build and a Vercel rollback take minutes; the margin covers diagnosis |
| RPO, database, last 6 hours | under 5 minutes | Neon point-in-time restore (project keeps 6 hours of history, 21,600 seconds) |
| RPO, database, older | up to 24 hours | Daily snapshot branches (`scripts/neon-daily-snapshot.sh`), kept 14 days; needs `NEON_API_KEY` in repository secrets and the scheduled workflow |

These are proposed targets the current setup can honestly meet; the owner confirms or changes them (**Owner decision**, §31). For regulated customers where contractually in scope, the PSD-12-inspired benchmark is 99.9% availability, recovery within 2 hours, a 5-minute RPO for critical data and two successful recovery tests per year (§17.3); it is not a universal promise until the operating maturity exists. Restore: in Neon restore the `main` branch to a point in time (or promote a snapshot branch), confirm `GET /health` returns `"database":"ok"`, run `scripts/smoke-production.sh`. Test the restore on a throwaway branch every quarter and keep the result as evidence (date, branch, what was checked). Backups are encrypted. Copies of disposed personal data persist in backups until they age out.

### 16.4 Environments and data

| Environment | Use | Data rule |
|---|---|---|
| Local and CI | Unit, journey smoke, migration replay | Synthetic only; local `backend/.env` points at a development branch, never production |
| Disposable Neon branch | End-to-end tests and migration rehearsal | Copy of production shape; deleted afterwards; the sign-up abuse limiter (`SIGNUP_MAX_PER_HOUR`, `SIGNUP_MAX_PENDING_PER_DOMAIN`) may need raising for rehearsal, never in production |
| Staging | A0 alpha and early A1 | Synthetic plus partner-consented fake visitors |
| Production | Customers and pilot tenants | Real data under a data processing agreement; demo and test organisations never exist in production (D-19); demo seeds live in `backend/db/seed/demo/` |

Never copy production visitor payloads into tickets, shared screenshots or model prompts. Before each new demo account, re-check which email domains the organisation's users hold, so scheduled reports cannot reach a real domain by mistake.

---

# Part 5: Security, privacy and standards

## 17. Security baseline

### 17.1 Minimum controls

| Control area | Required control |
|---|---|
| Encryption in transit | TLS for every API and service integration; HTTPS forced at the edge with HSTS |
| Encryption at rest | Database, object store, kiosk local store, backups; personal data in protected envelopes (§14.3) |
| Key management | Per-environment keys, versioning, rotation, restricted access, recovery process; no default or fallback keys in production |
| Authentication | TOTP MFA for owners and privileged roles after go-live and for platform staff always; lockout after 3 failures in 5 minutes; separate customer and ops front doors (§5.3) |
| Device security | Kiosk mode, MDM, screen lock, automatic session reset, patching, CRAN gate (§15.1) |
| Data access | RBAC plus tenant and site scope enforced in the API; deny by default (§5.2) |
| Logs | Tamper-evident audit events for access, export, change and support activity (§14.4) |
| Retention | Customer-configured lifecycle, legal holds, disposal evidence (§8.5) |
| Backups | Encrypted, tested restores, defined objectives (§16.3) |
| Vulnerability management | Dependency scanning on every pull request and weekly, patch SLAs, secrets scanning, secure code review (§17.3) |
| Incident response | Documented playbook, customer notification rules, evidence preservation (§17.4) |
| Third-party risk | SMS, hosting, MDM, NFC and identity vendors assessed and contractually controlled (§21.3, REG-SUP-01) |
| Business continuity | Offline process, spare-device model, power continuity, secure non-paper fallback (§6.5) |

### 17.2 Application controls

- Parameterized SQL only; never string-built queries. Every external request is validated server-side and unknown fields are rejected.
- Secrets and peppers are never committed; they live in environment panels (Railway for the API, Vercel per web app) and, on the kiosk, in Android Keystore. Frontend bundles carry no secrets: only `NEXT_PUBLIC_*` public values. Grep the built output before each release.
- Public endpoints (contact, sign-in, registration, password reset, check-in) are throttled. Sign-up has abuse limits counted in the database (`SIGNUP_MAX_PER_HOUR`, `SIGNUP_MAX_PENDING_PER_DOMAIN`).
- Crash and analytics payloads scrub visitor personal data before leaving the device or server. Analytics are consent-gated and carry codes and counts only.
- Logs go through the project logger; raw `console.*` is not allowed in committed code.
- Production visitor data is never in Git, fixtures, error reports, analytics payloads, developer logs, tickets or model prompts.
- The web security headers of §6.2 apply on every route of the website, admin and ops console; the API uses `helmet`.

### 17.3 Vulnerability management

Dependencies are checked on every pull request (`npm audit --omit=dev --audit-level=high` blocks the merge) and weekly by Dependabot. A secrets scan (gitleaks, full history) runs in CI. New packages wait 7 days before adoption; security updates are exempt from the wait. Versions are pinned exactly (no `^` or `~`) and lockfiles are never ignored.

| Severity | Fix or documented mitigation within |
|---|---|
| Critical | 2 days |
| High | 7 days |
| Moderate | 30 days |
| Low | Next routine update |

Counted from the day the advisory reaches us. A finding that cannot be fixed in time is recorded with the reason, the compensating control and a review date. Reports go to `team@buffranalytics.com` (acknowledged within 3 business days; good-faith research within the stated limits is not pursued legally), and `/.well-known/security.txt` is served on the website.

### 17.4 Incident response

Defined in `docs/incident-response.md`. An incident is any event that exposes or could expose visitor or customer data, stops visitors checking in, or lets someone act without the right access.

| Level | Meaning | Respond within |
|---|---|---|
| Sev 1 | Data exposed, or visitor check-in down for all customers | 1 hour |
| Sev 2 | One customer affected, or a control failed with no known exposure | 4 hours |
| Sev 3 | Degraded or cosmetic, no data risk | Next business day |

First hour: confirm and log with times; contain (revoke the credential, disable the account, turn off the flag, or roll back); preserve evidence before changing anything else (the audit chain and the error trail); tell the owner. **Processor duty:** where personal data is involved Checkpoint notifies each affected customer, as controller, without undue delay, with the nature of the breach, categories and approximate number of data subjects, likely consequences and measures taken or proposed, so the customer can meet its own notification deadline (draft Bill s22, §18.6). After recovery, write a short review (cause, what worked, what to change) and add a decision-log entry if a standing decision changes.

### 17.5 PSD-12-inspired resilience benchmark

For customers inside the National Payment System or other highly regulated settings, Checkpoint can support: an availability target, risk tolerance thresholds, regular risk assessment, independent control assessment, an incident notification process, tested response and recovery plans, recovery-time and recovery-point targets and supplier safeguards. Benchmarks in PSD-12: 99.9% availability, recovery within two hours, a five-minute RPO for critical systems, two successful recovery tests a year. Treat these as a regulated-customer design benchmark, not a universal promise, and never claim PSD-12 compliance (§1.4).

### 17.6 Bot defence, passwords, location and discoverability: findings and decisions

Researched 2026-10-08 by reading this codebase and public sources. The code facts below were checked against the repository; the external facts (package versions, how the services work) are from public documentation and should be re-checked on the day of the work. Passwords and discoverability were built on 2026-10-08 (below); bot defence and the breached-password lookup wait for the owner's approval of the services they use.

**Bot and abuse defence (built, 2026-10-08).** Cloudflare Turnstile is on sign-up, sign-in, password reset and the contact form, and nowhere else. A bot score such as reCAPTCHA v3's `grecaptcha.execute()` would have given a 0 to 1 judgement per request and sent browser signals to a third party; Turnstile is a challenge that usually shows nothing, embeds without sending traffic through Cloudflare and processes only what the check needs. How it works: the page shows the widget (`components/turnstile-widget.tsx`, rendered only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set), the browser sends the token in the `x-turnstile-token` header, and the API's `TurnstileGuard` (`@RequireTurnstile()`) verifies it with Cloudflare, sending only the secret and the token, never the address or the form. A missing or wrong token is refused with "Complete the check below the form and try again." If Cloudflare cannot be reached the request is let through with a warning, because those routes also have throttles, lockout and MFA, and a Cloudflare outage must not lock every customer out; a token Cloudflare calls wrong is always refused. The check is off until `TURNSTILE_SECRET_KEY` is set. It does not stop an attacker who farms real browsers; the throttles and the five-minute lockout remain the second line. **Visitor check-in, the QR pages and assisted entry never carry it**: a visitor who cannot pass a challenge must still be able to check in (§1.2). The widget is created in the owner's Cloudflare account (domain `buffrcheckpoint.com` and its subdomains, mode managed); the secret key is on Railway only and the public site key on the website and admin projects in Vercel. Cloudflare is listed as a provider in the Privacy Policy and the register. Staff sign-in to the ops console does not carry it; Cloudflare Access in front of that hostname is the option for staff (§17.7).

**Passwords (built).** Passwords are hashed with `bcryptjs` 2.4.3 at 12 rounds (`BCRYPT_ROUNDS`), which is sound and unchanged. The policy was the weakness (a minimum of 8, nothing else) and is now `common/auth/password-policy.ts`, following NIST SP 800-63B: at least 12 characters (counted as characters, so a phrase in any script works), at most 72 bytes because bcrypt reads no further and a longer password is refused with that reason rather than cut silently, spaces and any characters allowed, no composition rules and no forced expiry, a small block on very common words and on passwords of a few repeated characters, and the rule stated in plain words beside every field where a password is chosen (`passwordRule` in `lib/copy/auth.ts`). It applies whenever a password is chosen: sign-up, reset, and an account an administrator creates. Existing passwords keep signing in; they meet the new rule the next time they are changed, and nobody is locked out. Not built: a breached-password lookup using the Have I Been Pwned range API (only the first five characters of the SHA-1 are sent, so the password stays on our server; a plain HTTPS call, no package). It adds HIBP as a named subprocessor, so it waits for the owner (§31 item 23). Argon2id stays optional; if adopted, hashes are upgraded on a successful sign-in, never in bulk.

**Location.** Geolocation is denied by the `Permissions-Policy` header on the website, admin and ops console (`geolocation=()`), and nothing reads `navigator.geolocation`. `getCurrentPosition()` asks the visitor's browser for their position after a permission prompt; it is precise (metres), needs a secure context, fails for anyone who says no, and the answer is personal data under the draft Bill. Recommendation: **do not collect precise location of visitors.** Managing hardware and organisations does not need it, because the location that matters is already recorded and is a fact about the place, not a person: every site carries its physical address, its Namibian region (which feeds the ops console map) and its time zone, and every managed device belongs to a site and zone with its serial number, firmware, CRAN reference and MDM enrolment (`managed-kiosk-devices.ts`). A lost or stolen tablet is found through the MDM (Knox or Android Enterprise), which is built for that and holds the device's position under the customer's own device policy, so Checkpoint does not need to read a position to manage devices. For analytics, a country or region taken from request headers (for example `x-vercel-ip-country`) is enough and stores no position. A "was this check-in at the site" check is better done by the site QR itself, which already proves presence. If a regulated customer ever needs a geofence it is an opt-in, per-site, notified setting with its own assessment, never a default, and the header would have to be relaxed for that page only.

**Discoverability (SEO) (built).** `lib/seo.ts` is the one list of public pages. Each page takes its canonical address, title, description and share data from it, and the sitemap is built from the same list, so a page cannot be in one and missing from the other (`seo.test.ts` checks that every description is unique and 70 to 165 characters, every page declares itself canonical, every page uses it, and the visitor pages are never listed). Platform, pricing, developers and about have a generated share image (`opengraph-image.tsx`); the rest use the default. Structured data now carries the organisation, the site and breadcrumbs, and the prices in it are read from the same plan source as the pricing page (`lib/pricing.ts`), with no offer at all rather than an invented one when the source is unreachable. The sitemap carries no last-modified date, because a date that changes on every build tells a crawler nothing true. `robots.txt` keeps crawlers off the visitor pages (`/check-in`, `/check-out`, `/emergency`, `/induction`, `/rate`, `/o/`, `/r/`), which also carry `noindex`. A Google Search Console verification code can be set in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` without a DNS change.

What is left is not code: register the domain in Search Console and submit the sitemap, create a Google Business Profile once there is a public Windhoek address, and measure Core Web Vitals from the Search Console report once it has field data. What actually moves ranking for a new B2B product in Namibia is, in this order: pages that answer what buyers ask (data protection for visitor records, the draft Bill, how to run a visitor log), links from Namibian business and technology publications and directories, a complete local profile, and a fast site. Meta tags alone move nothing, and no ranking can be promised.

### 17.7 Cloudflare: what it is for here

Read from Cloudflare's own documentation index on 2026-10-08 (developers.cloudflare.com). Cloudflare is a network and edge platform, not a database, so it complements Neon and the API hosts and does not replace them.

| Cloudflare product | Use here | Why |
|---|---|---|
| **Turnstile** | **Yes, now** | Free challenge that can be embedded without sending traffic through Cloudflare, WCAG 2.2 AA, processes only what the challenge needs. It is the bot defence of §17.6 and makes Cloudflare a named provider |
| **R2 object storage** | **Yes, as the off-platform backup**, not as the store | S3 compatible, no egress fee. Neon stays the system of record; a nightly dump is encrypted on our side before upload, so R2 holds ciphertext only, and kept for 30 days, in an EU jurisdiction bucket. It puts a copy of the data with a second company, which the 14-day Neon snapshots (§16.3) do not |
| Access (Cloudflare One) | Option for the ops console | A second login layer in front of staff pages only; needs that one hostname proxied through Cloudflare, which carries staff traffic and no visitor data |
| DNS, CDN, WAF, DDoS | Not now | Vercel and Railway already terminate TLS and absorb basic attacks. Proxying the product hostnames would put all traffic, including visitor data in transit, through a second provider, and the Data Localization Suite that lets a customer choose where Cloudflare inspects it is Enterprise-only |
| Web Analytics | Option | Free and cookieless; could stand in for part of what PostHog is used for |
| Secrets Store | No | Open beta and works only with Workers and AI Gateway, so Railway and Vercel apps cannot read it |
| Key wrapping or a key service | Not offered | Cloudflare has no service that wraps data keys, so §14.3 key management is still an open owner decision |
| D1, Durable Objects, KV, Queues, Workers, Pages, Containers | No | Rebuilding on a different platform and a different database (D1 is SQLite) for no gain: the schema, migrations, hash-chained audit and Drizzle code are Postgres |
| Hyperdrive | No | Speeds up queries to an existing Postgres (Neon is supported) but only from Workers; the API is not a Worker |
| Email Service, Images, Stream, Vectorize, AI, AI Gateway, Agents, Browser Run, Zaraz | No | Not needed; each would add a provider that handles data |

"Neon as a replica" of Cloudflare data does not apply, because Cloudflare has no Postgres to replicate from. The useful direction is the reverse: Neon is primary and Cloudflare holds an encrypted copy. Decisions: add Cloudflare (Turnstile, and R2 for backups) to the provider list before use (§31 item 23); the backup key is generated and held by the owner, offline, and never in a repository.

## 18. Namibia Data Protection Bill

### 18.1 Status and how to cite it

The text on file is the **draft** Data Protection Bill (undated, with tracked-change residue; its text ends at section 39; the contents list shows sections 40 to 44 for repeal and commencement that the file does not contain; the exceptions section cross-refers to "Section 8 [data breach notification]" where breach notification is section 22). Section numbers below are those of that draft and are used as design anchors. Status checked 2026-10-07: public reporting shows the Bill tabled for 2025 and not enacted, with legal guides expecting promulgation by the end of 2026, and the SOC 2 programme records it as not enacted as of July 2026. Re-check before any customer-facing statement that the Bill is or is not in force; until then Checkpoint says "designed to support the draft Bill" (§1.4). The Bill applies inside Namibia and to processing outside it where it relates to individuals in Namibia (s2(4)). The design benchmark remains POPIA-style safeguards, and no POPIA compliance is claimed.

### 18.2 Roles

The customer organisation is the **controller** (it decides purposes and means) and Buffr Checkpoint is the **processor** (s1). Buffr Checkpoint is also controller of its own data: marketing-site enquiries, ops CRM contacts, platform staff accounts and billing contacts. Under s18(4) a controller must use a processor that gives sufficient guarantees and must have a **written contract** that provides that the processor: acts only on the controller's instructions; engages no other processor without prior written authorisation; assists the controller with compliance and audits; has the categories of data and the purposes set out; and ensures its staff know and follow the security measures. The Terms and the data processing agreement carry these clauses, the subprocessor list names each vendor and processing region, and a new subprocessor is notified before use. Counsel review is an **Owner decision** (§31).

### 18.3 Principles and where each is met

| Bill provision | Requirement | Where it lives in the product |
|---|---|---|
| s3(2) purpose limitation, s3(3) minimisation | Explicit purposes; adequate, relevant, not excessive | Form builder field classes, minimisation gates, default-off ID and photo (§8.2); reason for visit is a category |
| s3(4) accuracy | Kept accurate | Correction requests (§8.5); assisted review at the desk |
| s3(5) storage limitation | No longer than necessary; delete or de-identify | Retention policies and disposition worker (§8.5) |
| s4 lawfulness | One of the listed bases; proportionate | Visitor processing relies on the controller's legitimate interest in site security and safety or a legal obligation, recorded as a mandatory notice; optional uses use consent (§8.4); the controller records its basis |
| s5 consent | Freely given, specific, informed, unambiguous; demonstrable; as easy to withdraw as to give; no undue pressure | `legal_basis_code` and acknowledgement evidence (§8.4); entry is never conditioned on optional consent |
| s6 children (under 18) | Parent or guardian consent or another listed basis; reasonable verification | Visitor categories and the privacy notice let a controller set a minors rule; no child-specific profiling |
| s7 special categories | Prohibited unless safeguards, including explicit consent or another listed ground | Health, religious belief, trade-union, biometric and similar data are off by default; the visit itself can reveal health or belief at clinics and faith-based organisations, so for those sectors purpose and free text default to restricted and a DPIA runs first (§8.2). Biometrics are not collected |
| s11 automated decisions | No decision significantly affecting a person based solely on automated processing, without human intervention | RBA guardrail: no automated denial; human override with reason (§3.2) |
| s16 transparency | Identity, basis and purposes, categories, recipients, means to exercise rights, in plain language | Privacy notice at the kiosk and on the phone before any capture (§7.3, §8.4) |
| s17 privacy by design and default | Examine impact first; privacy-friendly defaults | Default-off sensitive fields, per-organisation tenancy, default retention, pre-capture notice |
| s18 security | Appropriate technical and organisational measures: pseudonymisation and encryption, confidentiality, integrity, availability, resilience, timely restore, regular testing | §14, §16, §17; evidence in §21.2 |
| s19 accountability | Able to demonstrate compliance | Audit chain, evidence packs, ISMS records (§19) |
| s20 records of processing | Written record: controller details, purposes, data subjects and categories, recipients, erasure limits, security measures | A record of processing activities for Checkpoint as processor and as controller is maintained in `docs/` and listed in the evidence pack; customers receive the template for their own |
| s21 DPIA | Before large-scale special-category processing, systematic monitoring of a publicly accessible area, or profiling | Trigger list in §18.7 |

### 18.4 Data-subject rights

| Right (Bill) | Mechanism |
|---|---|
| Access and information (s8): confirmation, controller identity, purposes, source, recipients, transfer intent, copy; free; within one month, extendable by one month with reasons; reasoning behind processing on request | `visitor.data_request.manage`; packaged export scoped to the one subject; received date, due date and any extension reason derived from the status log; due-soon and overdue shown to the Compliance Officer and in the weekly summary (§8.5) |
| Rectification, erasure, restriction (s9): without excessive delay and free; communicate to recipients | Correction and account-deletion request types; disposal path; legal hold overrides erasure only for a documented lawful exception; the customer notifies its other recipients |
| Objection, including direct marketing (s10) | No marketing use of visitor data; optional consent items are revocable |
| Automated decisions (s11) | §3.2 |
| Assistance from the authority, representation, compensation (s12 to s14) | Information in the privacy notice and the customer's contact route |
| Alteration to defeat access (s39 offence) | Audit events and exports are immutable; an export request is never answered from edited data |

### 18.5 Cross-border transfers (s24)

Processing in Frankfurt (database, storage, AI gateway) and Amsterdam (API) is a transfer outside Namibia. A transfer needs an appropriate level of protection through the receiving country's law or binding safeguards, assessed on the nature of the data, purpose and duration, the receiving country's law and the recipient; the assessment is documented and available to the authority. Checkpoint maintains that assessment and the subprocessor register (including BulkSMS Namibia, the mailbox provider, Sentry, PostHog, Vercel and Railway, with each one's processing location), reviews it quarterly (§21.6) and reflects it in the Privacy Policy.

### 18.6 Breach notification (ss22 and 23)

A controller notifies the authority without undue delay and within 72 hours of becoming aware, unless the breach is unlikely to result in a high risk (with reasons for any delay), and notifies the affected people without undue delay where the risk is high, unless the data was rendered unintelligible by encryption, the risk is no longer likely, or the effort would be disproportionate (public communication instead). A processor notifies the controller without undue delay. The notification states the nature, categories and approximate number, likely consequences and measures; every breach is documented with facts, effects and remedial action. §17.4 implements the processor duty, and the encryption exemption makes §14.3 a breach-notification control, not only a security one.

### 18.7 DPIA triggers and processing record

A DPIA (necessity and proportionality, risks, measures) is completed before: a deployment that processes special-category data at scale (healthcare, faith-based, community organisations); systematic monitoring of a publicly accessible area at scale; any profiling feature; photo capture or ID capture enabled for a site; a new subprocessor outside Namibia. The authority will publish its own list (s21(4)); until then this list stands. The record of processing is reviewed with each release that adds a data category.

### 18.8 Authority, registration, offences

The Bill creates an independent Data Protection Supervisory Authority with investigation, enforcement, fining and ban powers (ss25 to 35) and registration fees based on turnover and staff numbers (s37). Checkpoint registers as a controller and as a processor if and when required, and tells customers which entity to register. Unlawful obtaining, retention or disclosure of personal data is an offence (s38) and is reflected in the staff access policy and break-glass rules (§5.4).

## 19. ISO/IEC 27001:2022

### 19.1 Position

Checkpoint's controls are **aligned to ISO/IEC 27001:2022**, with a Statement of Applicability (Annex B) covering all 93 Annex A controls. The product and the organisation behind it follow the clauses 4 to 10 requirements. No certificate is held, and no document says certified, compliant or accredited (§1.4). Whether to seek certification is an **Owner decision** (§31). The mapping gives the SOC 2 programme (`BUFFR_SOC2_PROGRAMME.md`, route: ISAE 3000 Type 1, then Type 2) and ISO 27001 one control set instead of two. ISO 27001 clauses 4 to 10 cannot be excluded; Annex A controls can be excluded only with a justification.

### 19.2 Scope and boundary

The ISMS belongs to Buffr Financial Services CC (the legal entity behind Buffr Checkpoint). The scope statement, kept as documented information (cl. 4.3), covers: design, development, operation and support of the Buffr Checkpoint service (kiosk, API, admin, ops console, website) and its supporting infrastructure accounts; the staff and contractors who work on it; interfaces to subservice organisations (Neon, Railway, Vercel, GitHub, Namecheap, the mailbox provider, Sentry, PostHog, BulkSMS Namibia and Adumo as payment page provider). Out of scope: other Buffr products, until Checkpoint relies on them (Buffr ID joins the boundary when Checkpoint signs in through it); customer-operated devices and networks (complementary customer controls, `docs/system-description.md` §7). Interested parties: customers and their visitors, regulators (the data protection authority, CRAN, the Bank of Namibia for payment-system customers), subservice vendors, staff, owners, auditors.

### 19.3 Clause map

| Clause | Requirement in short | Where Checkpoint meets it | Owner |
|---|---|---|---|
| 4.1 Context | External and internal issues | §1, §22, §30 (risks), `docs/system-description.md` | Owner |
| 4.2 Interested parties | Parties and their requirements | §19.2; customer contracts; §22 | Owner |
| 4.3 Scope | Boundaries as documented information | §19.2 | Owner |
| 4.4 ISMS | Processes and interactions | §19.6 | Owner |
| 5.1 Leadership | Policy, resources, integration, direction | Owner approves policy set and objectives; resources recorded in the programme | Owner |
| 5.2 Policy | Appropriate; objectives; commitments; communicated; available | POL-IS-01 (§21.3); published summary at `/.well-known/security.txt` and the Privacy Policy | Owner |
| 5.3 Roles | Responsibilities and authorities assigned and communicated | §5; ISMS roles named in the programme | Owner |
| 6.1.1 Risks and opportunities | Plan actions | §30.2 risk register; programme closure order | Owner |
| 6.1.2 Risk assessment | Criteria, consistent results, identification with risk owners, analysis, evaluation | §19.4 | Risk owners |
| 6.1.3 Risk treatment | Options, necessary controls, comparison with Annex A, Statement of Applicability, treatment plan, owner approval | §19.4, Annex B | Risk owners |
| 6.2 Objectives | Measurable, monitored, communicated, planned | §19.5 | Owner |
| 6.3 Planning of changes | Changes made in a planned manner | Pull requests with evidence checklist and CODEOWNERS on access, guard, auth and migration paths (§34) | Engineering |
| 7.1 Resources | Provide what the ISMS needs | Programme budget decisions | Owner |
| 7.2 Competence | Determine, ensure, act, retain evidence | §21.4 matrix and records | Owner |
| 7.3 Awareness | Policy, contribution, implications of non-conformity | Induction pack; policy acknowledgement | Owner |
| 7.4 Communication | What, when, with whom, how | Incident and customer-notification rules (§17.4); release notes | Owner |
| 7.5 Documented information | Identify, format, review and approve, control, retain | §19.6; archive of superseded versions | Owner |
| 8.1 Operational control | Plan, implement, control; outsourced processes controlled | §32 runbook; supplier register | Engineering |
| 8.2 Risk assessment (operation) | At planned intervals and on significant change | Annually and on a trigger list (new data category, subprocessor, region, capability, incident) | Risk owners |
| 8.3 Risk treatment (operation) | Implement the plan; keep results | Treatment plan with status per action | Risk owners |
| 9.1 Monitoring and measurement | What, how, when, who, evaluate | §10.3 targets, ops health panel, evidence calendar (§21.6) | Owner |
| 9.2 Internal audit | Planned, objective, reported | §19.7 | Internal auditor |
| 9.3 Management review | Inputs, results, retained evidence | §19.7 | Owner |
| 10.1 Continual improvement | Suitable, adequate, effective | Decision log (§35); review outputs | Owner |
| 10.2 Non-conformity | React, find cause, correct, check effectiveness, retain | §19.7 | Owner |

### 19.4 Risk method

- **Assets** are the inventory of §20.1 (information, people, equipment, systems, infrastructure, services). Assessing every item on that list satisfies the asset inventory control and the risk assessment in one exercise.
- **Criteria.** Likelihood and consequence are each scored 1 to 5 against fixed descriptions (for likelihood, from "less than once in five years" to "monthly or more"; for consequence, from "no customer impact" to "personal data exposed or a regulator notified"), multiplied to a score, and banded low (1 to 5), medium (6 to 12), high (13 to 25). Banded actions are fixed in the criteria: low is accepted and watched, medium is treated within the next quarterly cycle, high is treated first and needs owner approval of any residual risk. Repeating the assessment must give comparable results, so the criteria and an example per band are recorded.
- **Identification** is systematic: for each asset or process, check confidentiality, integrity and availability loss, common threats, vulnerabilities and current controls; record a named risk owner. External auditors expect the record, the owner and the criteria.
- **Treatment options:** avoid (stop the activity), remove (eliminate the source), change likelihood, change consequence, transfer (outsource to a more capable party, with supplier assurance), accept (an informed decision approved by the owner). Every option except acceptance ends in one or more controls. Controls are compared with Annex A so none necessary is omitted; additional controls outside Annex A are allowed.
- **Treatment plan** lists each action with owner, due date and status, approved by the risk owners together with acceptance of residual risk.
- **Review:** at least annually, and when a treatment action completes, assets or processes change, a new risk appears, or experience changes a likelihood or consequence. Inputs include threat intelligence (5.7), technical vulnerabilities (8.8), secure development (8.25) and supplier changes (5.22).
- **Home.** Risk register, treatment plan and Statement of Applicability live in the workspace-ops database (`workflow_run`, `workflow_step_log`, `finding`) and in `docs/`, not in new product tables (§19.6).

### 19.5 Objectives

Each objective is measurable, consistent with the policy, monitored, communicated and carries what, who, when and how it is evaluated.

| Objective | Measure | Target |
|---|---|---|
| Contain incidents quickly | Time to first response by severity (§17.4) | Sev 1 within 1 hour, Sev 2 within 4 hours |
| Keep evidence intact | Audit chain verification | 100% of organisations verify clean from the first unforked event |
| Keep devices governed | Devices approved before activation | 100% |
| Keep analytics trustworthy | ETL reconciliation difference | 0 |
| Fix vulnerabilities on time | Findings closed inside the SLA of §17.3 | 100% or a recorded exception |
| Prove recovery | Successful restore tests | At least 2 a year, and quarterly rehearsal on a branch |
| Keep people competent | Required competence records present | 100% before unsupervised operation |
| Keep suppliers assured | Subservice vendors with an assurance report or documented review | 100% of in-boundary vendors |
| Protect personal data | Secrets and keys present and strong in production | Verified at every deploy |

### 19.6 ISMS records and documented information

Documented information is identified (title, date, author, reference), reviewed and approved, access-controlled, version-controlled, retained and disposed of. It lives here:

| Record | Home |
|---|---|
| Scope, policy set, procedures | `docs/` (system description, incident response, record of processing, policies) and this blueprint |
| Programme, decisions, closure order, evidence model | `buffr-ai/BUFFR_SOC2_PROGRAMME.md` |
| Risk register, treatment plan, findings, audit and review results | Workspace-ops database (project `buffrcheckpoint`); no root-level report files |
| Evidence collection | `scripts/compliance/collect-evidence.mjs` output in `.evidence/` |
| Statement of Applicability | Annex B |
| Competence records and acknowledgements | `staff_training_acknowledgements` and the matrix in §21.4 |

### 19.7 Internal audit, management review and corrective action

- **Internal audit.** A planned programme with criteria and scope per audit, auditors who are competent, impartial and given the time, results reported to management. Frequency follows risk: processes that perform poorly or manage the most significant risks are audited more often. The programme covers all ISMS processes over a three-year cycle. An audit tests both conformity to the standard and to Checkpoint's own requirements, and whether controls are effective.
- **Management review** at planned intervals (at least quarterly in the governance cycle, §21.1). Inputs: status of earlier actions; changes in issues and interested parties; performance trends (non-conformities, measurements, audit results, objectives); interested-party feedback; risk assessment and treatment status; improvement opportunities. Outputs: decisions on improvement and changes to the ISMS, minuted with owners and dates. Existing meetings may cover inputs; a table shows which meeting covers which input.
- **Non-conformity and corrective action.** React and contain; evaluate the cause (a "five whys" analysis for events scored medium or high); check whether similar cases exist; implement and review the effectiveness of the action; change the ISMS if needed; retain the record (what occurred, consequences and mitigation, root cause, action, effectiveness).

### 19.8 Relationship to other frameworks

| Framework | Relationship |
|---|---|
| SOC 2 (security and confidentiality; ISAE 3000) | Same controls; Annex B has a criterion column. The system description (DC 200 form) is the shared narrative |
| ISO 55001 and 55002 | Asset-management lens on devices, credentials, information and software (§20) |
| NIST CSF 2.0 | Profile, risk register, role clarity, action plans and continuous improvement; used for the target profile cycle |
| Data Protection Bill | Annex C crosswalk; privacy controls 5.34, 8.10, 8.11 and the transfer assessment |
| PSD-12 | Resilience benchmark for regulated customers (§17.5) |

Climate-change relevance is determined under clauses 4.1 and 4.2 in the amended standard (the NQA guide records the 2024 amendment; the copy of the standard on file predates it). For Checkpoint the determination is recorded as: not a material driver for a cloud-hosted service, relevant only through supplier regions and power continuity at customer sites.

## 20. Asset management (ISO 55001 and 55002)

ISO 55001:2024 specifies requirements for an asset management system; ISO 55002 is guidance, not a certification standard, and is used when sizing the system for SME versus enterprise customers (scale documentation to asset criticality). Checkpoint is not only software: it is a managed portfolio of physical, digital, information, contractual and trust assets.

### 20.1 Portfolio

| Asset class | Examples | Owner | Key lifecycle risk |
|---|---|---|---|
| Physical devices | Tablets, kiosks, NFC readers, printers, UPS, mounts | Customer or Checkpoint by contract | Theft, loss, patch failure, unsupported OS |
| Credentials | NFC badges, contractor tokens, QR invitations | Customer | Cloning, expiry failure, wrong assignment |
| Information | Visitor records, audit logs, retention rules | Customer as controller, Checkpoint as processor | Privacy breach, over-retention, unauthorised access |
| Software | Kiosk app, API, admin, integrations | Checkpoint | Vulnerabilities, supply chain, debt |
| Trust | Certificates, signing keys, verifier permissions | Checkpoint or customer | Misuse, expiry, compromise |
| Service | SMS provider, cloud tenancy, support contracts | Checkpoint | Lock-in, outage, cross-border exposure |
| Operational | Procedures, training, playbooks, registers | Both | Policy not embedded in practice |

The four principles apply: **value** (measurable privacy, reception, evacuation and audit outcomes), **alignment** (configuration matches site risk, policy and obligations), **leadership** (a named executive control owner per customer, not only reception) and **assurance** (evidence that devices, controls, retention and permissions work as designed).

### 20.2 Lifecycle

```text
PLAN      site risk assessment, use cases, privacy review
SELECT    hardware, reader, MDM, connectivity, supplier due diligence
VERIFY    CRAN type approval or exemption before import or deployment
ACQUIRE   asset tag, serial capture, warranty, configuration baseline
DEPLOY    MDM enrolment, encrypted kiosk app, role policy, acceptance test
OPERATE   check-in, verification, offline sync, notification, access records
MAINTAIN  patches, reader tests, certificate renewal, UPS checks, spare readiness
ASSURE    access review, retention test, device compliance review, restore test
RETIRE    credential revocation, wipe, MDM removal, disposal certificate
```

Acceptance checklist before a device reaches a site: model assessed for CRAN approval or exemption; supplier evidence stored; asset-tagged and assigned; MDM enrolled and kiosk mode on; supported OS and firmware; full-disk encryption; local encrypted cache tested; NFC reader tested against approved credential types; privacy screen and mount where required; UPS assessed for critical sites; offline-to-online sync tested; secure wipe tested; spare-device process documented.

### 20.3 Measures

Devices enrolled in MDM; devices on a supported OS and patch level; kiosk availability by site; offline queue age; successful sync rate; NFC revocation time; records retained beyond policy; privileged-access events; evidence-pack generation time; recovery-test success; check-in completion by channel (inclusion, not only speed).

### 20.4 Documented-information register (ISO 55001:2024)

| Clause | Documented information | Checkpoint artefact |
|---|---|---|
| 4 Context | Interested parties, scope, portfolio boundary | §1 to §3, §19.2, §20.1 |
| 4.5 Decisions | Decision framework and criteria | §3.2, access policies |
| 5 Leadership | Asset management policy, roles | POL-AM-01; customer executive owner plus Checkpoint roles in contracts |
| 6.1 Risk and opportunity | Actions | §30.2 |
| 6.2.1 SAMP | Strategic asset management plan | Outline below; a controlled copy is maintained per customer addendum |
| 6.2.2 Plans | Asset management plans | Deploy checklists, MDM baselines |
| 7 Support | Competence, knowledge, document control | §21.4, runbooks |
| 8 Operation | Lifecycle control, change, outsourcing | §15, §32 |
| 9 Performance | Monitoring, KPIs, internal audit, management review | §10.3, §19.7, §21.1 |
| 10 Improvement | Non-conformity, corrective and predictive action | §19.7, decision log |

SAMP outline: objectives tied to privacy, inclusion and audit readiness; decision framework (risk tier, channel, assurance, access decision); asset classes in and out of scope; value criteria (availability, sync health, retention, evacuation readiness); contingencies (offline, spare devices, power, continuity kit); improvement inputs from the quarterly review; alignment to resource plans (lease or purchase, MDM seats).

## 21. Governance and assurance

### 21.1 Quarterly governance cycle

```text
Quarterly review
  -> risk register, incidents, supplier performance
  -> product and security roadmap decisions
  -> control testing and privacy review
  -> leadership reporting
  -> action ownership and remediation tracking
```

The method is Assess, Design, Implement, Assure: a control only matters if it works in daily operation ("have we mistaken policy approval for policy implementation?").

### 21.2 Customer assurance pack

For regulated customers: architecture diagram, data-flow map, RBAC matrix, retention policy report, access-log extract, device inventory, patch and MDM compliance report, offline-sync exception report, incident register, vulnerability management summary, supplier register, disaster-recovery test evidence, identity-verification configuration status, annual control-effectiveness report. Today the generated pack holds the RBAC matrix, retention report, audit extract and visitor-access extract (§10.2); the rest are produced from the same sources on request.

### 21.3 Policy and procedure register

| ID | Document | Owner | Review |
|---|---|---|---|
| POL-AM-01 | Asset management policy | Checkpoint and customer | Annual |
| POL-IS-01 | Information security and privacy policy | Checkpoint | Annual |
| POL-AC-01 | Acceptable use and staff access policy | Customer | Annual |
| POL-RP-01 | Relying-party practice statement (inactive until DigiNam or e-ID is live, §24.6) | Checkpoint | Annual or on provider change |
| PROC-DEV-01 | Device acquisition, CRAN gate, MDM enrolment, retirement | Checkpoint ops | Semi-annual |
| PROC-INC-01 | Security incident response (`docs/incident-response.md`) | Checkpoint | Annual and after incidents |
| PROC-DR-01 | Backup, restore, failover | Checkpoint | Semi-annual test |
| PROC-DSAR-01 | Data-subject request handling | Customer and Checkpoint | Annual |
| PROC-RET-01 | Retention and deletion execution | Customer | Annual |
| PROC-ONB-01 | Customer onboarding and evidence | Checkpoint customer success | Annual |
| FORM-ACK-01 | Visitor acknowledgement record specification | Product | With schema releases |
| REG-RISK-01 | Enterprise risk register | Leadership | Quarterly |
| REG-SUP-01 | Supplier and subprocessor register | Checkpoint | Quarterly |
| REG-DEV-01 | Device compliance register | Checkpoint and customer | Continuous |
| REG-ROPA-01 | Record of processing activities (§18.3) | Checkpoint | With each data-category change |

There is no Buffr Certificate Practice Statement or Certificate Policy: those are artefacts of accredited certification service providers (§24).

### 21.4 Training and competence matrix

Competence must be evidenced before unsupervised operation of kiosks, credentials or exports. Modules: A privacy and electronic-transactions acknowledgement; B kiosk operations; C host screening; D devices and MDM; E DigiNam and e-ID (when live); F emergency roster.

| Role | A | B | C | D | E | F | Frequency |
|---|---|---|---|---|---|---|---|
| Front-desk operator | Required | Required | Awareness | Awareness | Awareness | Required | On hire and annual |
| Host | Required | n/a | Required | n/a | Awareness | Awareness | On hire and annual |
| Site manager | Required | Required | Required | Required | When enabled | Required | Annual |
| System administrator | Required | Awareness | n/a | Required | When enabled | Awareness | Annual |
| Compliance or audit officer | Required | Awareness | Awareness | Awareness | When enabled | Awareness | Annual |
| Buffr platform support | Required | Required | Awareness | Required | Required | Required | Semi-annual |
| Installer or field technician | Required | Required | n/a | Required | n/a | Awareness | Per engagement |

Records: trainee, modules, date, assessor, result. Delivery may be instructor-led, learning-management or supervised shadowing. The Owner-Operator launch acknowledgement (§7.9) does not stand in for these records.

### 21.5 Continuity practice statement

**Purpose.** Keep visitor check-in, host-notification intent and the emergency roster available within the agreed targets without reverting to an open shared paper register. **Scope.** API, admin, kiosk, the encrypted offline outbox, the notification outbox, MDM-managed devices and approved telecom channels when live; customer door controllers and other identity providers are out of scope until contracted. **Objectives.** As §16.3 and §17.5. **Strategies.** Offline kiosk capture with idempotent sync; honest degraded UX; spare pre-enrolled devices and a wipe procedure; the continuity kit (§6.5); SMS only through an active provider arrangement, otherwise assisted entry; encrypted backups with restores tested on the calendar of §21.6. **Invocation.** An incident commander (Checkpoint operations or the customer's site manager, by contract) declares degraded mode, records the incident, notifies affected sites and opens a post-incident review within five business days.

### 21.6 Evidence calendar

| Cadence | Evidence or activity | Owner |
|---|---|---|
| Continuous | Capability evidence before any `live` claim; device CRAN gate | Platform support |
| Weekly | Offline queue age; failed notification review | Operations |
| Monthly | Privileged access review sample; MDM patch compliance; evidence close | Security |
| Quarterly | Governance cycle (§21.1); risk register and treatment plan; supplier and subprocessor register; transfer assessment; restore rehearsal on a branch | Leadership |
| Semi-annual | Disaster-recovery restore test; installer competence refresh | Operations |
| Annual | Customer assurance pack; policy set and SAMP review; risk assessment; internal audit programme update; management review; training renewals; RPPS review when active | Compliance and customer success |
| On provider or statute change | Re-validate trust anchors; marketing wording audit; update §22 and Annex C | Product and counsel |

---

# Part 6: Regulatory and government

## 22. Law map

What applies directly, and what informs the design. "Designed to support" is the strongest wording unless an independent assessment says otherwise (§1.4).

| Framework | Relevance | Product implication |
|---|---|---|
| Electronic Transactions Act 4 of 2019 | Most provisions in force from 16 March 2020 (GN 75/2020); section 20 and Chapter 5 from 15 June 2026 (GN 182/2026, GG 8949); Chapter 4 not commenced. Signature and accreditation regulations in force with them | Record integrity and computer evidence (ss17, 19, 24, 25, 33). Kiosk capture defaults to acknowledgement evidence (§25) |
| Namibia Data Protection Bill | Draft text on file (§18.1) | Privacy by design now: minimisation, purpose limitation, retention, access control, deletion workflow, processor terms, transfer assessment |
| POPIA (South Africa) | Not a Namibian obligation; strong regional benchmark | POPIA-style safeguards for cross-border customers; no POPIA compliance claim |
| PSD-12 | Applies to persons within the National Payment System, FMIs, PSPs, authorised entities and FinTech-framework participants | Support their supplier-risk, data-security, resilience, audit and incident obligations (§17.5); never claim compliance |
| NPS Vision and Strategy 2030 | Strategic: user-centricity, trust and resilience, digital enablement, innovation | Position as privacy-preserving, inclusive and DPI-compatible, not as a payment product |
| Communications Act 8 of 2009 and CRAN | Type approval of telecommunications equipment; operators and aggregators; Root CA for NPKI | Device gate (§15.1, §23); no telecom-operator role |
| DigiNam and NPKI | National trust infrastructure; separate from the physical e-ID card | Relying-party adapter, gated (§24) |
| NamCode | Governance benchmark: board oversight, risk, IT governance, compliance, internal audit, stakeholders, integrated reporting | Supports the business case; governance cycle (§21.1) |
| ISO/IEC 27001:2022 | Information security management | §19, Annex B |
| ISO 55001 and 55002 | Asset management system requirements and guidance | §20 |
| NIST CSF 2.0 and SP 1308 | Risk and workforce profile framework | Target profile, risk register, role clarity, continuous improvement |
| Public Procurement Act 15 of 2015 | Commercial entry to public bodies | §26 |
| Access to Information Act 8 of 2022 | Enacted; commencement awaits Gazette notice | Redacted, reason-coded, audited disclosure (§26.2) |
| National Digital Strategy 2025 to 2028 | Citizen-centric services, digital inclusion | Assisted entry, offline capture and multilingual interfaces are strategic necessities |

## 23. CRAN and devices

The Communications Regulatory Authority of Namibia regulates communications equipment, spectrum and licensing under the Communications Act and operates the Root Certification Authority. For Checkpoint it matters for connected hardware, NFC readers and badges, SMS services and the national trust ecosystem.

Type approval generally applies to telecommunications equipment imported, sold, offered for sale, connected to or used with a network in Namibia. Assess the actual SKU, never assume.

| Component | CRAN consideration | Action |
|---|---|---|
| Android tablet with Wi-Fi, Bluetooth or SIM | Telecommunications equipment | Use locally type-approved models or keep approval evidence per SKU |
| Cellular router | Telecommunications equipment | Confirm approval before import or deployment |
| Bluetooth NFC reader | Possibly telecommunications equipment | Confirm the exact model is approved or exempt |
| USB NFC reader | May fall outside radio-device rules; assess by specification | Vendor declaration and CRAN status |
| NFC tags and cards | Generally low-power short-range | Confirm chip frequency and power and whether the exemption applies |
| Badge printer | Not telecom unless wireless | Review any wireless component |
| Mount, privacy filter, UPS | Not communications devices | Normal asset procurement |

CRAN's regulations indicate 13.56 MHz NFC readers within low-power limits may be exempt. That is not a blanket exemption: confirm frequency, radiated power, connectivity features and import or sale status. Evidence goes into the Device Compliance Register and the deployability gate (§15.1). Open written questions to CRAN, whose answers update this section and the capability register only when confirmed: the relying-party onboarding note, a device category assessment for the kiosk bill of materials, and the telecom provider guidance note.

Checkpoint is not a telecommunications operator. SMS runs through an authorised provider (§12.4). Do not build a path from a handset into Checkpoint that bypasses the provider.

### 23.1 Checkpoint-supplied tablets (add-on hardware)

The hardware add-on is custom Android tablets with the kiosk application loaded, sold by Checkpoint. Checkpoint would then be the importer and seller of telecommunications equipment, which changes its position from recorder of a customer's device evidence to holder of the approval itself. Rules:

1. **No import, no sale, no price, no quote** until CRAN type approval is held for the exact tablet model (and any radio component sold with it, such as a cellular router or a Bluetooth reader). Until then the add-on is described only as "planned" and is not on the sell sheet, the pricing page or any tender response.
2. **Sequence:** choose a supplier and a candidate model; obtain the supplier's technical documentation, radio test reports and declarations; confirm with CRAN, in writing, the application route, fees, documents and timelines, and whether Checkpoint applies as importer or the supplier applies; apply; receive the approval; record it in the Device Compliance Register (CRAN certificate reference and evidence artifact); only then place an import order and quote customers. Re-apply or confirm coverage for any change of model, radio module or firmware that changes radio behaviour.
3. **Supplier due diligence** is a registered supplier assessment (§21.3, REG-SUP-01): country of manufacture and processing, warranty and repair route, spare-parts and replacement, firmware and security-patch commitment for the support period, MDM compatibility, secure-wipe support, and the ability to ship the exact approved SKU.
4. **Customer-supplied tablets** stay supported: the customer provides the device, and the register records the exemption or approval evidence for that SKU (§15.1). The type-approval burden then sits with whoever imported the device.
5. **Evidence in the register for each supplied unit:** model, serial, approval reference, supplier and import documents, MDM enrolment, firmware, warranty, and the customer and site it was sold to, so a unit can be traced to its approval and recalled.
6. **Open questions for CRAN** (§23): the application route and fees, who may apply, approval validity and renewal, treatment of a kiosk-configured device versus its base model, labelling requirements, and whether sales from stock need a licence beyond type approval. These are answered in writing before any commitment.

Commercial effects: the add-on is hardware sold or leased (§28.1), never inside a subscription; the lead time and cost of approval and import are part of the add-on's price; and the capability is gated like any other (a status in the capability register would be needed before it is marketed).

### 23.2 Hardware and peripherals: register and candidate suppliers

Candidates only, found by public search on 2026-10-08. None has been contacted, quoted or assessed, and none is endorsed. Each must pass the supplier assessment of §23.1 (3) before an order, and approval is held per exact SKU, never per brand.

**Regulatory path (CRAN).** The Type Approval Regulation of 21 August 2023 (Government Gazette 8180) requires manufacturers, importers, distributors and individuals to hold a certificate for equipment that transmits or receives radio frequencies and connects to a network; CRAN states a processing time of 40 days. This is stated from CRAN's public material and must be confirmed with CRAN in writing (§23.1 (2)). The owner has made a CRAN application before, which fixes the route for the tablets.

| Item | Needs CRAN approval? | Requirements to put to the supplier | Candidate suppliers (verify each) |
|---|---|---|---|
| Kiosk tablet (Android, Wi-Fi, Bluetooth, optional SIM, NFC) | Yes, per SKU | Android Enterprise or MDM support, security-patch commitment for the support period, replaceable or serviceable battery, IP rating for the site, firmware lock for kiosk mode, radio test reports and declarations | Branded rugged: Samsung Galaxy Tab Active5 Enterprise Edition (IP68, 3-year warranty and one year of Knox Suite per the Bechtle listing); Zebra rugged tablets (Zebra's South African distributor is Rectron since 2020). Custom or wall-mount ODMs in Shenzhen (PoE, NFC, 24/7 use): Shenzhen TPS Industry Technology, Shenzhen Hopestar Sci-Tech, Shenzhen Pretech Industrial, Shenzhen Electron Technology |
| Cellular router or modem | Yes | Approval evidence for the exact model, remote management | Via the tablet or network supplier |
| Bluetooth NFC reader | Likely | Per-SKU approval or documented exemption | ACS (Hong Kong manufacturer, ships to 100+ countries; ACR122U and ACR1252U are common models); Feitian |
| USB NFC reader (13.56 MHz) | Assess by specification; low-power 13.56 MHz may be exempt (§23) | Frequency, radiated power, vendor declaration, driver support on Android | ACS (ACR1252U and USB-C variants); HPRT also lists RFID readers |
| Barcode and QR scanner | Only if wireless | USB HID mode for kiosk use, QR support, scan-time rating | Zebra, Honeywell, Newland (China); Zebra product via Rectron or ComX Computers |
| Badge printer | Only if wireless | Card or label media supported, Android print path or SDK, driver licence terms | Zebra (ZD series; Rugged SA and ComX Computers list them in South Africa), Brother (Brother South Africa runs a distributor network for Sub-Saharan markets), HPRT (Xiamen Hanin, OEM and ODM, 80+ export countries), Xprinter, Rongta, SPRT |
| Mounts, privacy filters, UPS | No | Normal procurement | Local suppliers |

**Sourcing routes.**
- *Namibia and South Africa:* ComX Computers (South Africa, collection offered to customers in Namibia), Rectron (Zebra distribution), Rugged SA (Zebra industrial printers). No Windhoek-based authorised reseller was confirmed for Zebra, Samsung or ACS; ask each manufacturer for its partner list for Namibia.
- *China and Hong Kong, direct from the manufacturer:* a Chinese ODM can build the exact kiosk specification but then Checkpoint is importer of record, with the CRAN approval, customs and warranty duties of §23.1; branded units from a local distributor move part of that burden to the distributor. Choose per volume.

**Register fields per unit** (Device Compliance Register, §15.1): model, serial, supplier, CRAN certificate reference and date, radio parts, import documents, MDM enrolment, firmware and patch end date, warranty, customer and site.

**Selection rule.** Shortlist one branded tablet and one ODM tablet, request radio test reports and a CRAN-route statement from each, compare landed cost plus approval cost plus support, then choose (**Owner decision**, §31 item 9).

## 24. DigiNam, NPKI and e-ID

### 24.1 Two separate facts

1. **DigiNam and the National PKI** are the national certificate-based digital-trust infrastructure, with CRAN as Root CA. CRAN's July 2026 roadmap shows Policy and Governance, Legislation and Regulation, Root CA and Trust Infrastructure, Adoption and Integration and Go Live as completed, accreditation of providers and Sustain as ongoing, with MHAISS (Ministry of Home Affairs, Immigration, Safety and Security) as the first accredited certification service provider, for e-ID rollout.
2. **The e-ID smart card** is a separate physical card project under MHAISS, targeted for rollout from September 2026. CSP accreditation governs national issuance, not Checkpoint's verification. Cards may not be in circulation at every site.

These must never be conflated. The national programme being live is not Checkpoint's relying-party integration being live.

### 24.2 Four-layer separation

| Layer | What Checkpoint may say | Evidence |
|---|---|---|
| National direction | "Namibia is building NPKI under CRAN as Root CA; MHAISS is the first accredited CSP for e-ID rollout" | CRAN presentation |
| National operational facts | Root CA, regulations, Go Live and MHAISS accreditation as shown on CRAN slides; revocation and relying-party interface details still need written confirmation | CRAN slides plus written follow-up |
| Checkpoint relying-party integration | "Built to support DigiNam/NPKI verification where formally enabled" | Approved relying-party arrangement and tested interface |
| Forbidden without approval | "DigiNam integrated or verified", "National e-ID NFC live on Checkpoint", "Government identity verification via Checkpoint today" | Capability `live` and organisation enablement |

### 24.3 Relying-party model

```text
CRAN (Root CA)
  -> accredited CSP (MHAISS for e-ID issuance)
  -> approved verification response or credential
  -> Buffr Checkpoint as relying party (never a CSP)
  -> customer organisation as access decision-maker
```

Checkpoint does not become a certification service provider, certificate issuer or identity authority. Before any verification feature launches: confirm the approved interface; relying-party registration (customer, Checkpoint or both); certificate validation, revocation and expiry rules; a privacy and data-flow assessment; exactly which attributes may be requested; minimum retention (outcome, reference, assurance level, timestamp, expiry, released attribute codes only); penetration and interoperability testing; incident escalation with CRAN, the provider and the customer; updated contract, privacy notice and evidence pack. An offline tap must never be shown as verified when revocation needs connectivity.

### 24.4 Capability register

Public claims come from a governed register, not from copy. `platform_capability_approvals` is one platform-wide row per capability (the one tenancy exception, because the status is the same for everyone); `organisation_capability_enablement` is the per-organisation switch layered on top. Platform-capable does not mean customer-approved, and customer-approved does not mean site-permitted.

| Capability (`capability_code`) | Internal status vocabulary |
|---|---|
| `nfc_badge_checkin` | `live` |
| `diginam_verification` | `discovery`, `approved`, `pilot`, `live`, `suspended` |
| `national_eid_nfc` | `discovery`, `targeted`, `pilot`, `live`, `suspended` |
| `qr_invitation_checkin` | `not_started`, `pilot`, `live`, `suspended` |
| `sms_contact_confirmation` | `not_started`, `provider_testing`, `pilot`, `live`, `suspended` |

Public vocabulary (`public_display_status`) is only `not_available`, `targeted` or `live`; every internal state except `live` (and `targeted` for e-ID) reads as `not_available`, and a suspended capability never reads as available. The public endpoint returns booleans-by-name only (`diginamVerification`, `nationalEidNfc`, `nfcBadgeCheckIn`, `qrInvitationCheckIn`, `smsContactConfirmation`) and never evidence references, approver identities, history or organisation enablement.

Rules: a status change needs `evidence_reference`; a move to `live` needs two distinct approvers (primary and secondary, dual approval); only the platform-support role writes it, in the ops console, never in customer admin; customer System Administrators and Compliance Officers manage only their own enablement rows. The kiosk shows the NFC badge tile when the capability is live and enabled, and adds the e-ID tile only when the platform status is `live` and the organisation has enabled it, never as a build-time constant and never greyed. A calendar date arriving (for example the e-ID target month) is not evidence: wording moves to "live" only when the register does. The UI status colours are `--color-status-live` for live and Sodium Yellow for targeted (§33.1).

### 24.5 Permitted wording

| Phrase | Allowed when |
|---|---|
| "NPKI-ready", "designed for DigiNam verification where formally enabled" | Always |
| "Supports certificate validation" | Architecture documents only until the interface is confirmed |
| "Integrates with accredited CSPs" | After a written relying-party onboarding note |
| "Verified digital identity", "DigiNam verified" | Register `live`, organisation enabled, a real verification transaction |
| CRAN, DigiNam or NPKI logos | CRAN prior approval only |

### 24.6 Relying-party practice statement

Checkpoint publishes no Certification Practice Statement or Certificate Policy. The Relying-Party Practice Statement (POL-RP-01) has 12 clauses to complete before any `live` claim: purpose and scope; Checkpoint's role (relying party only); trust anchors (CRAN Root CA store, approved CSP certificates, pinning and update); onboarding (written agreement, interface specification, interoperability evidence); the verification process (request, response, store outcome code, reference, assurance level, expiry and released attribute codes only); prohibited retention (no credential payloads, biometric templates or private keys); revocation and status checking (method recorded before go-live); mapping to V0 to V4 (DigiNam success is V3, official e-ID cryptographic success is V4, failure never upgrades a prior level); permitted claims (register `live` with evidence); forbidden claims (CSP accreditation, recognised signature by default, government endorsement logos); incident response (verifier key compromise, false accept or reject, supplier outage); and evidence retention aligned to the customer's retention version and ETA section 24, reviewed annually. **Activation gate:** the statement stays inactive until the onboarding note exists, the interface is tested, the register shows `live` with evidence, and each organisation enables the capability.

## 25. Electronic Transactions Act

### 25.1 Commencement

| Provision | Topic | Commencement | Relevance |
|---|---|---|---|
| Chapters 1, 2, 3 (except s20), 6, 7 | Core electronic transactions | 16 March 2020, GN 75/2020 (GG 7142) | Data messages (s17), writing (s19), retention (s24), computer evidence (s25), automated systems (s33) |
| s20 | Electronic and recognised electronic signature | 15 June 2026, GN 182/2026 (GG 8949) | Recognised signatures where the regulations are met |
| Chapter 5 | Accreditation of security services and products | 15 June 2026, GN 182/2026 | CRAN accredits CSPs; public accreditation database; s48 offence for holding out |
| Chapter 4 | Consumer protection | Not commenced | Not the frame for B2B visitor management |
| s59 | Repeal of the Computer Evidence Act | First tranche | s25 is the computer-evidence frame |

Subsidiary regulations in force with s20 and Chapter 5: Electronic Signature Regulations GN 335/2025 (GG 8814) and Accreditation Regulations GN 953/2025 (GG 8808, commenced by CRAN General Notice 401/2026, GG 8948). Source PDFs are listed in §25.5.

### 25.2 Terms that matter

| Term | Meaning | Checkpoint posture |
|---|---|---|
| Certification service provider | A person accredited under s42 and the Accreditation Regulations; issues subscriber certificates | MHAISS holds the first accreditation. Checkpoint is not one |
| Electronic signature | Data associated with a data message that identifies a person and shows intent | A kiosk tap or drawn mark may qualify as a basic electronic signature |
| Recognised electronic signature | An advanced signature that meets s20(3) and regulation 8, including a subscriber certificate from an accredited CSP after identification | Not a default claim |
| Relying party | A person who may act on a certificate or electronic signature | Checkpoint's intended role for DigiNam and e-ID verification |
| Security service | Includes issuing digital certificates (s41) | Checkpoint is a relying party only unless it elects CSP obligations |

### 25.3 Acknowledgement is not a signature

| Capture | Typical classification | Checkpoint claim |
|---|---|---|
| Kiosk tap or drawn mark on a policy screen | May be a basic electronic signature (reg 3) | `visitor_policy_acknowledgements` audit evidence only |
| Advanced signature with a qualifying device and CSP path | Advanced (regs 6 and 7) | Not shipped |
| Law requires a "recognised electronic signature" | Reg 8 and Accreditation Reg 30 | Not claimed until an accredited path is integrated and counsel approves |

| Situation | Required level |
|---|---|
| Privacy notice or site visitor policy before capture | Acknowledgement evidence (required) |
| Host approval of a visit | An access decision record, not a signature |
| A statute or contract that says "electronic signature" without a type | Counsel decides; never auto-upgrade a kiosk tap |
| "Recognised electronic signature" required | Blocked until the CSP subscriber-certificate path exists |
| DigiNam or e-ID verification | An assurance outcome (V3 or V4), not a signature |
| Issuing subscriber certificates | Out of product scope |

Permitted: "Visitor acknowledgements are retained as audit evidence under the Electronic Transactions Act record-keeping and computer-evidence provisions." Forbidden: "legally binding e-signatures on every check-in", "Checkpoint is a CRAN-accredited certification service provider", "a kiosk tap equals a recognised electronic signature", and conflating V3 or V4 identity verification with signing a contract. Reserve `digital_signature` as an acknowledgement method for a future confirmed path only.

### 25.4 Evidence

Every visit record carries: visit id, organisation, site, device, capture channel, check-in time, server-acceptance time, offline indicator, assurance level, verification reference where applicable, host or sponsor, purpose category, notice acknowledgement, check-out time, retention policy version, audit references. The system can produce: an authenticated record, the policy in force, the assurance result, the device and operator, the access history, whether it was captured offline and when synchronised, whether and by whom it was amended and why, and proof of retention or disposal. This makes Checkpoint defensible evidence infrastructure, not only a reception tool. For regulated customers, evidence should also hold time-stamping, certificate validation, revocation checks and preservation recommended by CRAN once confirmed.

### 25.5 Reference files

Workspace-local PDFs inform privacy-notice copy, record keeping and kiosk engineering; they do not replace counsel's analysis. Under `bon-application-tool/docs/Regulation & Compliance Resources 2/`: the annotated Electronic Transactions Act, Electronic Signature Regulations GN 335-2025, Accreditation Regulations GN 953-2025, GN 182-2026 and GN 401-2026, NamCode and King V. Also `reglens/reglens/data/Communications Act 8 of 2009.pdf`, `buffrcheckpoint/Namibia_DPA-Bill (1).pdf`, and the ISO and NQA PDFs under `buffr-ai/` for §19.

## 26. Public sector

### 26.1 Procurement

The Public Procurement Act 15 of 2015 is a commercial-entry framework, not a visitor-data law.

| Requirement | Response |
|---|---|
| Formal tenders and evaluations | A tender-ready technical and compliance pack |
| Clear specifications | Standard architecture and device bill of materials |
| Price scrutiny | Transparent subscription, hardware purchase and lease, and support prices |
| Local support | Namibia-based deployment, maintenance, training and support |
| Long-term maintainability | Source-code escrow or continuity provisions for high-value deployments |
| Data sovereignty | Clear hosting, backup, subprocessor and exit documentation (§16.2) |
| Audit | Audit logs, evidence pack, SLA reporting, annual assurance review |

Tender pack: company registration and tax documents; technical and security architecture; CRAN device compliance register; data-flow map; privacy and retention model; offline and continuity design; RBAC matrix; identity-verification integration status statement; SLA and support model; hardware asset lifecycle plan; supplier register; data portability and exit plan; implementation methodology; training plan; annual assurance-report template.

### 26.2 Access to information

The Access to Information Act 8 of 2022 is enacted and awaits commencement. Public bodies still need to balance transparency with visitor privacy. Checkpoint supports record classification, role-specific disclosure, redacted exports, legal holds, reason-coded disclosure, audit of every export, data-minimised reports and a way to separate public-information requests from private visitor data. A public body never answers such a request by exporting a full unredacted visitor register.

### 26.3 Public-sector tenant policy

Government organisations (`organisation_sector = government`) default to the public-sector retention policy, reporting and disclosure posture as an organisation-level policy row (§8.5). The product is otherwise the same.

---

# Part 7: Commercial

## 27. Strategy

**Three-sentence strategy.** We win by governance-grade visitor evidence on one encrypted record, with the public site QR as the default self-service path. We play for regulated and multi-site organisations in Namibia that must replace paper registers without buying tablets first. We win through admin-issued site QR plus assisted front desk, with kiosk, SMS and NFC as optional add-ons on the same architecture, not parallel apps.

### 27.1 Winning aspiration

Become the trusted digital check-in and visitor-evidence standard for regulated, multi-site and inclusion-conscious organisations in Namibia, then expand into Southern and East Africa with the same offline-first, risk-based model, without forcing hardware capital expenditure as the price of entry. Measurable wedge for the default plan: a site prints a check-in QR from admin, runs phone check-in, and covers visitors without a phone through assisted entry, on one encrypted visit record.

### 27.2 Where to play

Namibia first; regulated and high-visitor organisations; public-facing locations; multi-site operations; sites with intermittent connectivity; customers that must show evidence to boards, auditors, partners or regulators. Beachhead segments, in order: banks and financial institutions; government and public service offices; healthcare facilities; critical infrastructure, logistics, mining and utilities; multi-site SMEs and corporate offices (an easier first sales cycle and good pilots). Will not play initially: selling six equal "products", requiring a tablet for the default plan, or marketing any gated capability as live.

### 27.3 How to win

| Choice | In practice |
|---|---|
| Lead with the paper-register risk | Show the exposure safely: one page, many people's data, no audit trail |
| Sell governance, not tablets | The default plan is software: site QR, phone check-in, assisted entry. Tablets and readers are optional hardware |
| QR-first by default | Admin generates the public site QR; visitors use `/check-in` on their phone; zero device spend |
| Inclusion-honest | Assisted check-in is permanent and in every plan |
| Optional fast lanes | Kiosk, SMS and NFC are add-ons on the same record, enabled when the register and the organisation allow |
| Own the offline problem | Most foreign SaaS is cloud-first; Checkpoint stays credible when connectivity fails |
| Risk-based configuration | Each customer gets a tailored site, visit and zone policy, not a generic form |
| Make assurance recurring | A quarterly or annual control review, not only software and hardware |
| Avoid lock-in | Documented APIs, data export, exit support, asset register, transparent integration contracts |

### 27.4 Why Checkpoint

| Capability | Paper register | Generic foreign QR-only SaaS | Buffr Checkpoint |
|---|---|---|---|
| Isolated, private visitor records | No | Yes | Yes |
| Start without a tablet | Yes (paper) | Often | Yes: site QR, phone, assisted |
| Works with no smartphone | Manual only, no privacy or audit | Rarely | Yes: assisted entry; SMS add-on |
| Offline-first | Paper never goes offline but has none of the other properties | No | Yes, with the kiosk (§15.2) |
| Tap-to-check-in (NFC) | No | Rare | Optional entitlement |
| Government e-ID readiness | No | No | Architected; not sold as live until the register says so |
| DigiNam pathway | No | No | Architected; gated |
| CRAN-aware device governance | No | No | Yes, where devices are deployed |
| Retention, audit and evidence | No | Partial | Yes (§8.5, §10.2) |
| Local support and procurement readiness | n/a | Typically none | Yes (§26) |

What we do not copy from benchmark products: a public name lookup for returning visitors (use credentials and references, §8.3); capturing every possible field (minimise by type and risk); photo capture on by default (off, with a documented purpose); one generic workflow for all sites (configure by site, zone and type); visitor management as a facilities tool only (position as privacy, governance, resilience and evidence); cloud-only operation (offline-first); a digital signature treated as legal proof (§25.3); QR-only contactless access.

### 27.5 Competitors and pricing reference

Read from public pricing pages on 2026-09-29; conversions about N$20.5 per EUR and N$17.5 per USD. Re-check before quoting a customer.

| Vendor | Plan | Public price | Approx. N$ per location per month |
|---|---|---|---|
| Vizito | Standard / Pro / Enterprise | EUR 29.95 / 59.95 / 99.95, billed yearly | about 615 / 1,230 / 2,050 |
| Envoy Visitors | Basic / Premium / Enterprise | Free (100 entries a month) / USD 362 billed annually / custom | 0 / about 6,300 / custom |

NamEvents (event ticketing, not visitor management) charges commission on throughput and shows a public fee calculator. What to copy: a public calculator that shows the price for N sites, one price with two ways to set up (self-serve or assisted), plain fee tables. What not to copy: commission on throughput; our customers do not sell visits.

### 27.6 Management systems

| System | Role |
|---|---|
| Subscription catalog | Plans versus add-ons; default-plan features must match shippable surfaces |
| Capability register | Public badges and organisation enablement; never market live ahead of it |
| Pilot metrics (§29.2) | Completion and duration by channel; paper fallbacks; offline-sync success |
| Hardware discipline | Tablets, readers and mounts sold or leased separately, never buried in subscription; Checkpoint-supplied tablets only after CRAN type approval (§23.1) |
| Packaging cadence | Revisit tier copy when a gated capability goes live |

## 28. Packaging and pricing

Public pricing is three plans plus catalog add-ons, billed monthly or annually (ten months for twelve). Names, prices and entitlements below are catalog values (`subscription_catalog_item`, `included_sites`, `extra_site_monthly_amount`), stated here for orientation; the catalog wins (§11.1).

| Offer | Kind | Includes | Best for | List price (NAD per month) |
|---|---|---|---|---|
| **Checkpoint Site** | Plan, 1 site | Public site QR (create, rotate, print), phone check-in, assisted entry, RBAC, encrypted visitor record, sign-out, reports. No tablet needed. Owner-Operator as the only admin role | One office, branch or clinic | 1,500 |
| **Checkpoint Network** | Plan, 3 sites included, N$950 per extra site | Site, plus multi-site dashboard, host notification, pre-registration QR, audit export, site-manager reporting; entitlement to NFC, SMS add-on and kiosk when the register allows | Branch networks, clinic groups, corporate offices | 4,500 |
| **Checkpoint Assure** | Plan, 3 sites included, N$1,500 per extra site | Network, plus visitor assurance levels, high-risk visit policies, compliance dashboard; DigiNam workflow only where approved | Government and regulated institutions | 9,500 |
| Physical access control | Add-on | Access-control integration, contractor credentials, zones, escort rules, emergency roster | Critical infrastructure, large enterprises | 5,000 |
| Controls review and evidence | Add-on | Annual controls review, retention test, RBAC review, recovery test, evidence pack | Assurance-led customers | 4,500 |
| Kiosk or tablet licence | Add-on or Network entitlement | Dedicated Android offline experience and MDM. Software only: the kiosk app on a customer-supplied approved tablet | High-volume doors | Sales-quoted |
| Kiosk tablet (hardware) | Add-on, gated | Custom Android tablet with the kiosk app loaded, sold or leased by Checkpoint. **Not offered until CRAN type approval is held for the model (§23.1)** | High-volume doors | Not priced until approved |
| SMS messaging | Add-on, no monthly fee | N$1.00 per text sent, invoiced monthly; monthly safety limit 1,000 texts | Visitors who prefer a text | Usage-billed |
| NFC fast lane | Network entitlement | Phone-NFC and badge-NFC on the same record | Regulated high-traffic sites | In plan when enabled |

Rules: no free tier and no card-free trial; self-serve setup before payment removes the need for one. Existing customers keep their price until renewal and the old price is recorded in the plan and add-on price snapshot so MRR stays honest. Hardware is never inside a low subscription.

Per extra site stays below the benchmark enterprise price (about N$2,050) so Checkpoint competes on EFT billing, assisted entry, offline operation and Namibian support without being the expensive option per branch. A single Assure site costs less than one benchmark premium location while carrying the compliance and identity features they price as enterprise. Assure includes no DigiNam claim until the register is live.

### 28.1 Revenue streams

| Stream | Logic |
|---|---|
| Assessment and configuration | Site survey, RBA design, field configuration, policy mapping, deployment plan |
| Hardware sale or lease | Custom Android kiosk tablets (gated on CRAN type approval, §23.1), readers, mounts, printers, UPS, spares |
| Per-site subscription | Platform, hosting, updates, support, reporting |
| Messaging | Billed by use, no bundle |
| Integration fee | DigiNam, access control, directory, SSO |
| Assurance retainer | Quarterly or annual control testing and board evidence |
| Training | Front desk, host, security, compliance, administrators |

Contribution per site = subscription revenue minus hosting, support, messaging, device amortisation, reseller and telecom costs and assurance delivery cost. Use purchase, lease or financed hardware for kiosks and readers.

### 28.2 Marginal cost by channel

| Channel | Marginal cost | Position |
|---|---|---|
| Public site QR and phone web | 0 | Default; zero marginal software cost |
| Assisted entry | 0 | Mandatory inclusion path |
| Kiosk or tablet | 0 software; hardware separate | Optional add-on |
| SMS | N$0.30 to N$0.50 bought, N$1.00 charged | Optional add-on, usage-billed |
| QR pre-registration | 0 | Network plan |
| NFC phone | 0 | Entitlement when enabled |
| NFC badge | about USD 0.20 to 0.40 per badge landed | Optional hardware |
| National e-ID | Near zero at launch; cost is integration and testing | Gated |

### 28.3 Costs that decide how many sites are needed

Figures here come from vendor documents on file and are quoted without VAT. The current monthly invoices for Neon, Railway, Vercel, the mailbox, the text-message provider and Cloudflare are not written in this document: they belong in the workspace operations records, and the owner should add the real totals here before any funding request.

| Cost | Per month (NAD) | Source | Equals this many Site subscriptions (N$1,500) |
|---|---|---|---|
| Debit-order service, fixed part (subscription and one user) | 503 | Collexia quote, 2026-10-02 | 0.3 |
| Debit-order service, variable | about 34 per Site collection (2.3 percent) | same | not fixed |
| Rack space at Armada (Paratus), uncaged half cabinet, 0.5 kVA | 8,060 | Paratus price list | 5.4 |
| Rack space, uncaged cabinet, 1 kVA | 12,680 | same | 8.5 |
| Rack space, caged cabinet | 13,280 | same | 8.9 |

Rack space is rent only. Servers, switches, internet transit, a second site and the people to run them are extra (§16.2), so colocation is not a cost the product should carry before a customer needs Namibian residency in writing. The debit-order fixed fee is small enough to take on at about 20 paying sites (§11.5).

## 29. Go-to-market and acceptance

### 29.1 Entry offer

Self-serve signup gated by payment. The primary call to action is **Create account**; the secondary is **See pricing**. The public paper-register review offer is not sold; Contact handles pre-signup questions, multi-site and hardware rollouts, integrations and partnerships. Path: create account, verify email, set up (no payment needed to configure), accept standards, test arrival, choose a plan, pay by EFT with proof or by card, ops confirm, subscription `active`, go-live, then multi-site and hardware add-ons through Contact and an annual assurance retainer.

### 29.2 Pilot design and targets

Do not launch with a nationwide promise. Run 60 to 90 day pilots at three deliberately different sites: an urban corporate office, a high-footfall public or regulated office, and a low-connectivity or rural site. Measure: completion rate; check-in duration by channel; queue length; host-notification success; offline-sync success; operator workload; data-minimisation compliance; visitor satisfaction; paper-register fallbacks; audit-evidence generation time.

First-year planning hypotheses (not forecasts): months 0 to 3 discovery, legal and brand gates, prototype, two design partners; months 4 to 6 core pilot at 3 to 5 sites; months 7 to 9 commercial launch, NFC badges, pre-registration, audit packs; months 10 to 12 15 to 30 active sites and one regulated reference customer; year 2 DigiNam where formally enabled, access-control integration, regional entry assessment.

### 29.3 Acceptance ladder

The ladder turns the pilot into executable gates. It does not replace the pilot: it is the work that must pass before and during it so pilot metrics measure product value, not known breakage.

| Industry label | Stage | Who | Environment |
|---|---|---|---|
| Alpha | A0 internal alpha | Buffr engineering and ops | Staging, demo organisation |
| UAT | A1 design-partner UAT | Named operators at two partners | Staging, then a pilot tenant |
| Pilot | A2 paid pilot | 3 to 5 real sites, 60 to 90 days | Production-like; paper parallel for week 1 |
| GA | A3 commercial launch | Sales and assurance | Production |

**Honesty rules.** (1) UAT covers shippable default-plan surfaces only: site QR, phone check-in, assisted entry, RBAC, encrypted record, sign-out, reports, host email, emergency roster, audit and data-request paths. (2) Gated capabilities are outside UAT sell claims until the register is live and a separate gate passes: DigiNam, e-ID NFC, SMS until all four gates hold (§9.3), badge-print hardware, and retention disposition until a reviewed dry run has passed. (3) No silent paper return: a forced fallback is a pilot KPI failure. (4) Each stage ends with accept, accept with conditions or reject by a named authority. (5) Engineering smokes (`scripts/smoke-production.sh`, `backend/scripts/journey-smoke.ts`, local e2e) are entry criteria, not UAT. The runnable tracker is `./scripts/acceptance-gate.sh run a0` (or `a0-a3`), which executes automated checks, prints remaining manual items and records marks and sign-offs into gitignored `scripts/acceptance/state.json`; the item list is `scripts/acceptance/checklist.json`.

**A0 entry:** smoke and journey smoke pass; the quality checklist of §34 closed or deferred with owner and date; demo organisation not in production; MFA enrolled for alpha operators; mail configured or the degrade documented; no open Sev 1 or Sev 2.

| ID | Journey | Script | Pass rule |
|---|---|---|---|
| A0-01 | Walk-in | Print site QR, phone `/check-in`, privacy acknowledgement, submit | Visit created; roster shows it; no other visitor's data visible |
| A0-02 | Assisted | Front-desk check-in for a visitor with no phone | Encrypted; no shared-screen leak |
| A0-03 | Forms | Published form with `visibilityRule` and `requiredIf` | Hidden fields not submitted; required-if enforced server-side (400 if missing) |
| A0-04 | Pre-registration | Create, revoke, resolve token, check in | Revoked token rejected; live token matches the visit |
| A0-05 | Offline | Kiosk offline capture, reconnect, outbox drain | Idempotent; no duplicates; never "host notified" offline |
| A0-06 | Emergency | Trigger, roster, resolve | Roster limited to on site; audit events written |
| A0-07 | Sign-out | Public `/check-out` or staff check-out | Exactly one open visit closed; emergency roster updates |
| A0-08 | Host notification | Check-in with a host that has email | Outbox `sent` or honest `failed` |
| A0-09 | Approval | Zone with host approval required | Held until approve or reject; rejection audited |
| A0-10 | Admin | Front desk, site manager, owner | No cross-site leak; role changes from the fixed catalogue only |
| A0-11 | Privacy | Staff roster from kiosk welcome | Fresh sign-in challenge every time |
| A0-12 | Languages | `/check-in?lang=af` and `pt` | Labels resolve; submit succeeds |
| A0-13 | NFC (if in scope) | Badge validate, then check in; revoked badge | Live badge passes; revoked rejected |
| A0-14 | Evidence | Evidence pack for a window | Pack generates; sensitive reads audited |
| A0-15 | Onboarding | Register, verify email, Setup home, accept standards, scan QR (test arrival), go-live, MFA setup | Kiosk and CRAN items never required on QR-first; test visit visible in roster and excluded from analytics and billing; within 15 minutes |
| A0-16 | Waiting and collision | Invite a staff user; second admin saves while the first has the step open | Waiting copy names what happens next; conflicting save shows "changed by" copy with refreshed state, never a raw 409 |

**A0 exit:** all in-scope scripts pass on staging; Sev 1 and Sev 2 at zero or accepted with conditions; sign-off by engineering lead and product owner; UAT pack ready.

**A1 design-partner UAT** (10 to 15 working days; reception, site manager, two hosts, five or more visitor stand-ins per site, a Buffr facilitator who observes and does not drive). Entry: A0 accepted; a written UAT charter with scope, out-of-scope, data handling and NDA; partner sites classified on risk tiers; the paper register kept for week 1 only; a feedback tracker with severity, journey id and screenshot, no visitor data.

| ID | Operator action | Acceptance |
|---|---|---|
| U-01 | Open day with a printed site QR; 10 walk-ins on phone | Completion 90% or more; median 2 minutes or less (tier 1 to 2) |
| U-02 | 5 assisted check-ins | No shared-screen leak; completion 95% or more |
| U-03 | Host receives email and responds when approval is required | Delivery 95% or more when the provider is up; degrade is honest |
| U-04 | Peak hour, 3 visitors waiting | Wait-queue tickets usable; queue length recorded |
| U-05 | Sign-out at end of visit | Open visits at close of day 5% or fewer unexplained |
| U-06 | Emergency roster drill | Usable in 60 seconds; matches reality |
| U-07 | Manager exports "last Tuesday" | Time to evidence 15 minutes or less |
| U-08 | Wrong-site or wrong-role attempt | Denied; no cross-tenant data |
| U-09 | Offline window (kiosk sites) | Check-in continues; sync succeeds; fallbacks counted |
| U-10 | Language switch for one visitor | Completes without English |

A1 exit: U-01 to U-08 executed at both partners; no Sev 1; Sev 2 fixed or accepted with conditions; a written partner decision; conditions have owners and dates.

**A2 paid pilot** entry: A1 accepted; commercial pilot agreement and a data processing agreement; approved site access policy; training for front desk and a backup operator; monitoring of API errors, outbox failures, sync lag and lockouts; paper parallel allowed for the first 7 days only. Weekly measures: the list of §29.2. Day-30 gate: no Sev 1 open more than 5 business days; paper fallbacks trending down; one emergency drill per site; a continue, remediate or stop decision recorded. Exit: 60 to 90 days at three or more sites (or a documented early stop); KPI pack reviewed and hypotheses updated; optional reference permission; an accept, accept-with-conditions or reject decision for GA.

| Severity | Definition | Impact |
|---|---|---|
| Sev 1 | Data leak across visitors or tenants; auth bypass; cannot check in on the primary channel; false "host notified"; wrong or empty emergency roster | Blocks entry and exit; stop pilot traffic in production |
| Sev 2 | Major journey broken with a workaround; sync duplicates; wrong role catalogue; audit export fails | Fix or accept with conditions before the next stage |
| Sev 3 | UX friction, copy, non-blocking i18n gaps | Backlog |
| Sev 4 | Enhancement | Out of UAT |

Change requests are logged separately so UAT does not become a redesign workshop. Decision owners: A0 exit by the engineering lead (accountable: product owner); A1 exit by the partner champion (accountable: product owner; consulted: legal and privacy); A2 by site champions (accountable: product owner and commercial). Sign-off record: stage, date, environment, build ids (API, admin, website, kiosk), scripts run, open Sev 1 and Sev 2 with disposition, decision, conditions with owner and date, signer. Record it with `./scripts/acceptance-gate.sh signoff a0 --decision ACCEPT --signer "..."`; store completed forms with the pilot commercial file, never as a root-level report. Calendar: A0 weeks 1 to 2; A1 weeks 3 to 5; A2 months 4 to 6; A3 months 7 to 9 with only shippable surfaces on the sell sheet. NFC and kiosk-heavy sites may run a parallel A0-P alpha with a separate decision line.

## 30. Roadmap and risks

### 30.1 Roadmap

Everything here is gated or unscheduled. Nothing is marketed as available.

| Horizon | Item | Gate |
|---|---|---|
| Next | Key management service for personal data (§14.3) and per-subject data keys | Owner decision on the service |
| Next | SMS switched on for a first organisation | Four gates of §9.3 |
| Next | Breached-password lookup on sign-up and reset (§17.6) | Owner approves the Have I Been Pwned lookup |
| Later | Debit-order collection of subscriptions through Collexia EnDO (§11.5) | A Collexia quote for the selling entity; schema sign-off for mandates and collections |
| Next | Google Search Console and a Google Business Profile | A public Windhoek address |
| Next | Card payments enabled | Adumo merchant credentials |
| Later | Delivery receipts and webhook status for SMS | Provider documents them |
| Later | Contractor induction workflow: courses, quizzes, expiry per person | Product decision |
| Later | Checkpoint-supplied kiosk tablets: supplier selection, CRAN type-approval application, import and resale (§23.1) | Supplier chosen and CRAN approval held for the exact model |
| Later | Badge printing hardware path | Printer SDK and device decision |
| Later | DigiNam relying-party adapter | Written onboarding, interface, tests (§24) |
| Later | National e-ID NFC adapter | Official protocol and interoperability tests (§24) |
| Later | Device-held signing keys and signed offline envelopes | High-risk site need (§15.2) |
| Later | CSV bulk import of visitors and contractors with expiry and audit | None |
| Later | SSO via enterprise identity provider; HR directory sync; Teams and Slack alerts; access-control connectors | Customer-specific threat model |
| Later | Unplanned visitor with no host known (a nullable host reference or an unassigned host plus a triage queue) | Core schema decision |
| Later | Per-staff attribution on the kiosk roster (PIN or sign-in per staff member) | New credential model |
| Later | Named-staff signature on support replies (display-name column) | Schema decision |
| Later | Shared event bus for roster push and onboarding presence | More than one API instance |
| Later | Full script content-security policy, report-only first | Nonce work |
| Later | Customer-facing assurance tables: risk register, controls, tests, findings, remediation, resilience exercises, supplier assessments | Schema sign-off |
| Later | Recurring card tokens; public OpenAPI publication; self-serve checkout refinements | Commercial decision |
| Later | A v2 churn model | Labelled churn history exists |

Principle: no module exists unless it performs the control it claims (§34).

### 30.2 Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Brand confusion from the word "Buffr" | Buyers assume affiliation | Trademark, company-name, domain and market-confusion review before launch (§1.3) |
| DigiNam ecosystem live but no integration authority | Misleading marketing, failed rollout | Claim rules and the register (§1.4, §24) |
| Personal-data key handling | Breach of confidentiality; breach-notification exemption lost | Fail-closed secrets in production (§14.3); managed key service and per-subject keys (§30.1) |
| Application database role could rewrite audit rows | Evidence integrity undermined | Least-privilege runtime role with append-only grants; privilege check after any `DATABASE_URL` change (§14.4) |
| Cross-border processing without a documented assessment | Breach of the transfer provision of the draft Bill | Assessment, subprocessor register, quarterly review (§18.5) |
| Draft Bill status or content changes | Rework; wrong claims | Track status; cite as draft (§18.1) |
| Special-category exposure through the visit itself | Health or belief inferred from presence | Sector defaults, restricted purpose fields, DPIA (§8.2, §18.7) |
| NFC tag cloning | Unauthorised access | Opaque tokens, server-side validation, expiry, revocation, cryptographic credentials for restricted zones (§2.3) |
| Offline data exposure on a stolen kiosk | Privacy breach | Device encryption, MDM, kiosk lock, minimal cache, remote wipe (§15, §17.1) |
| Excessive data collection | Privacy and trust harm | Field classes, no ID or photo defaults, retention templates, privacy review (§8.2) |
| Customer configures excessive retention | Privacy breach | Recommended templates, warnings, approval workflow, audit report |
| SMS leaks visitor details on a lock screen | Confidentiality breach | Neutral templates, one segment, no names (§9.3) |
| Overclaiming compliance | Credibility and regulatory loss | Claim rules; independent assessment before stronger claims (§1.4) |
| Residency claim invalidated by logs, backups or subprocessors | Misleading statement | Complete the chain before any claim (§16.2) |
| Product becomes an access-control system too early | Safety and liability complexity | Start as visitor evidence; door control after a formal threat model |
| Paper fallback reintroduces exposure | Control failure in outages | Sealed single-use contingency cards, never an open register (§6.5) |
| e-ID rollout slips or changes scope | Marketing inaccurate; idle engineering | Never claim live without Ministry confirmation and own testing (§24.4) |
| "NFC-first" excludes most Namibians | Contradicts inclusion promise | NFC is an accelerant; assisted entry is permanent (§2.2) |
| Selling tablets before CRAN type approval | Unlawful import or sale; stock that cannot be sold; reputational harm with the regulator | No import, quote or sell-sheet entry until the approval is held for the exact model (§23.1) |
| Parent-brand association | Procurement pauses | Audit every surface for badges, taglines and comparisons (§1.3) |
| Subservice vendor without an assurance report | Gap in the control chain | Supplier register with reports or documented reviews (§21.3) |
| Single-instance assumptions (roster push, onboarding presence, one polling worker) | Wrong behaviour at scale | Documented limits; shared bus before a second instance (§30.1) |
| Onboarding abandonment at unclear or out-of-order steps | Activation and revenue stall | Launch-readiness design, three required steps, test arrival as activation (§7) |
| Notification outbox keeps recipients and message text with no purge | Personal data held beyond need | Owner chooses a retention period, then redaction in the disposition worker |

### 30.3 Funding to reach break-even

The owner expects to need outside money, possibly a grant from the Ministry of Information and Communication Technology or other funders, to keep the company going for two to three years. What was found on 2026-10-08, from public pages, is below; none of it has been confirmed with the funder, and a funder's own rules always win over this summary.

| Source | What it is | Fit and status |
|---|---|---|
| **Ministry of ICT (MICT)** | 2026/27 budget N$682 million; N$78 million for radio access network sites, N$17.4 million for ICT development programmes including cybersecurity, N$31.4 million for government information services (New Era, 2 April 2026). The National ICT Policy and Digital Strategy 2025 to 2029 is its plan | **No grant programme for software companies was found.** The ministry is better approached as a customer and partner: government offices replacing paper visitor books is a use of the Digital Strategy, and the draft Data Protection Bill gives it a reason. A grant, if it comes, would most likely arrive as funded pilots or a programme line, not an application form |
| **9th National ICT Summit** | 12 to 16 October 2026, Ongwediva Trade Centre, Oshana; Hackathon Day on 16 October; exhibitor packages from N$30,000 to N$110,000; registration at passcard.com.na; sponsorship contacts are listed on ictsummit.gov.na | The one place this week where the ministry's people are in one room. Attend; an exhibitor stand is probably not worth N$30,000 yet |
| **NIPDB, National Planning Commission and GIZ SME Fund** | Grants of N$50,000 to N$100,000 for registered Namibian micro, small and medium enterprises with a turnover of 0 to N$10 million and at least 51 percent Namibian ownership; ICT is a priority sector; the call ran 10 June to 24 July 2026 and **has closed** (New Era, 17 June 2026) | Eligible on the stated tests. Small against a two to three year gap. Watch for the next call |
| **ScaleUp Namibia (NCRST and NIPDB)** | Launched 27 February 2025; mentorship, investment facilitation, acceleration, a free co-working office at the FNCC building in Windhoek with several hubs under one roof; funding is one of its five focus areas | Join for access to funders and investors, not as a funder |
| **CRAN Tech Challenge** | Youth innovation challenge for citizens and permanent residents aged 18 to 35 with an operational or prototype solution | Check the age rule against who would enter; CRAN is also the regulator for the tablets (§23.1) |
| **Development Bank of Namibia, Namibia Business Innovation Centre, angel networks, South African venture funds** | Grants for youth and women entrepreneurs (DBN), subsidised space (NBIC), early-stage angels concentrated in Windhoek; one secondary source | Not verified here; ask each directly |
| **GSMA Innovation Fund** | Grants of about GBP 100,000 to 200,000 for African startups, currently themed on climate and on artificial intelligence | Fit only with a real angle in those themes; Checkpoint's is not one today |

Recommendations, in order:

1. **Lead with customers and let grants pay for pilots.** A grant is easiest to win, and easiest to account for, when it funds something with a named customer and a measurable result: three pilot sites (§29.2), one of them a public office. The credible request to the ministry is a pilot, with a letter of intent from an office that wants to retire its paper register, not general support for a company.
2. **Build the 24 to 36 month budget before naming a sum.** Lines: people, hosting (the usage-based stack, not colocation), tablets and readers, CRAN approval and import, the SOC 2 and ISO 27001 audits when a customer requires them, counsel for the Terms and the Privacy Policy, marketing and travel. A funder asks "what does this buy and what will you show me in a year"; the budget answers it, and §28.3 supplies the first lines.
3. **Stack small, non-dilutive money first** (the SME Fund when it reopens, ScaleUp Namibia introductions, a DBN programme if eligible), then an angel round once there are paying sites; avoid giving equity before the pilots give evidence. Several N$50,000 to N$100,000 grants will not cover two to three years alone, so plan for revenue and one larger source.
4. **Keep fixed costs low until funded.** Stay on usage-based services, defer colocation (§16.2), take on debit orders at about 20 paying sites (§11.5), and defer certification audits until a customer asks (§19, §21).
5. **Be grant-ready.** Funders ask for the company's own papers: registration documents and the member list (the founding statement shows Namibian ownership), a tax good-standing certificate and BIPA annual returns up to date, bank statements, management accounts, a business plan and pitch, and evidence the product is live. Funders often ask for a tax good-standing certificate, even though Checkpoint does not ask it of its own customers (§7.5).
6. **Settle the legal entity, which is mid-change.** The founding statement kept on file (CC1, **Buffr AI Technologies CC**, registration number `CC/2024/09322`, lodged November 2024) is out of date: the owner states the close corporation was renamed **Buffr Financial Services CC**, which is the name on the Collexia quote, and wants it renamed again to **Buffr Analytics**. That fits the mailbox domain `buffranalytics.com` (D-34). A funder, a bank, Collexia, Paratus and every customer contract must name one entity, so finish the rename before signing any of them. The steps below are what public sources suggest and must be confirmed with BIPA or the accounting officer, because the search did not find BIPA's own change-of-name instructions: reserve the new name (Form CC8, N$75 and valid for 60 business days according to a secondary source); lodge the change with BIPA (the amended founding statement, Form CC2, is the form for amended particulars, but confirm which form carries a name change); receive the updated certificate. The registration number normally stays the same on a rename; confirm that too. Then update everything that carries the name: the bank account and invoice bank details (`BILLING_BANK_*`), the Collexia and Paratus documents, the Terms and Privacy Policy, the BoN FinTech application, tax and social security registrations, funder applications and customer contracts. Two things to know: the Collexia quote also classes the business as **micro-lending**, so ask for a new quote under the right industry (software as a service) because the pricing code can differ; and a 2023 BIPA proposal would stop *new* close corporations being registered in favour of closely held companies, with existing ones continuing, so ask BIPA whether a rename is affected and whether a company would suit the next five years better. **A gap that waits on the final name:** the Terms and the Privacy Policy do not name the legal entity that is the contracting party or its registration number. They should, once the name is settled, and counsel reviews the wording (§31 item 6). The product stays "Checkpoint" everywhere a visitor or customer sees it (§1.3); the company name belongs only in the contract documents, the footer attribution and the mailbox.
7. **Read the conditions.** Reporting duties, who owns the code and data, restrictions on other funding, and what happens when milestones slip. Never let a grant widen the scope beyond the privacy promise of §1.5.

## 31. Decisions required

Items only the owner, counsel or a named third party can close.

1. **Brand clearance.** Trademark, company-name and market-confusion review before public launch.
2. **Hosting model.** Shared Namibia-hosted cloud, private cloud, on-premise or hybrid; until decided, no residency claim (§16.2).
3. **Key management.** Which managed key service; and the rotation and re-encryption plan. Confirm production values for the data key, lookup peppers and token peppers are strong, since production now refuses weak or missing values (§14.3).
4. **Default retention.** Approved as on by default at 365 days (decision made 2026-10-08); counsel to confirm the figure; tier day counts for other categories.
5. **Recovery targets.** Confirm or change the RTO and RPO of §16.3; Neon history plan; the `NEON_API_KEY` repository secret is set and verified: the snapshot workflow ran successfully on 2026-10-07 after the idempotency fix, and runs daily.
6. **Counsel review** of the Terms, Privacy Policy and processor agreement before publication (§6.2, §18.2).
7. **Data Protection Bill status** confirmation before any customer-facing statement (§18.1).
8. **ISO 27001 certification** as a later milestone, and if so the body and date; **ISMS roles**: risk owners, internal auditor, management-review cadence (§19).
9. **Tablet supplier and CRAN application.** Choose the supplier and model, confirm the application route and who applies with CRAN, and fund the approval and first import (§23.1). Until approved there is no tablet add-on to sell. Candidate suppliers and requirements are in §23.2.
10. **Minimum viable channel set** for the first sellable release. Recommended: site QR, assisted entry, offline cache, QR pre-registration, NFC badge support, SMS as an add-on.
11. **NFC credential standard** for the first contractor badge: low-risk random token, or a cryptographic credential for regulated access.
12. **Customer role model.** Checkpoint is processor and each customer is controller (decided, §18.2); confirm in contracts.
13. **Initial verticals.** Recommended: financial services, government and public offices, and healthcare or logistics.
14. **Switches that are cost decisions:** activate the BulkSMS arrangement, approve the SMS capability live (dual approval, with evidence), attach the add-on to a first organisation, confirm N$1.00 and the 1,000-text limit; set Adumo credentials. Retention disposition is live (approved 2026-10-08).
15. **Subprocessor regions and transfer assessments.** Confirm the processing region of each provider in `common/privacy/subprocessors.ts`, in particular Neon and Railway, and complete the transfer assessments (draft Bill s28 to s30). Until confirmed, the evidence pack shows them as unconfirmed.
16. **Account MFA.** Each existing owner-operator account holder must enrol their own authenticator; the platform never holds the secret.
17. **Smoke fixture.** A non-production test organisation, site and public QR for the production smoke check, and a test account with its authenticator secret for the journey smoke.
18. **Where a staff display name lives** (for support reply signatures), for example the Buffr ID name claim.
19. **Schema decisions** in §30.1 marked core schema.
20. **Business verification schema sign-off.** Migration 0071 adds `organisation_kyb_document` and `organisation_kyb_document_status_events` and six columns on the verification tables. They follow the schema rules (type_definition for every list, a status log created with the table, tenant column first in every index, no trigger or cascade) but are proposals under §14.1 rule 9 until signed off.
21. **Registry check and larger uploads.** Whether to seek a data arrangement with BIPA so a registration can be checked automatically; and whether to add direct browser-to-API uploads (a short-lived upload token) so files above the 4.4 MB the admin proxy allows can be sent.
22. **Scope of business verification.** Confirm that onboarding verification stays at the owner's required set of §7.5 (BIPA registration, owners with contact details, bank letter, owner identity documents, proof of address; 74.5 percent of the BIPA dictionary), and that the BO1-level personal particulars and AML screening of §7.5 stay out. If a customer segment needs them (a regulated customer asking Checkpoint to evidence its own KYB), they belong in a separate product with its own schema and consent, not as extra fields here.
23. **Subprocessors for abuse defence and passwords.** Cloudflare is approved and listed for Turnstile (2026-10-08). Still to approve: Cloudflare R2 for encrypted off-platform backups (§17.7) and the Have I Been Pwned range lookup, each added to the Privacy Policy and the register when built. The 12 character minimum applies from the next time a password is chosen, so existing accounts are untouched until then; say if you would rather prompt everyone at their next sign-in (§17.6).
24. **The legal entity and funding.** Finish renaming the close corporation to Buffr Analytics (§30.3 item 6) and confirm with BIPA the form, the fee, whether the registration number stays and whether a company would suit better than a close corporation; then name that entity in the Terms, the Privacy Policy, funding and banking papers and the Collexia and Paratus documents. Separately: whether to approach the Ministry of ICT as a pilot partner (and attend the National ICT Summit, 12 to 16 October 2026), and the size and period of the ask once the budget of §30.3 exists.
25. **Debit-order collection.** Obtain a Collexia quote in the name of the entity that invoices customers, confirm the settlement days and the fee on a failed debit, and approve the schema for mandates and collections before any code (§11.5, §30.1).

---

# Part 8: Operations and design

## 32. Hostnames, environments and runbook

### 32.1 Hostnames and DNS

| Role | Hostname | App or service |
|---|---|---|
| Marketing and operational visitor pages | `buffrcheckpoint.com`, `www` | `website/` (Vercel) |
| Customer admin | `admin.buffrcheckpoint.com` | `admin/` (Vercel) |
| Platform ops console | `ops.buffrcheckpoint.com` | `ops-console/` (Vercel) |
| API for kiosk, admin and ops (server side) | `api.buffrcheckpoint.com` | `backend/` (Railway) |

The kiosk has no DNS name of its own: field tablets enter `https://api.buffrcheckpoint.com/` and the site id on the setup screen. HTTPS is mandatory in production; debug builds may use cleartext only for local development. Site QR codes encode `https://buffrcheckpoint.com/check-in?site={siteId}&ref={referenceId}` (base from `VISITOR_CHECKIN_BASE_URL`).

DNS (Namecheap Advanced DNS; host field is the label only, not the full name): `@` A records and `www`, `admin`, `ops` CNAMEs to the targets Vercel prints for each project; `api` CNAME to the Railway hostname and a `_railway-verify.api` TXT as issued; never a second `api` CNAME. Fallback mail sending domain records (Resend) stay DNS-only and never put a Resend MX on the apex, which would take inbound mail for `@buffrcheckpoint.com`. Use TTL 300 while wiring and 3600 when stable. If a proxy is used, keep it off the mail records and test long-poll behaviour on the API.

### 32.2 Environment variables (names only)

Values are set per platform and never committed. Optional features stay off until their variables are set. Canonical shapes are each app's `.env.example`.

| App | Variables |
|---|---|
| API (Railway) | Core: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and `NODE_ENV=production` (required: the fail-closed secret checks and the artifact-store guard only run when it is set). Public URLs: `PUBLIC_ADMIN_BASE_URL`, `PUBLIC_OPS_BASE_URL`, `PUBLIC_WEBSITE_BASE_URL`, `PUBLIC_WEB_BASE_URL`, `PUBLIC_ASSET_BASE_URL`, `VISITOR_CHECKIN_BASE_URL`. Secrets and peppers (required and strong in production): `LOCAL_DEV_DATA_KEY`, `PHONE_HASH_PEPPER`, `NAME_HASH_PEPPER`, `CONTACT_REFERENCE_HASH_PEPPER`, `QR_TOKEN_PEPPER`, `EMAIL_VERIFICATION_PEPPER`, `MFA_CHALLENGE_PEPPER`, `MFA_SECRET_ENCRYPTION_KEY`. Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_TRANSPORT`, `EMAIL_MAX_PER_HOUR`, `EMAIL_MAX_PER_DAY`, `PUBLIC_CONTACT_EMAIL`, `CONTACT_OPS_EMAIL`, `PUBLIC_BRAND_LOGO_URL` (fallback only: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Storage: `ARTIFACT_STORE`, `NEON_STORAGE_*`, `BLOB_READ_WRITE_TOKEN` (degrade only). Billing: `BILLING_*`, `ADUMO_*`. SMS: `BULK_SMS_API_KEY`, `BULK_SMS_BASE_URL`, `SMS_USAGE_INVOICING_ENABLED`, `SMS_USAGE_INVOICING_INTERVAL_MS`. Workers and features: `RETENTION_DISPOSITION_ENABLED` (default on), `RETENTION_DISPOSITION_MODE` (`dry_run` or `live`, default `live`), `NOTIFICATION_REDACTION_DAYS` (default 30), `SCHEDULED_REPORTS_ENABLED` (on in production since 2026-10-08), `TURNSTILE_SECRET_KEY` (the bot check is off until it is set), `KYB_PADDLE_OCR` (default on; `false` skips the second reading), `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` (build-time: keeps the PaddleOCR runtime to its CPU binaries), `ANALYTICS_ETL_*`, `ANALYTICS_MIN_CELL`, `FORM_AI_ENABLED`, `NEON_AI_GATEWAY_*`, `CIMSO_*`. Observability: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` |
| Admin (Vercel) | `BACKEND_API_URL`, `API_URL`, `NEXT_PUBLIC_WEBSITE_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `SENTRY_*` |
| Ops console (Vercel) | `BACKEND_API_URL`, `NEXT_PUBLIC_ADMIN_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN` (set; the ops console reports nothing without it), observability keys |
| Website (Vercel) | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

`NEXT_PUBLIC_*` values bake into the client bundle at build time, so redeploy after changing them. The API must include every web origin in `CORS_ORIGIN`. Before every API deploy confirm the secrets listed above are present and at least 16 characters, because the API refuses weak or missing values in production (§14.3). Kiosk crash reporting reads its DSN from a Gradle property.

### 32.3 Deploy, rollback and checks

| Surface | Deploy | Rollback |
|---|---|---|
| API | `cd backend && railway up --service api --detach` | Railway dashboard: previous deployment, Redeploy |
| Website, admin, ops console | `cd <app> && vercel --prod --yes` | `vercel rollback` or promote the previous deployment |
| Database | Apply `backend/db/migrations/NNNN_*.sql` in order, tested on a branch first (§14.5) | Forward-only: restore the branch to a point in time, or write a corrective migration |

Order with a migration: migration, then API, then web apps. A destructive migration needs a named restore point first (a Neon branch of production) and runs after the API that no longer reads the dropped objects is live. After every deploy:

```bash
curl -s -o /dev/null -w "api %{http_code}\n" https://api.buffrcheckpoint.com/health
for u in https://buffrcheckpoint.com https://admin.buffrcheckpoint.com/auth/login https://ops.buffrcheckpoint.com/login; do curl -s -o /dev/null -w "$u %{http_code}\n" "$u"; done
for u in https://buffrcheckpoint.com https://admin.buffrcheckpoint.com/auth/login https://ops.buffrcheckpoint.com/login; do curl -sI "$u" | grep -iE "x-frame|content-security|x-content-type|referrer-policy|permissions-policy"; done
```

`GET /health` returns `200 {"status":"ok","service":"buffrcheckpoint-backend","database":"ok"}` when the database answers within 3 seconds and `503 {"status":"degraded",...,"database":"down"}` otherwise, so a monitor cannot see 200 during a database outage. Then open the ops overview: integration health shows nothing down and the service-level panel shows any missed target. Run `scripts/smoke-production.sh` (health, public check-in contract when `SITE_ID` and `REF_ID` are given, website pages, check-out validation, auth error shape, sector list, absence of retired channels, short links); without those ids the form check reports SKIPPED. `scripts/run-all-tests.sh` runs backend unit and e2e, website and admin Vitest and kiosk unit tests; `SMOKE_PRODUCTION=1` appends the live smoke. Sandboxed network checks that fail with proxy errors are false failures, not regressions.

### 32.4 Monitoring

Uptime monitor (1-minute interval, alert after 2 consecutive failures, email plus text): API `/health` expecting 200 and `"database":"ok"`; website; admin login; ops login. Sentry on the API, website, admin, ops console and kiosk with a PII scrubber; alert rules: a new issue in production, and more than 10 errors in 5 minutes on the API. Ops integration health probes (5-second timeout, never throws): database, document storage, SMTP, notification outbox (24 hours), analytics ETL freshness, CiMSO sync runs (24 hours), Adumo gateway, invoice bank details, anomaly alerts (24-hour count), scheduled report runs (7 days). PostHog is consent-gated and carries named, decision-oriented events with codes and counts only (authentication, onboarding step events with `launch_route` and `blocker_key`, first-site, first-QR, first-test-visit and navigation timing, web check-in and check-out funnel steps, contact enquiry), never visitor personal data.

## 33. Design system

Light canvas only. Mood: a clean paper-white control surface, near-black type, one reactive gold accent, ultra-light display type and hairline-bordered cards on an off-white ground. The restraint reads as authority for banks and government offices.

### 33.1 Tokens

The canonical file is `website/src/styles/presets/buffr-checkpoint.css`; copy it byte-for-byte into `admin/src/styles/presets/` and `ops-console/src/styles/presets/` after any edit, and check with `cmp` (the three were found to differ on 2026-10-08 and were reconciled: the admin-only working-scale classes `bc-h-page` and `bc-h-section` are now in the canonical file, and hex values are upper case). The kiosk mirrors the same values in `ui/theme/Color.kt`.

| Token | Value | Role |
|---|---|---|
| `--color-sodium-yellow` | `#E0B000` | The only saturated action colour: primary fills, active navigation, accent card |
| `--color-sodium-yellow-ink` | `#8A6B00` | Text-safe yellow for labels and links on light surfaces |
| `--color-carbon` | `#171717` | Text and ink; never pure black |
| `--color-charcoal` | `#111111` | Inverted chips and fills, mark core |
| `--color-cloud` | `#F5F5F5` | Page background |
| `--color-pure-white` | `#FFFFFF` | Elevated card, sidebar, popover |
| `--color-graphite` | `#E9E7E0` | Secondary surface fill |
| `--color-frost` | `#D9D9D4` | Borders, hairlines |
| `--color-slate` | `#6B6B6B` | Secondary text (passes 4.5:1 on white) |
| `--color-ash` | `#9A9A94` | Tertiary and disabled text |
| `--color-status-live` | `#15803D` | Verified, live and healthy states (clears 4.5:1) |
| `--destructive` | `#B91C1C` | Errors (5.88:1) |
| `--color-lime-pulse` | `#00FF1A` | Editorial emphasis only; never status, never a second call to action; unused today |

Rules: text on a Sodium Yellow fill is near-black, never white (white on yellow is about 2.2:1; near-black about 9.7:1). Raw yellow and ash fail as foreground text, so use the ink variant or slate. No second saturated accent for any button. No more than about 20% of a viewport in yellow. No navy, teal or blue brand colours. No custom per-organisation colour.

### 33.2 Typography, spacing, layout

| Family | Role | Weights |
|---|---|---|
| Archivo | Display and headings; ultra-light (100 to 300) at 56 to 64 px is the signature | 100, 300, 400 |
| Geist | UI and body: navigation, buttons, forms | 300 to 600 |
| Geist Mono | Technical labels: audit hashes, device serials, evidence references | 400, 600 |

Heading and mono tokens must pass through to the preset (a hard-coded fallback silently renders headings in the body face). Scale: caption 14, body 16, subheading 20, heading-sm 24, heading 32, heading-lg 56, display 64. An 8 px base unit; spacing 8/16/24/32/40/48/64/80/96; radius nav 8, tags 4, cards and buttons 16, large panels 24; page maximum 1280 px; section gap 64; card padding 24 to 32. **No drop shadows anywhere**: elevation is a white surface plus a 1 px hairline border (a blanket `box-shadow: none` rule is forbidden because `ring-*` utilities compile to `box-shadow` and would erase every popover edge). No sharp corners on interactive elements.

### 33.3 Components and patterns

- Primary call to action: filled Sodium Yellow, near-black text, 16 px radius. Accent card: yellow fill, at most one or two per view. Content card: white with a hairline border.
- A list is one flat panel with hairline dividers (`List` and `ListRow`), never a stack of separate cards; nested cards are always wrong. Use a shared `StatusSelect` ("Change status..." or "Move to...") instead of rows of status buttons; keep a visible approve and reject pair only for a consequential binary decision. Conversation threads are the exception: chat-style bubbles distinguish turns.
- Sidebar: the template's left sidebar with the yellow active-state treatment; no bottom bar in a data-dense admin.
- Charts (`recharts`, with `chartTokens`): `TrendChart`, `ShareBars` (ranked bars, lead item emphasised, never pie charts), `ScoreScatter`, `TrendWithForecast`, `BusyHoursHeatmap` (empty cells stay blank). Every chart takes a required `finding` prop so the title is a finding, not a topic. Server components pass serialisable data to charts, never functions.
- Shared utility classes (`bc-panel`, `bc-stat-tile`, `bc-active-soft`, `bc-grid-marketing`, `bc-span-*`, `bc-stat-row`): flat panels, soft active navigation, marketing eyebrow and lead type, a 12-column helper, at most four primary stat tiles. Prefer the exports of `marketing-layout.ts` on public pages.
- States: every list and table has empty, loading (skeleton, never a spinner-only blank), error (retry, never a raw stack trace) and slow-network states. The kiosk's offline state is the core design constraint, not an edge case (§15.2).

### 33.4 Kiosk variant

The kiosk is a different surface: unfamiliar visitors, bright light, no brand exposure, seconds to complete. It keeps the brand tokens and breaks the admin typography: canvas white or near-white, near-black text (`#1A1A1A` or carbon), Sodium Yellow `#E0B000` for primary actions with near-black text, border `#D0D0D0` or frost, muted `#6B6B6B`, status green `#15803D`. Minimum weight 400, minimum 24 px for instructional text, touch targets at least 48 dp, Geist Mono dropped. Large-text mode scales body and display sizes. Light only; the system dark theme is ignored. Compose Material3 theming maps the token table almost verbatim; no XML view system. Assisted entry (operator mode) is the one denser screen and uses the admin spacing scale. A contrast check on every token pair and a tap-target audit gate each kiosk release.

### 33.5 Scores, predictions and errors

Wherever the product shows a score or model output (health score, forecast, any future classifier): show a confidence label or range and its backtest error, cite the source under every chart, hedge generated text; name the inputs that drove a score and give a one-sentence reason; start at suggestion or approve-then-act (identity decisions on the kiosk stay at that level; automatic check-in after a valid NFC badge may be act-then-review with an undo); on error say that an error happened, never blame the user, keep it brief, give the next step and return control.

### 33.6 Visual and imagery strategy

Design principle: show the risk clearly, show the product simply, show the evidence credibly. The journey: recognise the paper-register risk, see the safer alternative, understand how it works, see proof of control and inclusion, take one clear action.

| Asset type | Purpose | Rule |
|---|---|---|
| Product screenshots | Show the real system | Highest priority; synthetic demo tenant only |
| System diagrams | Explain flows, controls, roles | Preferred over stock images for technical buyers |
| Contextual photography | Namibian and African relevance | Real, consented, non-sensitive settings; closing bands use dedicated files, never the hero asset |
| Hardware photography | Make kiosk, reader, printer tangible | The actual approved hardware or a labelled concept render |
| Data visualisations | Prove controls operate | Never invented metrics or decorative charts |

| Page | Placement |
|---|---|
| Home | Hero: headline, two-sentence problem, one call to action, a product frame with one synthetic visitor record and the line "Record protected. Visible only to authorised staff". Next: the paper-risk comparison (a designed comparison with redacted synthetic lines, not a photo of a real register). Then "Every visitor can check in" (a strip of QR, assisted, kiosk, NFC and SMS converging on one record). Then operational proof (Front Desk roster, Device Compliance Register, Compliance Dashboard screenshots). Final call to action: "Replace your paper register before it becomes your next privacy incident." |
| Platform | Diagrams and screenshots, not photography: layered architecture (six layers; external systems drawn as side integrations), the V0 to V4 ladder, the real RBAC table (not an image), online-queue-synced offline visual, evidence-pack screen, live capability badges |
| Pricing | Low image, high clarity: plan cards, channel-inclusion matrix, capability badges; optional hardware photography only under add-ons |
| About | The one place for real human imagery: founders, actual Namibian implementation, hardware testing; no stock "business team", no surveillance or facial-recognition imagery, no unapproved photos at sensitive sites |
| Admin | 90% data, 10% brand: status chips, assurance labels, timelines, monospace ids; initials avatars, no external profile photos, no previews of unredacted visitor data |
| Kiosk | No decorative photography in the check-in flow; one choice per large tile; icons plus plain language; privacy reassurance immediately before capture ("Your details are private. Other visitors cannot see this check-in."); calm confirmation, not celebration; equal visual dignity for assisted entry |

Governance: product screenshots use a synthetic demo tenant with non-identifiable culturally appropriate names, masked phone numbers, no ID numbers, non-functional QR codes and no real credential references; client logos and testimonials need written permission; customer-site photos need written site permission and consent; emergency-roster and audit-log screenshots are synthetic with redacted actors. DigiNam and e-ID imagery appears only after approval with the exact live wording. Don't show a visitor holding an e-ID card unless e-ID support is operational, a generic shield, a crowded reception behind hero copy, or a readable paper register.

### 33.7 Accessibility and copy

- WCAG AA is the bar for admin, website and kiosk: 4.5:1 for body text, 3:1 for large text, keyboard access through data tables, alt text on every image (including decorative illustrations, with a short description), no colour-only state. Decorative step numbers are `aria-hidden` and still contrast-passing. Each page has one `main` landmark and a heading order without skips. Unauthenticated pages in both web apps target 100 on Lighthouse accessibility and axe; the authenticated dashboard is checked in a browser session after MFA enrolment.
- Test at narrow mobile, tablet and desktop widths; the website must work on a phone first.
- Copy: plain, direct, active, human; no emojis anywhere, no em dashes or semicolon chains in interface copy, plain words over corporate ones. There is no tagline: the one used before ("Built for Africa's Compliance.") was vague and read as a compliance claim, and it was removed from the website footer on 2026-10-08. Page titles are the page name only; the layout template adds "| Buffr Checkpoint" once. Legal pages stay precise and unembellished. User-facing strings live in `lib/copy/` modules, never hardcoded on pages (the ops console and the marketing pages are moved into copy modules progressively).
- The identity assets are a transparent square icon (`icon.png`, also the favicon source) and a transparent wordmark (`logo.png`, black "buffr" with a gold "checkpoint" ff-bar) with a reversed variant for dark print or export. Kit under `branding/`.

### 33.8 Project skills

Two Claude Code skills live in `.claude/skills/` and carry this section and section 34 into day-to-day work: `buffrcheckpoint` (how to work on the product: map, canon, standing rules, workflows, success check) and `buffrcheckpoint-design` (the design system: tokens, patterns, verify commands, success check). Their baseline checks (identical presets, no colour-family classes, no shadows, hex literals only where a canvas or image generator cannot read a token) were measured on 2026-10-08. The visitor check-in, check-out, emergency and induction pages were found using a magenta button and purple and mauve text from another palette; they now use the theme tokens, and the share-image generator uses the brand palette instead of navy.

## 34. Engineering rules

1. **No production stubs.** A module is complete only when it uses the real database through Drizzle, enforces tenant and site scope, validates input server-side, performs the promised operation, writes required audit events, returns a DTO without unnecessary personal data, has unit and integration tests, has explicit failure and retry behaviour, and compiles, lints and passes tests. Never: in-memory arrays as persistence, empty guards, TODO-only services, placeholder URLs or provider responses, static identity or NFC validation, client-controlled tenant ids or storage prefixes, fake compliance status, unimplemented public endpoints, a raw identity payload accepted through a generic endpoint, or a Boolean "enabled" standing in for an evidence-led capability status. Release check, output empty apart from permitted fixtures:

   ```bash
   rg "TODO|FIXME|private .*\[\].*= \[\]|return \{ processed: 0 \}|return \{ valid: false \}|storage\.example\.com|@UseGuards\(\)" backend/src
   ```

2. Build in complete vertical slices, one at a time: core check-in, then the admin on real data, then devices and offline sync, then NFC, then notifications, then the gated integrations last.
3. Every mutation route declares a permission, is public, or has an explicit own-account opt-out; a route-policy audit reports `mutation_routes_without_policy=0`.
4. Parameterized queries only. No raw `console.*`: use the project logger. No emojis in code, comments or docs.
5. Exact dependency versions, lockfiles committed, a 7-day cool-down before adopting a newly published package (security updates exempt).
6. Secrets and peppers fail closed in production (§14.3). No default credentials in any script; no demo organisation or published password in production (D-19).
7. User-facing copy in `lib/copy/`. State is always current: no stale data on back-navigation; a screen or modal reflects the latest state.
8. Pull requests carry an evidence checklist; CODEOWNERS cover the access, guard, auth and migration paths. CI per app: typecheck (with `next typegen` for Next.js apps), tests, build, gitleaks, and the migration replay; `npm audit` and Biome lint report until existing findings are cleared. Nested git repositories commit from inside the project, not from the workspace root.
9. Audits, validation and verification output are rows in the workspace-ops database (`workflow_run`, `workflow_step_log`, `finding`), not new dated report files. Human-readable summaries extend this document or `docs/`.
10. When an audit, review or test turns up a defect, fix it in the same pass, test it, and then document the fix. A gap may stay open only when it truly needs the owner's decision, a credential only the owner holds, real data not available, or core-schema design reserved to a human (§14.1 rule 9); say which.

## 35. Standing decision log

A change to a decision is a new numbered entry, not an edit. Retired decisions are marked.

| No. | Decision | Why |
|---|---|---|
| D-01 | Wiebe schema rules: type codes in `type_definition`, a status log beside every stateful table, soft deletes, client-generated UUIDs, NUMERIC money | Adding a value is an insert, history is never lost, retries are safe |
| D-02 | No triggers, stored procedures or cascades; all business logic in the API | One place to read and test behaviour |
| D-03 | Tenancy column on every operational table; every index starts with it | Isolation is structural, not a filter someone can forget |
| D-04 | Audit events are hash-chained and append-only | Tampering is detectable; the chain can be checked outside the product |
| D-05 | Personal data is encrypted in an envelope with keyed lookup digests (§14.3). Disposal overwrites the payload and clears the digests; per-subject data keys under a managed key are the target so disposal can destroy the key (D-29) | Retention can be honoured without breaking audit or aggregate history; copies in backups age out |
| D-06 | Bank transfer with proof of payment is the default; card payments use Adumo's hosted page and never handle card data | Keeps Checkpoint out of card-data scope |
| D-07 | A card result is trusted only from Adumo's signed token, matched on reference and amount, applied once | The posted result alone can be forged |
| D-08 | Analytics read from PII-free fact tables built by the ETL in Africa/Windhoek time and reconciled on every run | Same numbers everywhere; a run that does not reconcile fails |
| D-09 | Cross-organisation statistics suppress any cell below 5 | Small counts can identify a site or a person |
| D-10 | Production rollout of retention disposition starts as a dry run; the owner reviews counts before `live` (amended by D-35: no longer opt-in) | Deleting and shredding cannot be undone |
| D-11 | Live roster push uses an in-process event stream (one API instance) | Simple until there is more than one instance |
| D-12 | Baseline security headers everywhere; a full script policy later, report-only first | Protection now without breaking Next.js or third-party scripts |
| D-13 | Every export goes through one helper and is audit-logged, with a formula-injection guard | One place to fix; every download leaves a record |
| D-14 | The satisfaction survey is offered only at sign-out and proven by a signed token | No table is needed to prove the visit |
| D-15 | Anomaly rules alert people and never block a visitor; alerts go to the customer's admin, not to ops or email | The risk-based approach forbids automated denial; the customer's staff act |
| D-16 | Scheduled reports go only to verified users of the same organisation, chosen by role | No visitor data and no typed address can become an egress path |
| D-17 | Every scheduled job claims its period in a run table before sending | A restart or second instance never sends twice |
| D-18 | Custom branding (logo, colour, welcome text, display names, background) is not part of the product; check-in and kiosk use Checkpoint's own look; the kiosk privacy notice is the organisation's published `privacy_notice` policy | Branding was the onboarding abandonment point and did not work reliably |
| D-19 | Demo and test organisations never exist in production; demo seeds live in `backend/db/seed/demo/`; no script carries a default credential or published password | A published password or demo organisation in production is a back door |
| D-20 | MFA is optional during setup and required for every customer user once the organisation is live; platform staff always. The API enforces it and the admin proxy sends the user to enrolment | Setup is not blocked by an extra step, and nobody operates a live organisation without MFA |
| D-21 | The production API connects as the least-privilege role `buffr_checkpoint_runtime`, not the owner; migrations run as the owner | Append-only tables must be append-only for the application |
| D-22 | Email goes over SMTP through one mailbox, `team@buffranalytics.com` (set 2026-10-07, replacing `hello@buffr.ai`), within a send budget; Resend is only a fallback | One mailbox and sender; no third-party sender cost |
| D-23 | Sign-in with Buffr ID (Better Auth, OIDC with PKCE). Buffr ID proves who the person is; Checkpoint keeps its own roles, organisations, audiences, onboarding state, support sessions and kiosk credentials. The ID token is traded at `POST /auth/buffr-id/exchange` for an ordinary Checkpoint session. `LEGACY_PASSWORD_AUTH` (`on`, `kiosk`, `off`) narrows password sign-in in stages | Checkpoint never changes when other products join Buffr ID; staged migration |
| D-24 | Transactional mail is structured: plain-text canonical body, personalised greeting, signature naming the writing team, a catalog entry per template | Mail is consistent, checkable and cannot be added without being described |
| D-25 | Emergency information and contractor induction are versioned policy documents; the contractor's confirmation uses the acknowledgement table | No new table; history and a content hash come with it |
| D-26 | Optional-email switches and notice text use existing audited configuration and policy tables | Nothing new to migrate; changes are logged |
| D-27 | Comments on visit ratings need `site.configure`; the rating figures need `visit.history.read` | Comments are free text that can carry personal data |
| D-28 | The device support QR is gated by sign-in and permission and is not a site reference | A printed code can be photographed, so it must reveal nothing |
| D-29 | Secrets that protect personal data (data key, lookup peppers, token peppers) fail closed in production through `requiredSecret` (minimum 16 characters, no fallback); development fallbacks apply only outside production | A fallback visible in source makes encryption and lookup digests worthless |
| D-30 | ISO/IEC 27001:2022 is positioned as aligned with a maintained Statement of Applicability; certification is a later owner decision; one control set serves the SOC 2 programme and ISO 27001 | Avoids claims no certificate supports; avoids two parallel control systems |
| D-31 | The Data Protection Bill is cited as a draft, by the section numbers of the text on file, until its status is confirmed | The text is unfinished and undated |
| D-32 | USSD, WhatsApp and feature-phone sessions are not built; assisted check-in is the inclusion path; email is free and SMS is billed by use | Recurring telecom cost with no matching revenue for a small audience; assisted entry costs nothing per visit |
| D-33 | `NODE_ENV=production` is set on the API in production, so secrets that protect personal data and the durable artifact store fail closed (D-29) | Without it the guards silently do not run; it was unset until 2026-10-07 |
| D-34 | The contact domain is the company's trading name (`team@buffranalytics.com`) until a `buffrcheckpoint.com` mailbox exists (§1.3) | The product domain has no mail; one mailbox is the only deliverable address |
| D-35 | Privacy is automatic by default: disposal on at the platform default retention, outbox redaction, data-request clock and posture evidence need no customer action. Supersedes the opt-in in D-10 | Privacy management is the value proposition; customers should not have to think about it |
| D-36 | The notification outbox is redacted 30 days after delivery (`NOTIFICATION_REDACTION_DAYS`) | Recipient addresses, numbers and link tokens outlive their use otherwise |
| D-37 | Registration documents are read on the platform by Tesseract and Poppler, with PaddleOCR as an optional second reading in a short-lived child process (PDFs only, `KYB_PADDLE_OCR=false` turns it off), with no third-party document or AI service, and the result is only ever a suggestion a person confirms | A founding statement names members and identity numbers; sending it to a subprocessor would add a disclosure and a transfer for a convenience |
| D-38 | Business verification requires proof of BIPA registration (with the reviewer's register check), the owners with their share, phone and email, a bank confirmation letter, an identity document per owner and proof of address; good standing is not required | Owner decision 2026-10-08: the business must be a registered one and its owners known, and the bank and address are evidenced |
---

# Annexes

## Annex A: Out of scope by decision

1. **USSD, WhatsApp and feature-phone sessions** are not built and not planned (D-32). Assisted check-in is the inclusion path; email and SMS reach visitors.
2. **Custom branding** (logos, colours, welcome text, backgrounds, per-site display names) is not part of the product (D-18).
3. **A fixed multi-step setup wizard** with a "mark complete" checkbox model, and an `mfa_enrolled` organisation status, are replaced by the evidence-driven launch-readiness checklist (§7) and MFA after go-live (D-20).
4. **Public name search for returning visitors, facial recognition or biometric matching, and a blacklist by default** are excluded (§3.2, §8.3).
5. **A message broker, Neon Functions as a second compute plane, and managed third-party authentication plugins** are not used (§13.2).
6. **Operating as a telecom operator or as a certification service provider** is excluded (§12.4, §24.3).

## Annex B: Statement of Applicability (ISO/IEC 27001:2022 Annex A)

Reading guide. All 93 controls are listed. **Applicable** is Yes unless a justification is given. **Status** is one of: **Yes** (the control is designed and operating, with the evidence named), **Partial** (designed or started; the open part is named), **Planned** (decided, not yet operating), **Inherited** (provided by a subservice organisation; its assurance report or review is to be placed on file, REG-SUP-01), **N/A** (excluded, with the reason). Statuses are as at 2026-10-07, taken from this blueprint, the repository and `BUFFR_SOC2_PROGRAMME.md`; where the two disagree the programme's verified state wins. "SOC 2" gives the indicative Trust Services criterion from the programme. Control titles are paraphrased; the standard is the authority for control text. Evidence pointers are sections of this document unless a path is shown.

### B.1 Organisational controls (5.1 to 5.37)

| Ref | Control | Applicable | Status | How Checkpoint meets it, evidence, open part | SOC 2 |
|---|---|---|---|---|---|
| 5.1 | Policies for information security | Yes | Partial | Policy set drafted (`buffr-ops/docs/security/policies.md`, Draft 1); approval and acknowledgement open (§21.3, POL-IS-01) | CC1, CC2 |
| 5.2 | Security roles and responsibilities | Yes | Partial | Product roles in §5; ISMS roles (risk owners, internal auditor) to be named (§31 item 8) | CC1.3 |
| 5.3 | Segregation of duties | Yes | Partial | Permission split in the product; CODEOWNERS on sensitive paths; one-person organisation uses an external reviewer or dated self-review (programme §8) | CC1.3, CC5 |
| 5.4 | Management responsibilities | Yes | Planned | Owner approves the policy set and objectives (§19.3) | CC1.1 |
| 5.5 | Contact with authorities | Yes | Partial | `security@` disclosure channel; DPA authority, CRAN and Bank of Namibia contacts recorded for incident notification (§17.4, §18.6) | CC2.3 |
| 5.6 | Contact with special interest groups | Yes | Planned | Security forums and CRAN stakeholder sessions followed; membership to be recorded | CC2.3 |
| 5.7 | Threat intelligence | Yes | Partial | Dependency advisories (Dependabot, `npm audit`), vendor security notices (§17.3); a recorded review cadence is open | CC7.1 |
| 5.8 | Information security in project management | Yes | Partial | Evidence-checklist pull request template, security review on schema and auth paths (§34); formal project risk step open | CC8.1 |
| 5.9 | Inventory of information and assets | Yes | Partial | Table families (§14.2), asset classes (§20.1); a single owned inventory in workspace-ops is being built (programme §7) | CC6.1 |
| 5.10 | Acceptable use of assets | Yes | Partial | Staff acceptable-use and AI-use sections in the draft policy set (POL-AC-01) | CC1.4 |
| 5.11 | Return of assets | Yes | Planned | Offboarding procedure: identity disabled, sessions revoked, roles removed (programme §9) | CC6.2 |
| 5.12 | Classification of information | Yes | Partial | Restricted, confidential and public classes (`docs/system-description.md` §4); field classes for visitor data (§8.2) | C1.1 |
| 5.13 | Labelling of information | Yes | Planned | Class labels on exports and evidence packs; redaction labels on packs (§10.2) | C1.1 |
| 5.14 | Information transfer | Yes | Partial | TLS everywhere; signed links; every export audited with a formula guard (§10.2); transfer rules for subprocessors in processor terms (§18.2) | CC6.7 |
| 5.15 | Access control | Yes | Yes | RBAC, tenant and site scope, deny by default (§5.2); two front doors (§5.3) | CC6.1 |
| 5.16 | Identity management | Yes | Partial | Customer user lifecycle in the product (invite, role change, deactivate); staff identity through Buffr ID (D-23); leaver checklist open | CC6.2 |
| 5.17 | Authentication information | Yes | Partial | Hashed passwords, TOTP MFA, recovery codes, lockout, challenge tokens (§5.3, §17.1); rotation records for platform and vendor accounts open | CC6.1 |
| 5.18 | Access rights | Yes | Partial | Role catalogue and audited role changes; access-review attestation page for customers (`access_review.manage`); a quarterly review of Buffr staff and vendor accounts is open | CC6.2, CC6.3 |
| 5.19 | Security in supplier relationships | Yes | Partial | Subprocessor register and vendor tiers (programme §7); due diligence per vendor open | CC9.2 |
| 5.20 | Security in supplier agreements | Yes | Partial | Processor terms specified (§18.2); data processing agreements on file are to be confirmed per vendor | CC9.2 |
| 5.21 | ICT supply chain | Yes | Yes | Exact version pinning, 7-day adoption cool-down, lockfiles, secrets and dependency scanning in CI (§17.3, §34) | CC9.2 |
| 5.22 | Monitoring and change of supplier services | Yes | Partial | Ops integration health panel (§32.4); vendor report review cadence open | CC9.2 |
| 5.23 | Security for cloud services | Yes | Partial | Regions, exit and residency documented (§16); vendor assurance reports to be placed on file | CC9.2 |
| 5.24 | Incident management planning | Yes | Partial | Severity levels, first-hour steps, processor notification (§17.4, `docs/incident-response.md`); a tabletop exercise has not been held | CC7.3 |
| 5.25 | Assessment and decision on events | Yes | Partial | Severity table and anomaly alerts (§9.4, §17.4) | CC7.3 |
| 5.26 | Response to incidents | Yes | Partial | Contain, preserve evidence, tell the owner, notify customers (§17.4) | CC7.4 |
| 5.27 | Learning from incidents | Yes | Partial | Post-incident review and decision-log entry required (§17.4, §19.7) | CC7.5 |
| 5.28 | Collection of evidence | Yes | Yes | Hash-linked audit chain, preservation before change, evidence packs with a content digest (§14.4, §10.2) | CC7.4 |
| 5.29 | Information security during disruption | Yes | Partial | Offline kiosk, continuity kit, honest degraded UX (§6.5, §21.5) | A1.2 |
| 5.30 | ICT readiness for continuity | Yes | Partial | RTO and RPO proposed (§16.3); a restore test is not yet recorded | A1.2, A1.3 |
| 5.31 | Legal, statutory and contractual requirements | Yes | Yes | Law map and crosswalks maintained (§22, Annex C), reviewed on statute or provider change (§21.6) | CC2.3 |
| 5.32 | Intellectual property rights | Yes | Partial | Licences of dependencies and templates tracked through lockfiles; a licence review is open | CC1.1 |
| 5.33 | Protection of records | Yes | Yes | Append-only logs, soft deletes, least-privilege runtime role, hash chain (§14) | CC6.1, CC7.2 |
| 5.34 | Privacy and protection of PII | Yes | Partial | Minimisation, notices, retention, data requests (§8); Bill alignment (§18); privacy posture in the evidence pack (§10.2); record of processing, subprocessor register and DPIA triggers in `docs/system-description.md`; transfer assessments to be completed | P1 to P8 (privacy not in first scope) |
| 5.35 | Independent review of information security | Yes | Planned | ISAE 3000 Type 1 then Type 2 route (programme §2, §12); internal audit programme (§19.7) | CC4.1 |
| 5.36 | Compliance with policies, rules and standards | Yes | Partial | CI gates, evidence checks (`scripts/compliance/collect-evidence.mjs`), release `rg` check (§34) | CC4.1 |
| 5.37 | Documented operating procedures | Yes | Partial | Runbook, deploy and rollback, incident, restore (§32, §17.4, §16.3) | CC5.3 |

### B.2 People controls (6.1 to 6.8)

| Ref | Control | Applicable | Status | How Checkpoint meets it, evidence, open part | SOC 2 |
|---|---|---|---|---|---|
| 6.1 | Screening | Yes | Planned | Background checks proportional to access for staff and contractors with production access | CC1.4 |
| 6.2 | Terms and conditions of employment | Yes | Planned | Security responsibilities in engagement terms | CC1.4 |
| 6.3 | Awareness, education and training | Yes | Partial | Competence matrix and records (§21.4, `staff_training_acknowledgements`); organisation-wide Buffr staff training open | CC1.4 |
| 6.4 | Disciplinary process | Yes | Planned | Formal process communicated with the policy set | CC1.5 |
| 6.5 | Responsibilities after termination | Yes | Planned | Continuing duties stated in engagement terms; offboarding evidence (programme §9) | CC6.2 |
| 6.6 | Confidentiality or non-disclosure agreements | Yes | Partial | NDAs for integration partners and contractors; a standard template and register are open | CC1.4 |
| 6.7 | Remote working | Yes | Partial | MFA and managed platform access; a staff endpoint baseline is open | CC6.1 |
| 6.8 | Information security event reporting | Yes | Yes | `team@buffranalytics.com` (published in `security.txt` and `SECURITY.md`) (§17.3) | CC2.3, CC7.2 |

### B.3 Physical controls (7.1 to 7.14)

Hosting facilities belong to the subservice organisations (Neon, Railway, Vercel): data-centre perimeter, entry, environmental and utility controls are inherited, and their assurance reports go on file. Customer sites own the physical controls around kiosks. Checkpoint operates without a Buffr-owned processing facility, so premises controls apply to the remote working set-up only.

| Ref | Control | Applicable | Status | How Checkpoint meets it, evidence, open part | SOC 2 |
|---|---|---|---|---|---|
| 7.1 | Physical security perimeters | No | N/A | No Buffr-owned processing facility; hosting perimeters inherited (§16.1) | CC6.4 |
| 7.2 | Physical entry | Yes | Inherited | Hosting providers; customer site entry is the customer's, supported by the visitor record itself | CC6.4 |
| 7.3 | Securing offices, rooms and facilities | No | N/A | No Buffr-owned office with processing equipment | CC6.4 |
| 7.4 | Physical security monitoring | Yes | Inherited | Hosting providers; kiosk site monitoring is the customer's | CC6.4 |
| 7.5 | Protection against physical and environmental threats | Yes | Inherited | Hosting providers; offline kiosk capture tolerates site outages | A1.2 |
| 7.6 | Working in secure areas | Yes | Inherited | Hosting providers; platform support works only through consented sessions (§5.4) | CC6.4 |
| 7.7 | Clear desk and clear screen | Yes | Partial | Kiosk idle timeout clears the screen (§6.5); staff clear-screen rule in the policy draft | CC6.4 |
| 7.8 | Equipment siting and protection | Yes | Partial | Kiosk mounts and privacy screens, UPS where justified (§20.2); staff equipment baseline open | CC6.4 |
| 7.9 | Security of assets off-premises | Yes | Partial | MDM, remote lock and wipe, Keystore-protected local store (§15.2) | CC6.7 |
| 7.10 | Storage media | Yes | Partial | Encrypted devices; media handling in device lifecycle (§20.2) | CC6.7 |
| 7.11 | Supporting utilities | Yes | Inherited | Hosting providers; UPS for critical kiosk sites (§20.2) | A1.2 |
| 7.12 | Cabling security | Yes | Inherited | Hosting providers; customer sites for kiosk cabling | CC6.4 |
| 7.13 | Equipment maintenance | Yes | Partial | Device maintenance actions and patching (§20.2); health monitoring | A1.2 |
| 7.14 | Secure disposal or re-use of equipment | Yes | Partial | Secure wipe and disposal evidence in the device lifecycle (§15.1, §20.2) | CC6.5 |

### B.4 Technological controls (8.1 to 8.34)

| Ref | Control | Applicable | Status | How Checkpoint meets it, evidence, open part | SOC 2 |
|---|---|---|---|---|---|
| 8.1 | User end point devices | Yes | Partial | Kiosk MDM and kiosk mode (§15.1); staff endpoint baseline open | CC6.7 |
| 8.2 | Privileged access rights | Yes | Yes | Break-glass, customer-approved, time-bound, fully audited (§5.4); ops MFA mandatory (§5.3) | CC6.3 |
| 8.3 | Information access restriction | Yes | Yes | Tenant and site scope, minimal roster fields, no public visitor search (§5.2, §8.3) | CC6.1 |
| 8.4 | Access to source code | Yes | Partial | GitHub with CODEOWNERS on sensitive paths; branch protection and private repositories need a plan decision (programme D1) | CC6.1, CC8.1 |
| 8.5 | Secure authentication | Yes | Yes | TOTP MFA, lockout, per-IP throttling, separate token audiences (§5.3) | CC6.1 |
| 8.6 | Capacity management | Yes | Partial | Health, ETL and outbox monitoring (§32.4); a single API replica is a documented limit (§30.2) | A1.1 |
| 8.7 | Protection against malware | Yes | Planned | Scanning of uploaded evidence and proof-of-payment files before storage; managed hosts inherit server protection | CC6.8 |
| 8.8 | Management of technical vulnerabilities | Yes | Yes | PR-blocking `npm audit`, Dependabot, secrets scan, SLAs (§17.3) | CC7.1 |
| 8.9 | Configuration management | Yes | Partial | Migrations and seeds in Git, env names in `.env.example`, replay in CI (§14.5, §32.2); a recorded configuration baseline for the hosting accounts is open | CC8.1 |
| 8.10 | Information deletion | Yes | Partial | Retention disposition on by default with platform default retention, legal-hold precedence, reconciliation and outbox redaction (§8.5, §9.1); production rollout through a reviewed dry run | P4, C1.2 |
| 8.11 | Data masking | Yes | Partial | Minimal roster fields, masked card number, PII scrubbers on telemetry, small-cell suppression (§10.1, §17.2) | C1.1 |
| 8.12 | Data leakage prevention | Yes | Partial | Audited exports, formula guard, no PII in logs or prompts, restricted comment access (D-27) | C1.1 |
| 8.13 | Information backup | Yes | Partial | Neon point-in-time restore and daily snapshots; restore test and the snapshot secret open (§16.3) | A1.2 |
| 8.14 | Redundancy of information processing facilities | Yes | Planned | Offline kiosk capture today; a second API replica needs the shared bus (§30.1) | A1.2 |
| 8.15 | Logging | Yes | Partial | Hash-linked audit events, platform-support audit, outbox and ETL logs (§14.4); a central log store and retention are open (programme D3) | CC7.2 |
| 8.16 | Monitoring activities | Yes | Partial | Health checks, Sentry, anomaly alerts, integration health (§9.4, §32.4); the external uptime monitor is to be created | CC7.2 |
| 8.17 | Clock synchronisation | Yes | Inherited | Managed platforms synchronise time; all authoritative timestamps are UTC (§14.1) | CC7.2 |
| 8.18 | Use of privileged utility programs | Yes | Partial | Database owner role used only from an operator machine for migrations (D-21); access recorded | CC6.3 |
| 8.19 | Installation of software on operational systems | Yes | Inherited | Managed platforms; kiosk app installed through MDM | CC8.1 |
| 8.20 | Network security | Yes | Inherited | TLS, CORS allow-list, security headers, throttling (§6.2, §13.4); provider network controls | CC6.6 |
| 8.21 | Security of network services | Yes | Inherited | Hosting and telecom providers' service terms (§12.4, REG-SUP-01) | CC6.6 |
| 8.22 | Segregation of networks | Yes | Inherited | Provider-managed isolation; tenant isolation is logical in the application and database (§14.1) | CC6.6 |
| 8.23 | Web filtering | Yes | Planned | Staff endpoint baseline item; not applicable to the hosted service | CC6.8 |
| 8.24 | Use of cryptography | Yes | Partial | TLS; AES-256-GCM personal-data envelope; keyed lookup digests; secrets fail closed in production (D-29, §14.3); managed key service, per-subject keys and rotation open (§30.1) | CC6.1, C1.1 |
| 8.25 | Secure development life cycle | Yes | Yes | Pull requests, CI, tests, migration replay, vertical-slice rule (§34) | CC8.1 |
| 8.26 | Application security requirements | Yes | Yes | Deny-by-default routes, input validation, tenant derivation from the principal (§5.2, §13.5, §34) | CC8.1 |
| 8.27 | Secure system architecture and engineering principles | Yes | Yes | Architecture principle, Wiebe rules, capability-named modules (§13, §14) | CC8.1 |
| 8.28 | Secure coding | Yes | Yes | Parameterized SQL, strict DTOs, logger rule, static guards (§34) | CC8.1 |
| 8.29 | Security testing in development and acceptance | Yes | Partial | Unit and e2e suites, `ops-auth-verify.ts`, acceptance ladder (§29.3); an external penetration test is open | CC4.1, CC7.1 |
| 8.30 | Outsourced development | Yes | Partial | AI coding assistants and contractors go through the same pull-request and CI path; model versions pinned (programme §6) | CC8.1 |
| 8.31 | Separation of development, test and production | Yes | Yes | Disposable branches, synthetic data, no demo organisation in production (§16.4, D-19) | CC8.1 |
| 8.32 | Change management | Yes | Partial | Evidence checklist, CODEOWNERS, forward-only migrations; protected `main` open (programme D1) | CC8.1 |
| 8.33 | Test information | Yes | Yes | Synthetic data only; production payloads never copied (§16.4) | CC8.1 |
| 8.34 | Protection of information systems during audit testing | Yes | Partial | Audit tests run on branches or with read-only evidence scripts; written test agreements per engagement | CC4.1 |

Count check: 5.x has 37 rows, 6.x has 8, 7.x has 14, 8.x has 34: 93 in total.

## Annex C: Data Protection Bill crosswalk

Section numbers are those of the draft text on file (§18.1). "Where" points to the section of this document that implements or specifies the requirement.

| Bill section | Subject | Checkpoint treatment | Where |
|---|---|---|---|
| s1 | Definitions: controller, processor, personal data, special categories, breach | Customer is controller; Checkpoint is processor, and controller of its own data | §18.2 |
| s2 | Scope: automated and structured manual processing; applies to processing outside Namibia relating to people in Namibia | Whole service in scope; Frankfurt and Amsterdam processing noted | §18.1, §18.5 |
| s3 | Principles: fair, transparent, lawful; purpose limitation; minimisation; accuracy; storage limitation | Form classes, minimisation gates, corrections, retention | §8.2, §8.5, §18.3 |
| s4 | Lawfulness: bases, proportionality, further-processing assessment | Mandatory notice basis; controller records its basis; new purposes need an assessment | §8.4, §18.3 |
| s5 | Consent: demonstrable, specific, withdrawable, no undue pressure | `legal_basis_code`; entry not conditioned on optional consent | §8.4 |
| s6 | Children under 18 | Controller minors rule; no profiling | §18.3 |
| s7 | Special categories | Default-off fields; sector defaults; DPIA | §8.2, §18.3, §18.7 |
| s8 | Right to know and access; one month, extendable | Packaged, subject-scoped export; clock recorded | §8.5, §18.4 |
| s9 | Rectification, erasure, restriction; communicate to recipients | Correction and deletion request types; disposal | §8.5, §18.4 |
| s10 | Right to object; direct marketing | No marketing use; revocable optional consents | §18.4 |
| s11 | Automated decisions | No automated denial; human override | §3.2 |
| s12 to s14 | Assistance from the authority; representation; compensation | Information in the notice; customer contact route | §18.4 |
| s15 | Exceptions by law for defined public purposes | Not relied on by Checkpoint; recorded if a customer relies on one | §18.3 |
| s16 | Transparency: minimum information to data subjects | Privacy notice before capture | §7.3, §8.4 |
| s17 | Privacy by design and by default | Default-off sensitive fields, tenancy, pre-capture notice | §14, §18.3 |
| s18 | Security; processor contract terms | Controls and processor agreement | §14, §17, §18.2 |
| s19 | Accountability | Audit chain, evidence packs, ISMS records | §10.2, §19 |
| s20 | Records of processing | REG-ROPA-01 | §18.3, §21.3 |
| s21 | Data protection impact assessment | Trigger list | §18.7 |
| s22 | Breach notification to the authority (72 hours); processor to controller | Incident process | §17.4, §18.6 |
| s23 | Breach notification to data subjects; encryption exemption | Customer communication; envelope encryption | §14.3, §18.6 |
| s24 | Transfers outside Namibia | Transfer assessment, subprocessor register | §16.2, §18.5 |
| s25 to s37 | Supervisory Authority: establishment, independence, board, staff, competence, functions, powers, penalties, cooperation, funds (registration fees) | Registration as controller or processor when required; cooperation with inquiries | §18.8 |
| s38 | Offence: unlawfully obtaining, retaining or disclosing personal data | Staff access policy; break-glass rules | §5.4, §18.8 |
| s39 | Offence: altering or destroying data to defeat an access request | Immutable audit and exports | §14.4, §18.4 |

## Annex D: Section crosswalk (v0.34 to this document)

Source comments in live code and docs have been updated to the new numbers. Comments inside historical migrations and seeds cite the v0.34 numbering and now name the archived file explicitly.

| v0.34 | This document |
|---|---|
| 1, 1a, 2, 3 | §1, §22 |
| 4, 4.2, 5, 5.1, 6 (retired), 12 | §2 |
| 4a (NFC, DigiNam, e-ID, register) | §2.3, §24 |
| 5.2, 5.2a (assurance levels, axes) | §3.1 |
| 7, 7.2 (RBA) | §3.2 |
| 8.1 to 8.10 (journeys) | §4.1 to §4.10; 8.9 also §8.5 |
| 9.1, 9.1a (roles) | §5.1 |
| 9.2 rules 1 to 8 | §5.2 rules 1 to 8 (rule 4 detail is §5.4) |
| 9.2 rule 9 (fixed role catalogue) | §5.1 |
| 9.2 rule 10 (deny by default) | §5.2 rule 9 |
| 9.2a (two front doors) | §5.3 |
| 10 (wireframes) | §6.5 |
| 11.1, 11.2 (architecture, stack) | §13 |
| 11.1a (outbox) | §9.1 |
| 11.1b, 11.1c (analytics, reporting, payments, KPIs, UI patterns) | §10, §11, §33.5; security headers §6.2; CI §34 |
| 11.3, 11.4 (data model) | §14 |
| 11.4.4 (wiring, onboarding lifecycle) | §13.4, §7.2 |
| 11.5 (design system) | §33 |
| 11.6 (website) | §6.2; visuals §33.6 |
| 11.7 (kiosk) | §6.5, §33.4; 11.7.8 hostnames §32.1 |
| 11.8 (pre-launch checklist) | §34, §33.7, §32.4 |
| 11.9.1 to 11.9.9 (operating model, config) | §6, §5.4, §8 |
| 11.9.1a (ops console) | §5.4, §6.4, §11 |
| 11.9.8 (QR types, notices, escalation, maintenance) | §8.6, §3.3, §6.5 |
| 11.9.15.1 to 11.9.15.11 (onboarding) | §7.2 to §7.11 (11.9.15.5 branding is retired; 11.9.15.12 build plan not carried) |
| 12 (NFC) | §2.3, §15.3 |
| 13 (security and resilience) | §17, §16.3 |
| 14 (asset management) | §20 |
| 15, 16 (business model, strategy) | §28, §27 |
| 17 (go-to-market) | §29 |
| 17.2 (pilot) | §29.2 |
| 17.4 (alpha and UAT) | §29.3 |
| 18 (roadmap) | §30.1 |
| 19 (risk register) | §30.2 |
| 20 (governance and assurance) | §21 |
| 21 (immediate decisions) | §31 |
| Part Two, 1 to 11 (regulatory addendum) | §22 to §26 |
| Part Three (competitive assessment) | Decisions folded into §2, §8, §27 |
| Constitution (names, schema, services, commands) | §13.3, §13.5, §14, §34 |
| Decision log D-01 to D-28 | §35 (unchanged numbers; D-29 to D-36 added) |
