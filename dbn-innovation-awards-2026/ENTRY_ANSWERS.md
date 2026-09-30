# DBN Innovation Award 2026/27 - Checkpoint by Buffr entry 

> **Superseded on 30 September 2026.** The submission text is now `submission/00_Entry_Submission.html` to `05_Evidence_and_Sources.html` (rendered to `submission/pdf/`). Those files carry the final facts: contact team@buffranalytics.com, company name without "trading as", Hotel Etuna in Ongwediva as the first pilot, Etuna as co-founder, CiMSO status, Data Protection Bill status, and APA references. Do not submit this draft.


Sector focus: Tourism and Hospitality  
Project status: Start-up (product live in production, commercial scale still early)  
Closing: 12h00 on 01 October 2026  
Form file: Innovation-Award-2026-7-APPLICATION-FORM.pdf  
Product name: Checkpoint (the product brand on buffrcheckpoint.com; "Checkpoint by Buffr" identifies the maker). Company names stay as registered.

Paste the paragraphs under each form heading into the official PDF. Sign by hand. Keep the strategy, Mom Test, and sources sections as an internal pack for the sealed envelope annex if you want judges to see the evidence trail.

---

## Playing to Win (strategy pass)

We win by differentiating on privacy-preserving, inclusion-first visitor check-in built for Namibian hospitality sites with weak connectivity and mixed guest devices.  
For registered hotels, lodges, guesthouses, and tourism front desks in Namibia (then similar SADC properties).  
On a QR-first web check-in path plus assisted front desk, with optional offline Android kiosk and NFC as paid add-ons, sold by self-serve signup (properties create an account, set up, and go live once payment clears) with founder-led help for groups.

Winning aspiration: become the default way Namibian hospitality replaces the shared paper guest or visitor book without forcing tablet CAPEX on every small property.

Where to play: NTB-registered accommodation and high-footfall tourism reception desks. Direct sales and pilots through lodging operators and groups. Do not try to replace the full hotel PMS, compete as a generic global Envoy clone, or sell DigiNam, USSD, or SMS before those adapters are live.

How to win: differentiation, not lowest price. The hard-to-copy stack is isolated encrypted records, assisted check-in as a first-class channel, offline outbox sync, emergency roster from the same records, and an honest capability register so marketing never outruns the product.

Capabilities already shipping: public site QR and phone check-in, assisted desk, RBAC and audit, host notification path, emergency trigger and roster, sign-out, offline kiosk path, per-site licensing enforced in the API, payment-gated go-live (EFT plus proof of payment, confirmed by ops), and a separate staff sign-in with mandatory MFA so Buffr staff never share the customer login. Live site at buffrcheckpoint.com.

Management systems: per-site subscription catalog (Site N$1,500 per month for one site; Network N$4,500 including 3 sites plus N$950 per extra site; Assure N$9,500 including 3 sites plus N$1,500 per extra site), pilot KPI pack in the product blueprint, and the A0 to A3 acceptance gate in scripts/acceptance-gate.sh with production results recorded per item.

Anti-patterns avoided: do-it-all (no PMS replacement claim), something-for-everyone (Tourism and Hospitality wedge for this award), dreams without a live product (API and website already in production).

---

## Mom Test pass (what is evidence vs fluff)

Mom Test rule: talk about operators' past work, not compliments about our idea.

Validated without needing a polite yes from a lodge manager:

1. Registered accommodation must keep a guest register and file returns. Namibia Tourism Board regulations under the Namibia Tourism Board Act require arrival particulars (name, citizenship or residence, address, group size, dates, room, vehicle registration when present, next destination, signature, planned departure) and monthly returns to the Board. Failure is an offence. Source: NTB regulations text (guest register and returns), LAC annotated regulations PDF for Act 21 of 2000 / GN 2004-139.
2. A shared paper book lets each new signer read prior guests' details. This is how a bound register works in practice. The product blueprint treats this as the core failure mode the platform exists to remove.
3. Tourism scale in Namibia is large enough for a hospitality wedge. TSA 2022: direct tourism contribution N$14.3 billion, 6.9 percent of GDP, 57,571 direct tourism-related jobs (UNECA launch summary of MEFT/NSA TSA). MEFT Tourist Arrivals Statistics Report 2025: 1,217,108 international arrivals, holiday purpose 48.4 percent, 994,780 national-park visits (Business Express report of the MEFT launch).
4. Front-of-house digitisation is already a sector priority. NTB and MTC signed a digitalisation MoU on 19 September 2025 (TechAfrica News). Properties such as Oshakati Country Lodge and Burning Shore have moved lodging operations onto cloud PMS (Business Express / Hotelogix coverage). Checkpoint sits beside the PMS, not inside room inventory.

