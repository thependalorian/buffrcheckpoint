# Checkpoint by Buffr: Business Model Canvas pack

> **Superseded on 30 September 2026.** The submission text is now `submission/00_Entry_Submission.html` to `05_Evidence_and_Sources.html` (rendered to `submission/pdf/`). Those files carry the final facts: contact team@buffranalytics.com, company name without "trading as", Hotel Etuna in Ongwediva as the first pilot, Etuna as co-founder, CiMSO status, Data Protection Bill status, and APA references. Do not submit this draft.


**For:** DBN Innovation Award 2026/27 attachment (Tourism and Hospitality)  
**Company:** Buffr Financial Services CC (trading as Buffr Analytics), CC/2024/09322  
**Product:** Checkpoint by Buffr (live: buffrcheckpoint.com)  
**Date:** 2026-09-29 (revised: per-site pricing, self-serve signup, separate staff sign-in)

**Sources used**

| Source | Role |
|---|---|
| `docs/Digital_transformation_starts_at_the_reception_desk.docx` | Vision: privacy, inclusion, offline, risk-based verification at the desk |
| Osterwalder Business Model Canvas (Spark pack PDF path; Drive file not readable this session; cloud stub timed out) | Classic 9-block structure |
| Ash Maurya Lean Canvas pattern (Lean Business Model Canvas Buffr_.pptx path; Drive file not readable this session) | Problem / Solution / UVP / Unfair Advantage / Metrics |
| Eisenmann, Ries, Dillard, *Hypothesis-Driven Entrepreneurship: The Lean Startup* (HBS 812-095; MBA notes in fin-agent-kg and agent-rag-kg) | Falsifiable hypotheses, MVP tests, persevere / pivot / perish |
| `dbn-innovation-awards-2026/ENTRY_ANSWERS.md` | Hospitality wedge, pricing, Mom Test honesty |
| `buffrcheckpoint.md` §9.2a, §15.2, §16.4a, §17 | Separate staff sign-in, per-site pricing, competitor benchmark, self-serve payment-gated GTM, pilot design |
| vizito.eu/pricing, envoy.com/pricing (read 2026-09-29) | Competitor price points per location |

**Playing to Win one-liner:** We win by differentiation on privacy-preserving, inclusion-first check-in for Namibian hospitality desks, on QR-first web plus assisted desk, with optional offline kiosk and NFC.

---

## 1. Vision (from the reception-desk essay, hospitality wedge)

People do not meet Namibia's digital strategies in a white paper. They meet them in a queue when someone hands them a book.

A shared paper register is a privacy problem, a safety problem, and a trust problem. The next guest reads the prior line. Digital transformation that starts only after every law and national ID platform is finished leaves that exposure in place.

Checkpoint turns that desk into a governed process: one isolated encrypted record per person, multiple channels so feature-phone and no-phone guests are not left behind, offline capture when the link drops, verification matched to site risk, and an audit trail of who opened what. For this award the first commercial beachhead is Tourism and Hospitality (hotels, lodges, guesthouses, tourism reception), where NTB guest-register duties already force arrival data capture and paper books remain common.

The essay's public-institution pilot idea stays valid as a later wedge. It is not the year-1 pay customer for this canvas.

---

## 2. Osterwalder Business Model Canvas (9 blocks)

### Customer Segments

1. **Primary (beachhead):** NTB-registered hotels, lodges, guesthouses, and B&Bs in Namibia (single site and small groups). Buyers: GM, owner-operator, front-office manager, group IT or operations.
2. **Secondary:** Tourism attractions and high-footfall hospitality campuses with day visitors and contractors.
3. **Later:** Corporate and public reception desks (essay wedge), then SADC lodging with the same paper-register failure.
4. **Not a segment:** Guests as payers. Guests are users of check-in; properties pay.

### Value Propositions

1. Stop guest-to-guest exposure from shared paper registers while still supporting lawful guest-register purposes.
2. QR phone check-in without mandatory tablet CAPEX (Site plan), with unlimited visits.
3. Assisted desk for guests without smartphones, so inclusion does not mean a second paper book.
4. Offline-capable kiosk path for remote lodges; never claim "host notified" while the message is still queued.
5. Emergency on-site roster and audit-ready evidence from the same records.
6. Honest capability status (USSD / SMS only when live). Complements PMS; does not replace room inventory.
7. Staff and customers sign in through separate doors: Buffr staff need MFA and never share the customer login, which answers the "who at the vendor can see our guests" question.

### Channels

1. Direct self-serve: buffrcheckpoint.com, Create account, set up sites, pay by EFT to go live. "See pricing" shows the price for any number of sites.
2. Founder-led sales and demos to lodging operators and groups.
3. HAN / tourism association and corridor networks (Etosha, coast, south) as distribution of trust, not exclusive partners yet.
4. Pilot sites as reference channels after measured A2 pilots.
5. Optional later: systems integrators and PMS partners (Hotelogix-class) as complements, not owners of the visitor record.

