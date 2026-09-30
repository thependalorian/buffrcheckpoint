# INNterchange package notes (Buffr Checkpoint)

**Package:** `INNterchange_Specifications_3_June_2026_a` (spec dated **3 June 2026**)  
**Local path:** `docs/cimso-innterchange/INNterchange_Specifications_3_June_2026_a/` (gitignored — NDA / Restricted)  
**Received:** 2026-09-23  
**Scope:** Multi-tenant Buffr Checkpoint ↔ CiMSO for **any** hospitality site that runs INNkeeper. Connections are **org + site** scoped (`pms_integration_connections`).  
**First named end-user on CiMSO registration / pilot:** Hotel Etuna · Interface types **1 + 3 + 4**  
**Applicant:** team@buffranalytics.com

This file is our engineering digest. Do **not** paste large proprietary excerpts into public docs, marketing, or commits outside this private tree.

---

## 0. Status (2026-09-24)

| Layer | State |
|---|---|
| Spec digest + message map (1 / 3 / 4 → 2001 / 1101 / 1107) | Done |
| Production **shell** (schema, admin Connect/Sync UI, org enable at targeted\|live, invitation persist path, ops PMS tab) | Done — deployed |
| Platform register `cimso_innterchange` | **Targeted** (correct until a live handshake is proven; do **not** flip to `live` via env vars) |
| TCP framing / CRC32 / handshake client | **Not implemented** — `cimso-innterchange.client.ts` fails closed (`CIMSO_TCP_CLIENT_NOT_IMPLEMENTED`) |
| Live property credentials + network path | **Waiting on Hotel Etuna** (or another CiMSO site) — see §5 |

**Not required:** a second CiMSO developer registration or a different hotel on the registration form. Etuna is already the named pilot. Additional properties connect later via Checkpoint admin on the same adapter.

**To finish the live wire:** (1) implement TCP client + 1101/1107/(optional 2001); (2) get Etuna host:port, Client Login ID/Password, TLS/VPN reachability from Railway; (3) Connect site + set Railway secret named by `credentials_secret_ref`; (4) Sync → invitations; (5) only then consider register → `live` with evidence.

---

## 1. Architecture (corrects earlier REST assumption)

INNterchange is **not** a public HTTPS OpenAPI.

| Piece | Reality |
|---|---|
| Server | Windows **INNterchange server** app, connected directly to the **INNkeeper** database |
| Client | Third-party app (Buffr Checkpoint adapter) |
| Transport | **TCP/IP** (server may accept inbound, initiate outbound, or both) |
| Port | Configurable (`ListenOnPort` in sample config; e.g. sample uses `1234`) |
| Encryption | Optional **SSL/TLS** on LAN; **should be used** over the Internet |
| Payload | Fixed binary **header** + optional **JSON** body (most messages); optional **Zlib** compression |
| Auth | **Client Login ID** + **Client Password** in Client→Server Handshake (Message Type ID **5**), after Server→Client Handshake (ID **4**) |

Env vars `CIMSO_INNTERCHANGE_BASE_URL` / `CIMSO_INNTERCHANGE_API_KEY` were placeholders from pre-package marketing. Prefer per-site connection rows (admin Connect sheet) plus:

```
# Per-site password env named by credentials_secret_ref on the connection row:
CIMSO_SITE_<slug>_CLIENT_PASSWORD=
# Optional global fallbacks for local single-site:
CIMSO_INNTERCHANGE_HOST=
CIMSO_INNTERCHANGE_PORT=
CIMSO_INNTERCHANGE_TLS=true
CIMSO_INNTERCHANGE_CLIENT_LOGIN_ID=
CIMSO_INNTERCHANGE_CLIENT_PASSWORD=
CIMSO_SITE_EXTERNAL_ID=
CIMSO_ENABLED_INTERFACE_TYPES=1,3,4
```

Per-property credentials should eventually live in secret refs on `pms_integration_connections` (or a vault), not only global Railway env — so multiple lodges/hotels can connect under different Checkpoint orgs.

Sample config in package (`SampleConfigFile.txt`) is for the **Windows server** side (`Database`, `DebugMode`, `ListenOnPort`, `DisableOutgoingConnection`) — not Checkpoint’s Nest env.

---

## 2. Binary message header (32 bytes, little-endian)

| Offset | Size | Field |
|---|---|---|
| 0 | 4 | Header CRC32 (excludes this field) |
| 4 | 4 | Payload CRC32 (after compression if any; 0 if no payload) |
| 8 | 4 | Connection Token (client-chosen; echoed by server) |
| 12 | 4 | Request Token (client request correlation) |
| 16 | 4 | Message Number (per-direction sequence from 1) |
| 20 | 4 | Payload Size (post-compression size) |
| 24 | 4 | Error Code (&lt;0 error, 0 success, &gt;0 success with note) |
| 28 | 2 | Message Type ID |
| 30 | 1 | Payload Compression (0 = none, 1 = Zlib) |
| 31 | 1 | Protocol Version (**must be 1**) |

Keepalive: if idle **&gt; 5 minutes**, send Message Type ID **3**.  
Error (ID **1**): server waits 10s, disconnects, reconnects 60s later (when it is the initiator).

---

## 3. Handshake

1. Connect TCP (TLS if configured).  
2. Receive **Server→Client Handshake (4)** JSON: Server ID, Server Code, Server Name, Serial Number, Server Time Zone Minutes, Server Currency Code/Symbol, Server Version, Client Application Login ID.  
3. Send **Client→Server Handshake (5)** JSON: **Client Login ID**, **Client Password**.  
4. Then exchange business messages.