Not yet Mom Test commitment (do not write these as proven sales facts on the form):

- Count of paying lodge customers.
- Signed paid pilots or deposits from named hotels.
- Measured minutes saved on a specific property's last Tuesday roster pull.
- Guaranteed European guest preference for digital privacy (market share of beds is HAN survey data, preference is inference).

Production evidence that is real but is not customer demand: on 29 September 2026 the team ran the live billing path end to end in production on a clearly labelled test organisation (subscription with site count, invoice, invoice PDF, invoice email with the PDF attached, ops notification templates). This proves the product works. It does not prove anyone will pay, so it stays out of the traction claims.

Internal discovery questions already used against the product (blueprint §11.9.1b / discovery audit): if you had to pull everyone on site last Tuesday right now, how long would it take, and has an auditor ever asked a hard question about your visitor records. Those questions drove product fixes. They are not the same as completed paid hospitality interviews. Before the DBN ceremony, run the script below with two lodge or hotel front-desk managers and treat only time, money, reputation, or process-switch promises as advancement.

Mom Test hospitality script (for annex interviews, not for the PDF boxes):

1. Walk me through how a walk-in guest was recorded the last time someone arrived after 21:00.
2. Show me (or describe) the book or system you used yesterday for day visitors or contractors.
3. When did an auditor, insurer, or head office last ask who was on the property on a given day, and what did you do.
4. What have you already paid for check-in, guest books, tablets, or PMS modules tied to arrivals.
5. What breaks when power or data drops at the lodge.
6. Who else on the property should I talk to before you would trial a change at the desk.

---

## Source validation log

| Claim | Figure | Source | Check |
|---|---|---|---|
| Tourism direct GDP 2022 | N$14.3bn, 6.9% of N$206.2bn GDP | UNECA story on MEFT/NSA TSA 6th edition (8 Feb 2024), https://www.uneca.org/stories/namibia-launches-tourism-satellite-account-report-to-boost-economic-growth | Confirmed against UNECA page |
| Direct tourism jobs 2022 | 57,571 | Same TSA package, cited in IPPR Namibia QER Q2 2024 and TSA materials | Confirmed in secondary official-adjacent reporting of TSA |
| International arrivals 2025 | 1,217,108 (−3.2% vs 2024) | MEFT Tourist Arrivals Statistics Report 2025, summarised by Business Express, https://nambusinessexpress.com/?p=14436 | Confirmed |
| Holiday purpose share 2025 | 48.4% | Same MEFT 2025 report via Business Express | Confirmed |
| National park visits 2025 | 994,780 (+5.2% YoY) | Same | Confirmed |
| African share of arrivals 2025 | 75.4% | Same | Confirmed |
| Europe arrivals 2025 | 299,634 (−21% YoY) | Same | Confirmed. Do not claim Europe leads arrivals in 2025. |
| HAN occupancy 2025 | ~51.99% average room occupancy | HAN annual occupancy reporting (HAN LinkedIn / Windhoek Express coverage) | Secondary press on HAN member survey. Label as HAN member sample. |
| HAN Q2 2026 occupancy | Above 57%, above 2019 in HAN sample | Tourismus / HAN coverage | Secondary. Label as HAN member sample. |
| July 2026 occupancy | 62.63% | Business Express citing HAN / Simonis Storm analysis | Secondary. Label as reported sector figure. |
| NTB guest register duty | Prescribed fields + monthly returns | NTB regulations, LAC annotated PDF | Confirmed in regulation text |
| NTB-MTC MoU | Signed 19 Sep 2025 | TechAfrica News | Confirmed |
| Buffr company | Buffr Financial Services CC, CC/2024/09322, trading Buffr Analytics | Product blueprint / payment companion company id | Internal company record. Attach BIPA extract. |
| Live product | buffrcheckpoint.com, api.buffrcheckpoint.com | Production smoke and marketing site | Confirm again on submission day |
| Pricing | Site N$1,500 (1 site) / Network N$4,500 (3 sites, +N$950 per extra) / Assure N$9,500 (3 sites, +N$1,500 per extra) per month | https://buffrcheckpoint.com/pricing and GET https://api.buffrcheckpoint.com/public/pricing | Confirmed live 2026-09-29. Confirm again on submission day |
| Competitor benchmark: Vizito | EUR 29.95 / 59.95 / 99.95 per location per month (yearly billing), about N$615 / N$1,230 / N$2,050 | https://vizito.eu/pricing/ (read 2026-09-29) | Confirmed on vendor page. NAD at about N$20.5 per EUR, re-check rate |
| Competitor benchmark: Envoy Visitors | Premium USD 362 per location per month (annual), about N$6,300; Enterprise custom | https://envoy.com/pricing (read 2026-09-29) | Confirmed on vendor page. NAD at about N$17.5 per USD, re-check rate |
| Production test run | Billing path end to end on a test organisation | acceptance-gate state A0-ENTRY-RESEND, 2026-09-29 | Internal. Test data, not a customer |