### Customer Relationships

1. Self-serve signup, setup before payment, go-live once the first EFT payment is confirmed. Lodge groups get a planning call by email, then the same account flow.
2. High-touch onboarding for first sites (training front desk + backup).
3. Self-serve admin for QR print, hosts, forms, roles after go-live.
4. Assurance retainer path for regulated or multi-site groups.
5. Support runbook for lockout, outbox fail, offline sync, emergency.

### Revenue Streams

| Stream | Model | Status |
|---|---|---|
| Site subscription | N$1,500 / month, 1 site, unlimited visits | Live on pricing page |
| Network subscription | N$4,500 / month incl. 3 sites, +N$950 per extra site | Live |
| Assure subscription | N$9,500 / month incl. 3 sites, +N$1,500 per extra site | Live (higher-assurance packaging) |
| Hardware | Tablet / NFC lease or sale, separate CAPEX | Optional |
| Paid pilot / workshop | Fixed fee before full MRR | Planned GTM |
| Annual assurance retainer | After multi-site | Later |

Price discrimination: number of sites and assurance level (Site vs Network vs Assure), not per-guest fees. The API enforces the licensed site count.

Competitor check (vendor pages, 29 Sep 2026, approximate NAD): Vizito N$615 to N$2,050 per location per month with visit caps on lower tiers; Envoy Premium about N$6,300 per location. A 20-branch group pays N$20,650 a month on Network, against about N$41,000 on Vizito Enterprise and about N$126,000 on Envoy Premium.

### Key Resources

1. Production software: NestJS API, admin, website check-in, Android kiosk, shared types.
2. Domain IP: risk-based forms, encryption model, offline outbox, capability register, RBAC catalogue, per-site licensing, separate staff front door with mandatory MFA.
3. Founder domain knowledge (DPI, payments regulation, Namibian inclusion constraints).
4. Live infrastructure: Neon (Frankfurt), Railway API, Vercel frontends.
5. Brand and site: buffrcheckpoint.com, Buffr Analytics legal entity.

### Key Activities

1. Build and harden the FULL surfaces every plan relies on (QR, assisted desk, RBAC, audit, emergency, sign-out).
2. Run A0–A3 acceptance and hospitality pilots (falsifiable KPI tests).
3. Self-serve onboarding support and design-partner UAT.
4. Customer success and training for front desk.
5. Honest marketing against the capability register.
6. NTB-aligned reporting packs as a productised output for lodging.

### Key Partners

1. Cloud and infra vendors (Neon, Railway, Vercel, Resend for host email).
2. Telco / SMS / USSD aggregators when those channels go live (not sold today).
3. DigiNam / NPKI relying-party path when formally approved (Assure later; kept off all marketing until live).
4. Hospitality associations and design-partner lodges for learning and references.
5. Optional PMS vendors as integration complements.
6. DBN Award capital, if won, as non-dilutive funding for pilots (rule: applied to this project).

### Cost Structure

1. **Variable / semi-variable:** hosting, object storage, email sends, support hours per site.
2. **Fixed / step-fixed:** engineering time, founder salary draw, domain and compliance overhead.
3. **CAPEX optional:** demo tablets, NFC readers for Network pilots.
4. Lean rule (Ries / Eisenmann): do not scale paid acquisition or heavy ops spend until beachhead hypotheses pass paid-pilot tests.

---

## 3. Lean Canvas (Ash Maurya layout)

```text
+------------------+------------------+------------------------+------------------+------------------+
| PROBLEM          | SOLUTION         | UNIQUE VALUE           | UNFAIR           | CUSTOMER         |
|                  |                  | PROPOSITION            | ADVANTAGE        | SEGMENTS         |
| 1. Shared paper  | QR phone         | Isolated encrypted     | Namibia-built    | Beachhead: NTB   |
|    guest books   | check-in +       | record per guest;      | inclusion +      | hotels/lodges/   |
|    expose prior  | assisted desk    | same privacy standard  | offline-first    | guesthouses      |
|    guests        | + optional       | across channels;       | stack already    |                  |
| 2. NTB register  | offline kiosk    | NTB-aligned presence   | live in prod;    | Later: tourism   |
|    duty forces   |                  | without shared pages;  | essay voice +    | desks, then      |
|    capture       | Risk-based       | emergency roster from  | DPI framing      | public desks     |
| 3. Remote lodges | forms, host      | same records           |                  |                  |
|    lose network  | notify,          |                        |                  | Guests = users   |
|                  | emergency,       | High-level concept:    |                  | not payers       |
| Existing alts:   | audit export     | "Privacy-preserving    |                  |                  |
| paper, Excel,    |                  | guest check-in for     |                  |                  |
| WhatsApp, PMS    |                  | Namibian hospitality"  |                  |                  |
| guest profile    |                  |                        |                  |                  |
+------------------+------------------+------------------------+------------------+------------------+
| KEY METRICS                         | CHANNELS                                  |
| Pilot: completion rate by channel;  | Self-serve signup, EFT, go-live           |
| check-in duration; paper fallbacks; | Direct web + founder help for groups      |
| host-notify success; offline sync;  | HAN / corridor networks                   |
| time-to-evidence for "last Tuesday" | Reference sites after A2                  |
| Sev-1 privacy/auth incidents = 0    |                                           |
+-------------------------------------+-------------------------------------------+
| COST STRUCTURE                      | REVENUE STREAMS                           |
| Eng + hosting + support             | Site N$1,500 / Network N$4,500 (3 sites)  |
| Avoid scaled CAC until pilots paid  | Assure N$9,500 (3); +per extra site       |
+-------------------------------------+-------------------------------------------+
```

