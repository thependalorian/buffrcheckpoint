# CiMSO INNterchange — public research pack (Buffr Checkpoint)

**Scraped:** 2026-09-22 · **Package received:** 2026-09-23 · **Shell status:** 2026-09-24  
**Purpose:** Hospitality integration between Buffr Checkpoint (visitor/guest check-in) and CiMSO (INNkeeper PMS / ERP).  
**Current state:** NDA package is in-tree (`INNterchange_Specifications_3_June_2026_a/`). Engineering digest: `NDA_PACKAGE_NOTES.md`. **Production shell is done** (schema, admin Connect/Sync, invitation path). **Live TCP client is not** — still needs framing code + Hotel Etuna (pilot) host/credentials. Platform register stays **Targeted** until handshake proven. No second developer registration required.

---

## 1. Verdict

| Question | Answer |
|---|---|
| Public OpenAPI / Swagger? | **No** |
| Public base URL / sample requests? | **No** |
| Official API product name | **CiMSO INNterchange** |
| Access path | Register at https://backoffice.cimso.com/api_registration → NDA → approval → download API |
| Architecture (vendor claim) | Microservices-based API suite for 3rd parties, devices, web/mobile apps |
| Africa contact | marketingza@cimso.com · +27 21 852 2388 (UTC+2) |
| Asia contact | marketingsg@cimso.com · +65 6604 7245 (UTC+8) |

Do **not** invent fake CiMSO routes. Transport is **TCP binary + JSON** (not public REST). Shell + fixtures are in place; wire live 1101/1107/2001 after TCP framing lands and a property server is reachable.

---

## 2. Sources scraped (raw HTML + text in this folder)

| URL | Local dump |
|---|---|
| https://backoffice.cimso.com/api_registration | `raw/backoffice.cimso.com_api_registration.html` + `.txt` |
| https://www.cimso.com/software/innterchange/ | `raw/www.cimso.com_software_innterchange.html` |
| https://www.cimso.com/software/interfaces/ | `raw/www.cimso.com_software_interfaces.html` |
| https://www.cimso.com/software/innkeeper/ | `raw/www.cimso.com_software_innkeeper.html` |
| https://www.cimso.com/cimso-launches-new-product/ | launch article (2019) |
| https://www.cimso.com/developing-an-api-for-hotel-management-software/ | microservices note (2019) |
| https://www.cimso.com/ | home |

NDA preview path exists at `/api_nda_view/1` (session cookie required; not saved here).

---

## 3. INNterchange interface types (from registration form)

Registration note (verbatim sense): the interface you develop is limited to the Interface Type messages you select. Using another type later requires re-registration.

| ID | Interface type | Vendor description | Buffr Checkpoint relevance |
|---|---|---|---|
| 1 | Customer data platform | Customer profile and membership data | Guest/member profile sync (careful PII minimisation) |
| 2 | Customer satisfaction | Customer and services detail | Post-stay / visit feedback (optional later) |
| **3** | **Lodging reservations** | **Rooms, rates, bookings detail** | **Pre-arrival: known bookings → Checkpoint invitation / expected guest** |
| **4** | **Front desk services** | **Check-in, check-out and billing detail** | **Primary: arrival/departure events ↔ Checkpoint visit lifecycle** |
| 5 | Housekeeping services | Lodging room service detail | Room-ready gates (secondary) |
| 6 | Workshop services | Workshop service ticket detail | Low for pure lodging |
| 7 | Restaurant & Bar services | F&B service delivery detail | Low for visitor register |
| 8 | Golf T-bookings | Golf bookings and scoring | Niche |
| 9 | Activity scheduling | Activity scheduling detail | Tourism activities / excursions |
| 10 | Staff tasks and activities | Internal staff task management | Ops tasks (secondary) |
| 11 | Business Intelligence | Customer-specified financial detail | Reporting only; avoid unless needed |

**Recommended first registration for Buffr Checkpoint hospitality:** types **1 + 3 + 4** (customer data + reservations + front desk). **Submitted 2026-09-23** with Hotel Etuna as the named registration end-user / first pilot — product is multi-site (any Checkpoint org on CiMSO). See `REGISTRATION_ANSWERS.md`.

---

## 4. What public marketing says (not a contract)

From product pages:

- INNterchange: secure data exchange with servers, mobile devices, web pages; encrypted TCP/IP; positioned for GDPR/PCI-conscious designs; APIs for 3rd-party app development; proprietary messaging (not “rely on 3rd party technology” in their wording).
- INNkeeper front office: contactless / mobile / kiosk check-in, guest folios, CRS via WEBsync, middleware to 600+ guest-service devices (locks, IPTV, HSIA) via Comtrol Lodging-Link class stack.
- Channel / OTA interfaces listed separately (SiteMinder, TripAdvisor, Expedia, NightsBridge, etc.) — those are **CiMSO↔channel**, not your integration surface. Buffr Checkpoint should not try to replace the CRS.
- Early adopter example: GuestRevu used INNterchange for guest feedback against INNkeeper (2019 news).

---

## 5. Buffr Checkpoint ↔ CiMSO integration design (adapter-first)

### 5.1 Principle

CiMSO owns **folio, room, rate, reservation**.  
Buffr Checkpoint owns **privacy-preserving presence, visitor/guest identity capture at the desk, assisted/QR inclusion, offline outbox, emergency roster, audit**.