---

## Cover fields (write on the form)

Name of Entrant: George Nekwaya  
Email Address: pendanek@gmail.com  
Mobile Number: +264 81 437 6206  
Name of Company: Buffr Financial Services CC (trading as Buffr Analytics)  
Registration Number: CC/2024/09322  
Status of project: Start-up  
Name of Innovation: Checkpoint by Buffr  
Date and signature: fill and sign on submission day  
Authorisation: certify you are authorised to enter

Submission summary (short paragraph for the summary box):

Checkpoint by Buffr is a digital visitor and guest check-in platform for hotels, lodges, and tourism reception desks. It replaces the shared paper register with one isolated encrypted record per person, QR phone check-in, assisted front-desk entry for guests without smartphones, optional offline kiosk operation, host notification, emergency roster, and audit-ready evidence. The platform is live at buffrcheckpoint.com and is aimed at Tourism and Hospitality sites that must welcome guests, protect guest privacy, and meet Namibia Tourism Board guest-register duties.

---

## What problem does the innovation solve?

Namibia's hospitality economy is large enough that front-desk failures are national failures. The Tourism Satellite Account for 2022, produced by MEFT and the Namibia Statistics Agency with UNECA support, put tourism's direct contribution at N$14.3 billion, or 6.9 percent of GDP, with 57,571 direct tourism-related jobs. The Ministry of Environment, Forestry and Tourism's Tourist Arrivals Statistics Report 2025 counted 1,217,108 international arrivals. Holiday travel was 48.4 percent of those arrivals. National parks recorded 994,780 visits. African source markets supplied 75.4 percent of international arrivals. European arrivals fell in 2025, yet mid and high-end lodging surveys from the Hospitality Association of Namibia still show strong European bed-share in peak months. The desk still has to process African road arrivals, older overseas guests, business travellers, day visitors, contractors, and emergency roll-calls.

The everyday tool for that work remains a shared paper guest or visitor book in many properties. The next person in the queue reads the prior line. Names, phone numbers, identity details, vehicle registrations, room notes, and hosts sit in plain sight. There is no access history of who opened the book. Retention is a drawer. When power fails at a remote lodge, staff fall back to the same book. When head office or an insurer asks who was on site on a given Tuesday, someone leafs through pages.

Registered accommodation cannot simply abandon the register. Namibia Tourism Board regulations require a guest register with prescribed arrival fields and monthly returns to the Board. Operators therefore face a bad trade: meet the legal register duty with a book that exposes guests to one another, or invent spreadsheets and chats with no encryption, role-based access, audit trail, or offline discipline.