---

## 4. Lean Startup hypotheses (Eisenmann / Ries)

Translate the canvas into falsifiable statements. Each needs an MVP test and a kill/pivot rule.

| ID | Hypothesis | MVP / test | Pass signal | Fail → |
|---|---|---|---|---|
| H1 | Lodge front desks still use shared paper or open lists for day visitors / walk-ins | Mom Test interviews (script in ENTRY_ANSWERS); photo or description of last night's process | ≥2 of 3 managers describe shared visibility or uncontrolled lists | Pivot problem framing or perish hospitality wedge |
| H2 | Operators will pay for Site at ≥ N$1,500 / month after a 60–90 day pilot | Paid pilot invoice or signed pilot fee at 1–2 sites | Money changes hands; paper fallbacks trend down | Pivot price, packaging, or segment |
| H3 | QR + assisted desk covers ≥90% of arrivals without USSD/SMS live | Pilot channel mix KPI | Completion ≥90%; paper fallbacks ≤ agreed cap | Accelerate assisted UX or add channel |
| H4 | Offline kiosk is required for ≥1 of 3 pilot site types | Include one low-connectivity site in A2 | Offline capture + sync success measured | De-prioritise kiosk CAPEX in the Site-plan story |
| H5 | "Last Tuesday" evidence in ≤15 minutes beats paper | Timed drill on pilot site | Measured time ≤15 min | Improve export UX before scale |
| H6 | CAC via self-serve signup plus founder outreach stays below early LTV (assume 12-month Site ≈ N$18,000) | Track hours per closed pilot | Founder-led CAC hours imply CAC << LTV | Change channel mix before paid ads |

**Current stage (honest):** Product MVP is past "fake door." Production software exists. Business-model uncertainty remains on **paid hospitality willingness and CAC**. Do not scale sales headcount or national campaigns until H2 and H5 pass. Persevere on QR + assisted. Do not pivot into full PMS. Keep DigiNam off all marketing until the capability register says live.

---

## 5. Minimum viable offer (what we sell now)

1. **Self-serve signup** (blueprint §17.1): create an account, set up sites, pay by EFT, go live once payment is confirmed. The paid Exposure Review offer is retired.
2. **Site plan** (N$1,500 / month): public site QR, phone `/check-in`, assisted front desk, encrypted records, sign-out, reports, RBAC, unlimited visits.
3. **Network and Assure** (3 sites included, then per extra site): multi-site dashboard, NFC/kiosk entitlements when enabled, richer host flows, compliance dashboard and evidence packs on Assure.
4. **Not in the sell sheet today:** live DigiNam verification, live USSD, live SMS MT, badge-print hardware, retention purge cron.

This matches the essay: channel can change, privacy standard stays the same, and DigiNam enters only when formally ready.

---

## 6. Cash-flow sketch (hypothesis only)

- Contribution margin: software MRR minus hosting and support; hardware margin separate.
- Breakeven: function of fixed eng/founder cost ÷ contribution per site. With Site at N$1,500 per site and early support-heavy sites, treat first 15–30 sites as learning, not profit peak.
- Award capital (if won): fund 3–5 hospitality pilots, offline hardening, NTB reporting pack, and training, not unrelated products (Award rule 16).

---

## 7. What to print for the DBN envelope

Print pages:

1. This document's **Osterwalder 9-block** section (or a one-page visual redraw).
2. The **Lean Canvas** ASCII section (or redraw on a blank Lean Canvas template).
3. The **hypothesis table** (shows judges you are learning, not only shipping).
4. Pricing screenshot from buffrcheckpoint.com/pricing.
5. Optional: one-page excerpt from *Digital transformation starts at the reception desk* as vision annex.

---

## 8. Drive file note

The Lean Canvas PPTX and Osterwalder PDF under Google Drive Shared drives were not readable in this session (Operation timed out / empty cloud stubs). Structure above follows the standard Osterwalder nine blocks and Maurya Lean Canvas fields those files normally contain. When Drive syncs, drop the official blank templates into this folder and copy the cell text across for a pixel-perfect attachable PDF.