Integration is event sync at the boundary, not a PMS clone.

### 5.2 Target flows (hospitality)

```text
[CiMSO INNkeeper]  --reservation create/update-->  [Checkpoint] create/update invitation / expected guest
[Checkpoint]       --walk-in / QR / assisted---->  [CiMSO] optional front-desk check-in / guest note (if property wants)
[CiMSO]            --checked-in / room assigned->  [Checkpoint] mark visit admitted + room/zone metadata (no shared book)
[Checkpoint]       --sign-out / leave----------->  [CiMSO] optional check-out signal or host notify only
[CiMSO]            --checked-out---------------->  [Checkpoint] close open visit if still open
```

Day visitors / contractors with **no reservation** stay Checkpoint-native (paper-register replacement). Do not force every visit into a folio.

### 5.3 Buffr modules (implemented shell)

Nest path under `buffrcheckpoint/backend`:

```text
modules/integrations/cimso/
  cimso.module.ts
  cimso.config.ts                 # per-site + optional global TCP env (not REST)
  cimso-innterchange.client.ts    # stub: assertReady + TODO framing (fails closed)
  cimso-integration.service.ts    # connect, sync persist, status
  cimso.controller.ts
  adapters/                       # reservations / front-desk / customer-profile
  mappers/                        # reservation→invitation, visit→front-desk
  cimso.types.ts                  # message IDs + booking statuses from package
  __fixtures__/                   # synthetic messages for tests
```

Public Buffr API surface (admin/ops):

| Method | Path | Intent |
|---|---|---|
| GET | `/integrations/cimso/status` | Connection health, last sync, capability flags |
| POST | `/integrations/cimso/connect` | Persist org+site TCP settings + secret ref (password in Railway only) |
| POST | `/integrations/cimso/sync/reservations` | Pull window → invitations / sync log (live pull blocked until TCP client) |
| POST | `/integrations/cimso/events/front-desk` | Front-desk event path (live 1107 blocked until TCP client) |
| GET | `/integrations/cimso/mappings` | Room/zone ↔ Checkpoint security zone map |
| GET | `/platform/dashboard/organisations/:id/pms-integrations` | Ops: list PMS connections |

CiMSO side has **no public HTTPS URLs** — Checkpoint opens TLS TCP to each property’s INNterchange server (or receives outbound). See `NDA_PACKAGE_NOTES.md`.

### 5.4 Data minimisation

When mapping CiMSO guest profiles into Checkpoint:

- Prefer opaque reservation/guest IDs over copying full passport into Checkpoint unless the site policy requires it.
- Do not write CiMSO folio PII into public check-in success screens.
- Audit every cross-system read/write (Checkpoint audit log + optional ops note).

---

## 6. Developer registration draft (Buffr Analytics)

Use at https://backoffice.cimso.com/api_registration

| Field | Suggested value |
|---|---|
| Business name | Buffr Financial Services CC |
| Trading name | Buffr Analytics |
| Website | https://buffrcheckpoint.com |
| Country | Namibia |
| Nature of business | Hospitality visitor-management / digital guest check-in software |
| Applicant | George Nekwaya |
| Email | pendanek@gmail.com or team@buffranalytics.com |
| Phone | +264 81 437 6206 |
| End-user customer | _(named lodge/hotel on CiMSO, or “design-partner hospitality sites in Namibia”)_ |
| Product name | Buffr Checkpoint |
| Description | Privacy-preserving guest and visitor check-in (QR, assisted desk, offline kiosk) that complements INNkeeper: sync reservations, front-desk events, and guest profiles without shared paper registers |
| Interface types | **1 Customer data platform**, **3 Lodging reservations**, **4 Front desk services** |
| End-user (registration) | Hotel Etuna (first pilot; not exclusive) |
| Product scope | Multi-tenant Checkpoint ↔ CiMSO for hospitality sites |
| Applicant email | team@buffranalytics.com |

Then: sign NDA → submit → download API → fill `cimso.types.ts` from real docs → certification when ready.

---

## 7. Next actions (ordered)

1. ~~Register~~ — **submitted 2026-09-23** (1+3+4; Hotel Etuna named pilot). No new registration for additional hotels.
2. ~~NDA package~~ — **received 2026-09-23**; digest in `NDA_PACKAGE_NOTES.md`.
3. ~~Production shell~~ — **done 2026-09-24** (migrations, Targeted register, admin/ops UI, invitation persist). Leave register at **Targeted**.
4. **Code:** TCP framing + CRC32 + handshake 4→5; wire **1101** / **1107** / optional **2001** (fixtures first).
5. **Pilot property (Etuna):** host:port, Client Login ID + Password, TLS/VPN so Railway can reach INNterchange; Connect sheet + Railway secret; Sync → QR invitations; paper parallel week 1.
6. **Compliance:** obtain/map **C-POL-GDP**; then consider type-1 profile sync.
7. **Register → live** only after handshake + sync evidence (ops Capability Status). Then other CiMSO sites on the same adapter.

---

## 8. What we explicitly did *not* invent

- No forged REST paths, API keys, or sample JSON claimed as CiMSO’s.
- No claim that INNterchange is a public REST OpenAPI.
- No CIMcloud / unrelated “CIM” products (different vendors).