Checkpoint answers that trade for Tourism and Hospitality. Each guest or visitor gets one isolated encrypted record visible to authorised staff only. Standard check-in uses a printed site QR and the guest's phone browser, so a small guesthouse does not have to buy a tablet to start. Assisted front desk covers guests without smartphones, older travellers, and low-literacy arrivals. An optional offline Android kiosk keeps capture working through outages and syncs when the link returns. Host and reception notification, optional host-approval zones, emergency on-site roster, sign-out, and evidence export sit on the same record. A property signs up online, sets up its sites, and goes live once its first EFT payment is confirmed. The product is already running in production at buffrcheckpoint.com and api.buffrcheckpoint.com. This entry marks commercial status as Start-up because paying hospitality scale is still early, not because the software is a slide deck.

---

## Name products or services that the innovation improves on or replaces

Checkpoint improves on and replaces the shared paper guest register and the ad-hoc visitor sheets still used at many hotels, lodges, and tourism desks. It also replaces the unsafe practice of meeting NTB guest-register obligations through a book every subsequent guest can read. For day visitors, contractors, and non-folio walk-ins, it replaces WhatsApp lists and open Excel sheets that mix personal data with no tenant controls.

It improves on, rather than replaces, a hotel property management system. Cloud PMS products such as Hotelogix already run room inventory and folios at Namibian properties, including recent migrations reported for Oshakati Country Lodge and Burning Shore. Checkpoint sits at the front door beside the PMS. It governs identity capture, presence, privacy, inclusion channels, and emergency roster. It does not sell itself as a full PMS.

It also improves on imported visitor-management SaaS built for office towers or schools in high-connectivity markets. Those tools often assume smartphone-only flows, always-on networks, and feature sets that do not match Namibian lodge connectivity or assisted-desk reality. Checkpoint is built here for QR-first check-in, assisted inclusion, offline outbox sync, and an honest public capability register so USSD and SMS are never marketed as live ahead of the product. On price it sits between the imports: about N$1,500 per site per month against roughly N$615 to N$2,050 per location for Vizito and about N$6,300 for Envoy's Premium plan, with unlimited visits, local EFT billing, and Namibian support included.

---

## What will be the social impact of this innovation?

Guests keep their dignity at the desk. Domestic travellers, regional road arrivals, older overseas guests, and people without smartphones should not have to publish a phone number or identity number on a page the next stranger reads. Assisted check-in is a designed channel, not a workaround, which matters in a country where smartphone ownership is uneven and African road arrivals dominate volume.

Staff gain a safer operations tool. Hotels and lodges along corridors such as Etosha, Kunene, Sossusvlei, and the coast need a usable on-site roster when something goes wrong. Building the roster from the same check-in records turns visitor management into a life-safety aid instead of a compliance chore.

International trust improves where operators already publish GDPR-style privacy notices for European guests, as large lodge groups do. A privacy-preserving desk matches the sustainability and authenticity story Namibia sells abroad. MEFT has also flagged tourist safety and institutional coordination in response to 2025 arrival pressure. Clean presence records support that agenda without turning the lobby into a surveillance theatre.

Local digital work grows with the product. Engineering, training, install, and customer success stay in Namibia. Small and community properties stay in scope because the Site plan costs N$1,500 per month with QR check-in, unlimited visits, and no mandatory tablet purchase.

---

## How will this innovation contribute towards environmental stewardship?

The stewardship case is operational. Digital check-in cuts daily dependence on bound registers, photocopied identity pages, and emergency printouts. A standard deployment uses the guest's phone and a printed QR, so many small properties avoid buying and powering always-on tablets. Faster digital evidence packs reduce couriered paper dumps for insurers and auditors.

Remote lodges that already limit generator hours keep capturing arrivals offline and sync later, instead of forcing an always-online appliance at the desk. Eco-lodges and conservancy accommodation that sell environmental care to guests get a matching story on guest-data care. We do not invent carbon-offset theatre. Less paper, less needless hardware, and better resilience at low-connectivity sites are the concrete gains.

Sector policy is moving the same way. The NTB and MTC MoU of 19 September 2025 puts digital tools on the national tourism agenda. Checkpoint is one practical layer of that shift at the front desk.