---

## 4. Hospitality message map (types 1 / 3 / 4)

Registration “interface types” gate which message families CiMSO licenses for the Buffr Checkpoint developer account. Spec message IDs apply to every connected property:

### Type 3 — Lodging reservations → Booking Messages

| ID | Message | Checkpoint use |
|---|---|---|
| **1101 / 1102** | Get Bookings Request/Response | Pull arrivals window → invitations |
| **1103 / 1104** | Get Booking Request/Response | Single booking detail |
| **1105 / 1106** | Set Booking Request/Response | Rarely; CiMSO remains SoR |
| **1107 / 1108** | Set Booking Status | See front desk |
| **1115 / 1116** | Get Booking Room List | Room assignment ↔ zone map |
| **1119 / 1120** | Get Booking ID | Lookup |

**Get Bookings (1101)** optional filters include: Booking Group IDs, Booker ID, Guest ID, Booking Statuses, Arrival From/Until Day, Departure From/Until Day (day encoding: **0 = 30 Dec 1899**, **43101 = 1 Jan 2018**).

### Type 4 — Front desk services → status / presence

| ID | Message | Checkpoint use |
|---|---|---|
| **1107 / 1108** | Set Booking Status | Check-in / cancel (see rules below) |
| Booking statuses | Enum | Map visit lifecycle |

**Booking Status** codes (enumerations):  
`Q` Quote · `E` Quote rejected · `W` Waiting list · `I` Internet · `P` Provisional · `C` Confirmed · `D` Deposit paid · `U` Fully paid · `A` **Active** (checked in) · `L` **Left** · `N` No show · `F` Faulty · `X` Cancelled · `O` Closed · `R` Restricted  

Check-in via **1107** only from statuses Internet / Provisional / Confirmed / Deposit Paid / Fully Paid → typically **Active (`A`)**. Departure maps to **Left (`L`)** when supported by property rules.

**1108 error codes (subset):** `-101` not found · `-201` status disallows check-in · `-202` client accounts not set · `-203` must match arrival day · `-204` check-in too early · `-302` denied by rule · `-303` could not post check-in transactions.

### Type 1 — Customer data platform → Client Messages

| ID | Message | Checkpoint use |
|---|---|---|
| **2001 / 2002** | Get Client | Profile pull (minimise PII retained) |
| **2003 / 2004** | Set Client | Prefer avoid; SoR in CiMSO |
| **2019 / 2020** | Get Clients | Search / sync window |
| **2029–2032** | Memberships | Only where the property uses memberships |

**Client Info** includes Client ID, names, gender, communications, etc. Prefer storing **Client ID** + display name HMAC/opaque refs in Checkpoint; do not mirror full passports into public kiosk screens.

---

## 5. Deployment topology (per property)

Confirm with CiMSO / each property’s IT:

1. **On-prem / VPN:** Checkpoint backend (or a small sidecar) opens TLS TCP to that site’s INNterchange host:port.  
2. **CiMSO-initiated outbound:** INNterchange server dials out to a Checkpoint listener (firewall rules + TLS).  
3. Never expose Client Password in admin UI or logs.

Until at least one property’s host/port/login are set on a connection row (and the password env named by `credentials_secret_ref` is present), transport stays incomplete even though the **message catalogue is known**. Registration may name a first pilot property; the product path is the same for every Checkpoint org.

---

## 6. C-POL-GDP / compliance

Package HTML does **not** embed C-POL-GDP. Still required by NDA. Obtain via CiMSO policy desk / legal@cimso.com after approval. Until mapped: no claim of GDP compliance; keep type-1 sync off in production by default.

---

## 7. Implementation checklist

### Production shell (done)

- [x] Digest package → this file  
- [x] Migration 0036/0037: `pms_*` tables, `awaiting_property_credentials`, per-site TCP columns, `default_host_id`  
- [x] Platform capability `cimso_innterchange` seeded **Targeted**; org enablement gate (targeted|live) + admin Configure UI  
- [x] Admin Site Experience → CiMSO (status, Connect, Sync, connections table)  
- [x] Ops org page PMS / CiMSO notes  
- [x] Adapters + mappers + synthetic fixtures (`__fixtures__/`)  
- [x] Sync drafts → `visit_invitations` + `pms_external_entity_links` (kiosk/website QR path; no Android CiMSO client)  

### Live wire (remaining)

- [ ] Implement TCP framing + CRC32 + handshake client (`cimso-innterchange.client.ts`) — unit-testable against fixtures without a hotel  
- [ ] Wire **1101** live pull → same invitation persist path  
- [ ] Wire **1107** Active/Left ↔ visit check-in/out  
- [ ] Wire **2001** optional profile (minimised; keep type-1 off in prod until C-POL-GDP)  
- [ ] Room list → `pms_room_zone_mappings`  
- [ ] Hotel Etuna (pilot): host/port/login + Railway password secret + confirm topology (§5)  
- [ ] Read C-POL-GDP and update DPA / retention  
- [ ] Flip platform register to **live** only after handshake + sync evidence (ops Capability Status — not Railway env)

**Kiosk:** Android kiosk and admin Kiosk Experience need no CiMSO client. Once sync persists invitations with opaque tokens, existing `public/invitations/resolve` QR flows work.

---

## 8. Source files in package

- `INNterchange_Specifications.html` + `.css` — full message catalogue  
- `INNterchange_console_response.png` / `INNterchange_sample_response.png` — header/payload visuals  
- `SampleConfigFile.txt` — Windows server config overrides  
