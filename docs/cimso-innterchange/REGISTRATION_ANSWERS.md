# CiMSO INNterchange — developer registration (as submitted)

Fill / track at: https://backoffice.cimso.com/api_registration  
Africa desk: marketingza@cimso.com · +27 21 852 2388

**Status (2026-09-24):** Application **submitted**; NDA package **received** (`INNterchange_Specifications_3_June_2026_a`). Named registration end-user: **Hotel Etuna** (first pilot). Product scope: **any** Checkpoint hospitality org/site on CiMSO INNkeeper — not Etuna-only. Interface types 1+3+4; applicant email team@buffranalytics.com. NDA form on file: `C-AGR-CND_Confidentiality_and_non_Disclosure_R5.4.pdf` (Form C-AGR-CND R5.4, 2025-03-14).

**Checkpoint product:** Production **shell** shipped (admin Connect/Sync, `pms_*` schema, invitation path). Platform register `cimso_innterchange` = **Targeted** (leave it). Live TCP client **not** built yet.

**Still waiting (not a new registration):**
1. **Hotel Etuna** (or another CiMSO property) — INNterchange host:port, Client Login ID/Password, network path (TLS/VPN) for Railway.
2. **Engineering** — TCP framing + handshake + 1101/1107 (optional 2001); see `NDA_PACKAGE_NOTES.md` §7.
3. **CiMSO policy desk** — **C-POL-GDP** when available (keep type-1 off in prod until mapped).

Do **not** re-register a different hotel on the developer form to “unlock” testing; connect additional sites later via Checkpoint admin on the same adapter.

## Business Details

| Field | Value |
|---|---|
| Full official name of your business | Buffr Financial Services CC |
| Trading Name | Buffr Analytics |
| Business Website URL | https://buffrcheckpoint.com |
| Street address | Windhoek, Namibia _(add street from CC extract)_ |
| State | Khomas |
| Country | Namibia |
| Postal Code | _(from CC extract)_ |
| Nature of your business | Hospitality and tourism visitor-management software (digital guest and visitor check-in) |
| How many years trading | 2 _(adjust to CC registration year 2024)_ |

## Applicant Details

| Field | Value |
|---|---|
| First Name | George |
| Last Name | Nekwaya |
| Applicant Job Title | Founder |
| Applicant Email | **team@buffranalytics.com** |
| Applicant Phone Number | +264814376206 |
| Spammer honeypot | Leave empty |

## End User Detail (Customer)

| Field | Value |
|---|---|
| Organization or customer for whom you will develop this interface | **Hotel Etuna** (Namibia) |
| Brief description of the program, device or process | Buffr Checkpoint replaces shared paper guest registers with isolated encrypted visitor records. We sync lodging reservations, front-desk check-in/out, and customer/guest profile messages with CiMSO INNkeeper so folio/room truth stays in CiMSO while Checkpoint handles QR phone check-in, assisted desk for guests without smartphones, offline capture, host notification, emergency roster, and audit. First live end-user on this registration: Hotel Etuna; the same Buffr Checkpoint product serves other CiMSO hospitality sites under their own org/site connections. |
| Product name | Buffr Checkpoint |

## Interface Type Detail (selected — all three for this registration)

- [x] **1 — Customer data platform** — customer profile and membership data (guest/member profile sync per property; minimise PII; DPA/GDP policy applies)
- [x] **3 — Lodging reservations** — rooms, rates, bookings detail  
- [x] **4 — Front desk services** — check-in, check-out and billing detail  

Do not add F&B, golf, workshop, BI, etc. without a new registration.

## NDA (Form C-AGR-CND R5.4)

Local copy: `C-AGR-CND_Confidentiality_and_non_Disclosure_R5.4.pdf`  
Form id: **C-AGR-CND** · Revision **R5.4** · Dated **2025-03-14** · Status Restricted (L1–L4)

Do not rewrite clauses 1–8. Only populate **Annex A** (page 4) and the signature block, then PDF-sign or wet-ink scan.

---

## Populating the NDA (Annex A)

Open the PDF, go to **Annex A — Information Pertaining to Confidentiality and Non-disclosure Agreement**, and fill as follows.

### Item 1.1 — CiMSO (leave as printed; already completed by CiMSO)

| Field on form | Value (pre-filled) |
|---|---|
| Name | CiMSO Development Pte Ltd |
| Co. Reg. No. | 201709086D |
| Address | 2 Balestier Road, #04-697 Balestier Hill SC, Singapore, 320002 |
| Telephone | +65 6604 7245 |
| E-mail | eo@cimso.com · johanm@cimso.com |

### Item 1.2 — The Second Party (you fill this)

| Field on form | Value to write |
|---|---|
| Name | Buffr Financial Services CC (trading as Buffr Analytics) |
| Co. Reg. No. | CC/2024/09322 _(confirm exact number on CC extract)_ |
| Address | _(full registered street address from CC extract)_, Windhoek, Khomas, Namibia |
| Telephone | +264 81 437 6206 |
| E-mail | team@buffranalytics.com |