---

## What is the expected economic value to be generated from this innovation in the next 5 years?

These figures are planning hypotheses tied to live pricing and the product go-to-market plan. They are not audited forecasts. Award rule 16 requires Award monies to benefit this project. If Checkpoint wins, capital goes to hospitality pilots, offline hardening for remote lodges, NTB-aligned reporting packs, and Namibian sales and training capacity.

The demand base is the registered accommodation sector plus tourism desks processing arrivals far beyond room nights alone. MEFT counted more than 1.2 million international arrivals in 2025. HAN member occupancy recovered above 2019 levels in parts of 2026 in the association's sample, including reported July 2026 occupancy of 62.63 percent in sector coverage. Every occupied property still runs a front desk process.

Published pricing on buffrcheckpoint.com today is per site: Site N$1,500 per month for one property (QR and assisted desk, unlimited visits), Network N$4,500 per month including 3 sites plus N$950 per extra site for lodge groups and chains, and Assure N$9,500 per month including 3 sites plus N$1,500 per extra site for higher-assurance settings. Annual billing charges ten months for twelve. Tablets and NFC hardware stay separate CAPEX or lease lines.

Five-year software revenue hypothesis for a Namibian hospitality-led base, blended average revenue per site near N$1,500 to N$2,000 per month (mostly single-site properties on Site, lodge groups on Network, a few Assure sites): year 1 about 15 to 30 sites and roughly N$0.3 million to N$0.7 million ARR, year 2 about 60 to 100 sites and N$1.1 million to N$2.4 million ARR, year 3 about 120 to 180 sites and N$2.2 million to N$4.3 million ARR, year 4 about 200 to 280 sites and N$3.6 million to N$6.7 million ARR, year 5 about 300 to 400 sites and N$5.4 million to N$9.6 million ARR. Per-site pricing means revenue now grows with every branch a group adds, instead of stopping at one flat fee per company. Wider economic value includes reception time saved, lower privacy-incident risk for operators hosting overseas guests, faster audit response, and local install and support work. Those operator savings are real only after paid pilots produce measured before-and-after times. Until then they stay off the hard revenue line.

---

## Acknowledgement of rules

Full Name: George Nekwaya  
Capacity: Founder and authorised representative, Buffr Financial Services CC (Buffr Analytics)  
Date: submission day  
Signature: sign on the form after reading rules 1 to 21

Closing remains 12h00 on 01 October 2026. Deliver a sealed envelope to DBN Windhoek, Ongwediva, Rundu, or Walvis Bay, or courier to Windhoek with a waybill dated on or before the closing date. Prefer outer marking "DBN Innovation Award 2026" even if the printed form still shows an older year on the delivery line.

---

## Attachments to put in the envelope

Business model: print `BUSINESS_MODEL_CANVAS.md` (Osterwalder 9-block + Lean Canvas + hypothesis table).  
Product and technical specifications: QR check-in, assisted desk, offline kiosk, encryption, RBAC, emergency roster, per-site licensing, payment-gated go-live, separate staff sign-in with mandatory MFA, capability-register honesty, screenshots from the live site.  
CVs: George Nekwaya CV as PDF.  
Company registration extract: Buffr Financial Services CC, CC/2024/09322.  
Optional annex: this file's source validation log and Mom Test interview notes once two hospitality managers have been spoken to.  
Optional vision annex: excerpt from `docs/Digital_transformation_starts_at_the_reception_desk.docx`.  
Optional: letter of intent from a design-partner property if you secure one before the deadline.

---

## Honesty lines (keep)

Do not claim DigiNam, National e-ID NFC, live USSD, or live SMS as current features. The public site no longer mentions DigiNam or e-ID at all.  
Do not claim hundreds of paying lodge customers. The 29 September production run used a test organisation; do not present it as a customer.  
Mark the project Start-up.  
Mark five-year revenue as hypothesis.  
Mark HAN occupancy figures as association member-sample reporting unless you attach the primary HAN PDF.  
Mark competitor prices as read from vendor pages on 29 September 2026, converted at approximate rates.