### Item 2 — Date

| Field on form | Value to write |
|---|---|
| The effective date of this agreement | Date of Second Party signature (e.g. 22 September 2026) |

### Item 3 — Term

| Field on form | Value to write |
|---|---|
| This agreement shall endure for a period of | **3 (three) years** from the effective date _(or leave blank if CiMSO prefers to complete — clause 8.1 allows CiMSO to finish incomplete Annex A and send back for attestation)_ |

### Item 4 — Jurisdiction

| Field on form | Value to write |
|---|---|
| This agreement is governed by the laws of | **Singapore** _(CiMSO Development Pte Ltd seat; if CiMSO inserts another governing law on return, accept their completed Annex)_ |

### Item 5 — Associates

| Field on form | Value to write |
|---|---|
| Associates | Employees, contractors, and professional advisers of Buffr Financial Services CC / Buffr Analytics who need access to INNterchange documentation to build and certify Buffr Checkpoint; each bound in writing to confidentiality no less restrictive than this agreement. Hotel Etuna staff only as required to operate the live interface, under the same restrictions. |

### Item 6 — Business

| Field on form | Value to write |
|---|---|
| Business | Evaluation and development of a third-party integration between **Buffr Checkpoint** and **CiMSO INNterchange** for end-user property **Hotel Etuna** (Namibia), limited to interface types **1 (Customer data platform)**, **3 (Lodging reservations)**, and **4 (Front desk services)**; including API access, certification, and ongoing support of that interface. |

Paste-ready (single paragraph):

> Development and certification of Buffr Checkpoint (Buffr Financial Services CC t/a Buffr Analytics) as a CiMSO INNterchange third-party interface for Hotel Etuna, Namibia — interface types 1 Customer data platform, 3 Lodging reservations, and 4 Front desk services — so that CiMSO INNkeeper remains system of record for reservations, folios, and guest profiles while Buffr Checkpoint provides privacy-preserving guest/visitor check-in (QR, assisted desk, offline capture).

### Item 7 — Signatures (Second Party side)

| Field on form | Value to write |
|---|---|
| The Second Party signed at | Windhoek, Namibia |
| 2nd Party Signature | _(George Nekwaya wet-ink or qualified e-signature)_ |
| On date | Same as Item 2 effective date |
| Name & Designation | George Nekwaya, Founder |

Leave the **CiMSO signed at / CiMSO Signature / Name & Designation** block blank for CiMSO to complete after you upload.

### Checklist before upload

1. Annex A Items **1.2**, **2**, **5**, **6**, and Second Party signature block are complete.  
2. Items **3** and **4** filled or intentionally left for CiMSO completion under clause 8.1.  
3. PDF is signed (all pages if required) and filename clear, e.g. `Buffr_Analytics_C-AGR-CND_R5.4_signed.pdf`.  
4. Upload on https://backoffice.cimso.com/api_registration (NDA step).  
5. Keep a copy next to this folder; do not commit secrets or counterparty personal data beyond what is already here.

### After signing / after approval

1. ~~Submit registration~~ / ~~Download API package~~ — done; digest in `NDA_PACKAGE_NOTES.md`.  
2. ~~Wire production shell~~ — done (`modules/integrations/cimso/`, migrations 0036/0037, admin/ops UI). TCP client still stubs.  
3. **When Etuna credentials exist:** admin → enable `cimso_innterchange` → Site Experience → CiMSO → Connect (TCP host/port/login + `credentials_secret_ref` + default host). Set Railway env named by that secret ref (e.g. `CIMSO_SITE_ETUNA_CLIENT_PASSWORD`). Optional global fallbacks: `CIMSO_INNTERCHANGE_HOST`, `PORT`, `CLIENT_LOGIN_ID`, `CLIENT_PASSWORD`, `CIMSO_ENABLED_INTERFACE_TYPES=1,3,4`.  
4. Implement/live-test TCP framing + 1101 Sync before flipping platform register to **live**.

## Email to Africa desk (optional cover)

Subject: INNterchange developer registration — Buffr Checkpoint / Hotel Etuna (Namibia)

Body:

We are registering Buffr Financial Services CC (trading as Buffr Analytics) for CiMSO INNterchange interface types 1 (Customer data platform), 3 (Lodging reservations), and 4 (Front desk services). End-user property for this interface: Hotel Etuna, Namibia. Buffr Checkpoint complements INNkeeper: CiMSO remains system of record for reservations, folios, and guest profiles; Checkpoint provides privacy-preserving presence, QR and assisted check-in, and offline operation. Applicant: George Nekwaya, team@buffranalytics.com, +264 81 437 6206. Signed NDA (C-AGR-CND R5.4) will be uploaded with the online form. Please confirm any Namibia-specific onboarding steps.
