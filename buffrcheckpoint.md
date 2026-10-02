# Buffr Checkpoint
## Business Plan, Product Architecture & Operating Blueprint
**Version 0.32 — Analytics, retention, card payments, live rosters**

> **What changed in v0.32 (2026-10-01, guide gaps closed):**
> 1. **Analytics ETL and dashboards** (§11.1b, built 2026-09-30) — PII-free
>    daily/hourly fact tables, reconciled hourly runs, admin analytics and
>    Ops Console arrival statistics with small-cell suppression.
> 2. **Architecture guide merged** as §11.1c (CRM, ETL, payments, reporting,
>    dashboards, UI), with its claims corrected against the build.
> 3. **Retention disposition job → FULL (opt-in).** Migration 0043 +
>    `retention-disposition` module: disposes visits past the effective
>    policy, skips active legal holds (unreadable scopes fail closed),
>    crypto-shreds subjects with no live visits or credentials, reconciles
>    candidates = disposed + held, audit-logs each run. Off unless
>    `RETENTION_DISPOSITION_ENABLED=true`; `POST /platform/retention/runs`
>    defaults to a dry run. Review a dry run before enabling in production.
> 4. **Card payments (Adumo Online Virtual) → FULL, credential-gated.**
>    Migration 0042: signed hosted-page form, response token verified,
>    reference and amount matched, applied once; reconciliation row on every
>    outcome. Off until Adumo merchant credentials are set. The
>    proof-of-payment endpoint now checks invoice ownership (tenant fix).
> 5. **XLSX export** next to CSV for the visitor roster and analytics, with
>    the same audit actions; CSV cells are guarded against formula injection.
> 6. **Live Front Desk and Emergency rosters.** `GET /visits/roster/stream`
>    (Server-Sent Events, ids only, tenant-filtered) triggers a page refresh
>    on check-in, check-out, approve/reject, escalation and emergency events;
>    falls back to a 30-second refresh if the stream drops. In-process
>    emitter: valid while the API runs as a single instance.
> 7. **Audit chain** — background jobs and gateway callbacks write to the
>    same hash-linked chain via `common/audit/audit-chain.ts`.

> **What changed in v0.31 (2026-09-24, integrations + market framing):**
> 1. **Sector-agnostic product.** Buffr Checkpoint replaces paper visitor
>    registers for **any** organisation that needs governed presence —
>    banks, government, healthcare, critical infrastructure, corporate,
>    hospitality, education, and other sectors via `organisation_sector`
>    (20 + Other). Beachhead GTM priorities (§15.1) remain a *sales*
>    sequence, not a product ceiling. This blueprint does **not** name
>    individual pilot properties.
> 2. **Existing-system integrations (series).** Where a site already runs
>    an operational system of record (PMS, HR directory, access control,
>    etc.), Checkpoint integrates at the boundary rather than replacing
>    that system. **CiMSO INNterchange** (`cimso_innterchange`) is the
>    **first** adapter in that series: multi-tenant `pms_*` schema,
>    admin Connect/Sync shell, platform register **Targeted**, invitation
>    persist path shipped; live TCP client still open. Further adapters
>    follow the same pattern when applicable — not hospitality-only.
> 3. **§4a.7 / §11.9.6 / Phase 3** updated for `cimso_innterchange` and
>    the existing-system series. Brand kit tokens remain §11.5 (#E0B000 /
>    #111111 / #F5F5F5); kit under `branding/`.

> **What changed in v0.30 (2026-09-22, alpha + UAT plan):**
> 1. **§17.4 Alpha testing and UAT plan** — executable acceptance ladder
>    A0 internal alpha → A1 design-partner UAT → A2 paid pilot (§17.2) →
>    A3 GA; entry/exit criteria, journey scripts, severity, RACI, sign-off
>    form, calendar aligned to §17.3. Scope honesty: FULL Core surfaces
>    only; DigiNam / USSD / SMS / retention-cron / badge hardware out of
>    sellable UAT until capability register is live.
> 2. **§11.8.10** — cross-references §17.4 so beta/launch gate does not
>    invent a second programme.
> 3. **Runnable gate** — `scripts/acceptance-gate.sh` +
>    `scripts/acceptance/checklist.json` track A0–A3 marks/sign-offs;
>    wraps `smoke-production.sh`, `journey-smoke.ts` (now includes
>    staff check-out), and form-rules unit tests. Local state is
>    gitignored (`scripts/acceptance/state.json`).

> **What changed in v0.29 (2026-09-18, overview + Neon primitives):**
> 1. **Admin home** — `/dashboard/default` renamed to `/dashboard/overview`
>    with `OperationalMetricCards`, `VisitActivityOverview`,
>    `OnSiteRosterPanel` (10-row preview + link to Front Desk). Legacy
>    `/dashboard/default` redirects to overview. Sidebar adds Overview;
>    Front Desk keeps the full live roster.
> 2. **Shared roster** — `visit-roster-table` moved to
>    `admin/src/components/features/visits/visit-roster-table/` (used by
>    overview, front-desk, visitors, emergency).
> 3. **Template residue removed** — `profile/`, `coming-soon/`,
>    `theme-switcher.tsx`, admin+website `sentry-example-page/`. Renamed
>    `events-data.ts` → `schedule-event.ts`, users/roles `data` → `types`.
>    Account menu links to `/dashboard/account`.
> 4. **Neon Object Storage + Frankfurt migration (complete)** —
>    Primary project **`falling-frog-15538162`** (`aws-eu-central-1`, PG18,
>    branch `br-blue-frog-b1sgfw94`). Oregon `bold-cloud-47505421` kept as
>    rollback until **2026-09-25**, then delete. Railway production
>    `DATABASE_URL` + local `.env` point at Frankfurt. Object Storage
>    bucket `buffr-checkpoint-artifacts`; **`ARTIFACT_STORE=neon_s3`** is
>    production primary. Blob→Neon copy ran (0 source objects). Preview
>    branch `v029-preview-branch-validate` inherited DB (8 orgs) + bucket;
>    upload probe succeeded; branch delete removed the branch (and objects).
> 5. **Neon AI Gateway (admin-only)** — `FormAiService` +
>    `POST /visitor-policy/forms/ai/suggest-fields` and
>    `.../ai/translate-field` (gated by `FORM_AI_ENABLED`); FormBuilder
>    “Suggest from description” panel. No visitor PII. Does **not**
>    replace custom MFA/auth or NestJS workers.
> 6. **Docs/assets** — admin README/AGENTS scrubbed of Studio Admin branding;
>    §11.4.1a / §11.4.7 / stack notes updated below.

> **What changed in v0.28 (2026-09-18, form builder full wire):**
> Closes the four gaps between Part Three §5 architecture and a usable,
> enforceable form product (Envoy/OfficeRnD-class admin tools + server-side
> data minimisation).
> 1. **Part Three §5 expanded** — field library + types, visibility /
>    `requiredIf` JSON contracts, field translations, admin builder UX,
>    publish and check-in minimisation gates (§5.2–§5.6).
> 2. **Schema** — `field_type_code`, `help_text` on `check_in_form_fields`;
>    `check_in_form_field_translations`; `field_type` + `check_in_field_code`
>    type_definition domains (migration `0030_form_builder_v028.sql`).
> 3. **`VisitorDataMinimisationService`** — publish blocked for
>    `high_risk` / `verification_evidence` without `approval_reference`;
>    check-in validates answers against published effective form
>    (unknown codes rejected; required / `requiredIf` / validation_schema).
> 4. **Admin** — `/dashboard/policies/forms/[definitionId]` drag-and-drop
>    builder (`@dnd-kit`), field library, classification warnings,
>    conditional rules, per-field translations; create stays draft until
>    explicit publish.
> 5. **Clients** — website + kiosk render from effective form when present
>    (no hardcoded CORE override); evaluate visibility client-side; pass
>    `languageCode` for resolved labels.
> 6. **FR-K09 / NFR-P02** — enforcement FULL (resolve + server validate),
>    not resolve-only.
> 7. **Neon applied (2026-09-18)** — `0030_form_builder_v028.sql` on
>    `bold-cloud-47505421` / `br-green-dawn-ardw1eme`; `0031_purpose_category_form_options.sql`
>    seeds `meeting` / `vehicle` / `other` so form options match
>    `purpose_category` type_definition (avoids 500 on check-in when purpose
>    is vehicle). Demo form seed: vehicle `visibilityRule` + `requiredIf`,
>    AF labels on name/phone/vehicle.
> 8. **Local e2e (agent-browser + API)** — public check-in: purpose=Meeting
>    hides Vehicle registration; purpose=Vehicle shows it required; submit
>    succeeded (`53D060F1`). API: missing vehicle → `400 Required field
>    missing: vehicle_registration`; with registration → 200. Admin FormBuilder
>    lists published fields + visibility UI. Screenshots under
>    `e2e-screenshots/{check-in,forms,responsive}/`. Unit:
>    backend `form-rules.spec` 8/8, website `form-rules.test` 3/3.
>    **Prod API/website still need redeploy** for live `visibilityRule` /
>    `fieldTypeCode` on `api.buffrcheckpoint.com`.

> **What changed in v0.27 (2026-09-16, demo tenancy + kiosk branding):**
> Product rule: a kiosk belongs to the **same organisation** it serves.
> The earlier split between a synthetic "Buffr Checkpoint Kiosk Demo" org
> (`47c8b69b-…`) and the real Buffr Analytics customer org (`b51f0704-…`)
> broke that rule and left the tablet able to sync experience under the
> wrong tenancy JWT.
> 1. **Seed `0018_unify_kiosk_demo_under_buffr_analytics.sql`** — re-points
>    Demo Front Desk (`74c72c99-…`), `kiosk-demo@buffrcheckpoint.test`,
>    hosts, forms, branding, kiosk experience, QR, directory units, and
>    related demo rows onto Buffr Analytics (`b51f0704-…`); soft-deletes the
>    retired kiosk-only org. Applied on prod Neon. Greenfield seeds
>    `0009` / `0013` / `0015` / `0016` / `0017` now use `b51f0704` as well.
> 2. **API smoke** — login as kiosk-demo →
>    `GET /kiosk-experience/effective?siteId=74c72c99-…` returns Buffr
>    Analytics, `#CF1161`, logo
>    `https://buffrcheckpoint.com/org-assets/buffr-analytics/icon.png`.
> 3. **Kiosk sync harden** — `ExperienceRepository.syncFromBackend` no
>    longer swallows failures into product-default chrome; Welcome surfaces
>    the error + retry; last-good cache kept when present. Re-provision
>    clears experience prefs + `LogoDiskCache` + token.
>    `ExperienceSyncWorker` uses `ExistingPeriodicWorkPolicy.UPDATE`.
> 4. **Logo harden** — `LogoDiskCache` requires HTTP 2xx, follows redirects,
>    drops bad cache files; prefetch after successful sync.
> 5. **Org chrome** — shared `OrgBrandingHeader` on Welcome, self/assisted
>    check-in, privacy notice, and success screens.
> 6. **§11.7.7** — emulator/demo tables document one org only (Buffr
>    Analytics). Debug APK install verified on Pixel_Tablet
>    (`versionName=0.1.0`).

> **What changed in v0.26 (2026-09-16, discovery-interview capability
> audit):** this top banner had fallen behind the body — §11.9.1b's
> "Gap-closure phases 1–8," "Live browser bug-hunt," and "UX pass" entries,
> and §11.9.8.5's technician-escape entry, all landed without a matching
> banner line here. Read §11.9.1b for that work's own detail; this entry
> covers only the pass that follows it, prompted by checking BuffrCheckpoint
> against a mom-test discovery-interview script drafted the same session
> ("if you had to pull everyone who visited last Tuesday, how long would
> that take you?", "has an auditor ever asked you a hard question about
> your visitor records?") — the premise being that these questions should
> be trivially answerable once a site is on the product instead of a paper
> register. They mostly weren't. Full detail in §11.9.1b's new closing
> entry; summary:
> 1. **Kiosk "Staff" roster button had no authentication gate at all** —
>    tapping it from the visitor-facing Welcome screen went straight to the
>    full on-site roster (every visitor's name and host), reproducing the
>    exact shared-visibility problem this product exists to fix. Fixed:
>    forces a fresh `LoginScreen` credential challenge every time, not
>    conditioned on the device's already-logged-in session state.
> 2. **"Pull everyone who visited on date X" had no working answer.** The
>    Visitors page's date-filter control was wired to the wrong option set
>    (silently broken, not just unstyled), the backing endpoint had no
>    date-range parameter at all, and results were capped at 200 rows with
>    no server-side fallback — an older date could go silently missing.
>    Added `GET /visits/roster/search` (real date range, keyset pagination)
>    and `GET /visits/roster/export` (CSV), reusing the pattern
>    `AuditService.listForOrganisation` already proved for this exact
>    problem.
> 3. **Audit log date-range UI** — the backend already supported `from`/`to`
>    query params; no page exposed them. Added.
> 4. **DSAR data export was over-disclosing** — `buildExportPackage` never
>    actually filtered by the requester's `subjectReference`, so every
>    visitor-data DSAR export returned every visitor's data. Fixed using the
>    same phone-HMAC lookup already used elsewhere in the codebase.
> 5. **Evidence packs wrote to the same ephemeral local disk already fixed
>    once this session** for KYB/billing/DSAR documents, and had no way to
>    answer "who accessed the premises in this period" or even a working
>    download route. Moved to the existing `createArtifactStore()`
>    abstraction, added an optional date-range visitor-access extract, and
>    added the missing `GET /evidence/:id/download` route.
>
> Flagged, not built — each needs a decision this pass correctly didn't make
> unilaterally: representing "visitor arrived, no host known" (needs
> `visitor_visits.host_id` to become nullable, a core-schema change);
> retention enforcement (already flagged elsewhere in this document as not
> yet built — a cron/purge job, not a wiring gap); per-staff attribution on
> the kiosk roster view (needs a new credential model, not this pass's
> device-level re-login gate).

> **What changed in v0.24.2:**
> 1. **`0025`** — restored `UPDATE` on `emergency_roll_call_events` for
>    `buffr_checkpoint_runtime` (0024 over-revoked; resolve sets `closed_at`).
>    DELETE remains revoked; `audit_events` UPDATE still false.
> 2. **Railway deploy** — removed `file:../shared` from backend (upload root is
>    `backend/` only); canonical codes inlined in `src/common/canonical-codes.ts`
>    (same mirror pattern as admin). Package `shared/` remains the editorial SoT.
> 3. **Journey smoke** — `scripts/journey-smoke.ts` covers emergency
>    trigger→roster→resolve and public check-in → host approval when a zone
>    can be gated; creates a host-gated zone if none exist.
> 4. **`0026`** — `visit.access.approve` granted to `owner_operator`,
>    `front_desk_operator`, and `site_manager` (was host_staff-only).
> 5. **FR-K05** — marked FULL (dual-gate + absent tile until live).
> 6. Surfaces redeployed: API (Railway), admin + ops (Vercel).

> **What changed in v0.24.1 (doc integrity — close-read triage):**
> 1. **§11.9.8.4** — removed stale "Worker/evaluation logic not built yet."
>    `HostNotificationEscalationEvaluationService` polls on
>    `ESCALATION_EVAL_INTERVAL_MS` (default 60s), writes
>    `host_notification_escalation_events`, and applies
>    notify / hold_entry / auto_admit actions. Matches §11.9.0a + v0.13 changelog.
> 2. **§11.9.9 kiosk nav** — removed stale "Remaining gaps: NFC/USSD tiles,
>    language picker, accessibility panel, logo." WelcomeScreen gates NFC/USSD
>    on channel enablement **and** effective capability `live`
>    (`WelcomeViewModel.isNfcEnabled` / `isUssdEnabled` ←
>    `GET /capability-enablement/effective`); language dialog, accessibility
>    dialog, and `RemoteLogoImage` are present. Real remaining gaps called out
>    separately (live USSD aggregator, national e-ID tile correctly **absent**).
> 3. **§11.9.8.5** — kiosk maintenance enforcement **is built** (nav start →
>    `MaintenanceScreen` when `maintenanceModeEnabled`; shows message +
>    assisted-entry direction). Removed the stale "not built yet" line.
> 4. **§11.4 canonical-name lookup** — one-line table at section top so agents
>    do not treat §11.4.5's original proposal names as live schema.
> 5. **`0024` + least-privilege role** — SQL role `buffr_checkpoint_runtime`
>    (not Neon-API/`neon_superuser`); append-only REVOKEs verified
>    (`audit_events` UPDATE=false, INSERT=true). Local `.env` + Railway
>    `DATABASE_URL` switched to `buffr_checkpoint_runtime`; API redeployed.
> 6. **SQLCipher pull-test** — emulator DB pulled; plain `sqlite3` →
>    "file is not a database" (§11.7.5 checkbox closed).
> 7. **Site QR dead-end gate** — admin UI select + API allowlist only
>    `public_site_checkin`; printable kit already present (`PrintableQrPanel`).
> 8. **Ops console** — `ApiError` status prefix + RBAC copy + OrgSelect +
>    actionable empty states; redeployed to `ops.buffrcheckpoint.com`.
> 9. **`shared/` scaffold** — `@buffrcheckpoint/shared` (visit_status +
>    identity_assurance_level); backend `file:` dep; kiosk `Enums.kt` aligned
>    (adds pending_approval / admitted / entry_rejected).
> 10. **Public check-in → host approval** — `security_zones.host_approval_required`
>     now sets initial visit status to `pending_approval` (kiosk + public QR);
>     public path auto-binds the sole gated zone when present.
> 11. **Identity providers fail-closed tests** — DigiNam + Discovery always
>     `unavailable` (never truthy verified). Dual-gate tests: org enable +
>     platform `targeted`/`not_available` cannot surface e-ID/DigiNam as live.
> 12. **Journey smoke script** — `backend/scripts/journey-smoke.ts`
>     (emergency trigger→roster→resolve + public→approve).
> 13. **DSAR / account deletion UI** — `/dashboard/compliance/privacy-requests`
>     with type filter, amber account-deletion badge, and
>     `GET /dsar?requestTypeCode=` (resolved type codes on list).
> 14. **Neon roles** — leftover `buffr_checkpoint_app` removed; only
>     `neondb_owner` + `buffr_checkpoint_runtime` remain.

> **What changed in v0.22.0 (governance / assurance / status sync):**
> 1. **Implementation wiring logged** — migration `0017_v022_completion.sql`
>    applied to Neon `bold-cloud-47505421`; organisation capability enablement
>    API/UI; credential site entitlements CRUD; SMS contact-confirmation event
>    scaffold; USSD session status log; invitation `visitor_category_code`;
>    pre-check-in `capture_channel_code`.
> 2. **FR-K10 → FULL** — privacy gate on QR/NFC paths; abandon clears ViewModels
>    and SQLCipher outbox pending drafts (`ProtectedDraftClearanceService` +
>    `OutboxDao.deletePendingDrafts`). **FR-K09 → FULL** — effective form resolve
>    + kiosk/website dynamic fields + `formAnswers`. **FR-K03 → FULL** — public
>    `/check-out` + kiosk sign-out-by-phone. **FR-K12 soft → FULL** (hardware
>    badge print remains NOT STARTED). **Login lockout → FULL** — 3 failed
>    passwords in 5 minutes locks the account for 5 minutes (cleared on success
>    or password-reset confirm); forgot/reset UI already shipped.
> 3. **§5.2 / §5.2a** — V0–V4 canonical names, NIST SP 800-63-4 / ISO/IEC 29115
>    maps, Constitution snake_case aliases; hard rule that assurance ≠ signature
>    class ≠ certificate role ≠ access decision.
> 4. **Regulatory Addendum §5.5–§5.6** — full certificates vs signatures vs
>    acknowledgement scope; Relying-Party Practice Statement (not a CSP CPS/CP).
> 5. **§14.5 + Part Two §8.3** — ISO 55001:2024 Clause 4–10 documented-information
>    register (SAMP, competence, predictive action); ISO 55002 as guidance.
> 6. **§20.3–§20.6** — policy/procedure register; training competence matrix;
>    continuity practice statement; accreditation/compliance evidence calendar.
> 7. **§11.9.0a / §11.9.6 / §11.9.7 / §11.7.6** — matrix and FR/NFR catalogues
>    brought current; kiosk phase status reconciled with v0.20+ delivery.
> 8. **Migration 0018** — `identity_assurance_level` labels updated to canonical
>    names (codes remain V0–V4); seed `0001_type_definitions.sql` aligned.

> **What changed in v0.21.3 (ETA commencement — verified from LAC/NamibLII):**
> 1. **Section 20 and Chapter 5 in force** — **15 June 2026** by Government
>    Notice **182/2026** (GG **8949**), Minister Emma Theofelus (MICT). **Chapter 4
>    remains not commenced.**
> 2. **Subsidiary regulations in force** — Electronic Signature Regulations
>    **GN 335/2025** (GG 8814); Accreditation Regulations **GN 953/2025** (GG 8808);
>    accreditation regulations commenced same date via CRAN **General Notice
>    401/2026** (GG 8948).
> 3. **Updated statute PDF downloaded** — LAC annotated *Electronic Transactions
>    Act 4 of 2019* plus commencement gazettes and both regulation sets saved under
>    `bon-application-tool/docs/Regulation & Compliance Resources 2/` (see §11.9.11).
> 4. **Regulatory Addendum §5.0–§5.4** — commencement table, recognised-signature
>    requirements (reg 8), and Ch5/MHAISS reconciliation updated. Kiosk default
>    remains **acknowledgement evidence** — not recognised electronic signature
>    without accredited CSP subscriber-certificate path.

> **What changed in v0.21.2:**
> 1. **Neon migrations applied** — `0015_cran_pki_v021.sql` and
>    `0016_qr_invitation_capability_live.sql` applied to project
>    `bold-cloud-47505421` (2026-09-14). Capability register now has **six**
>    rows; `qr_invitation_checkin` public status = `live`.
> 2. **Regulatory Addendum §5 expanded** — primary-source read of *Electronic
>    Transactions Act 4 of 2019* (GG 7068; commencement GN 75/2020, GG 7142):
>    in-force vs deferred provisions; Buffr mapping to s17/s19/s24/s25/s33;
>    Ch5 accreditation framework and CRAN-as-Authority; kiosk acknowledgement
>    vs recognised electronic signature.
> 3. **§11.9.0a** — QR invitation lifecycle row updated to **FULL** (register
>    live after migration).

> **What changed in v0.21.1 (CRAN roadmap update):**
> 1. **Regulatory Addendum §6.0** — CRAN *National Root CA Implementation Journey*
>    seven-step roadmap recorded (Policy → Sustain); statuses from CRAN
>    presentation slides.
> 2. **MHAISS as first accredited CSP** — Ministry of Home Affairs, Immigration,
>    Safety and Security accredited for **e-ID rollout** (Step 4); additional
>    CSP onboarding ongoing. This is a **national issuance** fact — it does
>    **not** change Buffr Checkpoint's relying-party register (`diginam_verification`,
>    `national_eid_nfc` remain `not_available` until Buffr's own RP onboarding
>    and tested interface exist).
> 3. **§4 / §4a.1 / §6.1 / §6.3** — national-vs-product separation tightened
>    against confirmed Root CA, Go Live, and MHAISS CSP milestones.

> **What changed in v0.21 (CRAN PKI alignment):**
> 1. **Regulatory Addendum §6** — CRAN PKI Stakeholder Engagement (July 2026):
>    four-layer separation (national direction / operational facts / Buffr
>    relying-party / forbidden claims); 36 CRAN presenter questions (A–F);
>    three post-presentation artifact requests; ETA s20/Ch4/Ch5 commencement
>    note; permitted marketing wording matrix.
> 2. **Capability register expanded** — `qr_invitation_checkin` and
>    `sms_contact_confirmation` added; public API, website badges, and kiosk
>    flags wired for all six capabilities.
> 3. **Digital identity boundary** — `DigitalIdentityVerificationProvider`
>    port; discovery/DigiNam skeleton; `POST /identity-verification/verify`;
>    banned raw payload fields.
> 4. **Credential validation hardening** — `reader_sessions`,
>    `credential_use_events`; extended validate DTO; 10-step server pipeline.
> 5. **Invitation QR lifecycle** — opaque `token_hmac`, revoke/resolve/public
>    match; admin create UI; kiosk token resolve.
> 6. **Kiosk privacy wipe** — `VisitorSessionTimeoutController`,
>    `AbandonVisitorCheckInUseCase`, `ProtectedDraftClearanceService` (FR-K10).
> 7. **USSD telecom webhook** — `POST /integrations/telecoms/:providerCode/ussd-sessions`;
>    `FeaturePhoneCheckInSessionService` stub.
> 8. **Blueprint corrections** — §4a.4, §16.4, §11.9.0a/6/8.2/8.3 synced;
>    kiosk acknowledgement ≠ recognised e-signature default.

> **What changed in v0.20 (full implementation — not MVP):**
> 1. **Canonical status matrix** — §11.9.0a lists every admin / API /
>    website / kiosk surface as **FULL / PARTIAL / NOT STARTED** after the
>    2026-09-13 audit. Soft-complete is **evidence-blocked**. DigiNam go-live,
>    live USSD/SMS gateways, Ops Console app, badge print hardware, and
>    Release 1.5 induction remain **NOT STARTED**.
> 2. **Backend domain completion** — privacy document lifecycle
>    (draft/publish/supersede/archive); form versions + fields; regions +
>    security zones CRUD; sites/hosts PATCH; onboarding evidence gate;
>    packaged DSAR export (JSON+CSV+manifest); public contact enquiry API;
>    artifact store abstraction for evidence/DSAR/policy content.
> 3. **Admin operational completeness** — front-desk approve/reject/checkout;
>    emergency trigger/resolve; printable QR kit; forms/access/retention/
>    privacy create+lifecycle UIs; devices + credentials lifecycle; user
>    invite; password-reset pages; MFA manage link; site pickers (no raw
>    UUID fields).
> 4. **Website** — real contact POST (honeypot + throttle + Resend + durable
>    enquiry); sitemap default host `buffrcheckpoint.com`.
> 5. **Kiosk Phase 4–6** — SQLCipher Room + transactional outbox +
>    WorkManager drain-until-empty; NFC reader-mode → validate → check-in
>    (no UID trust; hide when capability absent); read-only device list;
>    honest Keystore / notification status (§11.7.5 acceptance gate).

### 11.9.0a Implementation status matrix (v0.29)

**Packaging posture (QR-first Core):** Marketed Core claims must match FULL surfaces only — public site QR create/rotate/print + website `/check-in` + assisted front desk + RBAC/encrypted record/sign-out/reports. **Do not sell Core as including live USSD or SMS** while those adapters are NOT STARTED below. Dedicated kiosk/tablet, NFC fast lane, SMS, and USSD are optional Professional entitlements / catalog add-ons on the same encrypted visit record (Sections 5.1, 15.2, 16). Admin **Site Experience → Site QR Codes** is the Core CAPEX-reduction path (already FULL).

| Surface | Status | Notes |
|---|---|---|
| Auth / MFA / email verify / password-reset API | FULL | |
| Password-reset admin UI | FULL | forgot + reset pages; reset clears lockout |
| Login lockout / cooldown | FULL | 3 failed passwords in 5 min → 5 min lock; IP throttle 10/5 min; lock email |
| Onboarding wizard + evidence-blocked soft-complete | FULL | v0.20 |
| Org profile / sites / hosts CRUD | FULL | create+edit+deactivate |
| Regions / security zones | FULL | v0.20 |
| Branding / kiosk experience / escalation | FULL | |
| Site QR create/rotate + printable kit | FULL | v0.20 — **Core default channel** (admin public site QR → phone `/check-in`); tablet not required |
| Forms (defs + versions + fields + publish) | FULL | v0.20; v0.28 admin builder + minimisation + i18n |
| Form AI suggest/translate (admin) | FULL (gated) | `FormAiService` + §11.9.14; `FORM_AI_ENABLED`; never auto-publish |
| Retention purge/archive job | FULL (worker opt-in) | `retention-disposition` module + migration 0043. Disposes visits past the effective policy (site, else org default), skips active legal holds (unreadable hold scopes fail closed), crypto-shreds personal data of subjects with no live visits or credentials, and reconciles candidates = disposed + held. Worker runs only with `RETENTION_DISPOSITION_ENABLED=true`; `POST /platform/retention/runs` defaults to a dry run |
| Access / retention policies | FULL | v0.20 |
| Roster and analytics export (CSV + XLSX) | FULL | v0.32 `GET /visits/roster/export?format=xlsx`, `GET /analytics/export.xlsx`; same audit actions as CSV |
| Live roster push (Front Desk / Emergency) | FULL | v0.32 SSE `GET /visits/roster/stream`; single API instance only (in-process emitter) |
| Card payments (Adumo Online Virtual) | FULL (credential-gated) | v0.32 migration 0042; off until Adumo merchant credentials are set; recurring tokens not built |
| Privacy notice document lifecycle | FULL | v0.20 |
| Devices MDM + credentials issue/revoke/validate | FULL | v0.20 |
| Credential site entitlements CRUD | FULL | v0.22 `GET/POST /credentials/:id/entitlements` |
| Front desk approve/reject/checkout | FULL | v0.20 |
| Emergency trigger/resolve | FULL | v0.20 |
| User invite + role assign | FULL | v0.20; v0.29 invite with `roleCode`/`siteId`, change-role allowlist, live catalogue counts/permissions |
| Roles catalogue (org assign, no invent) | FULL | v0.29 fixed customer-assignable catalogue; orgs assign/change only — no custom permission editor; marketing Platform/Pricing/About aligned |
| Website marketing + `/check-in` | FULL | |
| Public `/check-in` language UI | FULL | Language picker (en/af/pt) + `?lang=`; API `languageCode` resolves translated labels |
| Neon Object Storage adapter | FULL | Frankfurt primary `falling-frog-15538162`; `ARTIFACT_STORE=neon_s3` on Railway; bucket `buffr-checkpoint-artifacts`; Blob bridge empty (0 objects copied) |
| Neon Functions | DEFERRED | NestJS workers remain primary compute |
| Website contact | FULL | v0.20 |
| Kiosk Phases 0–3 (online check-in) | FULL | |
| Kiosk Phase 4 offline (SQLCipher outbox) | FULL | v0.20 |
| Kiosk Phase 5 NFC reader fast lane | FULL | v0.20 |
| DSAR packaged export | FULL | v0.20 |
| Organisation capability enablement API + admin UI | FULL | v0.22 `/organisation/capability-enablement`; Site Experience → Capabilities |
| Effective org capability flags (kiosk) | FULL | v0.22 `GET /capability-enablement/effective` |
| Migration 0017 schema completion | FULL | visitor_category on invitations; ack capture_channel; SMS/USSD logs |
| DigiNam relying-party adapter live | NOT STARTED | discovery → public not_available |
| National e-ID NFC adapter live | NOT STARTED | targeted in register |
| QR invitation check-in lifecycle | FULL | v0.21 token/revoke/resolve; register `live`; admin pickers/revoke v0.22 |
| SMS contact confirmation gateway | NOT STARTED | v0.22 event scaffold + org gate; no live MT provider — **not a Core sellable claim**; optional add-on when live |
| Live USSD aggregator webhook | NOT STARTED | v0.22 DB arrangement guard + session status log; menu flow not live — **not a Core sellable claim**; optional add-on when live |
| Kiosk visitor-session privacy wipe (FR-K10) | FULL | v0.22 outbox pending wipe + QR/NFC privacy gate + abandon |
| Platform Ops Console app | FULL | v0.24 — schema, backend (`platform-control-plane` module), and `ops-console/` all built and live-verified end-to-end against the real dev DB: every console screen (Overview, Organisations + per-org detail with Rollup/CRM/Billing/KYB tabs, CRM, Billing + POP review, KYB, Capability Status with dual-approval, Support Access, Incidents, Tickets + comments, Analytics/churn queue, Audit) is real and wired to live endpoints, not stubbed. `admin/`'s support-session entry route (with live countdown banner) and customer-facing `/dashboard/billing` (invoice list + POP upload) are both built. The break-glass grant flow is customer-consent-gated (§11.9.1a) and was verified live end-to-end: request → inert → customer sees + approves/denies → session mint → grant revoke → 403. See Section 11.9.1a for the full build notes and one real bug this live testing caught and fixed before ship. |
| Other QR product types (pre-reg, emergency, …) | NOT STARTED | |
| Release 1.5 induction schema | NOT STARTED | |
| Kiosk dynamic form from site form version (FR-K09) | FULL | v0.28: Android `ManualCheckInViewModel`/`ManualCheckInScreen` + `FormRules` on `effectiveForm`; website + kiosk |
| Organisation directory (BIAN-optional) | FULL | `organisation_units` + modes custom / bian_aligned / hybrid; admin CRUD + optional seeds |
| Host email (Resend) | FULL | HTML host notification; honest fail without `RESEND_API_KEY` |
| Reception wait queue | FULL | `visitor_wait_queue_entries` on check-in; front-desk list; ticket on success |
| Visitor sign-out (FR-K03) | FULL | public `/check-out` + kiosk sign-out-by-phone; staff roster checkout unchanged |
| Soft visitor pass (FR-K12 soft) | FULL | printable confirmation on website; confirmation card on kiosk success |
| Badge print hardware (FR-K12 hardware) | NOT STARTED | printer SDK / device path not built |
| Server-side notification outbox + dispatcher worker | FULL | v0.23 real transactional outbox (`pending`→`sent`/`failed`, retry/backoff, `notification_delivery_status_events`); `visit.checked_in` domain event via `@nestjs/event-emitter` |
| `website`/`admin` accessibility (Lighthouse + axe) | FULL (unauthenticated), PARTIAL (dashboard) | v0.23 — 100/100 on every unauthenticated page in both apps; dashboard-behind-MFA not independently re-verified, see Section 11.8.7 |

#### v0.29 verification findings (2026-09-18)

| Claim | Result | Evidence |
|---|---|---|
| Kiosk dynamic forms from site form version | **FULL** | Android `ManualCheckInViewModel` / `ManualCheckInScreen` bind `effectiveForm`; website check-in uses published fields when present |
| Public `/check-in` language UX | **FULL** | Language picker (en/af/pt) + `?lang=`; form reload on language change |
| Prod migrations through 0038 | **FULL** | Frankfurt: through 0037 live earlier; **0038** branded templates + `attachments_json` applied 2026-09-25; `scripts/smoke-production.sh` 6/6 PASS on Frankfurt-backed `api.buffrcheckpoint.com` |
| Neon S3 primary | **FULL** | Local put/get/delete probe OK; Railway `ARTIFACT_STORE=neon_s3`; Blob→Neon copy: 0 source objects |
| Preview branch DB+storage | **FULL** | Branch inherited 8 orgs + `buffr-checkpoint-artifacts`; probe upload OK; branch delete removed branch |

> **What changed in v0.19.2 (MFA challenge "Invalid or expired"):**
> 1. **Root cause** — that message means the *challenge token* failed lookup
>    (missing / wrong / already used / past the 10-minute TTL), not a wrong
>    TOTP digit. Wrong authenticator codes still return
>    `Invalid authenticator code`.
> 2. **httpOnly `bc_mfa_challenge` cookie** — set on MFA-required login;
>    challenge BFF falls back to it when `sessionStorage` is empty or stale.
> 3. **Clearer API errors** — expired vs missing vs MFA-not-active are distinct.
> 4. **Challenge form** — re-reads token at submit; shows 10-minute TTL hint.

> **What changed in v0.19.1 (MFA authenticator hardening):**
> 1. **Verified against Google Authenticator Key URI Format** — `otplib`
>    `authenticator.keyuri` emits
>    `otpauth://totp/Buffr%20Checkpoint:email?secret=…&issuer=Buffr%20Checkpoint&period=30&digits=6&algorithm=SHA1`.
>    Admin renders that URI locally with `qrcode@1.5.4` (no third-party QR host).
> 2. **Idempotent enroll start** — remounts / Strict Mode no longer rotate the
>    pending TOTP secret after the user scans the QR (previous race made
>    confirm fail with "Invalid authenticator code").
> 3. **Code normalisation** — spaces/dashes stripped on enroll confirm and
>    login challenge; unit tests in `mfa-authenticator.spec.ts`.
> 4. **E2E already proves the loop** — `backend/test/auth.e2e-spec.ts` enrolls
>    via start→generate→confirm and challenges on subsequent login.

> **What changed in v0.19:**
> 1. **Proxy allowlist** — incomplete onboarding may open config routes
>    (`/dashboard/organisation`, `/sites`, `/hosts`, `/site-experience/*`,
>    `/policies/*`, `/devices*`, `/roles`, `/emergency`, …). Front-desk and
>    analytics stay blocked until go-live. Dashboard shows a **Back to
>    onboarding** banner while incomplete.
> 2. **Corrected wizard hrefs** — organisation → `/dashboard/organisation`
>    (not My Account); visitor categories → forms; hosts → `/dashboard/hosts`;
>    check-in channels link kiosk **and** Site QR.
> 3. **Create UIs wired** — Add site (`POST /sites`), Add host (`POST /hosts`
>    with decrypted list projection), organisation profile edit
>    (`PATCH /organisations/me`).
> 4. **Logo upload** — branding sheet accepts PNG/JPEG/WebP (≤400 KB) as a
>    `data:image/…` artifact; `resolvePublicAssetUrl` passes data URLs through
>    for kiosk sync. Object-storage/presign remains a later hardening step.
> 5. **Still open** — privacy-notice document CRUD/upload; retention/access/
>    forms create sheets; user invite API; soft-complete still does not
>    evidence-check configuration rows.

> **What changed in v0.18:**
> 1. **Website `/check-in`** — `website/src/app/check-in/` (page +
>    `check-in-form.tsx`) accepts `?site=&ref=` from the kiosk public-site QR
>    payload and renders a mobile visitor form. Production previously returned
>    **404** for that URL, so phones never reached a destination page.
>    Route is `robots: { index: false }` and is **not** in `sitemap.ts`
>    (operational surface, not marketing).
> 2. **Public API** — `GET /public/check-in/context` and `POST /public/check-in`
>    (`PublicCheckInController`, throttled, `@Public()`). Validates an active
>    `public_site_checkin` QR (`SiteQrReferencesService.validatePublicCheckInReference`),
>    returns site name + host display names (no contact PII) + purpose
>    categories, and creates a visit with `capture_channel=qr` without a JWT
>    (`VisitsService.publicCheckIn`). DTO: `dto/public-check-in.dto.ts`.
> 3. **Payload contract unchanged** — `buildPublicCheckInQrUrl` still encodes
>    `{VISITOR_CHECKIN_BASE_URL}/check-in?site={siteId}&ref={referenceId}`
>    (default base `https://buffrcheckpoint.com`).
> 4. **Ops verified (2026-09-11)** — Railway `api` already has
>    `VISITOR_CHECKIN_BASE_URL=https://buffrcheckpoint.com` and
>    `PUBLIC_WEB_BASE_URL=https://buffrcheckpoint.com`; Vercel website has
>    `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL`. Website + API redeployed;
>    smoke: page `200`, context for demo site QR, `POST /public/check-in`
>    created a visit on Demo Front Desk.
> 5. **Doc sync** — §1a.3, §11.6.4, §11.7.8, §11.8.8, §11.9.8.1, §11.9.9.1,
>    and Appendix flow 6.x updated for the live mobile QR destination.

> **What changed in v0.17:**
> 1. **Secure pending-account activation** — `POST /onboarding/organisation-admin`
>    creates the organisation + Owner-Operator **without** issuing a JWT.
>    Confirmation is delivered through Resend (`RESEND_API_KEY`) as a
>    single-use, expiring link. Unverified accounts cannot obtain a dashboard
>    session via login (`emailVerificationRequired`). Existing unverified
>    accounts are forced through verification and onboarding — no silent
>    grandfathering.
> 2. **TOTP MFA + recovery codes** — enrollment/confirm/challenge endpoints;
>    encrypted secret storage; hashed one-time recovery codes; short-lived
>    pre-auth MFA challenge tokens. Privileged Owner-Operator configuration
>    (sites write, branding publish, compliance dashboard) requires verified
>    email **and** MFA at the API layer.
> 3. **Mandatory 13-step onboarding wizard** — `/onboarding/*` admin shell with
>    server-derived progress (`organisation_onboarding_states` + status log).
>    Dashboard bypass is blocked in `admin/src/proxy.ts` and API go-live gates.
> 4. **Dashboard access UX** — compliance reads are isolated from ordinary
>    dashboard loads; 403 messaging distinguishes verification / MFA / RBAC.
>    Admin `/` redirects to `/auth/login`.
> 5. **Migration `0013_secure_customer_onboarding.sql`** applied on Neon
>    `bold-cloud-47505421`. Env: `PUBLIC_ADMIN_BASE_URL`,
>    `EMAIL_VERIFICATION_PEPPER`, `MFA_CHALLENGE_PEPPER`,
>    `MFA_SECRET_ENCRYPTION_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
>    **Operator action:** set `RESEND_API_KEY` on Railway `api` before
>    expecting live confirmation email delivery (fail-closed until set).

> **What changed in v0.16:**
> 1. **Production deployed (2026-09-11)** — Vercel team **Buffr**:
>    `buffrcheckpoint-website` → `buffrcheckpoint.com` / `www`;
>    `buffrcheckpoint-admin` → `admin.buffrcheckpoint.com`. Railway project
>    **`buffrcheckpoint`** / service **`api`** → `api.buffrcheckpoint.com`
>    (CNAME `yc9j25fm.up.railway.app`; fallback `*.up.railway.app` hostname
>    `api-production-8295.up.railway.app`). Neon unchanged (`buffr-checkpoint`,
>    `bold-cloud-47505421`, `aws-us-west-2`).
> 2. **§11.7.8 updated** — placeholder DNS replaced with verified Namecheap
>    records; production env vars set on all three hosts; smoke-test commands
>    confirmed API `/health` → `200`.
> 3. **§11.7.7 emulator pass** — debug kiosk can use **`https://api.buffrcheckpoint.com/`**
>    on the Android emulator (public HTTPS; no `10.0.2.2` needed when testing
>    against production). Demo site UUID and creds unchanged.
> 4. **`backend/railway.toml`** — Nixpacks deploy config; `start:prod` fixed to
>    `node dist/src/main.js`. Legacy `admin/vercel.json` redirect removed.

> **What changed in v0.15:**
> 1. **§11.7.8 rewritten** — production hostnames now use the registered
>    **`buffrcheckpoint.com`** domain (not the v0.10 `buffrconnect.com`
>    placeholder tree). Canonical plan: apex/`www` → `website/`,
>    `admin.buffrcheckpoint.com` → `admin/`, `api.buffrcheckpoint.com` →
>    `backend/`.
> 2. **`.env.example` / `.env.local` templates** — all apps document local
>    dev (`localhost:3000/3001/3002`) and commented production
>    `buffrcheckpoint.com` values; backend adds `PUBLIC_ASSET_BASE_URL`,
>    `PUBLIC_WEB_BASE_URL`, `VISITOR_CHECKIN_BASE_URL`, `QR_TOKEN_PEPPER`.
> 3. **QR / public URL fallback** — `public-asset-url.ts` default check-in
>    base is `https://buffrcheckpoint.com` when env vars are unset.

> **What changed in v0.14:**
> 1. **Neon migrations applied** — `0011_host_notification_escalation_events.sql`
>    (escalation worker log) and `0012_pre_checkin_ack_and_visit_statuses.sql`
>    (`kiosk_privacy_pre_checkin_acknowledgements` + `pending_approval` /
>    `admitted` / `entry_rejected` visit statuses).
> 2. **Demo site experience seed** — `0009_demo_site_visitor_experience.sql`
>    publishes branding, kiosk config, QR reference, and escalation policy for
>    demo site `74c72c99-93dc-4b33-934b-9b365e9924cf` (out-of-box kiosk welcome).
> 3. **Host access decisions** — `POST /visits/:id/approve` and
>    `POST /visits/:id/reject` (`visit.access.approve` permission); escalation
>    worker applies `hold_entry` → `pending_approval` and
>    `auto_admit_low_risk` → `admitted`.
> 4. **Pre-check-in privacy ack** — `POST /visitor-policy/acknowledgements/pre-checkin`
>    records server-side consent before PII capture; kiosk calls it from
>    `PrivacyNoticeViewModel.accept()`.
> 5. **Kiosk polish** — `LogoDiskCache` (SHA-256 keyed disk cache for logos),
>    dedicated `UssdInstructionsScreen`, idle handler tracks scroll/drag via
>    pointer events (not tap-only).

> **What changed in v0.13:**
> 1. **Admin create/publish/rotate UI** — sheet forms on all Site Experience
>    pages (`setupBrandingAndPublish`, kiosk config, QR rotate, escalation
>    policy) via server actions + `router.refresh()`.
> 2. **Host-notification escalation worker** — `HostNotificationEscalationEvaluationService`
>    polls open visits every 60s; append-only
>    `host_notification_escalation_events` (migration `0011`); dispatches
>    `notify_*` actions through `NotificationsService.sendForOrganisation`.
> 3. **Kiosk deferred UX** — logo URL fetch + `RemoteLogoImage`, capability-gated
>    NFC/USSD tiles, language picker, accessibility panel + large-text theme,
>    full policy text from `GET /kiosk-experience/effective`, offline cache via
>    `ExperienceSyncWorker` (6h periodic), form reset on idle/navigation.
> 4. **Backend enrichments** — `GET /visitor-policy/versions/:id/content`,
>    effective response includes `logoUrl`, `privacyNoticeContent`,
>    `languageCodes`; `resolvePublicAssetUrl()` helper.

> **What changed in v0.12:**
> 1. **Section 11.9.8 fully wired (schema + API + admin + kiosk).** NestJS
>    modules: `site-branding`, `kiosk-experience` (incl. `GET
>    /kiosk-experience/effective`), `site-qr-references`, `host-notification-escalation`.
>    Visit check-in now snapshots `branding_profile_version_id` and
>    `kiosk_experience_configuration_version_id` when published config exists.
> 2. **Admin `Site Experience` nav group** — branding, kiosk config, site QR,
>    host escalation list pages under `/dashboard/site-experience/*` (RSC +
>    `api.get()` against new endpoints).
> 3. **Kiosk visitor surface** — welcome screen (replaces roster-as-home),
>    branding sync + dynamic accent colour, privacy notice gate before PII,
>    idle timeout with warning dialog, maintenance mode screen, staff roster
>    as secondary route, policy acknowledgement post check-in.
> 4. **Compliance reference paths** added to §11.9.11 for local PDFs (ETA
>    2019, Communications Act 2009, NamCode, King IV) used when drafting
>    privacy copy and evidence posture — canonical legal analysis remains in
>    Sections 13–15 and Appendix A.
> 5. **Kotlin reference materials** for kiosk work documented at
>    `buffrcheckpoint/.claude/kotlin-reference.pdf` and
>    `buffrcheckpoint/.claude/dokumen.pub_kotlin-for-android-developers-learn-kotlin-the-easy-way-while-developing-an-android-app.pdf`.

> **What changed in v0.11:**
> 1. **New Section 11.9 — Three-Surface Product Operating Model.** Supplied
>    by George and integrated additively (nothing in Sections 1–11.8 removed
>    or rewritten). States explicitly that the **kiosk is the visitor-facing
>    application**, not an isolated tablet app — it sits above Buffr
>    Checkpoint Core/API and below the organisation admin platform in a
>    connected three-surface architecture. Draws the operating-model parallel
>    to *Vizito Demo 2026: Easy & Secure Digital Visitor Management System*
>    (configurable visitor app + back-office platform) while keeping Buffr
>    Checkpoint's privacy, offline, feature-phone, NFC, audit, and RBA
>    differentiators from Sections 4–8 and 13. Covers: surface roles and
>    boundaries (including a separate internal Operations Console — not the
>    customer `admin/` app), organisation/site **branding hierarchy** (use
>    "organisation branding" / "site branding" in product UI, not "owner
>    branding"), branded arrival flows (walk-in, pre-registered, NFC,
>    feature-phone, assisted), admin configuration areas, full journey maps
>    (visitor/host/reception/site-manager/compliance/platform-support),
>    functional and non-functional requirement catalogues (FR-K*, FR-A*,
>    NFR-*), six explicit product gaps (site QR ownership, branding-version
>    control, kiosk session timeout, host-notification escalation,
>    maintenance mode, secure non-paper continuity kit), updated kiosk and
>    admin navigation models, recommended new-customer configuration
>    sequence, and final product statement. Cross-references existing
>    canonical sections rather than duplicating them — Section 8 for journey
>    detail, Section 9 for RBAC, Section 10 for wireframes, Section 11.4 for
>    schema, Section 11.7 for kiosk implementation status. Flags which 11.9
>    items are **built**, **partial**, or **not yet built** against the live
>    repo.
> 2. **Section 11.1** and **Section 11.7** each gain a one-line pointer to
>    §11.9 for the three-surface operating model.
> 3. **Section 11.9.8 schema landed (migration `0010`).** Drizzle schema +
>    SQL migration + seed `0008_site_visitor_experience_domains.sql` for
>    branding profiles/versions, kiosk experience config/versions (idle
>    timeout + maintenance mode fields), typed site QR references +
>    append-only rotation log, host-notification escalation policies/
>    versions, and `visitor_visits` snapshot FKs
>    (`branding_profile_version_id`,
>    `kiosk_experience_configuration_version_id`). Schema-only at v0.11;
>    **v0.12 wires API + admin + kiosk** (see v0.12 changelog).

> **What changed in v0.10:**
> 1. **New Section 11.7.8** — a concrete DNS/hosting runbook for deploying
>    Buffr Checkpoint to public hostnames. **v0.10 originally used a
>    `buffrconnect.com` subdomain tree** (shared registrar assumption);
>    **v0.15 corrects the canonical domain to `buffrcheckpoint.com`** — see
>    the live §11.7.8 text for current hostnames and env shapes.
> 2. **Kiosk onboarding UX (code, not re-specified here):** `LoginScreen`
>    regained a **Back** action to `KioskSetupScreen` (top bar +
>    `BackHandler`); setup prefills saved base URL/site ID; cold-start
>    routing now resumes at Login once site config exists but before JWT
>    sign-in (`hasSiteConfiguration()` vs full `isProvisioned()`). Debug
>    builds allow HTTP cleartext for local dev only
>    (`kiosk/app/src/debug/AndroidManifest.xml`); production kiosks must
>    use the HTTPS API hostname from §11.7.8.

> **What changed in v0.9:**
> 1. **RBAC gap fixed**: `regional_manager`, `compliance_audit_officer`, and
>    `system_administrator` lacked the `visit.roster.read_live` grant that
>    `GET /schedule` requires. The sidebar nav isn't permission-filtered, so
>    these roles saw Calendar and Schedule links that 403'd on click,
>    rendering as an access-denied error rather than an empty state. Fixed
>    in `backend/db/seed/0004_canonical_permissions.sql` and applied live
>    to the running database (Neon project `bold-cloud-47505421`). Roles
>    intentionally left unchanged: `host_staff` (scoped to own hosted
>    visitors only, by design) and `platform_support` (internal break-glass
>    role, never granted customer-data reads).
> 2. **Every admin list page now renders its real UI shell even with zero
>    records**, instead of swapping the whole page for a generic icon-box
>    placeholder. Calendar shows the actual month grid with no events on
>    it; Schedule, Sites & Zones, Devices, Device Compliance Register,
>    Credentials, Access Policies, Visitor Types & Forms, Retention
>    Policies, Evidence Packs, and Audit Log all show their real table
>    headers with an inline "nothing here yet" row in the body; Visitors,
>    Front Desk, Emergency Roster, and the dashboard home's On-site Roster
>    card show the real roster table (search, filters, pagination) with a
>    "No visits found" row. `DashboardEmptyState`/`renderListState`/
>    `renderRosterState` (the old swap-the-page helpers) were removed;
>    `DashboardErrorState` (a real 401/403/network failure) is unchanged
>    and still replaces the page when a fetch genuinely fails. New shared
>    `TableEmptyRow` component in `admin/src/components/dashboard-state.tsx`
>    standardizes the inline empty message across all the table-based
>    pages.

> **What changed in v0.8:**
> 1. **`kiosk/` is no longer unscaffolded.** Section 11.4.2's monorepo tree
>    and Section 11.7.5's checklist both previously stated `kiosk/` had
>    never been created — as of 2026-09-10 it's a real Gradle/Compose/Hilt
>    project with Phases 0-3 of the phased delivery order built and
>    verified. See the new **Section 11.7.6** for the full phase-by-phase
>    breakdown; this entry summarizes it.
> 2. **Two backend additions, both schema-adjacent and reviewed as their
>    own diff before any Kotlin was written**, following existing
>    Wiebe/Canonical Engineering Constitution conventions — no new tables,
>    no schema redesign:
>    - `POST /credentials/validate` — the NFC fast-lane endpoint that
>      never existed (issue/revoke were real, validate wasn't). Gated by a
>      new, narrower `credential.validate` permission, not the admin-only
>      `site.configure` issue/revoke uses.
>    - `POST /visitor-policy/acknowledgements` + `GET
>      /visitor-policy/versions` — a write path for the
>      `visitor_policy_acknowledgements` table, which existed and was
>      already append-only (Section 11.4.5c) but had no endpoint until now.
> 3. **The Android project itself**: project scaffold, an
>    `AuthAuthenticator` that works around the backend's real no-refresh-
>    token JWT design (re-logs in on 401 rather than assuming a refresh
>    flow that doesn't exist), and manual/assisted/QR check-in +
>    checkout + roster screens, all against the live backend contract —
>    not a mocked one. Kotlin domain enums were reconciled to the *real*
>    seeded `type_definition` values, correcting drift from an earlier
>    planning pass's assumptions (e.g. `VisitStatus` has 4 real values,
>    not the larger invented lifecycle Section 11.7.5 had been checklisted
>    against).
> 4. **Verified, not just written**: `gradle testDebugUnitTest` (4/4 pass)
>    and `gradle assembleDebug` (produces a real APK) were both run to
>    completion, which required installing the Android SDK cmdline-tools
>    locally and fixing several real bugs the build surfaced — a
>    fabricated dependency version, a Moshi annotation typo, a wrong
>    import, and an experimental Compose API used without opt-in.
> 5. **A real gap found and left open rather than worked around**:
>    `hosts.service.ts` returns encrypted host names with no
>    decrypted-list projection, so the manual check-in form uses a plain
>    host-ID field instead of a picker — a third backend addition this
>    pass didn't scope or get sign-off for. Phases 4-9 (offline sync, NFC
>    reader-mode, device provisioning UI, capability-status gating,
>    notification-pending UX, policy-acknowledgement UI) remain open;
>    Section 11.7.5's checklist is their release gate.

> **What changed in v0.7:**
> 1. **New Section 11.6.5**, supplied by the user and cleaned/structured
>    into the document: a full visual, image-placement, and product-
>    demonstration strategy covering system decisions, five asset types,
>    per-page placement strategy for Home/Platform/Pricing/About, the admin
>    app's 90%-data/10%-brand rule, kiosk visual strategy, photo/screenshot
>    governance, an image asset backlog, and sales-journey/design-psychology
>    reference tables. Explicitly supersedes any earlier navy/teal,
>    shadow-heavy mockup guidance.
> 2. **The section's own rules were checked against the live code, not just
>    written down.** Two real findings, both fixed:
>    - **~20 hard-coded `shadow-*` Tailwind utilities** across
>      `admin/src/components/ui/*` (popover, dropdown-menu, select, sheet,
>      menubar, context-menu, hover-card, combobox, navigation-menu, chart
>      tooltip, sidebar) and a few app-level spots (`unauthorized/page.tsx`,
>      the dashboard home metric cards, `website/`'s contact form, the
>      featured pricing-tier card) — removed, with `ring-1`/`border` kept
>      or added where the element needed a visible edge.
>    - **A real, previously-undetected rendering bug.** `buffr-checkpoint.css`
>      carried a blanket `[data-theme-preset="buffr-checkpoint"] * { box-shadow: none !important; }`
>      rule. Tailwind's `ring-*` utilities also compile to `box-shadow` — the
>      same property — so this blanket kill switch was silently erasing every
>      popover/dropdown/select/sheet/menu's `ring-1` border along with the
>      drop-shadows it was meant to suppress, leaving every one of them
>      genuinely edgeless. Verified with `getComputedStyle` before (`box-shadow:
>      none`) and after (a real composited ring shadow) the fix. Removed the
>      blanket rule now that every actual `shadow-*` utility is gone from the
>      source directly.
>    - `#FFE900` (never the approved Sodium Yellow) was checked and found
>      nowhere in the actual code — the one place it existed was a labeling
>      mistake in this document's own Section 11.7.2 kiosk token table
>      (fixed). Navy/teal and misapplied Lime Pulse: audited, clean, no
>      violations found.
> 3. **The `globals.css` gap above, closed the same pass.** Rewrote
>    `admin/src/app/globals.css` on the same clean, single-preset pattern
>    `website/globals.css` already used, this time carrying forward what
>    admin genuinely needs that website doesn't: `--color-sidebar*`
>    (`AppSidebar`), `--radius-4xl` (`badge.tsx`), and `.disable-transitions`
>    (`theme-utils.ts`, still referenced). Removed: the three orphaned
>    preset imports (`brutalist.css`/`soft-pop.css`/`tangerine.css` —
>    confirmed zero remaining references anywhere, then deleted the files
>    themselves too, not just the imports), the stock shadcn `:root`/`.dark`
>    oklch palette, the 17-font `html[data-font=...]` switcher, the
>    now-redundant `@layer utilities` shadow-reactivation block, and unused
>    print-export CSS (`[data-print-root]`/`[data-print-paper]` — grepped,
>    zero call sites). One thing this cleanup surfaced that the messy
>    version had been quietly hiding: `--font-heading` was hardcoded to
>    `var(--font-sans)` instead of passing through the preset's real
>    Archivo value, and `--font-mono` wasn't mapped into `@theme inline` at
>    all — so every `font-heading` title (Card/Dialog/Sheet/Drawer/
>    AlertDialog/Empty, the auth hero H1) had silently been rendering in
>    Geist instead of Archivo, and every `font-mono` use (audit-log hashes,
>    device serials, evidence references) had been rendering in Tailwind's
>    generic mono stack instead of Geist Mono, since this app was first
>    built. Fixed by letting both tokens pass through instead of being
>    short-circuited. Verified visually: the auth hero H1 now renders in
>    Archivo where it previously matched the body's Geist exactly. `chart-1..5`
>    (never defined by the brand preset, which predates this app having any
>    chart) got a real fallback instead of inheriting the stock grayscale
>    set — Sodium Yellow leads the primary series, the rest step through
>    the neutral ink scale, matching Section 11.5's "one chromatic color,
>    rationed" principle rather than a generic multi-hue chart palette.
> 4. **Section 11.6.5 documented a visual strategy; the Home page didn't
>    have any of the visuals it called for.** User feedback, addressed the
>    same pass:
>    - **Real product screenshots, not stock imagery.** Registered a
>      synthetic demo tenant, seeded it with real data through the actual
>      backend (3 checked-in visitors, 2 devices at different CRAN
>      compliance stages, one fully approved) via the real check-in and
>      device-provisioning endpoints, not hand-written SQL — the screenshots
>      show genuine app behavior. Captured Front Desk, Device Compliance
>      Register, and Compliance Dashboard, cropped, and placed in a new
>      "operational proof" section on the Home page
>      (`website/public/screenshots/`). Demo tenant deleted afterward —
>      Section 11.6.5.9's synthetic-data rule, satisfied without leaving
>      throwaway data live.
>    - **The paper-register comparison became a real designed illustration**
>      instead of two plain bullet lists — Section 11.6.5.3's own rule
>      ("a designed comparison, not a photo... or a plain list" is the
>      spirit of it): redacted-looking gray bars for the paper side, a
>      structured encrypted-record card for the Buffr Checkpoint side.
>    - **A new multi-channel strip** (NFC badge/QR/Kiosk/USSD/SMS/Assisted
>      entry, equal-sized icons converging on one record) — Section
>      11.6.5.3's "every visitor can check in" section, previously absent
>      as its own moment on the page.
>    - **Section rhythm**: alternating `bg-background`/`bg-card` across
>      the Home page's sections, plus a real Sodium-Yellow high-contrast
>      final CTA panel (Section 11.6.5.3's own spec) in place of the CTA
>      being buried inside the paper-register card. Addresses "sections
>      aren't clearly distinguishable" — previously every section shared
>      the same background with only a 1px hairline between them.
>    - **Every website page now renders the real `SiteHeader` component**
>      instead of its own duplicated inline `<header>` block — six pages
>      (`about`, `contact`, `pricing`, `platform`, `privacy`, `terms`) still
>      had the copy-pasted original header from before `site-header.tsx`
>      was built; only the home page had been wired to it. `SiteHeaderActivePath`
>      widened to accept `null` so Privacy/Terms (not primary nav items)
>      render the header with nothing falsely highlighted.
>    - **A real duplicated-title bug**, found while verifying the above:
>      `website/`'s root layout templates every page title as
>      `"%s | Buffr Checkpoint"`, but several pages' own titles already
>      ended in "Buffr Checkpoint" (from the em-dash cleanup two versions
>      back), producing tab titles like "Platform: Buffr Checkpoint | Buffr
>      Checkpoint." Every page title shortened to just its name, letting
>      the shared template supply the brand suffix once; the home page's
>      own title override removed entirely so it inherits the layout's
>      `default` un-templated, rather than templating against itself.
>      Verified live: "Platform | Buffr Checkpoint," not the doubled
>      version. `admin/`'s title had the same em-dash leftover (`app-config.ts`)
>      fixed too, though admin's layout doesn't template so it wasn't
>      duplicating — just inconsistent with the house style.
> 5. **New Section 11.7.5**: an offline-sync/NFC/device-security readiness
>    checklist for the kiosk Android app, carried over from a parallel
>    kiosk-implementation planning session so it lives in this document
>    (the source of truth) rather than only in that session's own
>    transcript. Covers queue-reconnect/force-kill durability, NFC
>    validate → check-in and revoked-badge rejection, capability-status-gated
>    NFC visibility, honest notification-failure display, read-only
>    on-device governance, SQLCipher-at-rest verification, and Keystore
>    documented as local-only attestation — plus the backend files that
>    contract is built against. `kiosk/` itself remains unscaffolded
>    (confirmed again this pass); this is the release gate for when that
>    work starts, not a claim the work has started.

> **What changed in v0.6:**
> 1. **White-on-white auth pages, fixed at the root cause.** The admin app's
>    `theme_mode` preference still defaulted to `"dark"` — a leftover from
>    before the v0.5 light-canvas rebrand. That default added a `.dark`
>    class to `<html>`, and because `globals.css`'s generic `.dark { ... }`
>    block sits later in source order than the Buffr Checkpoint preset at
>    equal CSS specificity, it silently won the cascade and reverted the
>    *entire app* — not just auth — to stock shadcn dark colors, against a
>    `<body>` that had never been given an explicit `bg-background`/
>    `text-foreground` class. Near-white dark-mode text over an unstyled
>    (browser-default white) body is what "white on white" actually was.
>    Fixed three ways: `theme_mode` now defaults to `"light"`
>    (`admin/src/lib/preferences/preferences-config.ts`); `<body>` now
>    carries explicit `bg-background text-foreground`
>    (`admin/src/app/layout.tsx`); and `buffr-checkpoint.css` now also pins
>    every semantic token under `.dark[data-theme-preset="buffr-checkpoint"]`
>    at higher specificity than the generic `.dark` block, so toggling the
>    theme switcher can never reintroduce this regression again, in either
>    app. Also added missing `Mail`/`Lock`/`Building2` field icons and a
>    brand mark to both `auth/login` and `auth/register` (the "no icons"
>    half of the report was a real content gap, not a CSS bug).
> 2. **The `icon.png`/`logo.png` asset pair was swapped app-wide.** The file
>    literally named `icon.png` (referenced by every `/icon.png` call site —
>    the site header, both auth pages, every dashboard page, and the
>    Next.js favicon route in both `admin/` and `website/`) held the full
>    "buffr checkpoint" wordmark; `logo.png` held the square app-icon mark.
>    Every small (24–48px) icon usage was rendering a squashed, illegible
>    wordmark. Corrected by processing the real square icon asset the user
>    supplied (removing its solid-black canvas — flood-fill background
>    detection + connected-component cleanup, not a naive color-key, to
>    avoid a dark speckle halo at the edges) into a proper transparent
>    PNG, and placing it at `icon.png` in both apps' `public/` and
>    `src/app/` (the Next.js file-based favicon slot), with the wordmark
>    moved to `logo.png`. `website/public/` did not exist at all before
>    this fix — every website page's `/icon.png` reference had been 404ing.
> 3. **`organisation_sector` was an unnecessarily exclusive closed list.**
>    Registration only offered 5 sectors (bank/government/healthcare/
>    critical-infrastructure/SME) — the original regulated first-mover
>    verticals, not a real ceiling. Expanded to 20 sectors plus an explicit
>    "Other" catch-all (`backend/db/seed/0005_organisation_sector_expansion.sql`,
>    applied live) — config over code (Wiebe rule 1): a still-missing sector
>    is a future seed INSERT, not a schema change.
> 4. **`/dashboard/calendar` rebuilt from scratch, for real.** Reverses the
>    v0.5 deletion documented (and now corrected) in §11.4.2. Built against
>    `@fullcalendar/react` v7.1.0's actual API, which is a complete
>    architecture rewrite from v6 with two undocumented-in-training-data
>    breaking changes discovered by reading the installed package directly:
>    (a) the standard view packages moved from separate npm packages
>    (`@fullcalendar/daygrid`, stalled at `7.0.0-rc.0`, never published
>    stable) to `@fullcalendar/react/*` sub-path exports
>    (`/daygrid`, `/timegrid`, `/list`, `/interaction`) that must still be
>    passed through a `plugins` array or the calendar throws
>    `viewType "dayGridMonth" is not available` at runtime despite
>    compiling cleanly; (b) theming replaced v6's semantic `.fc-button`/
>    `.fc-daygrid-day`-style class names with hashed atomic classes not
>    meant to be targeted directly — a theme (`@fullcalendar/react/themes/classic`)
>    is itself a plugin that must be registered before its CSS custom
>    properties (`--fc-classic-*`) have any effect, which are then the
>    real, documented theming surface, re-pinned here to the Buffr
>    Checkpoint tokens. `/dashboard/calendar` renders the same
>    `GET /schedule?siteId=&from=&to=` data `/dashboard/schedule`'s plain
>    table already used — two real views over one dataset, not a
>    demo/duplicate pair — and is now linked in the sidebar (previously it
>    never was, even before the v0.5 deletion). Fixed one real bug found
>    during this rebuild's own smoke test: `InvitationsService.listUpcoming()`
>    was returning each invitation's `statusCode` as the raw
>    `type_definition` UUID rather than resolving it to the human code
>    (e.g. `"pending"`), so both the calendar's event-detail sheet and the
>    schedule table were one bind away from showing a bare UUID as a status
>    badge — fixed with the same batch-resolve-by-id pattern
>    `visits.service.ts`'s `listRoster()` already used.
> 5. **Two of the four remaining release-gate TODOs closed** (Section
>    "Required Coding Rule for This Project"'s grep now returns one hit,
>    down from four — the remaining one genuinely needs S3-compatible
>    object-storage credentials this environment doesn't have, and is
>    correctly left as an honest TODO rather than faked):
>    - **Section 8.8 host notification, wired for real.** `VisitsService.checkIn()`
>      previously had a TODO in place of dispatching a host notification.
>      It now decrypts the host's protected contact envelope and calls the
>      already-correctly-built `NotificationsService.send()` — which itself
>      was already real (a genuine outbox row, tenant-scoped, honest
>      failure) but nothing ever called it from the check-in path. No email
>      provider is configured (Section 11.8.4), so delivery honestly fails
>      and is recorded as `failed`, never faked as `sent` — but the
>      dispatch, the audit-worthy outbox row, and the host-contact decrypt
>      are real. A missing provider never fails the check-in itself.
>    - **Password-reset email, wired the same way.** `AuthService.requestPasswordReset()`
>      generated a reset token and then discarded it with a TODO instead of
>      sending it anywhere. Now dispatches through the same
>      `NotificationsService.send()` outbox — the raw token is still never
>      returned to this method's own caller (unchanged safety property),
>      only ever passed to the notification channel.
>    - **Section 11.8.1's audit-log pagination gap, closed.** `AuditService.listForOrganisation()`
>      returned a fixed most-recent-200 with a TODO for real pagination.
>      Now takes `from`/`to`/`limit`/`cursor` and does real keyset
>      pagination over `(occurredAt, id)` — not `OFFSET`, which would
>      skip/duplicate rows on this append-only, constantly-growing table —
>      returning `{ events, nextCursor }`. `GET /audit/events` exposes the
>      same params; the admin app's Audit Log page got a "Load more" client
>      component backed by a server action, replacing the old bare-array
>      response its page component expected. Verified end-to-end against
>      the live backend with `limit=1`: the second page's cursor fetch
>      returned a distinct row, not a repeat.
> 6. **Auth pages got a hero panel and footer — previously just a bare
>    centered card.** A shared `AuthLayout` component (`admin/src/app/(main)/auth/_components/auth-layout.tsx`)
>    now wraps both `auth/login` and `auth/register`: a left brand panel
>    (icon, "Built in Namibia. Built for Africa's Compliance Future.",
>    a short capability list, hidden below `lg` so the form stays the
>    primary focus on narrow viewports) and a footer with a "Back to
>    buffrcheckpoint.com" link plus Privacy Policy/Terms & Conditions links
>    into `website/`. Since `website/` is a separate deployed app (Section
>    11.6.1), these links resolve through a new `NEXT_PUBLIC_WEBSITE_URL`
>    env var (`admin/.env.example`), not a relative path.
> 7. **Generic template branding removed app-wide.** `admin/src/config/app-config.ts`
>    — read by the root `<title>`/meta description and, until this fix, by
>    nothing else that displayed it visibly — still held the installed
>    template's own identity verbatim: name `"Studio Admin"`, title `"Studio
>    Admin - Modern Next.js Dashboard Starter Template"`, and a meta
>    description describing the open-source starter kit itself. Every
>    browser tab and every page's `<title>` was silently the template's,
>    not Buffr Checkpoint's — renamed to the real product identity. Separately,
>    the dashboard sidebar header was rendering a generic lucide `Command`
>    icon next to the app name instead of the brand mark — swapped for the
>    real `/icon.png`. Also regenerated `favicon.ico` in both `admin/` and
>    `website/`, which had been carrying the icon's pre-v0.5 dark-canvas
>    version (the "U" mark, correctly — never the wordmark — but on a stale
>    dark tile that didn't match the corrected light asset shipped
>    everywhere else since v0.5).
> 8. **Icon placement on auth pages corrected**: the icon belongs centered
>    on the card itself (sign in, create account, and any future page like
>    forgot-password that reuses this pattern), not in the side hero panel
>    — the hero panel is messaging/positioning, the card is the product's
>    mark. Extracted a shared `AuthCardHeader` component
>    (`admin/src/app/(main)/auth/_components/auth-layout.tsx`) so this is
>    one decision instead of one per page, and removed the icon from the
>    hero panel (now a plain "Buffr Checkpoint" wordmark-style label).
> 9. **Humanizer pass over all frontend copy.** Every headline, subhead,
>    body paragraph, and list item across `website/`'s 7 pages plus 404,
>    and every page/empty-state/error-state string in `admin/` (auth pages,
>    every dashboard list page's empty-state description, the 403 error
>    message, the unverified-email banner), rewritten to a plain, direct,
>    human voice: no em dashes (the most common violation, found in around
>    25 places total, mostly marketing-copy asides and empty-state
>    descriptions that read naturally as a second sentence or a
>    parenthetical instead), active voice over passive ("Buffr Checkpoint
>    applies risk-based identity assurance" vs. "is applied"), and the
>    brand tagline shortened from "Built in Namibia. Built for Africa's
>    Compliance Future." to **"Built for Africa's Compliance."** everywhere
>    (9 occurrences: 7 page footers, the Home/About hero headlines, and the
>    admin auth hero panel). Full page-by-page copy map in §11.6.4a. Legal
>    pages (Privacy, Terms) were touched only at the title and one list
>    separator style; legal body prose is deliberately left as precise,
>    unembellished contract language, not "humanized" for tone, since
>    accuracy outranks voice on those two pages specifically. A handful of
>    "—" hits intentionally left as-is: table-cell placeholder dashes for
>    empty values (e.g. `fileReference ?? "—"`) and "V0 — Self-declared"
>    style label:value display pairs are UI conventions, not sentence
>    connectors, and aren't what the rule targets. Verified: both apps
>    build and typecheck clean; a full-repo grep for em dashes in rendered
>    JSX text (excluding code comments and the two conventions above)
>    returns zero remaining hits outside the two legal pages' unchanged
>    body prose.
> 10. **Wordmark asset background removed.** The wordmark PNG
>     (`9DEA346D-58CE-41C9-B4AC-F40124941AFF.PNG`) shipped with a solid
>     white background, which would show as a white box against any
>     non-white surface. Cut to transparent the same way the app-icon mark
>     was in point 2 above (distance-from-white alpha ramp rather than a
>     hard color-key, so the "b"/"e" letterform counters also open up
>     cleanly instead of staying solid white) and re-saved to `logo.png` in
>     both apps' `public/` and `src/app/`. Checked composited over both a
>     mid-tone and a dark background: no white fringe at the letterform
>     edges. The black "buffr" text is illegible on a dark ground, which is
>     expected of a black-ink mark, not a defect in the cutout — this asset
>     is still not wired into any page (confirmed via a repo-wide grep for
>     `logo.png`); it exists as a clean, ready asset for whenever a
>     full-wordmark placement (as opposed to the square icon) is needed.

**Version 0.5 — Visual design system corrected: admin/website flipped from dark to light canvas to match the real brand assets**

This document is self-contained and grounded in the resources referenced in the Sources sections throughout. It supersedes all earlier drafts and consolidates the business plan, the product architecture, the regulatory and CRAN addendum, the multi-modal and NFC-first revisions, the inclusion correction driven by Namibian device-ownership data, the National e-ID smart card distinction, and the Vizito competitive gap assessment into a single reference.

> **Important correction:** DigiNam being live does **not** mean Buffr Checkpoint can market itself as “DigiNam-integrated” until it has an approved relying-party/verifier arrangement, a working technical interface, successful interoperability testing, and the appropriate privacy and contractual documentation.  
>
> Likewise, Buffr Checkpoint may be **designed to support PSD-12-aligned controls**, but it should not claim PSD-12 compliance unless it is itself within the National Payment System scope and has been formally assessed against the determination.

> **What changed in v0.4:** an external hardening-pass review checked this
> blueprint against the actual built code (`backend/`, `website/`) and found
> most of v0.3's own corrections had already been implemented faithfully —
> the public site already renders DigiNam/e-ID status dynamically from a
> governed register, already avoids every overclaim v0.3 warned against, and
> the hosting-region contradiction was already flagged in this document's
> own Risk Register. Four things genuinely needed fixing, applied in this
> revision:
> 1. **§1a.3's Home/Pricing bullets were stale** — they described the *old*,
>    wrong hero-badge/tag behavior ("DigiNam Verified," "Live now") that the
>    website team had already corrected in code. Rewritten below to describe
>    what the site actually, correctly does.
> 2. **A schema gap between this document and itself** — §4a.7's own kiosk
>    frontend requirement references an `organisation_capability_enablement`
>    table that was never designed. Added below as a proposal awaiting
>    sign-off (§11.4.5), not yet applied to a migration.
> 3. **Several schema/process gaps the letter correctly identified** —
>    dynamic form/workflow configuration, PII encryption for `visitor.name`/
>    `host.contact_reference`, immutable retention-policy versioning, a
>    `legal_basis_code` distinction between notice and consent, and an
>    `idempotency_key` for offline sync — added as dated proposals in
>    §11.4.5, awaiting the same human/Fable sign-off this document already
>    requires for core schema changes (§11.4.5's own STATUS note).
> 4. **Enforcement gaps, not schema gaps** — the audit-hash chain existed but
>    wasn't backed by database-level append-only grants; the CRAN device
>    lifecycle was described in prose (§14, Addendum §8.1) but had no seeded
>    status values or an enforced deployability gate; and unverified users
>    were correctly allowed to log in but nothing stopped them from taking
>    privileged actions. These don't require new schema — added as concrete,
>    implementable-now items in §9.2 and §14/Addendum §8.

> **What changed in v0.5:** Section 11.5 specified, and `admin/`/`website/`
> built, a dark near-black canvas ("Adnaut dark theme") for the shared design
> system. Checking that build against the actual brand asset files at the
> workspace root (the wordmark PNG and the app-icon PNG) found the real
> marks are the opposite polarity — black type/marks and a single gold
> accent on a white or near-white ground, not a dark canvas with light type.
> The dark theme clashed with the real logo instead of complementing it.
> Corrected in this revision:
> 1. **Section 11.5's color-token table flipped to a light canvas** — the
>    Sodium Yellow accent (`#e2a603`) was already correctly sampled from the
>    logo and is unchanged; every other token was re-derived for a light
>    ground (full before/after table in 11.5, right after the section
>    intro).
> 2. **Primary/accent button text flipped from white to near-black** — white
>    text on the Sodium Yellow fill measures ~2.2:1 contrast (fails WCAG AA);
>    near-black measures ~9.7:1 and matches the wordmark's own
>    black-on-gold "checkpoint" lockup.
> 3. **`--color-status-live` darkened from `#22c55e` to `#15803d`** — the
>    original value was already below AA contrast on white/near-white text
>    backgrounds; the darker green clears 4.5:1.
> 4. **Section 11.6.2 and 11.7.1 updated** to stop describing the public
>    website and the admin/website-vs-kiosk contrast in terms of a dark
>    canvas that no longer exists. Section 11.7 (kiosk) itself — already a
>    deliberately separate, light, high-contrast token set for
>    accessibility reasons — was not touched; it was never the source of
>    this mismatch.
> `admin/` and `website/` both build cleanly (`npm run build`) with the
> corrected tokens; no component was found hardcoding a color that assumed
> the old dark canvas.

---

## 1. Executive Thesis

A paper visitor register is an everyday privacy and governance failure.

It exposes personal information — names, phone numbers, identification numbers, employers, hosts, vehicle registrations, and visit purposes — to every person who signs the page afterwards. It creates no reliable access history, cannot enforce retention, cannot support a data-subject request, and cannot demonstrate who viewed or removed information.

**Buffr Checkpoint** is an independent, Namibia-built digital visitor and access-management platform that replaces shared paper registers with:

- isolated visitor records;
- risk-based identity and access controls;
- NFC, QR, DigiNam, USSD, SMS, kiosk, and assisted check-in channels;
- offline-first operation for low-connectivity sites;
- role-based access control;
- encrypted records, retention automation, and audit evidence;
- a clear integration path to access-control, identity, notification, emergency-management systems, and — **where applicable** — existing operational systems of record (first beachhead adapter: CiMSO INNterchange; further PMS/HR/access adapters in series, not a single vertical).

The product is **sector-agnostic**: any organisation that today runs a paper visitor register (or needs governed presence) is in scope. GTM may sequence regulated beachheads first (§15.1); packaging and schema do not hard-code a hospitality-only or tourism-only product.

Whether a visitor carries a smartphone, a feature phone, or no phone at all, Buffr Checkpoint has a channel that fits. Inclusion is a design requirement; every section below is written to keep it true.

---

# 1a. Brand and Standalone Positioning

## 1a.1 Buffr Checkpoint is an independent company and product

Buffr Checkpoint is the approved product name, and it is retained. What changes, effective with this version of the blueprint, is that Buffr Checkpoint carries **no parent-brand linkage of any kind**. There is no "By Buffr" badge, no "A Buffr Product" footer tagline, and no copy anywhere in the product, the website, the pitch materials, or the contracts that references a separate Buffr payments application, a Buffr-branded fintech product, or any other company sharing a similar name. Buffr Checkpoint reads, in every surface a customer or regulator can see, as its own company: its own founding story, its own team credibility, its own identity, and its own commercial terms.

This is a deliberate correction, not a cosmetic one. A visitor-management and access-control platform sold into banks, government offices, and healthcare facilities needs a single, uncomplicated answer to "who is behind this product and what else do they do." Any implied association with a separate payments product invites exactly the kind of question a regulated buyer's procurement or compliance team will stop the deal to resolve. Keeping Buffr Checkpoint standalone removes that friction entirely, and it also protects the separate brand from being drawn into Buffr Checkpoint's own regulatory and security posture, and vice versa. The two products should never be compared, cross-referenced, or bundled in customer-facing language.

The practical consequence is that every reference elsewhere in this document to "Buffr Checkpoint," "the company," or "the platform" should be read as describing a standalone entity with its own registration, its own trademark clearance (see Section 21 and the Risk Register in Section 19), and its own go-to-market motion. Where earlier drafts of this blueprint referred to Buffr Checkpoint's relationship to a Buffr payments ecosystem, that language has been removed throughout.

## 1a.2 About-page narrative

The About page is rebuilt around a Namibia-first founding narrative with no reference to any other company: **"Built in Namibia. Built for Africa's Compliance Future."** The narrative should establish the founding team's credibility on its own terms — direct experience with the paper-register failure described in Section 2, direct exposure to Namibia's regulatory environment (Section 3), and direct familiarity with the inclusion problem described in Section 4 and Section 4a — without borrowing credibility from, or creating confusion with, any other branded product.

## 1a.3 Public website surfaces

The public website is rebuilt as a standalone site — **Home, Platform, Pricing, About, Contact, Privacy Policy, Terms & Conditions, and a custom 404** (eight marketing pages/states, up from the original five: Privacy Policy, Terms & Conditions, and a branded 404 were gaps, closed here and detailed further in Section 11.8.8). **v0.18** adds a ninth operational surface, **`/check-in`**, which is **not** part of the marketing sitemap (noindex) but is the live destination for admin-issued public site QR codes (Site Experience → Site QR Codes; Section 11.7.8.1 / 11.9.8.1) — Core CAPEX-reduction path, tablet optional. Each marketing page is scrubbed of parent-brand badges, footer taglines, and testimonial or comparison language that references a separate payments product. The pages carry the following standing content requirements, which this blueprint treats as binding until superseded by a future version:

- **Home** *(corrected in v0.4 — this bullet previously specified a static "DigiNam Verified" badge and a "Live now" tag asserted as present-tense fact; both were wrong and were never actually built that way)*. *(v2026-09-29: capability badges are removed from all marketing hero sections; they appear on `/status` and in the Platform Architecture section only. The rules below still govern those placements.)* The badge is a `CapabilityStatusBadge` (`website/src/components/capability-status-badge.tsx`) for `diginam_verification`, fetched live from the backend's public `GET /public/capability-status` endpoint (5-minute revalidation, degrades to "Not live" on any fetch failure — never assumes "live"). It shows one of three states — Not live / Targeted / Live — and only ever reads "Live" once `capability_status.status_code` for that capability is actually `live` in the database, which requires a role-gated, evidence-backed write per Section 4a.7. No step in the "How It Works" sequence may carry a "Live now" tag as fixed copy; any such tag must likewise read from the live register. Exactly **one** primary call to action above the fold (Section 11.8.9) — **Create account** → `https://admin.buffrcheckpoint.com/auth/register` (signup-first GTM). Secondary link **See pricing** → `/pricing` (v2026-09-29, replaces the retired **Need a review?** link); it must not compete as a second primary CTA.
- **Platform** *(corrected in v0.4 — this bullet previously referenced a `platform_capability_status.public_display_status` field that was never implemented; the actual table and column names below match `backend/src/db/schema/capability-status.ts`)*. The architecture explanation renders the identity-verification layer's status live via the same `CapabilityStatusBadge` component, reading `capability_status.status_code` (resolved through `type_definition`) for `diginam_verification` and `national_eid_nfc` independently — never a hardcoded date string, and never a status value baked into page copy. This must never say DigiNam/NPKI itself shows "live" as a stand-in for Buffr Checkpoint's own integration — Namibia's DigiNam/NPKI national ecosystem being operational is a separate fact from Buffr Checkpoint's own adapter approval status, and only the latter is what this badge renders (built to support DigiNam/NPKI verification "where formally enabled" — see Section 4a.7's public-copy correction). National e-ID NFC smart-card verification shows whatever `capability_status` currently holds for `national_eid_nfc` (`targeted` by default as of this revision, since the Ministry of Home Affairs' target month has arrived but no confirmation/evidence row exists yet — see Section 4a.7). The Platform page carries the full Role-Based Access Control table from Section 9. Marketing intro copy is buyer-facing and derived from §9 (not a verbatim paste of rule language). The Platform FAQ accordion covers DigiNam status, National e-ID NFC status, offline operation, API/data-layer access control, the fixed role catalogue, Form AI (admin suggest/translate, never auto-publish), and public check-in languages (picker en/af/pt).
- **Pricing** *(corrected in v0.4 — DigiNam live claims; QR-first packaging aligned with Section 15 / 16)*. **Core** story is print public site QR + phone web check-in + assisted front desk — **tablet purchase is not required**. DigiNam verification appears on **Verify** (and where adapter status is `live` for the customer's organisation) via `CapabilityStatusBadge`, not page-specific copy claiming permanent availability. National e-ID NFC compatibility appears on Verify / Enterprise-regulated packaging, badge-driven by the same register. NFC phone-tap and NFC badge-tap are **Professional entitlements / optional fast lanes** (capability-gated where the register applies), not Core defaults. USSD and SMS must not appear as Core "included today" features while §11.9.0a lists those adapters as NOT STARTED — show them as optional / Professional when live.
- **About.** Carries the founding narrative described in Section 1a.2, with no reference to any other company or product.
- **Contact.** Standard contact and sales-inquiry page; no parent-brand references. Form is validated and spam-protected per Section 11.8.9.
- **Visitor check-in** *(v0.18 — operational, not marketing)*. `website/src/app/check-in/` opens from the kiosk QR payload `https://buffrcheckpoint.com/check-in?site={siteId}&ref={referenceId}`. Loads context from `GET /public/check-in/context`, submits via `POST /public/check-in`. Collects name, required phone, company, visitor type, host, purpose, optional email / ID / vehicle, and a required privacy acknowledgement. Extra profile fields are stored inside the encrypted `visitor_personal_data` payload (not plaintext columns). Context and success responses include published site branding (org/site display names, welcome message, accent colour, logo URL, help contact, `brandingScope`) so the phone journey matches kiosk personalisation. **Branding visibility:** when published branding exists the organisation owns hero, logo, and footer; Buffr Checkpoint appears only as a quiet “Secured by Buffr Checkpoint” footer line (or as full chrome when no branding is published). Host notification message includes visitor name, type, company, purpose, and contact. Must never appear in `sitemap.ts`; metadata sets `robots: { index: false }`. Missing/expired `site`+`ref` must fail closed with a clear “ask reception for a fresh QR” message — never invent a site.
- **Privacy Policy** *(new)*. States what Section 3's "practical legal position" already commits to: data minimisation, retention per Section 11.3, the controller/processor split (client is controller, Buffr Checkpoint is processor — Section 21 decision 5), DSAR contact route (Section 8.9), subprocessor list (SMS/USSD aggregator, hosting — Section 13.1), and cookie use (Section 11.8.6). This page is the public expression of the DPA the product already promises operationally — it must not claim anything the schema and controls in Section 11.4.5 don't actually implement.
- **Terms & Conditions** *(new)*. Standard SaaS terms, scoped to Section 21's "customer role model" decision and Section 15's packaging tiers; reviewed by counsel before publication (ties to the trademark/brand clearance gate in Section 21 decision 1 — both are pre-launch legal gates, not engineering tasks).
- **Custom 404** *(new)*. Branded per Section 11.5/11.6's design tokens, not the framework default; a search box or link back to Home, never a dead end.

The full ten-journey user-flow breakdown in Section 8 and the RBAC model in Section 9 are the canonical, full-detail versions of the material that appears in condensed form on the live Platform page. The Platform page's condensed version should always be checked against Section 8 and Section 9 of this document before publication, since this document is the source of truth and the website is a derived summary of it.

---

# 2. The Problem and the Opportunity

## 2.1 The current-state failure

| Current paper process | Consequence |
|---|---|
| Visitors write in a shared book | The next visitor can read prior visitors’ personal information. |
| Handwritten data | Data is incomplete, inaccurate, difficult to search, and difficult to report on. |
| Paper is stored in drawers or security booths | No meaningful retention control, retrieval standard, or physical access log. |
| A page is lost, photographed, copied, or damaged | No reliable forensic trail or recovery process. |
| Sign-in is disconnected from host approval | Reception may not know whether a visit was expected or permitted. |
| Physical access is separated from data protection | The organisation treats the register as administration, rather than a live information-security control. |
| Rural/offline sites fall back to paper | Connectivity limitations create a false choice between operational continuity and privacy. |

The opportunity is not merely a “visitor app.”

It is a **digital trust, privacy, operational-resilience, and evidence platform** at the physical edge of an organisation.

## 2.2 The customer outcome

Buffr Checkpoint should promise four outcomes:

1. **Protect**  
   No visitor sees another visitor’s details.

2. **Verify proportionately**  
   The level of identity assurance matches the risk of the site, visit, and zone.

3. **Operate anywhere**  
   Check-in continues through outages and low-bandwidth conditions.

4. **Prove control effectiveness**  
   The organisation can evidence access, retention, user permissions, exceptions, and control performance to management, auditors, customers, and regulators.

---

# 3. Regulatory and Governance Position

## 3.1 What applies directly vs. what informs the design

| Framework | Relevance to Buffr Checkpoint | Product implication |
|---|---|---|
| **Electronic Transactions Act 4 of 2019** | Most provisions from **16 March 2020** (GN 75/2020); **section 20 and Chapter 5 from 15 June 2026** (GN 182/2026, GG 8949). **Chapter 4 still deferred.** Signature and accreditation regulations in force with s20/Ch5. See Regulatory Addendum §5. | Maintain record integrity and computer-evidence reliability (s24–25); default kiosk capture to **VisitorPolicyAcknowledgement** — a **recognised electronic signature** requires an advanced signature with an accredited **certification service provider** subscriber certificate (Signature Regulations reg 8), which kiosk tap-and-draw does not provide by default. |
| **Namibia Data Protection Bill** | Not yet a fully operational comprehensive regime according to the supplied regulatory reference, but it is the expected privacy direction. | Build privacy by design now: minimisation, purpose limitation, retention, access control, deletion workflow, and processor contracts. |
| **POPIA** | South African law, not a blanket Namibian obligation. It is a strong regional design benchmark, especially for cross-border customers or South African group operations. | Use POPIA-style safeguards, but do not claim POPIA compliance without a legal assessment. |
| **PSD-12** | Directly applies to persons within the National Payment System, including relevant FMIs, PSPs, retail payment systems, authorised entities, and FinTech-framework participants. | For banks, PSPs, and payment clients, support their supplier-risk, data-security, resilience, audit, and incident-management obligations. |
| **NPS Vision & Strategy 2030** | Strategic rather than a visitor-management regulation. It emphasizes user-centricity, trust/resilience, digital enablement, DPI, and innovation. | Position Buffr Checkpoint as a privacy-preserving, inclusive, DPI-compatible service — not as a payment-system product. |
| **DigiNam / NPKI** | National trust infrastructure is live. Distinct from, and never to be conflated with, the physical National e-ID smart card, which is a separate Ministry of Home Affairs project targeted for September 2026 — see Section 4a. | Build a verifier/relying-party adapter; only activate and market verified identity after formal integration and test evidence. |
| **NamCode** | Governance benchmark for Namibian entities. | Board oversight, risk governance, IT governance, compliance, internal audit, stakeholder trust, and integrated reporting all support the business case. |
| **ISO 55001 / ISO 55002** | ISO 55001 defines asset-management system requirements; ISO 55002 provides implementation guidance. | Manage kiosks, tablets, NFC readers, badges, devices, cryptographic keys, software, contracts, and information as lifecycle-managed assets. |
| **NIST CSF 2.0 / SP 1308** | Practical risk-management and workforce alignment framework. | Use Profiles, risk registers, role clarity, action plans, and continuous improvement to govern the platform. |

### Practical legal position

Buffr Checkpoint should **not** say:

- “We make you compliant.”
- “PSD-12 compliant.”
- “DigiNam verified” unless the verification transaction has actually occurred.
- “Legally binding e-signatures” unless the relevant statutory and accreditation conditions are confirmed.
- “Data hosted in Namibia” unless production data, backups, logs, support tooling, and subprocessors are all assessed against that statement.

It should say:

> “Buffr Checkpoint is designed to support privacy, cybersecurity, retention, evidence, and operational-resilience controls. Each client remains responsible for its own legal obligations and configuration decisions.”

---

# 4. The Strategic Choice: QR-First Default, Inclusion-Honest, NFC Optional

## 4.1 Why NFC matters

NFC has genuine strategic value:

- fast tap-based check-in;
- no camera or line-of-sight requirement;
- reusable visitor, contractor, staff, and event credentials;
- strong fit for controlled reception points, gates, turnstiles, warehouses, and regulated offices;
- support for future contactless government e-ID credentials, subject to official interoperability arrangements;
- potential integration with physical access-control systems.

But NFC must never become the only access path.

## 4.2 Why feature-phone inclusion is non-negotiable

Feature phones remain significant in Namibia and across Africa, particularly outside urban centres. A product that assumes every visitor has a smartphone, NFC capability, mobile data, or digital identity will exclude people at the exact institutions that most need a secure check-in process: public offices, clinics, banks, and rural service points.

The device-ownership data available to this blueprint makes the exclusion risk concrete rather than theoretical. Only **28.5% of Namibians own a smartphone**. In rural areas, the pattern inverts what an urban-built product would assume: **rural feature-phone ownership, at 25.4%, actually exceeds rural smartphone ownership, at 15.1%**. In other words, a strategy that treats NFC or QR as the *only* channel — either of which requires a smartphone — without assisted front desk (and eventually SMS/USSD) would silently exclude roughly seven in ten Namibians nationally, and would exclude the *majority* device type in rural areas specifically, which is exactly where many of the regulated sites this product targets actually operate: bank branches, clinics, and government offices outside the main urban centres.

This is not a peripheral inclusion concern layered on top of the product; it is a direct constraint on the architecture. Buffr Checkpoint cannot be designed with NFC or QR as the default assumption and feature-phone channels as an afterthought, because doing so would fail the majority of the population the regulated buyers in Section 15.1 actually serve, and it would cut directly against the inclusion language the brand already carries in its public positioning. NFC remains a genuine, valuable differentiator — see Section 4a and Section 12 — but it is layered on top of a foundation that has to work for every visitor regardless of device, not the other way around.

**Design principle:**

> Every visitor can check in.  
> The channel changes; the data-protection standard does not.

**Corrected strategic framing:** Buffr Checkpoint is **channel-agnostic by design**: **QR-first default self-service** (admin public site QR + phone web), **assisted front desk for inclusion**, and **NFC as an optional premium fast lane** — not "NFC-first" and not "tablet-required" as company-wide strategy. NFC and the National e-ID smart card opportunity (Section 4a) remain genuine differentiators for high-traffic regulated sites when enabled. USSD and SMS (Section 6) are inclusion-critical market-access **add-ons** — sell and market as live only when §11.9.0a / the capability register say so; until then assisted front desk carries the no-smartphone path. Neither NFC nor USSD/SMS is presented as the sole strategy.

---

# 4a. The NFC Opportunity: DigiNam/NPKI Today vs. the National e-ID Smart Card in 2026

## 4a.1 Two separate facts that must never be conflated

Two facts about Namibia's identity infrastructure look related but are legally and technically distinct, and conflating them would be a credibility risk this blueprint treats as a standing hazard rather than a one-time drafting error:

1. **DigiNam / National PKI** is Namibia's national digital-trust infrastructure — certificate-based, with CRAN operating as the Root Certification Authority per Section 3.1, Section 4, and Regulatory Addendum §6.0 of this blueprint. CRAN's July 2026 roadmap marks Policy & Governance, Legislation & Regulation, Root CA & Trust Infrastructure, Adoption & Integration, and Go Live as **completed** at the **national programme** level. Buffr Checkpoint may describe that national direction factually; it may only describe its **own** relying-party integration as live once an approved arrangement, working interface, interoperability testing, and privacy/contractual documentation are in place (§4a.7 register).

2. **Namibia's e-ID smart card** is a **separate, physical national identity card project** under **MHAISS** (Ministry of Home Affairs, Immigration, Safety and Security). CRAN's roadmap records MHAISS as the **first accredited Certification Service Provider (CSP) for e-ID rollout** (Step 4 — additional CSP onboarding ongoing). That accreditation governs **national issuance**, not Buffr Checkpoint's kiosk or verification integration. Cards may still be rolling out or not yet universally in circulation at every site — Buffr must not conflate "MHAISS accredited as CSP" with "Buffr verifies e-ID taps today." Platform capability `national_eid_nfc` governs Buffr's product claim; it remains `not_available` until RP onboarding and tested read/verify paths exist.

This distinction is the crux of the NFC opportunity described in this section: **Namibia is about to issue every citizen an NFC-readable government identity credential.** That is a generational infrastructure event for a company positioned to use it, and being ready for it now — rather than scrambling in September 2026 — is a legitimate first-mover strategy, provided the company never overstates where it stands relative to that date.

## 4a.2 Why NFC changes the capture layer materially

NFC's strategic value, beyond the general points already made in Section 4.1 and Section 12, is specifically sharpened by the coming e-ID rollout:

- **Sub-second interaction** at high-traffic, regulated sites — bank branches, government offices — where queue time is a real, measurable operational cost, not merely a convenience question.
- **No line-of-sight requirement.** NFC works through a badge holder, wallet, or lanyard, which makes it a better fit for gate- and turnstile-style entry points than reception-desk-only channels like QR.
- **A shorter attack surface than QR.** NFC's read range, measured in centimetres, makes shoulder-surfing or camera-capture replay attacks far harder than with a QR code, which can be photographed from a distance and reused.
- **Reusable physical tokens.** An NFC badge, and eventually the national e-ID card itself, becomes a durable, tap-to-verify credential, in contrast to a QR code that must be regenerated, displayed, or re-scanned at every visit.

## 4a.3 Hardware layer for NFC, including projected Namibian costs

| Component | Use case | Notes |
|---|---|---|
| NFC reader (kiosk/tablet add-on) | Tap-to-check-in at reception | USB or Bluetooth NFC reader modules attach to the existing Android/iPad kiosk stack described in Section 11.2 — no new device class is required. |
| NFC visitor badges (NTAG213/NTAG215) | Reusable badges for frequent visitors and contractors | Landed cost in Namibia is realistically **$0.20–$0.40 per unit** at moderate bulk once freight, customs, and VAT are factored in — cheap enough to issue per-site starter batches without a major capital-expenditure ask. |
| Phone-based NFC (visitor's own device) | Tap-to-check-in via smartphone NFC, no physical tag needed | Zero incremental hardware cost per visitor; relies on the visitor's own NFC-enabled phone, which is now standard on most mid-range Android devices — though see Section 4.2 for why this cannot be the default assumption at national scale. |
| **National e-ID smart card (future)** | Tap the government identity card to verify and auto-populate the check-in record | **Not yet live.** Targeted for the September 2026 Ministry of Home Affairs rollout. Buffr Checkpoint should design its reader compatibility now so that it activates automatically on day one of national rollout, per the roadmap in Section 18 and the immediate-actions list in Section 21. |

## 4a.4 Revised Digital Identity Layer wording (binding correction to all architecture material)

Every architecture diagram, pitch document, and public-facing description of the Digital Identity Layer in this blueprint — including the diagrams in Section 11.1 and Section 7 of the Regulatory Addendum — must describe it in **two clearly separated states**:

- **National NPKI direction (CRAN, July 2026 presentation):** National Root CA Implementation Journey — Root CA secured; **ETA s20 and Ch5 commenced 15 June 2026** (GN 182/2026); Signature and Accreditation Regulations in force; **MHAISS accredited as first CSP for e-ID rollout**. **Ch4 (consumer protection) still not commenced.**
- **Buffr relying-party adapter (register: `diginam_verification` → public `not_available`):** Built to support DigiNam/NPKI verification **where formally enabled** — not live until approved relying-party arrangement, tested interface, and evidence-backed capability status (Section 3.1, Section 4.4, Regulatory Addendum §6).
- **Targeted, not yet live:** National e-ID NFC smart-card tap-to-verify, targeting the Ministry of Home Affairs' September 2026 rollout. Buffr Checkpoint's NFC reader hardware and protocol support should be built and tested **ahead of** that rollout, so that a national infrastructure event becomes an immediate product capability rather than a scramble.

This correction exists because the public site, absent this correction, could be read as implying that DigiNam integration being live also means the e-ID NFC card is live — and that would overstate readiness against a specific, checkable government timeline. Keeping the two states separated protects credibility with exactly the regulated, risk-literate buyers — banks, government departments — that this product targets, and it is the same discipline already required of DigiNam claims generally in Section 3.1.

## 4a.5 The 12-month NFC positioning window

Buffr Checkpoint should treat the period between now and the September 2026 e-ID rollout as an explicit strategic phase, not passive waiting:

- Sell and deploy NFC-badge and NFC-phone check-in **now** — this is immediate, low-cost, and has no dependency on any government timeline.
- Simultaneously engineer and test e-ID card compatibility in the background, so the capability is ready the day the cards enter circulation.
- When the national rollout happens, Buffr Checkpoint becomes positioned to be the **first visitor-management platform in Namibia that can accept the government's own NFC-enabled identity card as a check-in credential** — a defensible, hard-to-replicate advantage against any competitor that supports QR only.
- This should be an explicit, dated milestone in investor and board materials: **"NFC-ready today, e-ID-ready by national rollout."**

## 4a.6 Timeline risk

The September 2026 date is government-stated but, like large public infrastructure programmes generally, subject to delay risk. This blueprint's standing rule, carried forward into the Risk Register in Section 19, is: **marketing must never claim e-ID NFC support is live until the Ministry of Home Affairs confirms the cards are in national circulation and Buffr Checkpoint has completed its own interoperability testing.** Every public-facing description of the Digital Identity Layer — the Home hero badge, the Platform architecture explanation, and the Platform FAQ described in Section 1a.3 — must carry the explicit "live" versus "targeted" distinction set out in Section 4a.4.

## 4a.7 The targeted month has arrived — from a hardcoded date to a governed status

As of this revision (2026-09), the Ministry of Home Affairs' targeted rollout
month is the current month. **This changes nothing about the rule in Section
4a.6** — a calendar date arriving is not evidence of national circulation or
of Buffr Checkpoint's own completed interoperability testing, so live
language is still not automatically warranted. What it does change is the
failure mode of how this blueprint has expressed that rule everywhere else
in this document: every occurrence of "targeted for September 2026, not yet
live" (Sections 1a.3, 4a.1–4a.5, 12.1, 15.4, 16.4, 18, 19) was a hardcoded
string that was safely conservative only because the date hadn't arrived
yet. Now that it has, the same hardcoded string is unsafe in both
directions — it could sit there and go stale even after a real MoHA
confirmation happens, or someone could treat the arrived date itself as
false justification to flip it to "live" without evidence. A string baked
into copy or a wireframe cannot express "the target month is here, but
confirmation and testing are still pending" — it can only be right by
accident.

**v0.4 correction to this section:** the original three-state model below
(`not_live | targeted | live`) conflated two genuinely different facts — (1)
whether Namibia's DigiNam/NPKI national identity ecosystem exists and is
operating (it does — that is a national infrastructure fact, independent of
Buffr Checkpoint), and (2) whether *Buffr Checkpoint's own adapter* has been
formally approved to call it as a relying party for any given deployment
(it has not). A single `live` value on one register invited exactly the
overclaim this blueprint has repeatedly had to catch and revert: "DigiNam
Verified" / "visitors can check in with a verified DigiNam credential
today." The corrected model splits these explicitly and adds the same split
for National e-ID NFC and USSD, each with its own vocabulary reflecting what
actually varies for that capability:

```text
platform_capability_status                -- Buffr-Checkpoint-wide, one row per capability
  ├── capability_code            'diginam_verification' | 'national_eid_nfc'
  │                              | 'nfc_badge_checkin' | 'ussd'
  ├── status_code                -- vocabulary is capability-specific, see below
  ├── evidence_reference          -- internal only: MoHA/CRAN confirmation, test report, operator agreement
  ├── confirmed_by                -- platform_support only (Section 9.1) — never a tenant role
  ├── confirmed_at
  ├── public_display_status       -- the ONLY field the public API and public website may read
  └── updated_at

organisation_capability_enablement        -- per tenant: has THIS client approved/turned this on
  ├── organisation_id
  ├── capability_code
  ├── status_code                 -- tenant-scoped subset of the same vocabulary
  ├── enabled_at
  ├── enabled_by                  -- tenant System Administrator or Compliance/Audit Officer
  └── configuration_reference     -- e.g. which site(s), which adapter config
```

**Why two tables, not one:** platform-capable does not mean client-approved,
and client-approved does not mean site-permitted. A capability can be
`live` at the platform level (Buffr Checkpoint's adapter is approved and
tested against the national ecosystem) while a specific organisation has
never enabled it, and a specific site within that organisation has enabled
it only for certain zones. Collapsing these into one flag is what let an
earlier draft imply blanket availability from a single global row. The
public-facing API and website read `public_display_status` from
`platform_capability_status` only — never `evidence_reference`,
`confirmed_by`, internal status-change history, or anything from
`organisation_capability_enablement` (a tenant's enablement configuration is
that tenant's private operational detail, not public marketing surface).

**Status vocabulary per capability** (deliberately not a single shared
enum — each capability's real lifecycle is different):

| Capability | Status vocabulary | Why this shape |
|---|---|---|
| `nfc_badge_checkin` (site-issued NFC badge/token/phone credential) | `live` only | Genuinely built and working today — no approval gate outside Buffr Checkpoint's own control |
| `diginam_verification` (display: **DigiNam relying-party verification**) | `discovery → approved → pilot → live → suspended` | The national ecosystem being live is a separate fact (see correction below); this tracks only Buffr Checkpoint's own integration approval lifecycle |
| `national_eid_nfc` (physical National e-ID card read via NFC) | `discovery → targeted → pilot → live → suspended` | Retains `targeted` because a real MoHA rollout month exists (Section 4a.6) as an intermediate state between discovery and a running pilot |
| `ussd` | `not_started → provider_testing → pilot → live → suspended` | Reflects the real dependency on a telecom-operator/aggregator arrangement (Section 5, "USSD is not offline") |
| `qr_invitation_checkin` | `not_started → pilot → live → suspended` | Pre-registration invitation QR with opaque token lifecycle |
| `sms_contact_confirmation` | `not_started → provider_testing → pilot → live → suspended` | Neutral SMS confirmation channel; no PII in message body |

A status change requires `evidence_reference` to be populated and
`confirmed_by` to be a real `platform_support` action — a **role-gated,
audit-logged write** (Section 9.2 rule 3: every correction creates an
immutable audit event), never a content-team copy change and never a
tenant-role action (customer System Administrators and Compliance/Audit
Officers manage only their own `organisation_capability_enablement` rows,
never `platform_capability_status`).

**Correct public copy, this revision forward:** *"Built to support
DigiNam/NPKI verification where formally enabled."* Never *"DigiNam
Verified"* or *"DigiNam Integrated — Live"* on any public-facing surface
unless a real, evidenced, approved relying-party integration exists for the
specific deployment being described.

**Public API response shape** — deliberately minimal, no internal detail:

```json
{
  "diginamVerification": "not_available",
  "nationalEidNfc": "targeted",
  "nfcBadgeCheckIn": "live",
  "ussd": "not_available",
  "qrInvitationCheckIn": "not_available",
  "smsContactConfirmation": "not_available"
}
```

`platform_capability_status` internal status codes map to this public
vocabulary (`discovery`/`approved`/`pilot`/`not_started`/`partner_testing`
all collapse to `"not_available"` publicly; `suspended` also reports as
`"not_available"` — a suspended capability must never read as available).
Only `live` (and, for `national_eid_nfc`, `targeted`) pass through as
distinct public values, matching the badge states already specified below.

### Frontend requirement: every "live vs. targeted" surface reads this register, not a hardcoded string

| Surface | Prior hardcoded language (now fixed in this revision) | Required behavior |
|---|---|---|
| Home hero badge (Section 1a.3) | "targeted for the Ministry of Home Affairs' September 2026 rollout, not yet live" | Render from `platform_capability_status` (`national_eid_nfc` row, `public_display_status`) — three visual states, not two: **Not available** (muted grey), **Targeted** (Sodium Yellow — an active, current-month state, not a future one), **Live** (a distinct status-green, not Lime Pulse — see below) |
| Platform architecture explanation + FAQ (Section 1a.3) | Same string, plus the DigiNam live/targeted pair | **Fixed above** — both `diginam_verification` and `national_eid_nfc` render independently from their own register rows |
| Pricing page NFC/e-ID row (Section 1a.3) | "engineered and tested for ahead of the September 2026 rollout, not a capability a customer can use today" | **Fixed above** — same three-state badge component, reused, not re-copywritten per page |
| Kiosk "Tap NFC Badge" button (Section 10.1) and "How It Works" "Live now" tag | Tag is currently only specified for the DigiNam step | Kiosk app queries the same register (via the backend, Section 11.4.4) at boot/sync. NFC badge/token is always shown (genuinely live). The National e-ID tile is added to the screen — not just relabelled — only once platform status is `live` **and** the site has enabled it in `organisation_capability_enablement`; never a build-time constant, never shown as a disabled/greyed tile |
| Buffr Checkpoint's own internal ops console (not `admin/` — see correction below) | Not previously specified | A **Capability Status** screen, editable only by Buffr Checkpoint's own Platform Support role (Section 9.1), where a status change requires `evidence_reference` before it can be saved |

**Correction made during implementation:** an earlier draft of this row said the Capability Status screen should be editable by customer-side System Administrator/Compliance-Audit-Officer roles inside `admin/`. That was wrong and has been fixed. `platform_capability_status` is a single platform-wide row per capability, not scoped per organisation — Section 4a.7's Wiebe rule 8 tenancy exception — so granting a customer's own admin write access would let any one customer's Compliance Officer flip the public "DigiNam live" / "e-ID live" badge for every other customer and the public website simultaneously. This is exclusively a Buffr Checkpoint internal action (`platform_support` role), never exposed in the customer-facing `admin/` app. Customer-side System Administrator/Compliance-Audit-Officer roles retain write access only to their own `organisation_capability_enablement` rows — turning a platform-live capability on or off for their own organisation and sites, never changing whether it is platform-live in the first place.

**Closes a gap flagged in Section 11.5.1:** the design system's Lime Pulse
green was specified as editorial-only, with a note that a real
status-semantic color was still needed for things like sync/error states.
This three-state capability badge is the concrete case — add a dedicated
`--color-status-live` token (not `--color-lime-pulse`) to Section 11.5.1 when
the admin app's theme is implemented, reserved for verified-live states
across the app (this badge, credential validity, device MDM health), keeping
Lime Pulse reserved for one-off editorial emphasis as originally specified.

The remaining descriptive mentions of "September 2026" throughout this
document (the hardware table in 4a.3, the positioning-window language in
4a.5, the unit-economics and competitive tables in 15.4/16.4, the roadmap in
Section 18, and the risk-register row in Section 19) are historical/strategic
narrative, not live UI copy, and are left as written — they correctly
describe the target month, which has now arrived, without claiming the
capability is live.

---

# 5. Channel Strategy

## 5.1 Multi-modal check-in channels

Channels share one encrypted visit record. **Recommended use** below is packaging posture (Section 15 / 16), not a claim that every channel is live — see §11.9.0a.

| Channel | Who it serves | Identity assurance | Works offline? | Recommended use |
|---|---|---:|---:|---|
| **Public site QR (phone web)** | Smartphone users at the door | Link possession (`/check-in?site=&ref=`) | Limited (needs network for submit) | **Default Core self-service** — admin generates/rotates/prints QR (`Site Experience → Site QR Codes`); no tablet CAPEX |
| **Assisted front-desk check-in** | Visitors with no phone, low literacy, disabilities, feature phones, or special needs | Self-declared / staff-observed | Yes | **Mandatory Core inclusion fallback** |
| **Self-service kiosk/tablet** | All visitors | Self-declared | Yes | Optional add-on — dedicated device UX / MDM when volume or accessibility warrants |
| **QR pre-registration / invitation** | Expected visitors (smartphone) | Link possession; can be combined with OTP | Limited | Professional — events, appointments, scheduled visits |
| **NFC badge / token** | Contractors, repeat visitors, staff | Credential possession | Yes | Optional / Professional fast lane when entitlement + capability allow |
| **NFC phone credential** | Smartphone users | Credential possession; stronger if wallet/secure element supported | Depends on configuration | Optional / Professional convenient fast lane |
| **DigiNam credential verification** | Visitors with an enabled digital identity | Verified identity, subject to integration | Usually online or cached according to rules | Verify — higher-risk or pre-registered visits (sell only when register is live) |
| **USSD** | Feature-phone users | SIM/session possession; not identity proof | Requires GSM network, not data | Optional add-on — inclusive remote/onsite when aggregator live (§11.9.0a) |
| **SMS** | Feature-phone and smartphone users | SMS/OTP possession; not identity proof | Requires GSM network | Optional add-on — confirmation, sign-out, fallback when MT gateway live |
| **Printed one-time code** | Anyone | Site presence only | Yes | Kiosk/guard fallback during outages |

## 5.2 Identity assurance levels

Do not label every check-in “verified.” Use explicit assurance states.

**Canonical runtime codes** are `V0`…`V4` in `type_definition.domain =
'identity_assurance_level'` (seeded in `backend/db/seed/0001_type_definitions.sql`).
These are the only codes the API, kiosk, and admin may persist on
`visitor_visits.identity_assurance_level_code` and
`visitor_identity_assessments.assurance_level_code`.

| Code | Canonical name | Meaning | Typical method | Suitable for |
|---|---|---|---|---|
| **V0** | Self-asserted identity | Visitor entered details; no external confirmation | Kiosk/manual entry | Ordinary low-risk office visits |
| **V1** | Contact-channel possession | Visitor controls the stated phone/session | SMS OTP or USSD session | Standard visitor flows |
| **V2** | Site-issued credential possession | Visitor holds a known NFC badge/token | NFC badge mapped to approved profile | Contractors, repeat visitors |
| **V3** | DigiNam / NPKI verified identity | Verified through approved DigiNam/NPKI relying-party flow | Credential validation through approved interface | Regulated or higher-risk visits |
| **V4** | Official e-ID cryptographic validation | Government e-ID cryptographically validated under approved protocol | Official NFC reader and relying-party process | Restricted zones, critical sites |

### 5.2a Naming conventions, aliases, and external maps (binding)

#### Orthogonal axes (never collapse into one field)

| Axis | Field / concept | Answers |
|---|---|---|
| **Identity assurance** | `identity_assurance_level` (`V0`–`V4`) | How strongly do we know who this person is / what they possess? |
| **Signature class** | ETA basic / advanced / recognised; product default = acknowledgement | Was a statutory electronic signature created? |
| **Certificate role** | Root CA / CSP subscriber certificate / RP trust material | Who issued or trusts a PKI credential? |
| **Access decision** | Host/reception approve, deny, escort | May this person enter? |

`identity_assurance_level` ≠ `signature_class` ≠ `certificate_role` ≠ access
decision. A V3 DigiNam result is not a recognised electronic signature. A
kiosk acknowledgement is not a V3 identity claim. A subscriber certificate
from MHAISS is national issuance infrastructure, not Buffr Checkpoint's
product capability register.

#### Constitution aliases (documentation / Zod vocabulary only)

Engineering Constitution §4.2 historically used snake_case enum names. Those
names are **aliases of V0–V4**, not a second persisted vocabulary. Runtime
and database remain `V0`…`V4`.

| Code | Canonical name | Constitution alias | Approx. external map |
|---|---|---|---|
| `V0` | Self-asserted identity | `self_declared` | ~NIST SP 800-63 IAL1; ISO/IEC 29115 LoA1 |
| `V1` | Contact-channel possession | `contact_possession_confirmed` | Authenticator possession (AAL-like); **not** identity proofing |
| `V2` | Site-issued credential possession | `managed_credential_validated` | Site-bound credential validation |
| `V3` | DigiNam / NPKI verified identity | `digital_identity_verified` | ~IAL2 + federation assertion (FAL context) |
| `V4` | Official e-ID cryptographic validation | `high_assurance_identity_verified` | ~IAL3 / high LoA under approved protocol |

NIST SP 800-63-4 separates **IAL** (proofing), **AAL** (authentication), and
**FAL** (federation). Buffr Checkpoint's V0–V4 is a **product composite** for
visitor check-in outcomes. Do not claim numeric equivalence to IAL/AAL/FAL
without a written mapping in a site access policy. ISO/IEC 29115 LoA 1–4 is
a mapping aid only.

#### Forbidden conflations

- Do not display “Verified” without the V-level name.
- Do not treat USSD, SMS OTP, QR, or a cheap NFC sticker as V3/V4.
- Do not market V3/V4 as “legally binding e-signature.”
- Do not treat CRAN Root CA or MHAISS CSP accreditation as Buffr DigiNam/e-ID `live`.

### Key rule

A USSD session, SMS OTP, QR code, or NFC tag proves **possession**, not necessarily **identity**.

Buffr Checkpoint must show staff the difference clearly:

```text
Visitor: Anna N.
Check-in status: V1 — Contact-channel possession
Identity verification: Not performed
Access decision: Host approval required
```

That avoids the dangerous mistake of treating a phone number, static QR code, or cheap NFC sticker as proof of identity.

---

# 6. Feature-Phone User Journeys

## 6.1 Feature phone without e-ID: can they use the service?

**Yes. Absolutely.**

They should have at least three usable options:

1. **USSD check-in**  
2. **SMS-assisted check-in**  
3. **Assisted kiosk/operator entry**  

No person should be denied a service merely because they do not have NFC, a smartphone, mobile data, or a DigiNam credential.

## 6.2 USSD flow

USSD is useful because it works on ordinary GSM devices and does not require an app or mobile data.

```text
Visitor arrives at site
        ↓
Kiosk / guard displays rotating Site Code: 7412
        ↓
Visitor dials: *[short-code]#
        ↓
1. Check in
2. Check out
3. Help
        ↓
Enter Site Code: 7412
        ↓
Choose host / department
1. Reception
2. Finance
3. Operations
4. Other
        ↓
Enter first name and surname initials
        ↓
“Your check-in has been recorded.
Your host has been notified.”
```

### USSD design controls

- Use a **rotating site code** displayed physically at the site to reduce remote false check-ins.
- Do not ask visitors to enter a full national ID number through USSD.
- Do not display sensitive visit purposes in the USSD menu.
- Capture only the minimum necessary information.
- Show a short privacy notice and acceptance step.
- Use the mobile number as sensitive personal information; store it encrypted and use a keyed hash for matching where possible.
- Build USSD through a formal operator or aggregator agreement; it is not a simple public API assumption.
- Design a fallback when USSD sessions time out or operator connectivity fails.

## 6.3 SMS flow

SMS should be a **fallback**, not the main high-security check-in channel.

```text
Visitor sends:
CHECKIN 7412 2

System replies:
You are checking in at [Site].
Reply with your first name and surname initial.

Visitor replies:
Anna N

System replies:
Checked in. Your host has been notified.
Ref: CP-8M4K
```

### SMS control rules

- SMS messages must be neutral: do not send a visitor’s full purpose, ID details, health information, or host-sensitive information.
- Allow opt-out only where it does not conflict with a lawful security/access requirement.
- Do not rely on SMS for immediate high-risk access control because delivery can be delayed.
- Treat SIM-swap and recycled-number risk as part of the threat model.
- Use SMS OTP for **V1 possession confirmation**, not as a high-assurance identity method.

## 6.4 No phone at all

The product must still work.

```text
Visitor arrives without phone
        ↓
Front desk selects “Assisted Check-In”
        ↓
Visitor views privacy notice on a privacy-screen kiosk
        ↓
Operator enters minimum details
        ↓
Visitor confirms details and signs if required
        ↓
Record encrypted; screen clears; host is notified
```

This is far better than returning to a shared paper register.

---

# 7. Risk-Based Approach (RBA)

For this blueprint, **RBA** means both:

1. a **risk-based approach** to controls, data collection, and identity verification; and  
2. **risk-based access decisions** based on site, visit, and zone context.

## 7.1 RBA principle

> Collect the least data and apply the lowest-friction verification method that safely meets the purpose of the visit.

A rural clinic visitor should not need NFC or a national e-ID to ask for care. A contractor entering a data centre or restricted payments-operation area may require scheduled pre-registration, an approved host, stronger verification, a badge, and supervised entry.

## 7.2 Site and visit risk model

| Risk tier | Example | Minimum check-in | Typical verification | Access decision |
|---|---|---|---|---|
| **Tier 1: Open / low risk** | Small office, public reception | Name, host, arrival time | V0 or V1 | Reception approval |
| **Tier 2: Standard controlled** | Corporate office, clinic, branch | Name, host, purpose category, contact | V1 or pre-registration | Host notified |
| **Tier 3: Sensitive** | Government office, bank, healthcare administration | Pre-registration, purpose, confidentiality notice | V1/V2; V3 where available | Host approval before entry |
| **Tier 4: Restricted** | Data centre, NPS operation, critical infrastructure | Pre-registration, zone, sponsor, safety terms | V3/V4 where supported | Explicit approval + badge + escort |
| **Tier 5: Critical / exceptional** | Security operations, highly restricted facilities | Tailored facility workflow | V4 plus physical/security procedure | Security-led decision |

### RBA guardrails

- No automated access denial purely based on a personal-data “risk score.”
- No facial-recognition or biometric matching in Version 1.
- No “blacklist” functionality by default.
- Human override requires a reason, role authority, and audit log.
- The RBA must be documented in a client-approved site access policy.
- Higher assurance must not become an excuse for indiscriminate collection of identity data.

---

# 8. Core User Journeys

## 8.1 Walk-in visitor

```text
Arrival
→ choose NFC / QR / kiosk / USSD / assisted check-in
→ privacy notice
→ minimum fields captured
→ verification level recorded
→ record encrypted and isolated
→ host notified
→ visitor obtains temporary badge if required
→ visitor signs out
→ retention timer starts / record retained according to policy
```

## 8.2 Pre-registered visitor

```text
Host pre-registers visit
→ visitor receives neutral SMS/email/WhatsApp invitation
→ visitor arrives
→ scans rotating QR or enters one-time code / taps NFC credential
→ record matched
→ host notified
→ access decision recorded
→ sign-out and retention workflow
```

## 8.3 NFC contractor journey

```text
Contractor enrolled once
→ random NFC badge ID assigned
→ badge mapped to approved contractor profile
→ contractor taps at entrance
→ site, schedule, zone, induction status and expiry checked
→ authorised entry recorded
→ badge expires automatically at end of contract
```

**Do not store name, ID number, or access permissions directly on a cheap NFC tag.**  
The tag should contain a random credential reference or cryptographically protected dynamic token.

## 8.4 DigiNam verification journey

```text
Visitor opts to use DigiNam credential
→ Buffr Checkpoint requests only necessary verification attributes
→ approved DigiNam/NPKI verifier flow runs
→ response validates credential status and required attributes
→ only minimum proof/result retained
→ visitor record marked V3: Digital identity verified
→ host/security workflow continues
```

### Critical implementation rule

Store the **verification outcome and reference**, not the full credential payload, biometric data, or unnecessary identity attributes.

## 8.5 Offline journey

```text
Internet outage
→ kiosk remains available
→ encrypted local record is created
→ local screen confirms: “Check-in recorded. Host notification pending.”
→ device reconnects
→ sync queue transmits idempotently
→ server records acceptance
→ notification is sent
→ local PII cache is deleted after confirmed sync
→ audit event records offline creation + sync time
```

For high-risk sites, the offline process must define what happens if host approval is required but the network is unavailable:

- local reception call/radio escalation;
- guard approval with recorded rationale;
- delayed entry;
- or a restricted-entry rule.

The system must never falsely say “host notified” while offline.

## 8.6 Emergency / evacuation journey

```text
Emergency initiated by authorised role
→ live on-site visitor roster generated
→ visitors grouped by site/zone
→ hosts and emergency coordinators notified
→ roll-call state recorded
→ emergency report exported
→ event and access to emergency roster fully audited
```

This is a high-value operational use case. It converts visitor management from a compliance cost into a safety asset.

## 8.7 Visitor sign-out journey

Sign-out is written here as its own journey because it is the point most competing paper and digital processes fail silently, leaving a visitor record open indefinitely and undermining both the emergency roster in Section 8.6 and the evidence pack in Section 20.2.

```text
Visitor searches for their own open record at the kiosk, or taps out with
NFC, or scans a personal QR/reference, or dials the USSD sign-out option,
or sends the SMS sign-out keyword
        ↓
System matches the credential or reference to exactly one open visit record
belonging to that visitor — never a searchable list of other visitors
        ↓
System closes the open record and writes the check-out timestamp
        ↓
Optional short satisfaction micro-survey is offered
        ↓
Record moves to the closed/archived state and the retention timer described
in Section 8.9 begins running
        ↓
Any host or security workflow tied to the open visit (escort requirement,
badge return, zone exit) is checked and, if unresolved, flagged for
front-desk follow-up rather than silently left open
```

The matching step is deliberately built the same way as the returning-visitor design in Section 7 and Section 12: a visitor proves they own the record they are closing, they do not browse a list of other people's visits.

## 8.8 Host notification and screening journey

```text
Check-in event fires from any capture channel in Section 6
        ↓
Host receives a real-time alert containing name, purpose category, photo
if captured and permitted, and verified-identity status (V0–V4 per
Section 6.2)
        ↓
On screening-enabled sites, the host may approve or reject the visit
remotely before the visitor is allowed past the reception/kiosk point
        ↓
If the host does not respond within a configurable window, the site's
escalation rule applies — reception default-approval for low-risk tiers,
or mandatory hold for Tier 3 and above per the risk model in Section 7.2
        ↓
Host greets the visitor, or the rejection reason is logged and the visitor
is informed at the kiosk without exposing the host's rejection rationale
```

Screening is deliberately kept separate from identity verification. A host approving or rejecting a visit is an access decision; a DigiNam or NFC verification result is an identity-assurance signal. The two must never be conflated in the interface, for the same reason the risk-based access model in Section 7 keeps assurance levels and access decisions in separate fields.

## 8.9 Data lifecycle and deletion journey

```text
Record is created at check-in, tagged with the retention-policy version in
force at that site and visitor type (Section 5.1's data model, Section
11.3's essential data rules)
        ↓
Retention timer starts at check-out (Section 8.7) or at record creation for
records that are never checked out and are flagged stale
        ↓
Record is auto-archived when it reaches the configured retention threshold
        ↓
At the archive threshold, the record is either auto-deleted, or flagged for
legal hold if a hold is active for that site, visitor, or date range
        ↓
Every archive, hold, and deletion action is written to the audit log
described in Section 13.1 and Section 20.2
        ↓
A data-subject deletion request, once received, is routed to the
Compliance/Audit Officer role defined in Section 9.1
        ↓
The Compliance/Audit Officer verifies the requester's identity and
authority, executes the deletion or explains a lawful exception, and logs
the outcome as an auditable event
```

## 8.10 Admin and compliance review journey

```text
Compliance/Audit Officer logs in with MFA (Section 13.1)
        ↓
Pulls the audit log for a chosen date range and site or region
        ↓
Verifies that the controls described throughout this document are actually
operating — record isolation, encryption at rest and in transit, retention
timers, RBAC enforcement at the data/API layer (Section 9.2), and offline
sync integrity (Section 8.5)
        ↓
Exports an evidence pack, built from the components listed in Section
20.2, for a regulator, an auditor, or the client's own board
        ↓
Logs the review itself as a completed control test, closing the loop
described in the governance cycle in Section 20.1
```

---

# 9. Role-Based Access Control (RBAC)

## 9.1a SME reality: the 9-role model is an enterprise default, not the only shape

Namibia's own MSME employee thresholds are micro = up to 10 employees, small =
11–30, medium = 31–100. Namibia Statistics Agency census data (2019–2021) puts
**91% of all recorded Namibian businesses in the micro tier (≤10 employees)**,
with 63% operating as sole proprietorships — a pattern broadly representative of
SME structure across much of Sub-Saharan Africa. The 9-role table below, staffed
by separate people, is the correct model for the regulated/enterprise segments in
Section 15.1 (banks, government, healthcare, critical infrastructure) but is a
fiction for the large majority of the addressable "Multi-site SMEs and corporate
offices" segment and any single-site SME, where one person routinely covers
several of these functions at once.

Of the 9 roles, **Platform Support** and **DigiNam Verification Adapter** are
Buffr Checkpoint's own internal/system roles, not customer-side roles, and are
unaffected by the rest of this section.

For the remaining customer-side roles, add a bundled role:

> **Owner-Operator** — a single, first-class role definition (not a UI
> convenience) carrying the combined permission set of Front Desk Operator +
> Site Manager + Compliance/Audit Officer + System Administrator, scoped to one
> site/tenant. Regional Manager is not part of the bundle — it has no meaning
> below multi-site scale.

The Owner-Operator bundle is a **permission union assigned to one identity**; it
does not weaken any individual permission boundary. All of Section 9.2's
enforcement rules (database/API-layer enforcement, `tenant_id`/`site_id`
scoping, immutable audit events, no cross-site access) apply to an
Owner-Operator identity exactly as they apply to any other role.

**Checkpoint Core** (Section 15.2, "single-site SME or office") should ship with
Owner-Operator as its default and only admin role — no UI exposure of the 5-way
granular split. Reserve full role granularity for Checkpoint
Professional/Verify/Access, where separately-staffed roles are a genuine control
requirement for regulated, multi-site buyers.

## 9.1 Roles

| Role | View rights | Change rights | Export rights |
|---|---|---|---|
| **Visitor** | Own confirmation only | Complete own check-in; request correction | None |
| **Host / Staff** | Their own visitors | Approve, reject, update host status | None by default |
| **Front Desk Operator** | Current-day roster for assigned site | Assisted check-in, sign-out, badge issue | Current-day operational list only |
| **Site Manager** | Full history for assigned site | Site fields, hosts, local configuration | Site reports |
| **Regional Manager** | Aggregated sites in assigned region | Limited regional configuration | Regional reports |
| **Compliance / Audit Officer** | Organisation-wide records and audit trail | Legal holds, retention review, DSAR workflow | Evidence packs |
| **System Administrator** | Configuration and operational metadata | Roles, sites, policy configuration, integrations | Configuration/audit exports |
| **Platform Support** | None by default | Time-bound, approved “break-glass” support access only | No routine export |
| **DigiNam Verification Adapter** | Only required identity-verification request fields | No human access | None |

## 9.2 RBAC rules

1. Enforce access in the **database and API layer**, not only in the web interface.
2. Every record must carry `tenant_id`, `site_id`, and policy scope.
3. Every sensitive read, export, correction, and deletion must create an immutable audit event.
4. Support access must be:
   - exceptional;
   - time-bound;
   - client-approved where practical;
   - reason-coded;
   - fully logged.
5. Site Managers cannot access another site merely by changing a URL or API request.
6. Compliance Officers should have broad **read and assurance** access but not routine ability to alter visitor records.
7. A role change must be a high-risk event requiring approval and audit evidence.
   This applies to a role **transition** on an existing account (e.g. a Front
   Desk Operator promoted to Site Manager, or a permission escalation), and to
   **splitting** an Owner-Operator bundle (Section 9.1a) into separate roles as
   an organisation grows past single-site scale. It does **not** apply to
   **initial role assignment** at account creation — provisioning a new
   Owner-Operator account for a micro/small customer is a role assignment, not
   a role change, and must be logged without triggering the escalation-approval
   workflow. Treating initial provisioning as a role change would generate
   false-positive audit noise on every micro/small signup, which is the segment
   Section 9.1a identifies as the majority of the addressable market.
8. **Privileged actions require a verified email and MFA, not just a valid session**
   *(updated v0.17)*. Login itself is blocked until `email_verified_at IS NOT NULL`.
   After verification, Owner-Operators must enroll TOTP MFA before completing
   onboarding or reaching the operational dashboard. Privileged configuration
   (site writes, branding publish, compliance dashboard, go-live approval)
   additionally require MFA at the API layer (`@RequireVerifiedEmail` +
   `@RequireMfa`). This replaces the earlier v0.4 posture where unverified
   accounts could sign in for "day-one access".
9. **Organisations assign roles from a fixed catalogue; they do not invent
   permissions** *(closed v0.29)*. Customer admins invite users with an
   assignable `role_code`, change roles via audited
   `POST /rbac/role-assignments/change` (no self-change), and review live
   assignment counts + permission sets on `/dashboard/roles`. Permission
   grants remain platform-owned config (`role_permission_grants` /
   type_definition). Owner-Operator remains the SME permission union
   (Section 9.1a); splitting into granular roles is a role change under
   rule 7 as the organisation grows.

## 9.2a Separate front doors for customers and platform staff *(v2026-09-29, approved by the product owner)*

Customers and Buffr staff sign in through different endpoints and receive tokens that can only be
used on their own surface. Customers never see or reach the ops console, and staff never act inside a
customer tenant except through the grant-gated support session (rule 4).

| Rule | Customer admin / kiosk | Platform Ops Console |
|---|---|---|
| Sign-in endpoint | `POST /auth/login`, `POST /auth/mfa/challenge/verify` | `POST /auth/platform/login`, `POST /auth/platform/mfa/challenge/verify` |
| Who may sign in | Any role except `platform_support` | `platform_support` only |
| Wrong kind of account | `401 Invalid email or password` (same as a bad password, no enumeration) | Same |
| MFA | Per rule 8 (Owner-Operators enrol during onboarding) | **Mandatory.** No MFA means a 15-minute `ops_enroll` token that can only call `/auth/mfa/enroll/*` and `/auth/me`; confirming enrolment issues the ops session and 10 recovery codes |
| Token `aud` claim | `admin` (support sessions are also `admin`) | `ops` |
| Session length | 8 hours | 2 hours |
| Attempt limit (per IP) | 10 per 5 minutes | 5 per 15 minutes, separate bucket |
| Routes the token may call | Any customer route; never a `platform.*` permission | Only `/platform/*`, `/type-definitions`, `/capability-status`, `/public/*`, `/health`, `/auth/me`, `/auth/platform/*`, `/auth/mfa/enroll/*` |

Enforcement lives in application code: `backend/src/common/auth/session-audience.ts` (rules, unit-tested
in `session-audience.spec.ts`) and the global `SessionAudienceGuard`, which runs after `JwtAuthGuard`
and before `TenantScopeGuard` / `RbacGuard`. Tokens issued before `aud` existed are classified by role
(`platform_support` without a support session = `ops`), so the rollout logged nobody out.

Verification: `backend/scripts/ops-auth-verify.ts` exercises every rule over HTTP. It passed 14/14 on a
Neon branch of production and 13/13 against production on 2026-09-29 (the forged-token check needs the
production signing key and is skipped there).

---

# 10. Product Wireframes

## 10.1 Kiosk home screen

```text
┌─────────────────────────────────────────────┐
│             BUFFR CHECKPOINT                │
│          Secure Visitor Check-In            │
├─────────────────────────────────────────────┤
│                                             │
│  How would you like to check in?            │
│                                             │
│  [ Tap NFC Badge ]                          │
│  [ Scan QR Invitation ]                     │
│  [ Check In on This Screen ]                │
│  [ I Have a Feature Phone ]                 │
│  [ I Need Assistance ]                      │
│                                             │
│  Privacy notice  |  Accessibility  | Help   │
└─────────────────────────────────────────────┘
```

The NFC badge/token tile is always shown (that capability is genuinely
live). A separate `[ Tap National e-ID ]` tile appears only when the
platform capability status for `national_eid_nfc` is `live` **and** the
client/site has enabled it via `organisation_capability_enablement` — never
a build-time constant, never shown by default. Until then, National e-ID is
absent from this screen entirely, not shown-disabled — an absent option
reads as "not offered here," while a disabled one reads as "broken," which
is not the honest state.

## 10.2 Feature-phone screen

```text
┌─────────────────────────────────────────────┐
│         CHECK IN WITH A FEATURE PHONE       │
├─────────────────────────────────────────────┤
│  Option 1: Dial *[SHORTCODE]#               │
│                                             │
│  Option 2: Send SMS:                        │
│  CHECKIN 7412 to [SHORTCODE]                │
│                                             │
│  Your Site Code: 7412                       │
│  This code expires in: 01:42                │
│                                             │
│  [Back]                 [Need Assistance]   │
└─────────────────────────────────────────────┘
```

## 10.3 Visitor confirmation

```text
┌─────────────────────────────────────────────┐
│                 ✓ CHECKED IN                │
├─────────────────────────────────────────────┤
│  Your host has been notified.               │
│                                             │
│  Reference: CP-8M4K                         │
│  Status: V1 — Mobile possession confirmed   │
│                                             │
│  Your personal information is not visible   │
│  to other visitors.                         │
│                                             │
│  [Print Badge]              [Finish]        │
└─────────────────────────────────────────────┘
```

## 10.4 Front-desk dashboard

```text
┌─────────────────────────────────────────────────────┐
│ Site: Windhoek Head Office         Operator: A. N.  │
├─────────────────────────────────────────────────────┤
│ ON SITE NOW: 18              PENDING HOST: 3        │
├─────────────────────────────────────────────────────┤
│ Visitor          Host         Status      Action     │
│ A. N.            Operations   V1          [Check out]│
│ K. M.            Finance      V3          [View]     │
│ Contractor 081   Facilities   V2          [Extend]   │
├─────────────────────────────────────────────────────┤
│ [Assisted Check-In] [Emergency Roster] [Help]       │
└─────────────────────────────────────────────────────┘
```

## 10.5 Compliance dashboard

```text
┌─────────────────────────────────────────────────────┐
│ Compliance & Assurance                               │
├─────────────────────────────────────────────────────┤
│ Retention actions due this week: 124   [Review]     │
│ Open deletion requests: 2               [Review]     │
│ Privileged access events: 0              [Audit log] │
│ Offline sync exceptions: 3               [Investigate]│
│ Role changes this month: 4               [Review]    │
├─────────────────────────────────────────────────────┤
│ [Export Evidence Pack] [Create Legal Hold]          │
└─────────────────────────────────────────────────────┘
```

---

# 11. Target Architecture

## 11.1 Architecture principle

> One secure visitor-record service; multiple inclusion channels; zero shared records.

> **Three-surface operating model (v0.11):** the visitor-facing **kiosk**,
> the **organisation admin platform** (`admin/`), and **Buffr Checkpoint
> Core/API** (`backend/`) are one connected product — not three isolated
> apps. The kiosk's channels, fields, policies, branding, notifications,
> credentials, and emergency rules are configured by authorised customer
> users through the admin platform. Full surface roles, branding model,
> journey maps, FR/NFR catalogues, and gap analysis: **Section 11.9**.

```text
                 ┌───────────────────────────────────┐
                 │       VISITOR CHANNELS             │
                 │ NFC · e-ID · QR · Kiosk · USSD     │
                 │ SMS · Assisted Check-In            │
                 └─────────────────┬─────────────────┘
                                   │
                 ┌─────────────────▼─────────────────┐
                 │  SITE EDGE / KIOSK APPLICATION     │
                 │  Android tablet · encrypted cache  │
                 │  NFC reader · device policy / MDM  │
                 └─────────────────┬─────────────────┘
                                   │
              Online sync          │      Offline encrypted queue
                                   │
                 ┌─────────────────▼─────────────────┐
                 │       API & IDENTITY GATEWAY       │
                 │ Auth · API keys · rate limits      │
                 │ idempotency · signed device claims │
                 └──────┬───────────────┬────────────┘
                        │               │
       ┌────────────────▼───┐       ┌──▼────────────────────┐
       │ Identity Adapters   │       │ Core Application       │
       │ DigiNam/NPKI        │       │ Visits · Workflow      │
       │ e-ID (if approved)  │       │ Risk rules · RBAC      │
       └─────────────────────┘       │ Retention · DSAR       │
                                     └───────┬───────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────┐
            ▼                                ▼                            ▼
┌──────────────────────┐         ┌─────────────────────┐      ┌───────────────────┐
│ Namibia-hosted        │         │ Notification Service │      │ Append-only Audit │
│ PostgreSQL            │         │ SMS · USSD · Email   │      │ Log / SIEM        │
│ Tenant/site isolation │         │ WhatsApp where used  │      │ Evidence exports  │
└──────────────────────┘         └─────────────────────┘      └───────────────────┘
            │
            ▼
┌──────────────────────┐
│ Encrypted object store│
│ Photos/docs only when │
│ necessary             │
└──────────────────────┘
```

### 11.1a Notification outbox and domain events (v0.23)

Request/response modules stay request/response; the two places that
genuinely benefit from decoupling got it, deliberately scoped rather than a
platform-wide rewrite into event sourcing:

- **Transactional outbox** — `notification_delivery_instructions` now
  persists message content at enqueue time (status `pending`) instead of the
  request calling the email/SMS provider synchronously.
  `NotificationDispatchWorkerService` drains it on an interval (same
  `OnModuleInit`/`setInterval` shape the host-notification-escalation worker
  already used — no queue/broker dependency added), with exponential
  backoff and a `notification_delivery_status_events` append-only log of
  every transition. See Section 5.8 and Slice 5.
- **In-process domain events** — `@nestjs/event-emitter` decouples the one
  concrete cross-module reaction in the system:
  `visits.service.ts` emits `visit.checked_in` after a host-contact check-in
  commits, instead of calling `NotificationsService` directly;
  `VisitCheckedInListener` in the notifications module reacts to it. This is
  in-memory decoupling only (not a durable event log) — everything else
  (audit interceptor, USSD webhook handling, auth OTP/reset sends,
  escalation worker) stays as direct calls, since there's nothing else today
  that's actually reacting to another module's event.

No Kafka/RabbitMQ/message broker — single-service scale doesn't warrant one;
Postgres-as-queue is a deliberate, well-precedented choice (see e.g.
[Dagster: Postgres vs Kafka for event queues](https://dagster.io/blog/skip-kafka-use-postgres-message-queue)).
If dispatch volume or multi-instance concurrency ever outgrows a single
polling worker, swap the poller for `SELECT ... FOR UPDATE SKIP LOCKED` or a
real queue — the outbox table shape doesn't need to change, only the
dispatcher.

### 11.1b Analytics and ETL (v2026-09-30)

Customer reporting and platform statistics read from PII-free rollups, never
from visitor rows. Migration: `backend/db/migrations/0041_analytics_etl.sql`
(applied to production 2026-09-30).

**Tables**

| Table | What it holds |
|---|---|
| `visit_daily_fact` | Check-ins, check-outs, offline captures and dwell totals per organisation, site, local date, visitor type, arrival channel and purpose |
| `visit_hourly_fact` | Check-ins per organisation, site, local date and local hour |
| `analytics_etl_run` | One row per refresh: kind, window, counts, status |
| `analytics_etl_run_status_log` | Append-only status transitions for each run (runtime role has no UPDATE/DELETE) |

Statuses (`etl_run_status`: running, succeeded, failed) and kinds
(`etl_run_kind`: incremental, backfill) are `type_definition` rows. Fact rows
are derived, so the ETL recomputes them in place; run history is never edited
after the run finishes.

**Run lifecycle** (`backend/src/modules/analytics-etl/`)

1. `AnalyticsEtlWorkerService` runs an incremental refresh 60 seconds after
   boot, then every `ANALYTICS_ETL_INTERVAL_MS` (default 1 hour).
2. Window: the last `ANALYTICS_ETL_LOOKBACK_DAYS` local days (default 3),
   widened to cover any day touched by a visit accepted since the last
   successful run (late offline tablet syncs).
3. One neon-http batch (one transaction): zero the window's fact rows, then
   upsert fresh aggregates. Local dates use each site's `sites.timezone`, so a
   01:00 Windhoek check-in counts on that Windhoek day.
4. Reconciliation: raw non-deleted visits in the window must equal
   `sum(check_in_count)` in `visit_daily_fact`. Any difference fails the run
   with both numbers in `error_message`.
5. Ops can rebuild all history: `POST /platform/analytics/etl-runs/backfill`
   (`platform.analytics.manage`), or the "Rebuild all history" button on the
   ops Analytics page.

**Endpoints**

| Endpoint | Audience | Returns |
|---|---|---|
| `GET /analytics/summary`, `/daily`, `/busy-hours`, `/mix`, `/forecast`, `/export.csv` | Property admin (`visit.history.read`; site-scoped users pinned to their site) | KPIs with previous-period change, daily series, weekday-by-hour matrix, channel/visitor-type/purpose shares, forecast, aggregated CSV (audit-logged) |
| `GET /platform/analytics/etl-runs` | Ops (`platform.dashboard.read`) | Recent runs with reconciliation counts |
| `GET /platform/analytics/arrival-statistics` | Ops (`platform.dashboard.read`) | Check-ins by Namibian region and visitor type across organisations; cells under `ANALYTICS_MIN_CELL` (default 5) returned as null with `suppressed: true`, never 0 |

**Forecast method** (`backend/src/modules/analytics/forecast.ts`): mean of the
same weekday over the last 8 weeks, a band of +/- 1.96 standard deviations of
the backtest residuals, and MASE on the last 28 days against a seasonal-naive
baseline (same weekday last week). Below 28 days of history the endpoint
returns `insufficient_history` instead of a number. History starts on the
scope's first recorded day; days before it are never zero-filled.

**Surfaces**

- Admin `/dashboard/analytics`: four KPIs, arrivals trend with forecast band,
  busy-hours heatmap, channel and visitor-type share bars, CSV download. Each
  panel states its question, a finding computed from the data, why it
  matters and the next step (copy in `admin/src/lib/copy/analytics.ts`).
- Ops `/analytics`: ETL health (last run, reconciliation, rebuild) and the
  anonymised arrival statistics, the feed offered to the Namibia Tourism Board.
- Ops "Platform-wide visit volume" now reads `visit_daily_fact`, so every
  surface counts from the same rows.

**Environment**: `ANALYTICS_ETL_ENABLED` (default true), `ANALYTICS_ETL_INTERVAL_MS`,
`ANALYTICS_ETL_LOOKBACK_DAYS`, `ANALYTICS_TIMEZONE` (window boundaries, default
`Africa/Windhoek`), `ANALYTICS_MIN_CELL`.

**Verified 2026-09-30** on a Neon branch of production: backfill, incremental
and a repeat backfill all reconciled 18 source visits to 18 daily and 18
hourly fact counts; suppression, forecast refusal below 28 days, CSV content
and ops-only route guards confirmed.

**Evidence report (v2026-09-30).** `GET /evidence/:id/report` renders an
auditor-readable HTML view of a stored pack (printable to PDF from the
browser): visits in period, audited actions, people with access, retention,
and an audit hash-chain check. The check treats a row as linked when its
`prev_event_hash` matches any event hash in the extract, because concurrent
requests can share a predecessor (a fork, not tampering). The footer prints
the SHA-256 of the exact JSON returned by `GET /evidence/:id/download`. The
pack's audit extract is the most recent 500 events in time order.

### 11.1c Architecture guide: CRM, ETL, payments, reporting, dashboards and UI (v2026-10-01)

Merged from the "Complete System Architecture Guide" supplied on 1 October
2026. Where the guide repeats material this document already holds, the row
below points to the canonical section instead of restating it. Where the
guide disagreed with what is built or verified, the correction is stated
inline and the built system wins.

**Where each part of the guide already lives**

| Guide part | Canonical home in this document | Notes |
|---|---|---|
| ETA, PKI, CRAN Root CA journey, relying-party boundary | Regulatory sections citing GN 75/2020, GN 182/2026 (GG 8949), GN 335/2025, GN 953/2025, CRAN GN 401/2026; NPKI direction notes | s20 and Chapter 5 in force from 15 June 2026 per GN 182/2026 (source PDF listed in the sources table). Kiosk tap/draw remains acknowledgement evidence, never a recognised electronic signature. |
| Data protection landscape and minimisation | Privacy and data-minimisation rules; §5.2 visitor and protected PII model | No Act in force; never claim "fully compliant". |
| Core data model, visitor vs visit, envelopes, lookup HMACs | §5 Full canonical data model | Unchanged. |
| DigiNam / national e-ID / USSD / SMS | §4.4 Capability status; §10 DigiNam and national e-ID capability rule | Roadmap capabilities only; not in marketing until the register says live. |
| Hosting and data residency | §11 Hosting and public-claim correction | No "hosted in Namibia" claim. |
| Kiosk and admin visual strategy | §11.6.5 Visual, Image Placement and Product Demonstration Strategy | Unchanged. |
| Analytics ETL, fact tables, endpoints, forecast | §11.1b Analytics and ETL | The guide's table sketches differ from the deployed schema. Migration `0041_analytics_etl.sql` is authoritative: `dwell_minutes_total NUMERIC(14,2)`, `dwell_sample_count`, `etl_run_id` on facts, and `type_definition` codes (`etl_run_status`, `etl_run_kind`) instead of text status columns. |

#### Payments architecture

**Namibian context (from the guide; confirm before quoting externally).**
Cash remains the most used payment method, followed by cards, EFT and
e-money. NamPay is replacing the EFT value chain with ISO 20022 messaging and
new debit-order and credit-transfer streams, migrated over about 18 months.
Wallets (PayToday, MobiPay, MTC Maris, EWallet, BluWallet) are growing.

**Card payments partner: Adumo Online (Virtual hosted payment page).** The
merchant posts a form to Adumo's hosted page; the cardholder enters card
details on Adumo's page, so Checkpoint never handles card data.

| Item | Detail |
|---|---|
| Account | Internet Merchant Account (distinct from card-present/POS) |
| Initialise URL (staging) | `https://staging-apiv3.adumoonline.com/product/payment/v1/initialisevirtual` |
| Initialise URL (production) | `https://apiv3.adumoonline.com/product/payment/v1/initialisevirtual` |
| Identifiers | Merchant ID and Application ID (GUIDs) from the Adumo Merchant Portal |
| Signing secret | JWT secret from the Merchant Portal |
| Request token | JWT carrying `mref` (merchant reference), `amount`, `auid` (application UID), `cuid` (merchant UID) |
| Mandatory request fields | `MerchantID`, `ApplicationID`, `Amount`, `Token`, `RedirectSuccessfulURL`, `RedirectFailedURL`; `MerchantReference` carries the invoice number |
| Response fields used | `_RESULT` (0 success, -1 failed, 1 success with warning), `_STATUS` (APPROVED / DECLINED / USER_CANCELLED), `_MERCHANTREFERENCE`, `_TRANSACTIONINDEX`, `_AMOUNT`, `_CURRENCYCODE`, `_PAYMETHOD`, `_PANHASHED` (first 6 and last 4 only), `_RESPONSE_TOKEN` |

Rules:

- **Credentials live only in environment variables** (`ADUMO_MERCHANT_ID`,
  `ADUMO_APPLICATION_ID`, `ADUMO_JWT_SECRET`, `ADUMO_BASE_URL`). Adumo's
  published sandbox test values are for local testing only and are never
  committed to the repository or this document.
- **Validate every response token** before trusting a payment: the JWT
  signature must verify with the secret, and the token's reference and amount
  must match the invoice. `_RESULT` alone is never enough (Adumo warns that
  skipping these checks can cause financial loss).
- **Never trust client-supplied amounts.** The amount posted to Adumo comes
  from the server-side invoice, as with the subscription catalog (MRR is
  computed in application code from `planCode`, site quantity and add-ons).
- **Store no card data.** Persist only the transaction index, masked PAN, pay
  method and result alongside the invoice payment record.

| Use case | Method | Integration |
|---|---|---|
| Subscription billing (Site / Network / Assure) | EFT, or card via Adumo | Hosted payment page from the invoice; recurring tokens later |
| Hardware purchase or lease | EFT | Invoice and proof-of-payment upload |
| Assurance retainer | EFT | Invoice and proof-of-payment upload |

**Reconciliation flow.** Invoice generated and shown in admin Billing →
customer pays. EFT: customer uploads proof of payment → platform support
reviews and confirms → reconciliation recorded. Card: Adumo redirects back →
server validates the response token → payment recorded against the invoice →
subscription activates through the same payment-gated go-live path as EFT.

**As built (2026-10-01).** Customer clicks "Pay by card" on an open invoice →
admin `GET /api/billing/card-payment/:invoiceId` asks the API to start the
payment (amount = invoice less confirmed payments and credit notes; a
`payment_transaction` at `initiated`, method `card`, whose id is the Adumo
merchant reference) and auto-posts the signed form to Adumo → Adumo posts the
result to admin `POST /api/billing/card-payment/return`, which relays it to
`POST /public/payments/adumo/result` → the API verifies the HS256 response
token (signature, merchant and application ids, expiry), matches reference and
amount, and moves the payment from `initiated` to `confirmed` or `failed` in
one conditional update, so the browser return and Adumo's `notificationURL`
webhook cannot both apply it. Confirmed: reconciliation row (reviewer
`00000000-0000-0000-0000-000000000000` = automated), invoice paid, receipt
email. Failed: reconciliation row `rejected`, invoice stays open. Stored: Adumo
transaction index, status, result code and masked PAN only. Subscription
go-live is unchanged (ops, with KYB). The card button shows only when the API
reports card payments configured and the invoice is not paid or void. The
sandbox merchant authorises in ZAR; a Namibian merchant account should
authorise in NAD (set `AuthoriseCurrencyCode` if multi-currency is enabled).
The proof-of-payment endpoint now also checks that the invoice belongs to the
caller's organisation.

#### CRM for visitor management

Checkpoint's CRM is a **visitor relationship and presence** system, not a
sales pipeline: the core entity is the visit. Returning visitors are
recognised by proving they hold a credential or reference (NFC badge,
pre-registration QR, visit reference plus phone OTP, front-desk assisted
lookup), never by searching a list of previous visitors. The platform-side
sales CRM (contacts, deals, activity) lives in the ops console and is
separate from visitor data.

CiMSO INNterchange is the first existing-system adapter: fixed 32-byte header
plus JSON payload (optionally Zlib-compressed) over TCP/IP with optional TLS.
Visitor-relevant messages: Get Bookings (1101/1102), Get Booking (1103/1104),
Set Booking (1105/1106), Unit Type Info (6/7), Get Facilities (501/502), Get
Staff (58/59). The adapter synchronises expected arrivals, hosts and room
assignments; it never replaces the PMS. `pms_*` tables are tenant-namespaced.

#### ETL quality and design patterns

Validation layers, applied in the pipeline rather than after it:

1. **Schema conformance:** types, nullability, constraints (migration-defined).
2. **Referential integrity:** fact rows reference organisations, sites and type definitions.
3. **Statistical checks:** value ranges and anomaly flags (to add as volume grows).
4. **Cross-store consistency:** raw non-deleted visits in the window must equal `sum(check_in_count)` in `visit_daily_fact`, or the run fails with both numbers recorded. Built.
5. **Freshness:** ops ETL panel shows the last run; stale runs are visible. Built.

| Pattern | Use | Checkpoint |
|---|---|---|
| Batch | Hourly or nightly rollups | Built: hourly incremental plus backfill |
| Streaming | Sub-minute needs | Not used; on-site roster reads live rows |
| Hybrid | Live plus historical | Built: live roster and overview chart, historical facts |
| Idempotency | Safe re-runs | Built: zero the window, then upsert on a unique grain |
| Watermarking | Late-arriving data | Built: window widened to days touched by visits accepted since the last successful run |

#### Reporting

| Report | Audience | Format as built | Frequency |
|---|---|---|---|
| Visitor roster | Front desk, security | Live screen; CSV `GET /visits/roster/export` | Real-time |
| Visitor history | Site manager, compliance | Date-range search; CSV | On demand |
| Compliance dashboard | Compliance officer | Live screen | Live |
| Device compliance register | System administrator | Live screen | Live |
| Emergency roll call | Security, emergency coordinators | Live screen | Real-time |
| Evidence pack | Auditor, regulator | JSON `GET /evidence/:id/download`; readable HTML report `GET /evidence/:id/report` (print to PDF) | On demand |
| Analytics | Property admin | Live screen; CSV `GET /analytics/export.csv` or XLSX `GET /analytics/export.xlsx` (aggregates, audit-logged) | Hourly refresh |
| Platform analytics | Ops | Live screen (ETL health, arrival statistics, trends) | Hourly refresh |

Correction to the guide: there is no server-rendered PDF evidence pack
today; the evidence report is HTML printable to PDF. XLSX sits alongside CSV
for the visitor roster (`GET /visits/roster/export?format=xlsx`) and
analytics exports. CSV text cells that start with `= + - @` are
apostrophe-prefixed so a visitor-supplied name cannot run as a spreadsheet
formula.

**Target KPIs** (targets, not measured results):

| Area | Metric | Target |
|---|---|---|
| Visitor funnel | Check-in completion (completed / started) | ≥90% |
| Visitor funnel | Median check-in duration | ≤2 min |
| Visitor funnel | Host notification delivered / attempted | ≥95% |
| Visitor funnel | Offline sync success | ≥99% |
| Visitor funnel | Paper-register fallbacks per week | Trending down |
| Compliance | Retention actions executed within policy window | 100% (scheduler not yet built) |
| Compliance | Data subject request resolution | ≤30 days |
| Compliance | Audit events with hash chain intact | 100% |
| Compliance | Devices `approved_for_deployment` before activation | 100% |
| Platform | API availability | ≥99.9% |
| Platform | Notification delivery (sent / queued) | ≥98% |
| Platform | ETL reconciliation difference | 0 |

**Evidence pack components for regulated clients** (what the pack should grow
to include; today's pack holds the RBAC matrix, retention report, audit
extract and visitor access extract): architecture diagram, data-flow map,
device inventory, patch and MDM compliance report, offline-sync exception
report, incident register, vulnerability-management summary, supplier
register, disaster-recovery test evidence, identity-verification
configuration status, annual control-effectiveness report.

#### Dashboards

| Dashboard | Audience | Key content | Refresh |
|---|---|---|---|
| Front desk | Reception, security | On site now, pending approval, expected today, check-out actions | Live |
| Overview | Property admin | Four KPIs, 90-day visit activity, on-site roster | Live |
| Analytics | Property admin | KPIs, arrivals trend with forecast band, busy-hours heatmap, channel and visitor-type shares | Hourly |
| Compliance | Compliance officer | Retention actions due, open data requests, privileged access events, offline sync exceptions | Live |
| Device compliance register | System administrator | Model, CRAN status, MDM status, firmware, review date | Live |
| Emergency roster | Security | On site by site and zone, host, roll-call status | Live |
| Ops console | Platform support | Organisation health, churn queue, CRM, billing, KYB, ETL health, arrival statistics | Live / hourly |

Layout rules: one chart, one message, with a finding as the title; actual
before forecast; at most four KPI tiles in a row, with one primary metric;
mix content types in a viewport (KPIs, chart, table); top-down reading order;
group views by task; five to seven panels per screen at most.

| Component | Where | Purpose |
|---|---|---|
| `TrendWithForecast` | Admin analytics | Arrivals line, dashed forecast, shaded likely range |
| `BusyHoursHeatmap` | Admin analytics | Weekday by hour; empty cells stay blank |
| `ShareBars` | Admin analytics; ops | Ranked horizontal bars, lead item emphasised; never a pie chart |
| `TrendChart` | Ops | Line with end label and % change |
| `ScoreScatter` | Ops | Health score against MRR |

#### UI patterns for scores, predictions and errors

Applies wherever the product shows a score or a model output (health score,
forecast, any future classifier):

- **Trust calibration:** show a confidence label or range (the forecast band
  and its backtest error are the current example); cite the source under
  every chart; hedge generated text.
- **Explainability:** name the inputs that drove a score (the health-score
  inputs are stored on each snapshot), give a plain one-sentence reason.
- **Progressive autonomy:** start at suggestion or approve-then-act. Identity
  decisions on the kiosk stay at levels 1–2; automatic check-in after a valid
  NFC badge may run act-then-review with an undo.
- **Graceful failure:** say an error happened, never blame the user, keep it
  brief, give the next step, and return control. This matches the copy rules
  already applied to check-in and billing errors.

#### Data science guidance (for future models)

No machine-learning model runs in production today: the health score is a
weighted scorecard and the forecast is a seasonal mean with a backtest. When
models are added, follow CRISP-DM (business understanding, data
understanding, preparation on PII-free rollups, modelling, evaluation by
expected value, deployment), evaluate on holdout data with k-fold
cross-validation, check learning and fitting curves, regularise (L1/L2) or
prune trees, and prefer ensembles for high-variance models. Candidate uses:
visitor-type prediction from booking source, channel, host department and
time of day (naive Bayes evidence lifts as a baseline); dwell-time
regression; capacity clustering; anomaly detection on offline sync and device
compliance.

#### Public-sector tender pack (Public Procurement Act 15 of 2015)

Company registration and tax documents; technical architecture; security
architecture; CRAN equipment compliance register; data-flow map; privacy and
retention model; offline and business-continuity design; RBAC matrix;
identity-verification integration status statement; SLA and support model;
hardware asset lifecycle plan; supplier register; data portability and exit
plan; implementation methodology; training plan; annual assurance-report
template.

#### Quality gates: no production stubs

Every production endpoint performs the control it claims. Forbidden in
`backend/src`: in-memory arrays standing in for storage, static
`{ valid: false }` validation, no-op jobs returning `{ processed: 0 }`, empty
guards, client-controlled tenant prefixes, raw identity payloads. Release
check:

```bash
rg "TODO|FIXME|private .*\[\].*= \[\]|return \{ processed: 0 \}|return \{ valid: false \}|storage\.example\.com|@UseGuards\(\)" backend/src
```

Output must be empty apart from permitted test fixtures.

#### Open work (status corrected against the build, 1 October 2026)

| Item | Status | Path |
|---|---|---|
| Retention purge/archive scheduler | **Built** (2026-10-01) | Opt-in worker (`RETENTION_DISPOSITION_ENABLED`); dry-run first. Analytics backfills count live visits only, so disposed history drops out of rebuilt facts |
| DigiNam relying-party adapter | Not started | Approved relying-party arrangement and tested interface |
| National e-ID NFC adapter | Not started | Official protocol and interoperability testing |
| SMS confirmation gateway | Not started | Live provider contract |
| USSD aggregator | Not started | Licensed operator or aggregator arrangement |
| Badge printing | Not started | Printer SDK and device path |
| Contractor induction schema (Release 1.5) | Not started | Safety induction workflow |
| Analytics ETL and dashboards | **Built** (2026-09-30) | §11.1b; the guide listed this as deferred |
| Evidence report | **Built** (2026-09-30) | Readable HTML from the JSON pack |
| Card payments | **Built and deployed** (2026-10-01); off until Adumo merchant credentials are set (result route answers 503 meanwhile) | Adumo Online Virtual hosted page: `POST /platform/billing/invoices/:id/card-payment`, result at `POST /public/payments/adumo/result` (signed token verified; reference and amount matched; applied once), migration `0042_card_payments.sql`. Tested against Adumo staging with test cards on a Neon branch. Recurring tokens later. |
| XLSX export | **Built** (2026-10-01) | Roster and analytics, same audit actions as CSV |
| Live dashboard push (WebSocket/SSE) | **Built** (2026-10-01) | `GET /visits/roster/stream` (ids only, tenant-filtered) drives Front Desk and Emergency refresh; in-process emitter, single instance only |
| Web security headers | **Built and deployed** (2026-10-01); verified on all three live sites | See "Security headers" below |
| Index integrity audit (post-0008 rename) | **Built** (2026-10-02) | Migration `0047_index_integrity.sql`. Verified by replaying all migrations into an empty Postgres and diffing against production: 333 of 333 indexes, 1,140 of 1,140 columns and 527 of 527 constraints identical; 0 triggers, 0 cascades, 0 CHECK constraints. CI now replays every migration on each push |
| Migration replay from scratch | **Fixed** (2026-10-02) | `0009_canonical_rename_cleanup.sql` dropped `visit_invitation` before `visit`, which references it, so a fresh environment could not be built. Drop order corrected; end state identical |
| Reserved-email-domain guard on scheduled reports | **Built** (2026-10-02) | `scheduled-reports.service.ts`; RFC 2606/6761 names (`*.test`, `example.com` and similar) skipped; unit-tested |
| Tenant-with-real-domain audit | **Done** (2026-10-02) | Report recipients come only from `application_users`. All 11 production organisations are test organisations; their user domains are `buffranalytics.com` (Buffr's own), reserved test domains, or `testbank.na` (both Test Bank Namibia organisations have reports switched off). No customer domain is involved yet. Rerun before each new demo account: `SELECT o.id, coalesce(o.trading_name, o.legal_name), string_agg(DISTINCT split_part(lower(u.email), '@', 2), ',') FROM organisations o JOIN application_users u ON u.organisation_id = o.id AND u.deleted_at IS NULL WHERE o.deleted_at IS NULL GROUP BY 1, 2;` |
| Soft-delete shadowing guard | **Built** (2026-10-02) | `src/common/guards-static/soft-delete-lookups.spec.ts` fails the build when a business-key `findFirst` on a soft-deletable table ignores `deleted_at`. Two deliberate exceptions are listed with reasons (staff reinstatement; registration, where the email unique index spans deleted rows). Proven by removing the credential fix: the test failed, then passed when restored |
| Anomaly alert review (acknowledge, dismiss, reopen) | **Built** (2026-10-02) | Migration `0048_anomaly_alert_review.sql`; see the anomaly section below |
| Ops Sentry tenant scrubbing, verified | **Built** (2026-10-02) | `ops-console/src/lib/observability/scrub-pii.test.ts` sends a fake organisation name, amount, KYB reference, session id, invoice number and MRR through every event field and asserts none survive. The scrubber now covers extra, contexts, tags, request data and breadcrumb data (admin too) |
| First scheduled report delivered | **Confirmed** (2026-10-02) | Ops daily summary run `succeeded` at 07:01:59 Windhoek; outbox row `pending > sent` at 07:02:03 |
| Kiosk survey on emulator | **Verified** (2026-10-02) | Unit tests (4) for the sign-out view model; Compose UI tests (2) on the Pixel Tablet emulator (Android 15): all five ratings render, a tap reports the code, Skip finishes. Ships with the next scheduled kiosk build |

**Production database state (1 October 2026).** Migrations `0041_analytics_etl`,
`0042_card_payments` and `0043_retention_disposition` are applied to the
production Neon branch (`falling-frog-15538162`, main). Each was checked after
applying: 0042 added 3 type codes, 4 payment columns and the unique processor
index; 0043 added 2 retention tables, 3 indexes, 4 type codes and the
`platform.retention.manage` grant.

**Production database state (2 October 2026).** Migrations `0044_visit_survey`,
`0045_anomaly_rules`, `0046_scheduled_reports` and `0047_index_integrity` are
applied to production, each run twice (idempotent) after a Neon branch test.
Checked: 8 new tables, 24 type codes, the 4 key unique and partial indexes,
and the 8 indexes of 0047. All 47 migration files are now reflected in
production: every table and column they define exists.

**Migration 0047 (index integrity, 2 October 2026).** An audit of production
against every migration file found that the 0008 canonical rename recreated
the tables but not some of their 0001 indexes. 0047 restores the open-visits
index behind the live roster (`idx_visitor_visits_org_site_open`) and the
unique live credential reference per organisation
(`uq_access_credentials_org_reference`; production had no duplicates), and
adds an `organisation_id`-leading index to the five tenant tables that had
none (credential entitlements and use events, feature-phone sessions, the
notification outbox, contact enquiries). After 0047, every table with an
`organisation_id` column has an index that starts with it. In the same pass,
credential validation now ignores soft-deleted credentials in the lookup
itself, so a revoked credential can never shadow a live one with the same
reference.

**Scheduled report recipients in production (2 October 2026).** Addresses on
reserved test domains (`*.test`, `example.com` and the other RFC 2606 names)
are skipped in code, since they cannot receive mail. The two "Test Bank
Namibia" demo organisations have both reports switched off (settings rows,
reversible on the admin Scheduled Reports page) because their users are on
`testbank.na`, a real domain.

**Deployed 1 October 2026:** API (Railway), website, admin and ops console
(Vercel) at commit `bf504ca`. Checked after deploy: API health 200, card
payment routes live (enabled route needs auth; result route 503 until Adumo is
configured), all five security headers present on the three web apps.

**Redeployed 1 October 2026** at `d053fda` (merged to `main`): API, website,
admin and ops console. Checked: API health 200; integration health, audit
export and payment register routes live and refusing unauthenticated calls
(401); admin and ops download relays 401 without a session; all three web
hosts 200.

**Redeployed 2 October 2026** at `e84991b` (merged to `main`, CI green):
API, website, admin and ops console, after migrations 0044-0047. Checked:
`/health` returns `{"status":"ok","database":"ok"}`; the survey options route
is public and serves the five ratings; a forged survey token gets 401; the
anomaly, report, satisfaction and integration routes refuse unauthenticated
calls (401); `/check-out`, admin and ops sign-in pages return 200; the API log
shows "Scheduled reports worker started". The first ops daily summary goes
out at 07:00 Windhoek, the first weekly digests on Monday 5 October.

**Redeployed 2 October 2026 (second pass)** at `0fe6bc4` (CI green, all six
jobs including the migration replay): migration `0048` applied to production
twice (1 table, 3 type codes, 1 index); API, admin and ops console deployed.
Checked: alert review route live (401 unauthenticated), `/health` reports the
database ok, report worker restarted, sign-in and `/check-out` pages 200. The
first ops daily summary was delivered at 07:02 Windhoek.

**Neon housekeeping (2 October 2026).** The two test branches used to
validate 0044-0048 (`test-0044`, `test-0044-0046`) were deleted after
confirming nothing referenced them (no repo, env or Vercel references; the
Vercel database variables predate them). Neither was a clean rollback point:
both were modified during testing. A manual snapshot of production after
0048, `post-0048-2026-10-02` (`snap-curly-shape-b1j0b8pm`), is the named
rollback point; the free plan allows one manual snapshot, and point-in-time
restore keeps 6 hours of history (`history_retention_seconds` 21600). The
project now has only the `main` branch.

#### Security headers (v2026-10-01)

The website, admin and ops console send, on every route (`headers()` in each
`next.config`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()` (no page uses
them), and a baseline `Content-Security-Policy` of `frame-ancestors 'none';
object-src 'none'; base-uri 'self'; form-action 'self'`. Admin's `form-action`
also allows `https://*.adumoonline.com`, because the card hand-off posts to
Adumo and Adumo redirects to its gateway host. HSTS comes from Vercel. The API
already sets its headers with `helmet`. A full `script-src` policy is a
separate step: it needs nonces for Next.js inline scripts and allowances for
Sentry and PostHog, and should start in report-only mode. Check after a deploy:

```bash
for u in https://buffrcheckpoint.com https://admin.buffrcheckpoint.com/auth/login https://ops.buffrcheckpoint.com/login; do curl -sI "$u" | grep -iE "x-frame|content-security|x-content-type|referrer-policy|permissions-policy"; done
```

#### Gap closure: KPI, reporting and runbook commitments (v2026-10-01; framing corrected v2026-10-02)

Engineering and operations items that this document already commits to (the
§8.7 sign-out micro-survey, the §11.1b live roster, the §11.1c reporting table
and runbook, the §11.8.10 launch gate) but that had no implementation at the
1 October 2026 audit. Each is justified by a commitment in this document.

| Item | Status | Closure evidence |
|---|---|---|
| CI pipeline | **Built** (2026-10-01) | `.github/workflows/ci.yml`: per app, typecheck (with `next typegen` for the Next.js apps), tests, build (blocking); gitleaks secrets scan (blocking); Biome lint and `npm audit` reporting only until the existing lint findings are cleared. SAST not yet added |
| Integration health panel | **Built** (2026-10-01; extended 2026-10-02) | `GET /platform/integrations/health`; ops overview panel. Live probes (5 s timeout, never throws): database, document storage, Resend, notification outbox (24 h), analytics ETL freshness, CiMSO sync runs (24 h), Adumo gateway, invoice bank details, anomaly alerts (24 h count), scheduled report runs (7 days). Latency is per check, not p95 |
| Exports (CSV and XLSX) | **Built** (2026-10-01) | Audit log (`GET /audit/events/export`, verified email required, hash-chain columns); payment register for ops (`GET /platform/billing/payments/export`); roster (`GET /visits/roster/export?format=xlsx`); analytics (`GET /analytics/export.xlsx`). All audit-logged through one helper with the formula-injection guard (D-13) |
| KPI targets in context | **Built** (2026-10-01; satisfaction row 2026-10-02) | Ops overview "Service levels against targets": notification delivery (≥98%, 4 weeks), ETL reconciliation (difference 0), open incidents (0), devices approved (100%), visitor satisfaction (average ≥ 4.0 of 5 over 28 days, needs 10 ratings). Targets in `ops-console/src/lib/targets.ts`; "no data" is never shown as met |
| Health check for uptime monitors | **Built and deployed** (2026-10-02) | `GET /health` now probes the database (3 s) and returns 503 `{status: "degraded", database: "down"}` when it fails, so a monitor cannot see 200 during a database outage |
| Ops console Sentry | **Built** (2026-10-01; tenant scrubbing 2026-10-02) | Same setup as admin, stricter: no Session Replay, no local variables, and the scrubber also redacts organisation names, amounts, KYB, bank and support-session fields. DSN set on the Vercel ops project (`SENTRY_ENVIRONMENT=production-ops`) |
| Visitor satisfaction micro-survey (§8.7) | **Built and deployed** (2026-10-02), migration `0044`; kiosk screen ships with the next kiosk build | See below |
| Live anomaly alerts (§11.1b) | **Built and deployed** (2026-10-02), migration `0045` | See below |
| Scheduled reports (§11.1c reporting) | **Built and deployed** (2026-10-02), migration `0046`; worker on (`SCHEDULED_REPORTS_ENABLED=true`) | See below |
| Notification matrix, runbook, decision log | **Done** (2026-10-01; updated 2026-10-02) | Below |
| Uptime monitor | Open: George creating the Better Stack account | See the runbook below. No code needed |
| Authenticated walkthrough | Open: waiting on sign-in | Checklist below. Nothing goes past pilot without it |

**Invoice bank details (2026-10-01).** If `BILLING_BANK_ACCOUNT_NUMBER` or
`BILLING_BANK_BRANCH_CODE` is missing, the API logs an error at startup and
the ops integration health panel shows "Invoice bank details: down". The
admin invoice page shows the bank details and the invoice number as the
payment reference (`GET /platform/billing/payment-instructions`); when they
are not configured it tells the customer to contact the team instead.
Configured in Railway on 1 October 2026 from Bank Windhoek's account
confirmation letter (29 August 2025): Bank Windhoek, Ongwediva branch,
Buffr Financial Services CC, branch code 485-673, registration CC/2024/09322.
The API started without the missing-details error.

**Schema sign-off.** George approved the three schemas below on 1 October
2026 ("approve all three") and the full scope on 2 October 2026, as CLAUDE.md
§2 requires for new tables. Each migration was applied twice to a Neon branch
of production (idempotent) before production.

##### Visitor satisfaction micro-survey (migration `0044_visit_survey.sql`)

The commitment: §8.7 "Optional short satisfaction micro-survey is offered".
The target, adopted on 2 October 2026: average rating of at least 4.0 out of 5
over 28 days, judged only once there are 10 or more ratings.

- Tables: `visit_survey_responses` (rating as a `satisfaction_rating` type
  code whose `sort_order` is the score 1-5; `survey_response_status`;
  `capture_channel`), `visit_survey_response_status_events` (append-only),
  and `visit_survey_daily_fact` (PII-free rollup).
- One response per visit (unique on organisation and visit); a repeat submit
  is accepted and ignored.
- Offered only at visitor sign-out: web `/check-out` and the kiosk sign-out
  screen (skip button, returns to the welcome screen after 20 s). Never at
  check-in and never on emergency sign-out, which is a staff action.
- Proof of the visit: the sign-out response carries a signed survey token
  (HMAC with the server pepper, 24 h, records the channel). No table, no
  visitor data. Forged or expired tokens get 401.
- Rating only. No free-text comment in v1: a public free-text box collects
  names and health details outside the encrypted envelope. A comment, if
  ever added, goes through the protected personal-data envelope in its own
  additive migration with a per-site switch that defaults to off.
- Reporting: the analytics ETL rolls ratings into `visit_survey_daily_fact`
  by the site's local date and reconciles raw responses against the rollup on
  every run (a mismatch fails the run). Customers see it on the admin
  Analytics page (`GET /analytics/satisfaction`); ops sees the platform-wide
  average only (`GET /platform/dashboard/satisfaction`).
- Retention: the response holds no personal data, so it stays when the visit
  is disposed.

##### Live anomaly alerts (migration `0045_anomaly_rules.sql`)

The commitment: the §11.1b live roster, "alerts for suspicious check-in
patterns (same phone repeatedly, after-hours restricted zones)". Two rules,
evaluated in the API on every check-in from the `visit.roster_changed` signal:

| Rule | Fires when | Default | Per-site override |
|---|---|---|---|
| `repeat_phone_window` | The same phone (lookup HMAC) checks in N times within M minutes at one site | N = 3, M = 30 | Yes |
| `after_hours_restricted_zone` | A check-in to a zone at risk tier 3 (sensitive) or above happens outside the site's visitor hours | Hours 07:00-18:00 site-local, any one check-in | Yes, including the hours |

- `site_anomaly_rule_configurations` holds overrides; a site with no row uses
  the defaults, so no site is unmonitored. `anomaly_alert_events` is
  append-only and holds references only (rule, site, visit id, lookup HMAC,
  non-personal context such as the local time and zone tier).
- One alert per subject per window: further check-ins inside the same window
  do not raise more alerts.
- Alerts never block, delay or deny a visitor (§7.2 guardrail), and a rule
  failure is logged without affecting the check-in.
- Where alerts go: the admin **Anomaly Alerts** page for the organisation's
  own staff (site-scoped users see their site only), with the per-site rule
  settings (`site.configure` permission). Not email: a live signal belongs on
  a screen the desk watches. Buffr ops sees only a platform-wide 24-hour count
  in integration health, because the customer's staff are the ones who act.
- Review (migration `0048_anomaly_alert_review.sql`): staff acknowledge,
  dismiss or reopen an alert. Alerts stay append-only, so each review is a new
  row in `anomaly_alert_status_events` and the current state is the latest
  row (none means open). The admin page lists open alerts by default with an
  Open / All filter. Verified on a Neon branch: acknowledge and dismiss
  removed both alerts from the open list, reopen restored one, an unknown
  status got 400, another organisation 404 and another site 403.
- API: `GET /anomaly-alerts?state=open|all`, `POST /anomaly-alerts/:id/review`
  (audited), `GET /sites/:siteId/anomaly-rules`,
  `PUT /sites/:siteId/anomaly-rules/:ruleCode` (audited).

##### Scheduled reports (migration `0046_scheduled_reports.sql`)

| Report | Recipients | Format | When (Africa/Windhoek) |
|---|---|---|---|
| Ops daily summary | The ops inbox (`CONTACT_OPS_EMAIL`) | Email body plus CSV of every integration check | Daily from 07:00 |
| Site manager weekly digest | Verified users holding `owner_operator` or `site_manager` (default) | PDF attachment | Mondays from 07:00, covering the previous Monday to Sunday |
| Board and compliance monthly pack | Verified users holding `owner_operator` or `compliance_audit_officer` (default) | PDF attachment, adds audit and retention figures | 1st of the month from 07:00, covering the previous month |

- Each organisation can switch a report off or change the recipient roles on
  the admin **Scheduled Reports** page (`membership.manage` permission).
  Recipients are roles resolved to verified users of the same organisation at
  send time: never visitors or hosts, never typed-in addresses.
- Content is totals only from the fact tables and counts: check-ins by site,
  offline captures, open visits, host-notification delivery, satisfaction,
  anomaly alerts, and (monthly) audit events and retention runs.
- `scheduled_report_run` (with its status log) claims each report, organisation
  and period once, so a restart or a second instance never sends twice. An
  organisation with no verified recipients is recorded as `skipped` with the
  reason.
- Delivery goes through the notification outbox (retry, backoff, status
  events). The worker is opt-in: `SCHEDULED_REPORTS_ENABLED=true`.

Verified on a Neon branch of production (2 October 2026): both anomaly rules
fired once each and not again on re-evaluation; survey submit recorded, the
repeat was ignored and a forged token got 401; the ETL reconciled 18 of 18
visits and the survey rollup; the Monday and 1st-of-month ticks sent the ops
summary, 7 weekly digests and 7 monthly packs, skipped 4 organisations with no
verified recipients, and a second tick in the same period sent nothing.

##### Authenticated verification pass (open)

Code that builds is not the same as screens that work. Run as a real user,
signed in:

- Ops: Overview (integration health shows no false "down"; Adumo reads "not
  configured"; service levels), Analytics (ETL runs, arrival statistics with
  suppression), Billing (payment register CSV and Excel).
- Admin: Audit Log (CSV and Excel; hash columns present; a cell starting
  with `=` is neutralised), Analytics (satisfaction line), Anomaly Alerts
  (list and rule save), Scheduled Reports (toggle and roles), an invoice
  detail page (bank details and reference).
- Negative checks: a site-scoped user cannot see another site's alerts or
  exports; an unverified account gets 403 on exports.
- Website: `/check-out` shows the rating after sign-out. Kiosk: sign-out shows
  the rating, Skip works, and it returns on its own after 20 s.

#### Notification matrix (v2026-10-01)

Every message goes through the notification outbox
(`notification_delivery_instructions`): written first, then delivered by the
dispatcher. A failed send retries with exponential backoff (30 s doubling,
capped at 1 hour) up to 5 attempts, then the row is marked `failed` and shows
in the ops integration health panel. Email (Resend) is the only live channel;
SMS, USSD and WhatsApp are registered channel codes with no provider yet, so
there is no automatic channel fallback today. The fallback for a host who
misses an arrival is the escalation rule, not another channel.

| Event | Template | Recipient | Channel | Raised in |
|---|---|---|---|---|
| Visitor checked in | `host_visitor_arrived` | Host | Email | `notifications/visit-checked-in.listener.ts` |
| Host has not acknowledged | `host_escalation` | Escalation contact | Email | `host-notification-escalation/` |
| Email verification | `email_verification` | User | Email | `auth/auth.service.ts` |
| Password reset | `password_reset` | User | Email | `auth/auth.service.ts` |
| Password changed | `password_changed` | User | Email | `auth/auth.service.ts` |
| MFA enabled | `mfa_enabled` | User | Email | `auth/auth.service.ts` |
| Account locked | `account_lockout` | User | Email | `auth/auth.service.ts` |
| Suspension warning | `suspension_warning` | Organisation owner | Email | `auth/auth.service.ts` |
| Organisation created | `org_welcome` | Organisation owner | Email | `onboarding/onboarding.service.ts` |
| Organisation created | `ops_new_organisation` | Ops | Email | `onboarding/onboarding.service.ts` |
| KYB submitted | `kyb_submitted_ack` | Organisation owner | Email | `kyb/kyb.service.ts` |
| Invoice issued | `invoice_issued` | Billing contact | Email (PDF attached) | `billing/billing.service.ts` |
| Invoice overdue | `invoice_reminder` | Billing contact | Email | `billing/billing.service.ts` |
| Proof of payment uploaded | `pop_received_ack` | Billing contact | Email | `billing/billing.service.ts` |
| Proof of payment uploaded | `pop_received_ops` | Ops | Email | `billing/billing.service.ts` |
| Proof of payment rejected | `pop_rejected` | Billing contact | Email | `billing/billing.service.ts` |
| Payment confirmed (EFT or card) | `payment_confirmed` | Billing contact | Email | `billing/billing.service.ts` |
| Receipt issued | `receipt_issued` | Billing contact | Email (PDF attached) | `billing/billing.service.ts` |
| Subscription activated | `subscription_activated` | Organisation owner | Email | `billing/billing.service.ts` |
| Support access requested | `support_access_request` | Organisation owner | Email | `support-sessions/support-sessions.service.ts` |
| Ops staff invited | `platform_staff_invitation` | New staff member | Email | `platform-staff/platform-staff.service.ts` |
| Website enquiry | `ops_contact_enquiry` | Ops | Email | `contact/contact.service.ts` |
| Website enquiry | `ops_contact_ack` | Enquirer | Email | `contact/contact.service.ts` |
| Daily, 07:00 Windhoek | `scheduled_ops_daily_summary` | Ops inbox | Email (CSV attached) | `scheduled-reports/scheduled-reports.service.ts` |
| Mondays, 07:00 Windhoek | `scheduled_site_manager_digest` | Organisation roles chosen on the Scheduled Reports page | Email (PDF attached) | `scheduled-reports/scheduled-reports.service.ts` |
| 1st of the month, 07:00 Windhoek | `scheduled_board_compliance_monthly` | Organisation roles chosen on the Scheduled Reports page | Email (PDF attached) | `scheduled-reports/scheduled-reports.service.ts` |

Anomaly alerts are deliberately not emailed: they appear on the admin Anomaly
Alerts page, and ops sees a 24-hour count in integration health.

#### Deploy, rollback and monitoring runbook (v2026-10-01)

| Surface | Host | Deploy | Rollback |
|---|---|---|---|
| API | Railway, service `api` | `cd backend && railway up --service api --detach` | Railway dashboard: previous deployment, "Redeploy" |
| Website | Vercel `buffrcheckpoint.com` | `cd website && vercel --prod --yes` | `vercel rollback` or promote the previous deployment in the dashboard |
| Admin | Vercel `admin.buffrcheckpoint.com` | `cd admin && vercel --prod --yes` | As website |
| Ops console | Vercel `ops.buffrcheckpoint.com` | `cd ops-console && vercel --prod --yes` | As website |
| Database | Neon `falling-frog-15538162`, branch main | Apply `backend/db/migrations/NNNN_*.sql` in order; test on a Neon branch first | Migrations are forward-only. To undo data damage, restore the branch to a point in time in Neon (history window) or write a corrective migration |

Order for a release with a migration: migration first (every migration is
additive, so the running code keeps working), then the API, then the web
apps. After every deploy:

```bash
curl -s -o /dev/null -w "api %{http_code}\n" https://api.buffrcheckpoint.com/health
for u in https://buffrcheckpoint.com https://admin.buffrcheckpoint.com/auth/login https://ops.buffrcheckpoint.com/login; do curl -s -o /dev/null -w "$u %{http_code}\n" "$u"; done
```

Then open the ops overview: integration health should show nothing down, and
the service level panel shows any target missed.

**Health check semantics (2026-10-02):** `GET /health` returns
`200 {"status":"ok","service":"buffrcheckpoint-backend","database":"ok"}` when
the database responds within 3 seconds, and
`503 {"status":"degraded","service":"buffrcheckpoint-backend","database":"down"}`
when it does not. Uptime monitors must alert on any non-200. This closes the
"200 with a dead database" failure mode.

Uptime monitor (to set up in Better Stack or UptimeRobot, 1-minute interval,
alert after 2 consecutive failures, to email plus SMS or WhatsApp):

| Check | URL | Expect |
|---|---|---|
| API | `https://api.buffrcheckpoint.com/health` | 200 and body contains `"database":"ok"` (503 means the database is down) |
| Website | `https://buffrcheckpoint.com` | 200 |
| Admin | `https://admin.buffrcheckpoint.com/auth/login` | 200 |
| Ops console | `https://ops.buffrcheckpoint.com/login` | 200 |

Monitoring today: Sentry on the API, website, admin and ops console
(`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`). The ops console is stricter than
admin because it shows data across organisations: no Session Replay, no local
variables on server stack frames, and the same PII scrubber in `beforeSend`.
Ops reports nothing until `NEXT_PUBLIC_SENTRY_DSN` is set on its Vercel
project. Alert rules to
set in Sentry: a new issue in production, and more than 10 errors in 5 minutes
on the API. Not yet in place: an external uptime monitor on `/health` and the
three web hosts (every 1 minute, alert after 2 failures).

Environment variables are set per platform, never committed. The API's
variables live in Railway; each web app's in its Vercel project. Optional
features stay off until their variables are set: card payments
(`ADUMO_MERCHANT_ID`, `ADUMO_APPLICATION_ID`, `ADUMO_JWT_SECRET`), retention
disposition (`RETENTION_DISPOSITION_ENABLED`), scheduled reports
(`SCHEDULED_REPORTS_ENABLED`), CiMSO (`CIMSO_*`), form AI
(`FORM_AI_ENABLED`, `NEON_AI_GATEWAY_*`), telecom webhooks
(`TELECOM_WEBHOOK_SECRET`).

#### Decision log (v2026-10-01)

Standing decisions. A change to any of these is a new numbered entry, not an
edit.

| No. | Decision | Why |
|---|---|---|
| D-01 | Wiebe schema rules: type codes in `type_definition`, a status log beside every stateful table, soft deletes, client-generated UUIDs, NUMERIC money | Adding a value is an insert, history is never lost, retries are safe |
| D-02 | No database triggers, stored procedures or cascades; all business logic in the API | One place to read and test behaviour |
| D-03 | Tenancy column on every operational table; every index starts with it | Isolation between organisations is structural, not a filter someone can forget |
| D-04 | Audit events are hash-chained and append-only | Tampering is detectable; the chain can be checked outside the product (export includes hashes) |
| D-05 | Visitor personal data is encrypted per subject; disposal is crypto-shredding | Retention can be honoured without breaking audit or aggregate history |
| D-06 | Bank transfer with proof of payment is the default; card payments use Adumo Online's hosted page, never handling card data | Keeps Checkpoint out of PCI card-data scope |
| D-07 | A card result is trusted only from Adumo's signed token, matched on reference and amount, applied once | The posted result alone can be forged |
| D-08 | Analytics read from PII-free fact tables built by the ETL, in Africa/Windhoek local time, reconciled on every run | Same numbers everywhere; a run that does not reconcile is marked failed |
| D-09 | Cross-organisation statistics suppress any cell below 5 | Small counts can identify a property or a person |
| D-10 | Retention disposition is opt-in per environment and has a dry run | Deleting and shredding cannot be undone |
| D-11 | Live roster push uses an in-process event stream (one API instance) | Simple until there is more than one instance; then move to a shared bus |
| D-12 | Baseline security headers on every web app; a full script CSP comes later, in report-only mode first | Protection now without breaking Next.js or third-party scripts |
| D-13 | Every export (CSV or XLSX) goes through one helper and is audit-logged | Formula injection is handled once; every download leaves a record |
| D-14 | The satisfaction survey is rating-only, offered only at visitor sign-out, proven by a signed token | No free text means no personal data outside the envelope; no table needed to prove the visit |
| D-15 | Anomaly rules alert people and never block a visitor; alerts go to the customer's admin, not to Buffr ops or email | §7.2 forbids automated denial; the customer's staff act on alerts |
| D-16 | Scheduled reports go only to verified users of the same organisation, chosen by role | No visitor data and no typed-in address can become a data-egress path |
| D-17 | Every scheduled job claims its period in a run table before sending | A restart or a second instance never sends the same report twice |

## 11.2 Recommended stack

| Layer | Recommendation | Reason |
|---|---|---|
| **Kiosk application** | Native Android application in Kotlin | Best NFC support, robust offline operation, device-level control, broad hardware choice. |
| **Offline store** | Encrypted SQLite/SQLCipher or encrypted Room database | Local resilience without retaining plain-text visitor data. |
| **Device management** | Android Enterprise-compatible MDM | Dedicated-device mode, remote lock/wipe, policy enforcement, OS update visibility. |
| **Admin web app** | Next.js, scaffolded from the [Next Shadcn Admin Dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) template (shadcn/ui + TanStack Table), installed at `admin/` | Responsive dashboards for operators, hosts, managers, and compliance teams. Template supplies routing, RBAC-gated layout, and data-table scaffolding only — the front-desk roster, compliance dashboard, and evidence-pack export in Section 10.4–10.5 are built as custom app code against the schema below, following the sibling `buffr-host/` project's structure for workspace consistency. |
| **Backend** | NestJS/TypeScript modular monolith | Revised from an earlier FastAPI/Python recommendation. NestJS's module/provider/guard/interceptor system is the TS framework structurally closest to FastAPI+Pydantic for this app's shape (RBAC enforcement, audit-chain hooks, visit-lifecycle state machines) — `@nestjs/swagger` covers the OpenAPI generation FastAPI gave for free. Unifying the admin app and backend on one language is a concrete, not cosmetic, benefit for a small team where individuals cover multiple technical roles (see Section 9.1a). |
| **Core database** | PostgreSQL + Drizzle ORM | Mature relational integrity, tenant/site scoping, row-level security, audit queries. Drizzle chosen over Prisma for its SQL-first fit with the hash-linked audit-chain and retention-timer queries (CTEs/window functions), and for consistency with `buffr-host/`'s existing Drizzle+Neon pattern in this workspace. |
| **Object storage** | S3-compatible encrypted storage — **Neon Object Storage** (`ARTIFACT_STORE=neon_s3`) as production primary on Frankfurt project `falling-frog-15538162` (`aws-eu-central-1`); **Vercel Blob** only as explicit degrade | Evidence packs, KYB, billing POP, DSAR. Storage branches with DB on Frankfurt. |
| **Admin form AI (optional)** | Neon AI Gateway (`FORM_AI_ENABLED`, OpenAI-compatible) behind NestJS `FormAiService` | Suggest/translate form field definitions only — never visitor PII; human review before publish. Does not replace NestJS workers or custom MFA. |
| **Identity / SSO** | Custom NestJS auth (TOTP MFA, lockout, challenge tokens); OIDC/SAML later via enterprise IdP | Managed Better Auth deferred — managed plugin set lacks TOTP MFA + lockout parity. |
| **Audit** | Append-only audit-event service, hash-linked event chain, immutable export storage | Better evidence without blockchain complexity. |
| **Messaging** | Adapter layer for MTC/direct provider or local aggregator; email as fallback | Avoid hard-wiring the product to one telecom provider. |
| **Observability** | OpenTelemetry, structured logs, uptime monitoring, SIEM forwarding | Required for operations, incident response, and assurance. |
| **Infrastructure** | Namibia-hosted private cloud, client private cloud, or on-premise for regulated deployments | Supports residency and client control requirements. Neon Object Storage / AI Gateway / Functions are currently Frankfurt/Ohio only — do not claim Namibia hosting from these primitives. |

## 11.3 Data model

```text
Organisation
  ├── Region
  │    └── Site
  │         ├── Device
  │         ├── Host / Staff Directory
  │         ├── Access Policy
  │         └── Retention Policy
  │
  ├── Visitor
  ├── Visit
  ├── Identity Verification Event
  ├── Credential / NFC Token
  ├── Notification Event
  ├── Emergency Event
  ├── Data Subject Request
  ├── Legal Hold
  └── Audit Event
```

### Essential data rules

- Separate `Visitor` from `Visit`.
- A one-time visitor does not automatically need a permanent profile.
- Store phone numbers encrypted; use a keyed token/hash for matching.
- Store NFC credential references, not personal details, on tags.
- Store only the identity-verification result and necessary attributes.
- Do not store biometrics in Version 1.
- Make national ID number fields disabled by default.
- Make photo capture disabled by default.
- Make “reason for visit” a configurable high-level category, not free text by default.

## 11.4 Proposed Repository Structure, Schema, and Wiring

> **Canonical table names (live today — v0.22+):** §11.4.5 / §11.4.5a keep the
> original proposal names for history. **Do not implement against those names.**
> Prefer §11.4.5c's rename table, or this short lookup:

| If you see (proposal / history) | Use (live Neon / Drizzle) |
|---|---|
| `visitor` | `visitor_subjects` + `visitor_personal_data` |
| `visit`, `visit_status_log` | `visitor_visits`, `visit_status_events` |
| `form_template*` / `form_field_definition` | `check_in_form_definitions`, `check_in_form_versions`, `check_in_form_fields` |
| `visitor_type_policy` | `visitor_categories` |
| `host` | `site_hosts` |
| `device` / `credential` | `managed_kiosk_devices` / `access_credentials` |
| `audit_event` | `audit_events` |
| `data_subject_request` | `privacy_requests` |
| `emergency_event` / `emergency_roster_snapshot` | `emergency_roll_call_events` / `emergency_roll_call_entries` |
| `organisation` / `site` / `zone` | `organisations` / `sites` / `security_zones` |

Full old→new map: §11.4.5c. Applied migrations and Neon project: §11.4.7.

This section documents the outcome of installing and auditing the admin-app
template chosen in Section 11.2, and proposes the concrete repository layout,
Drizzle schema, and wiring between the admin app, backend, and kiosk needed to
turn Section 11.1–11.3's architecture into a buildable monorepo.

### 11.4.1 Template audit: what `admin/` provides and what it does not

`admin/` was scaffolded from the [Next Shadcn Admin Dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)
template (Next.js 16, React 19, Tailwind v4, shadcn/ui, TanStack Table v9). A
full read of its source confirms it is **routing, layout, and component
scaffolding only** — it ships no backend, no database, no real authentication,
and no RBAC enforcement:

| Template piece | What it actually does | Implication |
|---|---|---|
| `src/proxy.disabled.ts` | Next.js middleware, present but **disabled by filename** (must be renamed to `proxy.ts` to run). Its only example code is a commented-out cookie check. | The route-protection layer (redirect unauthenticated users, gate `/dashboard/*`) does not exist yet — this is where session-cookie verification against the NestJS backend must be added. |
| `src/app/(main)/auth/_components/login-form.tsx`, `register-form.tsx` | Client-side `react-hook-form` + `zod` forms that, on submit, only show a `sonner` toast with the form values (`JSON.stringify(data)`). No network call. | Login/register are **UI shells**. They need a real `fetch`/API-client call to a NestJS `/auth/login` endpoint that sets an httpOnly session cookie. |
| `src/data/users.ts`, `src/app/(main)/dashboard/roles/_components/roles-table/data.ts` | Hardcoded arrays (`users`, `roles`) imported directly into server components (e.g. `roles/page.tsx` renders `<Roles roles={roles} />` from the static import). | Every "data" page in the template is fully static. There is no data-fetching layer, no API client, and no loading/error state pattern to reuse — these must be built. |
| `src/lib/data-table-features.ts` | A genuinely reusable TanStack Table v9 feature registry (sorting, filtering, faceting, pagination) shared across all table pages. | Worth keeping as-is — this is the one piece of real, reusable engineering in the template, and it's exactly what the front-desk roster and audit-log tables need. |
| `src/navigation/sidebar/sidebar-items.ts` | A typed nav-group/nav-item config consumed by `AppSidebar`. | Good extension point — replace its contents wholesale (Section 11.4.3) rather than editing the sidebar component itself. |
| `src/app/(main)/dashboard/layout.tsx` | Real, reusable shell: sidebar, header, theme switcher, account switcher, preference cookies (layout/theme only — not auth). | Keep as-is; `AccountSwitcher` currently renders the static `users` array and needs to be wired to the authenticated session instead. |
| `src/components/ui/*` | Full shadcn/ui primitive set (dialog, table, sidebar, form fields, command palette, etc.), already installed and themed. | Reusable wholesale for every Buffr Checkpoint screen. |
| `src/app/(main)/dashboard/{crm,finance,ecommerce,academy,logistics,infrastructure,file-manager,mail,chat,kanban,invoice,calendar,tasks,patient-monitoring}/*` and the entire `(legacy)` route group | Demo verticals unrelated to visitor management. | Delete outright (Section 11.4.3) rather than adapt — none of their data shapes match Section 11.3's data model. |

**Conclusion:** the template buys layout, theming, the sidebar/header shell,
the shadcn/ui component set, and a solid data-table feature registry. It does
not buy auth, RBAC, or data wiring — all of Section 9's access-control rules
and Section 11.3's data model still need to be built against a real backend.
This matches the plan already agreed in Section 11.2: the template is

### 11.4.1a Template demo data removal — completed

The following template demo assets have been removed from `admin/` and replaced
with Buffr Checkpoint product models or API-backed placeholders:

| Template demo asset | Action taken | Buffr Checkpoint replacement |
|---|---|---|
| `demoEvents` calendar events | Removed; file renamed `schedule-event.ts` | `CheckpointScheduleEvent` interface; calendar calls `GET /schedule?siteId=&from=&to=` |
| `recentCustomersSchema` / `recent-customers-table` | Replaced; moved to `components/features/visits/visit-roster-table/` | `VisitRosterRow` schema with privacy-first fields |
| `/dashboard/default` | Renamed to `/dashboard/overview` | Operational metrics + visit activity + roster preview |
| `performance-overview` / `subscriber-overview` / `metric-cards` | Renamed | `visit-activity-overview`, `on-site-roster-panel`, `operational-metric-cards` |
| `profile/` + `profile-data.ts` | Deleted (v0.29) | `/dashboard/account` via `GET /auth/me` |
| `coming-soon/` | Deleted (v0.29) | No placeholder product routes |
| `theme-switcher.tsx` | Deleted (v0.29) | Light-only Buffr Checkpoint preset |
| admin + website `sentry-example-page/` | Deleted (v0.29) | Verify Sentry via wizard / Route Handler test exception |
| Static `roles` array | Replaced; file renamed `types.ts` | `BuffrRole` type; page fetches from `GET /roles` |
| Static `users.ts` | Removed; file renamed `types.ts` | `UserRow` type; page fetches from `GET /users` |
| `data.json` demo fixture | Deleted | No static fixture; data comes from backend |
| Demo profile sub-components | Deleted (`profile-header.tsx`, `profile-overview.tsx`, etc.) | Account page renders from `MyAccount` |
| Calendar demo routes | `calendar/` page retained but stripped of demo events | Operational schedule calendar; no fake events |
| Finance/CRM/ecommerce demo routes | Not present in current tree (already absent) | N/A |

**No fake customer, employee, finance, HR, calendar, or role data ships in the
Buffr Checkpoint admin application.** All production routes now expect data from
real API endpoints. Static arrays have been replaced with empty placeholders and
TODO comments indicating the required backend calls.

**Remaining template assets retained (reusable shell only):**
- shadcn/ui primitives
- TanStack Table feature registry (`data-table-features.ts`)
- Dashboard shell (sidebar, header, layout)
- Form components, dialog/drawer components
- Pagination/filter controls
- Skeleton/empty/error components
- Authentication page styling
scaffolding, not a shortcut past the backend.

### 11.4.2 Monorepo structure — as built, verified against the real tree

Re-verified **2026-09-18** against the live filesystem under `buffrcheckpoint/`
(**full depth**, not `maxdepth 4`). Generated with directories pruned:
`node_modules`, `.next`, `.git`, `dist`, `build`, `.gradle`, `.vercel`,
`.turbo`, `coverage`, and `*.tsbuildinfo` / binary build artefacts. Local
`.env*` files are omitted from the published tree (secrets stay in the host
env panels — §11.7.8).

Top-level layout:

```text
buffrcheckpoint/
├── buffrcheckpoint.md     ← this document (source of truth)
├── admin/                 ← customer admin (Next.js + shadcn)
├── backend/               ← NestJS API + Drizzle/Neon migrations
├── website/               ← public marketing + visitor check-in
├── ops-console/           ← internal Platform Ops Console
├── kiosk/                 ← Android/Kotlin kiosk
├── scripts/               ← smoke + test harness
└── .claude/               ← local skills / Kotlin reference PDFs
```

Full project tree (max depth, pruned as above):

```text
buffrcheckpoint/
|-- .claude
|   |-- scheduled_tasks.lock
|   |-- settings.local.json
|   `-- skills
|       `-- data-warehouse-source-setup
|           |-- .posthog-wizard
|           |-- SKILL.md
|           `-- references
|               |-- COMMANDMENTS.md
|               |-- bigquery.md
|               |-- mysql.md
|               |-- postgres.md
|               |-- shopify.md
|               |-- snowflake.md
|               |-- sources.md
|               |-- stripe.md
|               |-- woocommerce.md
|               `-- wordpress.md
|-- .gitignore
|-- README.md
|-- admin
|   |-- .gitignore
|   |-- .husky
|   |   `-- pre-commit
|   |-- AGENTS.md
|   |-- CONTRIBUTING.md
|   |-- LICENSE
|   |-- README.md
|   |-- biome.json
|   |-- components.json
|   |-- media
|   |-- next-env.d.ts
|   |-- next.config.mjs
|   |-- package-lock.json
|   |-- package.json
|   |-- postcss.config.mjs
|   |-- public
|   |-- scripts
|   |   `-- verify-onboarding-copy.mjs
|   |-- sentry.edge.config.ts
|   |-- sentry.server.config.ts
|   |-- src
|   |   |-- app
|   |   |   |-- (main)
|   |   |   |   |-- auth
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- auth-layout.tsx
|   |   |   |   |   |   |-- check-email-form.tsx
|   |   |   |   |   |   |-- forgot-password-form.tsx
|   |   |   |   |   |   |-- login-form.tsx
|   |   |   |   |   |   |-- mfa-challenge-form.tsx
|   |   |   |   |   |   |-- mfa-setup-form.tsx
|   |   |   |   |   |   |-- register-form.tsx
|   |   |   |   |   |   |-- reset-password-form.tsx
|   |   |   |   |   |   `-- verify-email-client.tsx
|   |   |   |   |   |-- check-email
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- forgot-password
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- login
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- mfa
|   |   |   |   |   |   |-- challenge
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   `-- setup
|   |   |   |   |   |       `-- page.tsx
|   |   |   |   |   |-- register
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- reset-password
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   `-- verify-email
|   |   |   |   |       `-- page.tsx
|   |   |   |   |-- dashboard
|   |   |   |   |   |-- [...not-found]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _actions
|   |   |   |   |   |   |-- policy-device-actions.ts
|   |   |   |   |   |   `-- visit-ops.ts
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- header
|   |   |   |   |   |   |   |-- account-menu.tsx
|   |   |   |   |   |   |   |-- layout-controls.tsx
|   |   |   |   |   |   |   `-- search-dialog.tsx
|   |   |   |   |   |   |-- policy-create-sheets.tsx
|   |   |   |   |   |   `-- sidebar
|   |   |   |   |   |       |-- app-sidebar.tsx
|   |   |   |   |   |       `-- nav-main.tsx
|   |   |   |   |   |-- account
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- audit
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |   |-- audit-log-table.tsx
|   |   |   |   |   |   |   `-- types.ts
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- billing
|   |   |   |   |   |   |-- [id]
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- pop-upload-form.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- calendar
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- calendar.tsx
|   |   |   |   |   |   |   `-- schedule-event.ts
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- compliance
|   |   |   |   |   |   |-- legal-holds
|   |   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |   `-- legal-hold-controls.tsx
|   |   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |-- page.tsx
|   |   |   |   |   |   `-- privacy-requests
|   |   |   |   |   |       |-- _components
|   |   |   |   |   |       |   `-- dsar-controls.tsx
|   |   |   |   |   |       |-- actions.ts
|   |   |   |   |   |       `-- page.tsx
|   |   |   |   |   |-- credentials
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- devices
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- activate-device-button.tsx
|   |   |   |   |   |   |-- compliance
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- emergency
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- emergency-trigger-panel.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- evidence
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |   `-- generate-evidence-pack-button.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- front-desk
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- hosts
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- create-host-sheet.tsx
|   |   |   |   |   |   |   `-- protection-note.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- kyb
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- kyb-submission-form.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- layout.tsx
|   |   |   |   |   |-- organisation
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- organisation-profile-form.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- organisation-directory
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- directory-controls.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- overview
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- on-site-roster-panel.tsx
|   |   |   |   |   |   |   |-- operational-metric-cards.tsx
|   |   |   |   |   |   |   `-- visit-activity-overview.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- page.tsx
|   |   |   |   |   |-- policies
|   |   |   |   |   |   |-- access
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- forms
|   |   |   |   |   |   |   |-- [definitionId]
|   |   |   |   |   |   |   |   |-- _actions.ts
|   |   |   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |   |   `-- form-builder.tsx
|   |   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   `-- retention
|   |   |   |   |   |       |-- loading.tsx
|   |   |   |   |   |       `-- page.tsx
|   |   |   |   |   |-- roles
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- access-review-actions.ts
|   |   |   |   |   |   |   |-- access-reviews-tab.tsx
|   |   |   |   |   |   |   |-- record-access-review-form.tsx
|   |   |   |   |   |   |   |-- roles-table
|   |   |   |   |   |   |   |   |-- columns.tsx
|   |   |   |   |   |   |   |   |-- table.tsx
|   |   |   |   |   |   |   |   `-- types.ts
|   |   |   |   |   |   |   `-- roles.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- schedule
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- create-invitation-sheet.tsx
|   |   |   |   |   |   |   `-- invitation-list.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- site-experience
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |   |-- branding-actions.tsx
|   |   |   |   |   |   |   |-- escalation-actions.tsx
|   |   |   |   |   |   |   |-- kiosk-actions.tsx
|   |   |   |   |   |   |   |-- printable-qr-panel.tsx
|   |   |   |   |   |   |   |-- qr-actions.tsx
|   |   |   |   |   |   |   `-- site-experience-form-sheet.tsx
|   |   |   |   |   |   |-- branding
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- capabilities
|   |   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |   `-- capability-enablement-panel.tsx
|   |   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- escalation
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- kiosk
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   `-- qr
|   |   |   |   |   |       |-- loading.tsx
|   |   |   |   |   |       `-- page.tsx
|   |   |   |   |   |-- sites
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- create-site-sheet.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- support
|   |   |   |   |   |   |-- [id]
|   |   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |   `-- reply-form.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   `-- create-ticket-form.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- support-access
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- grant-history.tsx
|   |   |   |   |   |   |   `-- pending-grant-card.tsx
|   |   |   |   |   |   |-- actions.ts
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- users
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- types.ts
|   |   |   |   |   |   |   |-- users-columns.tsx
|   |   |   |   |   |   |   |-- users-table.tsx
|   |   |   |   |   |   |   `-- users.tsx
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   `-- visitors
|   |   |   |   |       |-- loading.tsx
|   |   |   |   |       `-- page.tsx
|   |   |   |   |-- onboarding
|   |   |   |   |   |-- [step]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- progress.tsx
|   |   |   |   |   |   `-- step-actions.tsx
|   |   |   |   |   |-- layout.tsx
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- unauthorized
|   |   |   |       `-- page.tsx
|   |   |   |-- api
|   |   |   |   |-- auth
|   |   |   |   |   |-- login
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- logout
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- mfa
|   |   |   |   |   |   |-- challenge
|   |   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |   `-- enroll
|   |   |   |   |   |       |-- confirm
|   |   |   |   |   |       |   `-- route.ts
|   |   |   |   |   |       `-- start
|   |   |   |   |   |           `-- route.ts
|   |   |   |   |   |-- password-reset
|   |   |   |   |   |   |-- confirm
|   |   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |   `-- request
|   |   |   |   |   |       `-- route.ts
|   |   |   |   |   |-- register
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   |-- resend-verification
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- verify-email
|   |   |   |   |       `-- route.ts
|   |   |   |   |-- evidence
|   |   |   |   |   `-- [id]
|   |   |   |   |       `-- download
|   |   |   |   |           `-- route.ts
|   |   |   |   |-- onboarding
|   |   |   |   |   |-- complete-step
|   |   |   |   |   |   `-- route.ts
|   |   |   |   |   `-- evidence
|   |   |   |   |       `-- route.ts
|   |   |   |   `-- visits
|   |   |   |       `-- roster
|   |   |   |           `-- export
|   |   |   |               `-- route.ts
|   |   |   |-- global-error.tsx
|   |   |   |-- globals.css
|   |   |   |-- layout.tsx
|   |   |   |-- not-found.tsx
|   |   |   |-- page.tsx
|   |   |   `-- support-session
|   |   |       `-- page.tsx
|   |   |-- components
|   |   |   |-- analytics
|   |   |   |   `-- AnalyticsProviders.tsx
|   |   |   |-- bc-panel.tsx
|   |   |   |-- calendar
|   |   |   |   `-- event-calendar-views.tsx
|   |   |   |-- dashboard-list-skeleton.tsx
|   |   |   |-- dashboard-page-header.tsx
|   |   |   |-- dashboard-state.tsx
|   |   |   |-- date-range-picker.tsx
|   |   |   |-- features
|   |   |   |   `-- visits
|   |   |   |       `-- visit-roster-table
|   |   |   |           |-- columns.tsx
|   |   |   |           |-- schema.ts
|   |   |   |           |-- table.tsx
|   |   |   |           `-- visit-ops-actions.tsx
|   |   |   |-- onboarding-config-banner.tsx
|   |   |   |-- qr-code-image.tsx
|   |   |   |-- simple-icon.tsx
|   |   |   |-- support-session-banner.tsx
|   |   |   |-- support-session-countdown.tsx
|   |   |   `-- ui
|   |   |       |-- accordion.tsx
|   |   |       |-- alert-dialog.tsx
|   |   |       |-- alert.tsx
|   |   |       |-- aspect-ratio.tsx
|   |   |       |-- attachment.tsx
|   |   |       |-- avatar.tsx
|   |   |       |-- badge.tsx
|   |   |       |-- breadcrumb.tsx
|   |   |       |-- bubble.tsx
|   |   |       |-- button-group.tsx
|   |   |       |-- button.tsx
|   |   |       |-- calendar.tsx
|   |   |       |-- card.tsx
|   |   |       |-- carousel.tsx
|   |   |       |-- chart.tsx
|   |   |       |-- checkbox.tsx
|   |   |       |-- collapsible.tsx
|   |   |       |-- combobox.tsx
|   |   |       |-- command.tsx
|   |   |       |-- context-menu.tsx
|   |   |       |-- dialog.tsx
|   |   |       |-- direction.tsx
|   |   |       |-- drawer.tsx
|   |   |       |-- dropdown-menu.tsx
|   |   |       |-- empty.tsx
|   |   |       |-- field.tsx
|   |   |       |-- hover-card.tsx
|   |   |       |-- input-group.tsx
|   |   |       |-- input-otp.tsx
|   |   |       |-- input.tsx
|   |   |       |-- item.tsx
|   |   |       |-- kbd.tsx
|   |   |       |-- label.tsx
|   |   |       |-- list.tsx
|   |   |       |-- marker.tsx
|   |   |       |-- menubar.tsx
|   |   |       |-- message-scroller.tsx
|   |   |       |-- message.tsx
|   |   |       |-- native-select.tsx
|   |   |       |-- navigation-menu.tsx
|   |   |       |-- pagination.tsx
|   |   |       |-- popover.tsx
|   |   |       |-- progress.tsx
|   |   |       |-- questionnaire.tsx
|   |   |       |-- radio-group.tsx
|   |   |       |-- resizable.tsx
|   |   |       |-- scroll-area.tsx
|   |   |       |-- select.tsx
|   |   |       |-- separator.tsx
|   |   |       |-- sheet.tsx
|   |   |       |-- sidebar.tsx
|   |   |       |-- skeleton.tsx
|   |   |       |-- slider.tsx
|   |   |       |-- sonner.tsx
|   |   |       |-- spinner.tsx
|   |   |       |-- switch.tsx
|   |   |       |-- table.tsx
|   |   |       |-- tabs.tsx
|   |   |       |-- textarea.tsx
|   |   |       |-- toggle-group.tsx
|   |   |       |-- toggle.tsx
|   |   |       `-- tooltip.tsx
|   |   |-- config
|   |   |   `-- app-config.ts
|   |   |-- data
|   |   |-- hooks
|   |   |   |-- use-lg.ts
|   |   |   `-- use-mobile.ts
|   |   |-- instrumentation-client.ts
|   |   |-- instrumentation.ts
|   |   |-- lib
|   |   |   |-- api
|   |   |   |   `-- client.ts
|   |   |   |-- auth
|   |   |   |   |-- backend-url.ts
|   |   |   |   |-- csrf.ts
|   |   |   |   |-- me.ts
|   |   |   |   `-- session.ts
|   |   |   |-- canonical-codes.ts
|   |   |   |-- cookie.client.ts
|   |   |   |-- copy
|   |   |   |   |-- auth.ts
|   |   |   |   `-- onboarding.ts
|   |   |   |-- data-table-features.ts
|   |   |   |-- fonts
|   |   |   |   `-- registry.ts
|   |   |   |-- local-storage.client.ts
|   |   |   |-- observability
|   |   |   |   |-- analytics-consent.test.ts
|   |   |   |   |-- analytics-consent.ts
|   |   |   |   |-- scrub-pii.test.ts
|   |   |   |   |-- scrub-pii.ts
|   |   |   |   `-- track.ts
|   |   |   |-- preferences
|   |   |   |   |-- layout.ts
|   |   |   |   |-- preference-runtime.ts
|   |   |   |   |-- preferences-config.ts
|   |   |   |   |-- preferences-storage.ts
|   |   |   |   |-- theme-utils.ts
|   |   |   |   `-- theme.ts
|   |   |   `-- utils.ts
|   |   |-- navigation
|   |   |   `-- sidebar
|   |   |       `-- sidebar-items.ts
|   |   |-- proxy.ts
|   |   |-- scripts
|   |   |   |-- generate-theme-presets.ts
|   |   |   `-- theme-boot.tsx
|   |   |-- server
|   |   |   `-- server-actions.ts
|   |   |-- stores
|   |   |   `-- preferences
|   |   |       |-- preferences-provider.tsx
|   |   |       `-- preferences-store.ts
|   |   `-- styles
|   |       |-- flag-icons
|   |       |   `-- flags.css
|   |       `-- presets
|   |           `-- buffr-checkpoint.css
|   |-- tsconfig.json
|   |-- tsconfig.scripts.json
|   `-- vitest.config.mts
|-- backend
|   |-- .gitignore
|   |-- README.md
|   |-- biome.json
|   |-- db
|   |   |-- migrations
|   |   |   |-- 0001_release1_init.sql
|   |   |   |-- 0002_auth_extensions.sql
|   |   |   |-- 0003_password_hash.sql
|   |   |   |-- 0004_capability_status.sql
|   |   |   |-- 0005_capability_status_split.sql
|   |   |   |-- 0006_release1_5_schema.sql
|   |   |   |-- 0007_audit_append_only.sql
|   |   |   |-- 0008_canonical_rename.sql
|   |   |   |-- 0009_canonical_rename_cleanup.sql
|   |   |   |-- 0010_site_visitor_experience_schema.sql
|   |   |   |-- 0011_host_notification_escalation_events.sql
|   |   |   |-- 0012_pre_checkin_ack_and_visit_statuses.sql
|   |   |   |-- 0013_secure_customer_onboarding.sql
|   |   |   |-- 0014_full_stack_v020.sql
|   |   |   |-- 0015_cran_pki_v021.sql
|   |   |   |-- 0016_qr_invitation_capability_live.sql
|   |   |   |-- 0017_v022_completion.sql
|   |   |   |-- 0018_assurance_level_labels.sql
|   |   |   |-- 0019_organisation_directory_and_wait_queue.sql
|   |   |   |-- 0020_login_lockout.sql
|   |   |   |-- 0021_notification_outbox_and_domain_events.sql
|   |   |   |-- 0022_platform_ops_console.sql
|   |   |   |-- 0023_support_access_customer_consent.sql
|   |   |   |-- 0024_app_role_append_only_enforcement.sql
|   |   |   |-- 0025_emergency_events_update_grant.sql
|   |   |   |-- 0026_owner_host_approve_grant.sql
|   |   |   |-- 0027_team_buffranalytics_platform_support.sql
|   |   |   |-- 0028_support_ticket_bidirectional.sql
|   |   |   |-- 0029_gap_closure_phase2_8.sql
|   |   |   |-- 0030_form_builder_v028.sql
|   |   |   |-- 0031_purpose_category_form_options.sql
|   |   |   |-- 0032_subscription_catalog.sql
|   |   |   |-- 0033_addon_display_labels.sql
|   |   |   `-- 0034_core_plan_owner_operator_copy.sql
|   |   `-- seed
|   |       |-- 0001_type_definitions.sql
|   |       |-- 0002_capability_status.sql
|   |       |-- 0003_legal_basis_and_form_types.sql
|   |       |-- 0004_canonical_permissions.sql
|   |       |-- 0005_organisation_sector_expansion.sql
|   |       |-- 0006_kiosk_permissions.sql
|   |       |-- 0007_visitor_policy_acknowledgement_domains.sql
|   |       |-- 0008_site_visitor_experience_domains.sql
|   |       |-- 0009_demo_site_visitor_experience.sql
|   |       |-- 0010_capability_v021.sql
|   |       |-- 0011_kiosk_demo_email_verified.sql
|   |       |-- 0012_demo_branding_buffr_analytics.sql
|   |       |-- 0013_demo_front_desk_hosts.sql
|   |       |-- 0014_organisation_unit_kinds.sql
|   |       |-- 0015_demo_bian_directory.sql
|   |       |-- 0016_demo_check_in_form.sql
|   |       |-- 0017_platform_support_demo.sql
|   |       |-- 0018_unify_kiosk_demo_under_buffr_analytics.sql
|   |       `-- 0019_demo_device_compliance_register.sql
|   |-- drizzle.config.ts
|   |-- nest-cli.json
|   |-- package-lock.json
|   |-- package.json
|   |-- railway.toml
|   |-- scripts
|   |   `-- journey-smoke.ts
|   |-- src
|   |   |-- app.controller.ts
|   |   |-- app.module.ts
|   |   |-- common
|   |   |   |-- access-control
|   |   |   |   |-- access-control.module.ts
|   |   |   |   `-- scoped-permission-evaluation.service.ts
|   |   |   |-- artifacts
|   |   |   |   |-- artifact-store.spec.ts
|   |   |   |   `-- artifact-store.ts
|   |   |   |-- assets
|   |   |   |   `-- public-asset-url.ts
|   |   |   |-- canonical-codes.ts
|   |   |   |-- crypto
|   |   |   |   `-- secret-crypto.ts
|   |   |   |-- data-protection
|   |   |   |   |-- data-protection.module.ts
|   |   |   |   `-- personal-data-protection.service.ts
|   |   |   |-- decorators
|   |   |   |   |-- audit-log.decorator.ts
|   |   |   |   |-- current-user.decorator.ts
|   |   |   |   |-- platform-scoped.decorator.ts
|   |   |   |   |-- public.decorator.ts
|   |   |   |   |-- require-mfa.decorator.ts
|   |   |   |   |-- require-permission.decorator.ts
|   |   |   |   `-- require-verified-email.decorator.ts
|   |   |   |-- domain-events
|   |   |   |   `-- visit-checked-in.event.ts
|   |   |   |-- guards
|   |   |   |   |-- rbac.guard.ts
|   |   |   |   `-- tenant-scope.guard.ts
|   |   |   |-- interceptors
|   |   |   |   `-- audit.interceptor.ts
|   |   |   |-- observability
|   |   |   |   |-- scrub-pii.spec.ts
|   |   |   |   `-- scrub-pii.ts
|   |   |   `-- rbac
|   |   |       `-- permissions.ts
|   |   |-- db
|   |   |   |-- client.ts
|   |   |   |-- db.module.ts
|   |   |   |-- db.token.ts
|   |   |   |-- schema
|   |   |   |   |-- audit.ts
|   |   |   |   |-- billing.ts
|   |   |   |   |-- capability-status.ts
|   |   |   |   |-- consent.ts
|   |   |   |   |-- contact-enquiries.ts
|   |   |   |   |-- credential-validation.ts
|   |   |   |   |-- credentials.ts
|   |   |   |   |-- crm.ts
|   |   |   |   |-- dsar.ts
|   |   |   |   |-- emergency.ts
|   |   |   |   |-- evidence.ts
|   |   |   |   |-- form-templates.ts
|   |   |   |   |-- host-notification-escalation-events.ts
|   |   |   |   |-- host-notification-escalation.ts
|   |   |   |   |-- hosts.ts
|   |   |   |   |-- identity-verification.ts
|   |   |   |   |-- index.ts
|   |   |   |   |-- invitations.ts
|   |   |   |   |-- kiosk-experience.ts
|   |   |   |   |-- kiosk-privacy-pre-checkin-acknowledgements.ts
|   |   |   |   |-- kyb.ts
|   |   |   |   |-- legal-holds.ts
|   |   |   |   |-- managed-kiosk-devices.ts
|   |   |   |   |-- notifications.ts
|   |   |   |   |-- organisation-units.ts
|   |   |   |   |-- organisations.ts
|   |   |   |   |-- platform-configuration.ts
|   |   |   |   |-- platform-ops.ts
|   |   |   |   |-- rbac.ts
|   |   |   |   |-- secure-onboarding.ts
|   |   |   |   |-- site-branding.ts
|   |   |   |   |-- site-qr-references.ts
|   |   |   |   |-- sites.ts
|   |   |   |   |-- sms-contact-confirmation.ts
|   |   |   |   |-- telecom-integrations.ts
|   |   |   |   |-- type-definitions.ts
|   |   |   |   |-- visit-form-answers.ts
|   |   |   |   |-- visitor-wait-queue.ts
|   |   |   |   |-- visitors.ts
|   |   |   |   `-- visits.ts
|   |   |   `-- type-definition-lookup.service.ts
|   |   |-- instrument.ts
|   |   |-- main.ts
|   |   |-- modules
|   |   |   |-- access-policies
|   |   |   |   |-- access-policies.controller.ts
|   |   |   |   |-- access-policies.module.ts
|   |   |   |   |-- access-policies.service.ts
|   |   |   |   `-- dto
|   |   |   |       `-- access-policy.dto.ts
|   |   |   |-- access-reviews
|   |   |   |   |-- access-reviews.controller.ts
|   |   |   |   |-- access-reviews.module.ts
|   |   |   |   `-- access-reviews.service.ts
|   |   |   |-- analytics
|   |   |   |   |-- analytics.controller.ts
|   |   |   |   |-- analytics.module.ts
|   |   |   |   `-- analytics.service.ts
|   |   |   |-- audit
|   |   |   |   |-- audit.controller.ts
|   |   |   |   |-- audit.module.ts
|   |   |   |   `-- audit.service.ts
|   |   |   |-- auth
|   |   |   |   |-- auth.controller.ts
|   |   |   |   |-- auth.module.ts
|   |   |   |   |-- auth.service.ts
|   |   |   |   |-- dto
|   |   |   |   |   |-- login.dto.ts
|   |   |   |   |   |-- password-reset.dto.ts
|   |   |   |   |   `-- register.dto.ts
|   |   |   |   |-- guards
|   |   |   |   |   `-- jwt-auth.guard.ts
|   |   |   |   |-- mfa-authenticator.spec.ts
|   |   |   |   |-- onboarding-evidence.service.ts
|   |   |   |   `-- strategies
|   |   |   |       `-- jwt.strategy.ts
|   |   |   |-- billing
|   |   |   |   |-- billing.controller.ts
|   |   |   |   |-- billing.module.ts
|   |   |   |   `-- billing.service.ts
|   |   |   |-- capability-status
|   |   |   |   |-- capability-status.controller.ts
|   |   |   |   |-- capability-status.module.ts
|   |   |   |   |-- capability-status.service.spec.ts
|   |   |   |   |-- capability-status.service.ts
|   |   |   |   `-- dto
|   |   |   |       |-- organisation-capability-enablement.dto.ts
|   |   |   |       `-- update-capability-status.dto.ts
|   |   |   |-- compliance
|   |   |   |   |-- compliance.controller.ts
|   |   |   |   |-- compliance.module.ts
|   |   |   |   `-- compliance.service.ts
|   |   |   |-- contact
|   |   |   |   |-- contact.controller.ts
|   |   |   |   |-- contact.module.ts
|   |   |   |   `-- contact.service.ts
|   |   |   |-- credentials
|   |   |   |   |-- credentials.controller.ts
|   |   |   |   |-- credentials.module.ts
|   |   |   |   |-- credentials.service.ts
|   |   |   |   `-- dto
|   |   |   |       |-- credential-entitlement.dto.ts
|   |   |   |       |-- issue-credential.dto.ts
|   |   |   |       `-- validate-credential.dto.ts
|   |   |   |-- crm
|   |   |   |   |-- crm.controller.ts
|   |   |   |   |-- crm.module.ts
|   |   |   |   `-- crm.service.ts
|   |   |   |-- devices
|   |   |   |   |-- devices.controller.ts
|   |   |   |   |-- devices.module.ts
|   |   |   |   |-- devices.service.ts
|   |   |   |   `-- dto
|   |   |   |       |-- create-device.dto.ts
|   |   |   |       `-- update-device-status.dto.ts
|   |   |   |-- dsar
|   |   |   |   |-- dsar.controller.ts
|   |   |   |   |-- dsar.module.ts
|   |   |   |   |-- dsar.service.ts
|   |   |   |   `-- dto
|   |   |   |       `-- create-dsar.dto.ts
|   |   |   |-- emergency
|   |   |   |   |-- dto
|   |   |   |   |   `-- trigger-emergency.dto.ts
|   |   |   |   |-- emergency.controller.ts
|   |   |   |   |-- emergency.module.ts
|   |   |   |   `-- emergency.service.ts
|   |   |   |-- evidence
|   |   |   |   |-- evidence.controller.ts
|   |   |   |   |-- evidence.module.ts
|   |   |   |   `-- evidence.service.ts
|   |   |   |-- host-notification-escalation
|   |   |   |   |-- dto
|   |   |   |   |   `-- host-notification-escalation.dto.ts
|   |   |   |   |-- host-notification-escalation-evaluation.service.ts
|   |   |   |   |-- host-notification-escalation.controller.ts
|   |   |   |   |-- host-notification-escalation.module.ts
|   |   |   |   `-- host-notification-escalation.service.ts
|   |   |   |-- hosts
|   |   |   |   |-- dto
|   |   |   |   |   `-- create-host.dto.ts
|   |   |   |   |-- hosts.controller.ts
|   |   |   |   |-- hosts.module.ts
|   |   |   |   `-- hosts.service.ts
|   |   |   |-- identity-verification
|   |   |   |   |-- dto
|   |   |   |   |   |-- record-verification.dto.ts
|   |   |   |   |   `-- verify-identity.dto.ts
|   |   |   |   |-- identity-verification-orchestrator.service.ts
|   |   |   |   |-- identity-verification.controller.ts
|   |   |   |   |-- identity-verification.module.ts
|   |   |   |   |-- identity-verification.service.ts
|   |   |   |   `-- providers
|   |   |   |       |-- diginam-relying-party-verification.provider.ts
|   |   |   |       |-- digital-identity-verification.provider.ts
|   |   |   |       |-- discovery-identity-verification.provider.ts
|   |   |   |       `-- identity-providers.fail-closed.spec.ts
|   |   |   |-- integrations
|   |   |   |   `-- telecoms
|   |   |   |       |-- dto
|   |   |   |       |   `-- ussd-session.dto.ts
|   |   |   |       |-- feature-phone-check-in-session.service.ts
|   |   |   |       |-- sms-contact-confirmation.service.spec.ts
|   |   |   |       |-- sms-contact-confirmation.service.ts
|   |   |   |       |-- telecom-webhook.guard.ts
|   |   |   |       |-- telecoms.controller.ts
|   |   |   |       `-- telecoms.module.ts
|   |   |   |-- invitations
|   |   |   |   |-- dto
|   |   |   |   |   |-- create-invitation.dto.ts
|   |   |   |   |   `-- public-invitation-check-in.dto.ts
|   |   |   |   |-- invitation-token.util.spec.ts
|   |   |   |   |-- invitation-token.util.ts
|   |   |   |   |-- invitations.controller.ts
|   |   |   |   |-- invitations.module.ts
|   |   |   |   |-- invitations.service.spec.ts
|   |   |   |   |-- invitations.service.ts
|   |   |   |   `-- public-invitations.controller.ts
|   |   |   |-- kiosk-experience
|   |   |   |   |-- dto
|   |   |   |   |   `-- kiosk-experience.dto.ts
|   |   |   |   |-- kiosk-experience.controller.ts
|   |   |   |   |-- kiosk-experience.module.ts
|   |   |   |   `-- kiosk-experience.service.ts
|   |   |   |-- kyb
|   |   |   |   |-- kyb.controller.ts
|   |   |   |   |-- kyb.module.ts
|   |   |   |   `-- kyb.service.ts
|   |   |   |-- legal-holds
|   |   |   |   |-- dto
|   |   |   |   |   `-- create-legal-hold.dto.ts
|   |   |   |   |-- legal-holds.controller.ts
|   |   |   |   |-- legal-holds.module.ts
|   |   |   |   `-- legal-holds.service.ts
|   |   |   |-- notifications
|   |   |   |   |-- dto
|   |   |   |   |   `-- send-notification.dto.ts
|   |   |   |   |-- email.adapter.ts
|   |   |   |   |-- host-notification-email.ts
|   |   |   |   |-- notification-dispatch-worker.service.ts
|   |   |   |   |-- notifications.controller.ts
|   |   |   |   |-- notifications.module.ts
|   |   |   |   |-- notifications.service.ts
|   |   |   |   `-- visit-checked-in.listener.ts
|   |   |   |-- onboarding
|   |   |   |   |-- dto
|   |   |   |   |   `-- create-organisation-admin.dto.ts
|   |   |   |   |-- onboarding-steps.spec.ts
|   |   |   |   |-- onboarding-steps.ts
|   |   |   |   |-- onboarding.controller.ts
|   |   |   |   |-- onboarding.module.ts
|   |   |   |   `-- onboarding.service.ts
|   |   |   |-- organisation-directory
|   |   |   |   |-- organisation-directory.controller.ts
|   |   |   |   |-- organisation-directory.module.ts
|   |   |   |   `-- organisation-directory.service.ts
|   |   |   |-- organisation-health
|   |   |   |   |-- organisation-health-worker.service.ts
|   |   |   |   |-- organisation-health.module.ts
|   |   |   |   `-- organisation-health.service.ts
|   |   |   |-- organisations
|   |   |   |   |-- dto
|   |   |   |   |   |-- create-organisation.dto.ts
|   |   |   |   |   `-- update-organisation.dto.ts
|   |   |   |   |-- organisations.controller.ts
|   |   |   |   |-- organisations.module.ts
|   |   |   |   `-- organisations.service.ts
|   |   |   |-- platform-configuration
|   |   |   |   |-- platform-configuration.controller.ts
|   |   |   |   |-- platform-configuration.module.ts
|   |   |   |   |-- platform-configuration.service.ts
|   |   |   |   `-- platform-notification-template.service.ts
|   |   |   |-- platform-dashboard
|   |   |   |   |-- platform-dashboard.controller.ts
|   |   |   |   |-- platform-dashboard.module.ts
|   |   |   |   `-- platform-dashboard.service.ts
|   |   |   |-- platform-incidents
|   |   |   |   |-- platform-incidents.controller.ts
|   |   |   |   |-- platform-incidents.module.ts
|   |   |   |   `-- platform-incidents.service.ts
|   |   |   |-- platform-search
|   |   |   |   |-- platform-search.controller.ts
|   |   |   |   |-- platform-search.module.ts
|   |   |   |   `-- platform-search.service.ts
|   |   |   |-- platform-staff
|   |   |   |   |-- platform-staff.controller.ts
|   |   |   |   |-- platform-staff.module.ts
|   |   |   |   `-- platform-staff.service.ts
|   |   |   |-- rbac
|   |   |   |   |-- dto
|   |   |   |   |   `-- change-role.dto.ts
|   |   |   |   |-- rbac.controller.ts
|   |   |   |   |-- rbac.module.ts
|   |   |   |   `-- rbac.service.ts
|   |   |   |-- regions
|   |   |   |   |-- regions.controller.ts
|   |   |   |   |-- regions.module.ts
|   |   |   |   `-- regions.service.ts
|   |   |   |-- rename-map.tsv
|   |   |   |-- retention-policy
|   |   |   |   |-- dto
|   |   |   |   |   `-- retention-policy.dto.ts
|   |   |   |   |-- retention-policy.controller.ts
|   |   |   |   |-- retention-policy.module.ts
|   |   |   |   `-- retention-policy.service.ts
|   |   |   |-- schedule
|   |   |   |   |-- schedule.controller.ts
|   |   |   |   `-- schedule.module.ts
|   |   |   |-- security-zones
|   |   |   |   |-- security-zones.controller.ts
|   |   |   |   |-- security-zones.module.ts
|   |   |   |   `-- security-zones.service.ts
|   |   |   |-- site-branding
|   |   |   |   |-- dto
|   |   |   |   |   `-- site-branding.dto.ts
|   |   |   |   |-- site-branding.controller.ts
|   |   |   |   |-- site-branding.module.ts
|   |   |   |   `-- site-branding.service.ts
|   |   |   |-- site-qr-references
|   |   |   |   |-- dto
|   |   |   |   |   `-- site-qr-references.dto.ts
|   |   |   |   |-- site-qr-references.controller.ts
|   |   |   |   |-- site-qr-references.module.ts
|   |   |   |   `-- site-qr-references.service.ts
|   |   |   |-- sites
|   |   |   |   |-- dto
|   |   |   |   |   `-- create-site.dto.ts
|   |   |   |   |-- sites.controller.ts
|   |   |   |   |-- sites.module.ts
|   |   |   |   `-- sites.service.ts
|   |   |   |-- support-sessions
|   |   |   |   |-- support-sessions.controller.ts
|   |   |   |   |-- support-sessions.module.ts
|   |   |   |   `-- support-sessions.service.ts
|   |   |   |-- support-tickets
|   |   |   |   |-- support-tickets-customer.controller.ts
|   |   |   |   |-- support-tickets.controller.ts
|   |   |   |   |-- support-tickets.module.ts
|   |   |   |   `-- support-tickets.service.ts
|   |   |   |-- type-definitions
|   |   |   |   |-- type-definitions.controller.ts
|   |   |   |   |-- type-definitions.module.ts
|   |   |   |   `-- type-definitions.service.ts
|   |   |   |-- visitor-policy
|   |   |   |   |-- dto
|   |   |   |   |   |-- acknowledge-policy.dto.ts
|   |   |   |   |   |-- check-in-form.dto.ts
|   |   |   |   |   `-- pre-checkin-acknowledge.dto.ts
|   |   |   |   |-- form-ai.service.spec.ts
|   |   |   |   |-- form-ai.service.ts
|   |   |   |   |-- form-rules.spec.ts
|   |   |   |   |-- form-rules.ts
|   |   |   |   |-- visitor-data-minimisation.service.ts
|   |   |   |   |-- visitor-policy.controller.ts
|   |   |   |   |-- visitor-policy.module.ts
|   |   |   |   `-- visitor-policy.service.ts
|   |   |   |-- visitor-wait-queue
|   |   |   |   |-- visitor-wait-queue.controller.ts
|   |   |   |   |-- visitor-wait-queue.module.ts
|   |   |   |   `-- visitor-wait-queue.service.ts
|   |   |   |-- visitors
|   |   |   |   |-- dto
|   |   |   |   |   `-- create-visitor.dto.ts
|   |   |   |   |-- visitors.controller.ts
|   |   |   |   |-- visitors.module.ts
|   |   |   |   `-- visitors.service.ts
|   |   |   `-- visits
|   |   |       |-- dto
|   |   |       |   |-- check-in.dto.ts
|   |   |       |   |-- public-check-in.dto.ts
|   |   |       |   `-- visit-access-decision.dto.ts
|   |   |       |-- public-check-in.controller.ts
|   |   |       |-- visitor-next-steps.ts
|   |   |       |-- visits.controller.ts
|   |   |       |-- visits.module.ts
|   |   |       `-- visits.service.ts
|   |   `-- test
|   |       `-- setup-env.ts
|   |-- test
|   |   |-- app.e2e-spec.ts
|   |   |-- auth.e2e-spec.ts
|   |   `-- jest-e2e.json
|   |-- tsconfig.build.json
|   `-- tsconfig.json
|-- buffrcheckpoint.md
|-- kiosk
|   |-- .claude
|   |   `-- settings.local.json
|   |-- .gitignore
|   |-- .idea
|   |   |-- .gitignore
|   |   |-- .name
|   |   |-- AndroidProjectSystem.xml
|   |   |-- caches
|   |   |   `-- deviceStreaming.xml
|   |   |-- codeStyles
|   |   |   |-- Project.xml
|   |   |   `-- codeStyleConfig.xml
|   |   |-- compiler.xml
|   |   |-- deploymentTargetSelector.xml
|   |   |-- deviceManager.xml
|   |   |-- gradle.xml
|   |   |-- migrations.xml
|   |   |-- misc.xml
|   |   |-- runConfigurations.xml
|   |   `-- workspace.xml
|   |-- .kotlin
|   |   |-- errors
|   |   |   |-- errors-1789377846065.log
|   |   |   |-- errors-1789377848419.log
|   |   |   `-- errors-1789719808004.log
|   |   `-- sessions
|   |-- app
|   |   |-- build.gradle.kts
|   |   |-- proguard-rules.pro
|   |   `-- src
|   |       |-- debug
|   |       |   `-- AndroidManifest.xml
|   |       |-- main
|   |       |   |-- AndroidManifest.xml
|   |       |   |-- java
|   |       |   |   `-- com
|   |       |   |       `-- buffrcheckpoint
|   |       |   |           `-- kiosk
|   |       |   |               |-- BuffrCheckpointApp.kt
|   |       |   |               |-- MainActivity.kt
|   |       |   |               |-- about
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- AboutDebugScreen.kt
|   |       |   |               |-- auth
|   |       |   |               |   |-- AuthRepository.kt
|   |       |   |               |   |-- KioskSetupViewModel.kt
|   |       |   |               |   |-- LoginViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       |-- KioskSetupScreen.kt
|   |       |   |               |       `-- LoginScreen.kt
|   |       |   |               |-- capability
|   |       |   |               |-- checkin
|   |       |   |               |   |-- CheckInMapper.kt
|   |       |   |               |   |-- CheckInRepository.kt
|   |       |   |               |   |-- assisted
|   |       |   |               |   |   `-- ui
|   |       |   |               |   |       `-- AssistedCheckInScreen.kt
|   |       |   |               |   |-- manual
|   |       |   |               |   |   |-- FormRules.kt
|   |       |   |               |   |   |-- ManualCheckInViewModel.kt
|   |       |   |               |   |   `-- ui
|   |       |   |               |   |       `-- ManualCheckInScreen.kt
|   |       |   |               |   |-- nfc
|   |       |   |               |   |   `-- ui
|   |       |   |               |   |-- policy
|   |       |   |               |   |   `-- ui
|   |       |   |               |   |-- qr
|   |       |   |               |   |   |-- QrCheckInViewModel.kt
|   |       |   |               |   |   `-- ui
|   |       |   |               |   |       `-- QrScanScreen.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       |-- CheckInSuccessScreen.kt
|   |       |   |               |       `-- CheckInSuccessViewModel.kt
|   |       |   |               |-- checkout
|   |       |   |               |   |-- CheckOutViewModel.kt
|   |       |   |               |   |-- VisitorSignOutViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- VisitorSignOutScreen.kt
|   |       |   |               |-- core
|   |       |   |               |   |-- db
|   |       |   |               |   |   |-- DatabasePassphraseProvider.kt
|   |       |   |               |   |   |-- KioskDatabase.kt
|   |       |   |               |   |   |-- OutboxDao.kt
|   |       |   |               |   |   `-- OutboxEntity.kt
|   |       |   |               |   |-- domain
|   |       |   |               |   |   |-- CheckInDraft.kt
|   |       |   |               |   |   `-- model
|   |       |   |               |   |       `-- Enums.kt
|   |       |   |               |   |-- governance
|   |       |   |               |   |-- network
|   |       |   |               |   |   |-- ApiClient.kt
|   |       |   |               |   |   |-- ApiService.kt
|   |       |   |               |   |   |-- ApiServiceProvider.kt
|   |       |   |               |   |   |-- AuthAuthenticator.kt
|   |       |   |               |   |   |-- AuthInterceptor.kt
|   |       |   |               |   |   `-- dto
|   |       |   |               |   |       |-- AuthDto.kt
|   |       |   |               |   |       |-- CapabilityStatusDto.kt
|   |       |   |               |   |       |-- CredentialDto.kt
|   |       |   |               |   |       |-- KioskExperienceDto.kt
|   |       |   |               |   |       |-- VisitDto.kt
|   |       |   |               |   |       `-- VisitorPolicyDto.kt
|   |       |   |               |   `-- security
|   |       |   |               |       `-- CredentialStore.kt
|   |       |   |               |-- devices
|   |       |   |               |   |-- DeviceListViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- DeviceListScreen.kt
|   |       |   |               |-- di
|   |       |   |               |   |-- DatabaseModule.kt
|   |       |   |               |   `-- NetworkModule.kt
|   |       |   |               |-- experience
|   |       |   |               |   |-- CapabilityRepository.kt
|   |       |   |               |   |-- ExperienceRepository.kt
|   |       |   |               |   |-- ExperienceSyncWorker.kt
|   |       |   |               |   `-- KioskExperienceState.kt
|   |       |   |               |-- maintenance
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- MaintenanceScreen.kt
|   |       |   |               |-- navigation
|   |       |   |               |   |-- KioskDestinations.kt
|   |       |   |               |   `-- KioskNavGraph.kt
|   |       |   |               |-- nfc
|   |       |   |               |   |-- NfcCheckInViewModel.kt
|   |       |   |               |   |-- NfcCredentialParser.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- NfcCheckInScreen.kt
|   |       |   |               |-- notifications
|   |       |   |               |   `-- ui
|   |       |   |               |-- offline
|   |       |   |               |   |-- db
|   |       |   |               |   |   |-- dao
|   |       |   |               |   |   `-- entity
|   |       |   |               |   `-- sync
|   |       |   |               |-- privacy
|   |       |   |               |   |-- PrivacyNoticeViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- PrivacyNoticeScreen.kt
|   |       |   |               |-- roster
|   |       |   |               |   |-- RosterRepository.kt
|   |       |   |               |   |-- RosterViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- RosterScreen.kt
|   |       |   |               |-- session
|   |       |   |               |   |-- AbandonVisitorCheckInUseCase.kt
|   |       |   |               |   |-- KioskIdleHandler.kt
|   |       |   |               |   |-- ProtectedDraftClearanceService.kt
|   |       |   |               |   `-- VisitorSessionTimeoutController.kt
|   |       |   |               |-- sync
|   |       |   |               |   |-- OutboxDrainWorker.kt
|   |       |   |               |   |-- OutboxRepository.kt
|   |       |   |               |   |-- SyncStatusViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- SyncStatusBanner.kt
|   |       |   |               |-- ui
|   |       |   |               |   |-- KioskOnboardingScaffold.kt
|   |       |   |               |   |-- LogoDiskCache.kt
|   |       |   |               |   |-- OrgBrandingHeader.kt
|   |       |   |               |   |-- QrCodeImage.kt
|   |       |   |               |   |-- RemoteLogoImage.kt
|   |       |   |               |   `-- theme
|   |       |   |               |       |-- Color.kt
|   |       |   |               |       |-- Theme.kt
|   |       |   |               |       `-- Type.kt
|   |       |   |               |-- ussd
|   |       |   |               |   |-- UssdInstructionsViewModel.kt
|   |       |   |               |   `-- ui
|   |       |   |               |       `-- UssdInstructionsScreen.kt
|   |       |   |               `-- welcome
|   |       |   |                   |-- WelcomeViewModel.kt
|   |       |   |                   `-- ui
|   |       |   |                       `-- WelcomeScreen.kt
|   |       |   `-- res
|   |       |       |-- mipmap-anydpi-v26
|   |       |       |   |-- ic_launcher.xml
|   |       |       |   `-- ic_launcher_round.xml
|   |       |       `-- values
|   |       |           |-- colors.xml
|   |       |           |-- strings.xml
|   |       |           `-- themes.xml
|   |       `-- test
|   |           `-- java
|   |               `-- com
|   |                   `-- buffrcheckpoint
|   |                       `-- kiosk
|   |                           |-- checkin
|   |                           |   |-- CheckInMapperTest.kt
|   |                           |   `-- manual
|   |                           |       `-- FormRulesTest.kt
|   |                           |-- core
|   |                           |   `-- domain
|   |                           |       `-- model
|   |                           |           `-- VisitStatusTest.kt
|   |                           |-- nfc
|   |                           |   `-- NfcCredentialParserTest.kt
|   |                           |-- session
|   |                           |   |-- AbandonVisitorCheckInUseCaseTest.kt
|   |                           |   `-- ProtectedDraftClearanceServiceTest.kt
|   |                           `-- sync
|   |                               `-- SyncBannerMappingTest.kt
|   |-- build.gradle.kts
|   |-- gradle
|   |   |-- gradle-daemon-jvm.properties
|   |   |-- libs.versions.toml
|   |   `-- wrapper
|   |       `-- gradle-wrapper.properties
|   |-- gradle.properties
|   |-- gradlew
|   |-- gradlew.bat
|   |-- local.properties
|   |-- scripts
|   |   `-- rebuild-and-run.sh
|   `-- settings.gradle.kts
|-- ops-console
|   |-- .gitignore
|   |-- README.md
|   |-- biome.json
|   |-- next-env.d.ts
|   |-- next.config.ts
|   |-- package-lock.json
|   |-- package.json
|   |-- postcss.config.mjs
|   |-- public
|   |-- src
|   |   |-- app
|   |   |   |-- (console)
|   |   |   |   |-- actions.ts
|   |   |   |   |-- analytics
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- audit
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- billing
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- billing-bulk-queue.tsx
|   |   |   |   |   |   `-- review-buttons.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- capability-status
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- update-form.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- configuration
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- configuration-forms.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- crm
|   |   |   |   |   |-- [dealId]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- deal-controls.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   |-- contacts
|   |   |   |   |   |   |-- [id]
|   |   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |   `-- contact-edit-form.tsx
|   |   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |   `-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- devices
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- device-status-controls.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- error.tsx
|   |   |   |   |-- incidents
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- incident-controls.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- kyb
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- decision-buttons.tsx
|   |   |   |   |   |   `-- kyb-bulk-queue.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- layout.tsx
|   |   |   |   |-- loading.tsx
|   |   |   |   |-- organisations
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   |-- _components
|   |   |   |   |   |   |   |-- subscription-actions.ts
|   |   |   |   |   |   |   |-- subscription-panel.tsx
|   |   |   |   |   |   |   `-- tabs.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- request-grant-form.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- page.tsx
|   |   |   |   |-- search
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- sites
|   |   |   |   |   |-- [id]
|   |   |   |   |   |   |-- loading.tsx
|   |   |   |   |   |   `-- page.tsx
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- site-status-controls.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- staff
|   |   |   |   |   |-- _components
|   |   |   |   |   |   `-- staff-controls.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- support-access
|   |   |   |   |   |-- _components
|   |   |   |   |   |   |-- grant-row.tsx
|   |   |   |   |   |   `-- new-grant-form.tsx
|   |   |   |   |   |-- actions.ts
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- tickets
|   |   |   |       |-- [id]
|   |   |   |       |   `-- page.tsx
|   |   |   |       |-- _components
|   |   |   |       |   |-- ticket-comments.tsx
|   |   |   |       |   `-- ticket-controls.tsx
|   |   |   |       |-- actions.ts
|   |   |   |       `-- page.tsx
|   |   |   |-- api
|   |   |   |   |-- kyb-documents
|   |   |   |   |   `-- [kybVerificationId]
|   |   |   |   |       `-- route.ts
|   |   |   |   `-- pop-documents
|   |   |   |       `-- [paymentTransactionId]
|   |   |   |           `-- route.ts
|   |   |   |-- globals.css
|   |   |   |-- layout.tsx
|   |   |   `-- login
|   |   |       |-- actions.ts
|   |   |       |-- mfa
|   |   |       |   `-- page.tsx
|   |   |       `-- page.tsx
|   |   |-- components
|   |   |   |-- analytics
|   |   |   |   `-- AnalyticsProviders.tsx
|   |   |   |-- app-sidebar.tsx
|   |   |   |-- bc-panel.tsx
|   |   |   |-- bulk-queue-list.tsx
|   |   |   |-- charts
|   |   |   |   |-- ScoreScatter.tsx
|   |   |   |   |-- ShareBars.tsx
|   |   |   |   `-- TrendChart.tsx
|   |   |   |-- dashboard-state.tsx
|   |   |   |-- logout-button.tsx
|   |   |   |-- map
|   |   |   |   |-- NamibiaMap.tsx
|   |   |   |   |-- chart-tokens.ts
|   |   |   |   `-- namibiaRegions.ts
|   |   |   |-- org-filter.tsx
|   |   |   |-- org-select.tsx
|   |   |   `-- ui
|   |   |       |-- alert.tsx
|   |   |       |-- avatar.tsx
|   |   |       |-- badge.tsx
|   |   |       |-- button.tsx
|   |   |       |-- card.tsx
|   |   |       |-- dropdown-menu.tsx
|   |   |       |-- input.tsx
|   |   |       |-- label.tsx
|   |   |       |-- list.tsx
|   |   |       |-- native-select.tsx
|   |   |       |-- select.tsx
|   |   |       |-- separator.tsx
|   |   |       |-- sheet.tsx
|   |   |       |-- sidebar.tsx
|   |   |       |-- skeleton.tsx
|   |   |       |-- sonner.tsx
|   |   |       |-- status-select.tsx
|   |   |       |-- table.tsx
|   |   |       |-- textarea.tsx
|   |   |       `-- tooltip.tsx
|   |   |-- hooks
|   |   |   `-- use-mobile.ts
|   |   |-- lib
|   |   |   |-- api.ts
|   |   |   |-- auth
|   |   |   |   `-- session.ts
|   |   |   |-- bulk-status-actions.ts
|   |   |   |-- chartTokens.ts
|   |   |   |-- observability
|   |   |   |   |-- analytics-consent.ts
|   |   |   |   |-- scrub-pii.ts
|   |   |   |   `-- track.ts
|   |   |   `-- orgs.ts
|   |   |-- navigation
|   |   |   `-- sidebar-items.ts
|   |   `-- styles
|   |       `-- presets
|   |           `-- buffr-checkpoint.css
|   `-- tsconfig.json
|-- scripts
|   |-- capture-marketing-screenshots.mjs
|   |-- run-all-tests.sh
|   `-- smoke-production.sh
|-- shared
|   |-- package-lock.json
|   |-- package.json
|   |-- src
|   |   |-- form-rules.ts
|   |   |-- identity-assurance-level.ts
|   |   |-- index.ts
|   |   `-- visit-status.ts
|   |-- tsconfig.build.json
|   `-- tsconfig.json
`-- website
    |-- .gitignore
    |-- AGENTS.md
    |-- CLAUDE.md
    |-- README.md
    |-- biome.json
    |-- next-env.d.ts
    |-- next.config.ts
    |-- package-lock.json
    |-- package.json
    |-- postcss.config.mjs
    |-- public
    |   |-- marketing
    |   |-- org-assets
    |   |   `-- buffr-analytics
    |   `-- screenshots
    |-- sentry.edge.config.ts
    |-- sentry.server.config.ts
    |-- src
    |   |-- app
    |   |   |-- (marketing)
    |   |   |   |-- about
    |   |   |   |   `-- page.tsx
    |   |   |   |-- contact
    |   |   |   |   |-- contact-form.tsx
    |   |   |   |   `-- page.tsx
    |   |   |   |-- developers
    |   |   |   |   `-- page.tsx
    |   |   |   |-- layout.tsx
    |   |   |   |-- page.tsx
    |   |   |   |-- platform
    |   |   |   |   `-- page.tsx
    |   |   |   |-- pricing
    |   |   |   |   |-- page.tsx
    |   |   |   |   `-- pricing-tiers.tsx
    |   |   |   |-- privacy
    |   |   |   |   `-- page.tsx
    |   |   |   |-- status
    |   |   |   |   `-- page.tsx
    |   |   |   `-- terms
    |   |   |       `-- page.tsx
    |   |   |-- check-in
    |   |   |   |-- check-in-branded-shell.tsx
    |   |   |   |-- check-in-form.tsx
    |   |   |   |-- invitation-check-in-form.tsx
    |   |   |   `-- page.tsx
    |   |   |-- check-out
    |   |   |   |-- check-out-client.tsx
    |   |   |   `-- page.tsx
    |   |   |-- global-error.tsx
    |   |   |-- globals.css
    |   |   |-- layout.tsx
    |   |   |-- not-found.tsx
    |   |   |-- robots.ts
    |   |   `-- sitemap.ts
    |   |-- components
    |   |   |-- analytics
    |   |   |   `-- AnalyticsProviders.tsx
    |   |   |-- capability-status-badge.tsx
    |   |   |-- json-ld.tsx
    |   |   |-- marketing
    |   |   |   |-- channel-convergence-visual.tsx
    |   |   |   |-- kiosk-product-frame.tsx
    |   |   |   |-- marketing-bottom-cta.tsx
    |   |   |   |-- marketing-closing-visual.tsx
    |   |   |   |-- marketing-hero.tsx
    |   |   |   |-- marketing-page-close.tsx
    |   |   |   `-- marketing-product-screenshot.tsx
    |   |   |-- site-footer.tsx
    |   |   |-- site-header.tsx
    |   |   `-- ui
    |   |       |-- accordion.tsx
    |   |       |-- badge.tsx
    |   |       |-- button.tsx
    |   |       |-- card.tsx
    |   |       |-- input.tsx
    |   |       |-- label.tsx
    |   |       |-- separator.tsx
    |   |       |-- sonner.tsx
    |   |       |-- textarea.tsx
    |   |       `-- tooltip.tsx
    |   |-- instrumentation-client.ts
    |   |-- instrumentation.ts
    |   |-- lib
    |   |   |-- api.ts
    |   |   |-- copy
    |   |   |   |-- contact.ts
    |   |   |   `-- identity-assurance.ts
    |   |   |-- form-rules.test.ts
    |   |   |-- form-rules.ts
    |   |   |-- marketing-layout.ts
    |   |   |-- marketing-visuals.ts
    |   |   |-- observability
    |   |   |   |-- analytics-consent.test.ts
    |   |   |   |-- analytics-consent.ts
    |   |   |   |-- scrub-pii.test.ts
    |   |   |   |-- scrub-pii.ts
    |   |   |   `-- track.ts
    |   |   `-- utils.ts
    |   `-- styles
    |       `-- presets
    |           `-- buffr-checkpoint.css
    |-- tsconfig.json
    `-- vitest.config.mts
```

**Surfaces present in the tree (2026-09-18 re-verify):**

| Path | Role | Notes |
|---|---|---|
| `admin/` | Customer tenant admin (Next.js + shadcn) | Auth/MFA/BFF wired; support-session + billing live |
| `backend/` | NestJS API | Modular monolith; platform-control-plane split under `src/modules/` |
| `website/` | Public marketing + `/check-in` | Same brand preset as admin |
| `ops-console/` | Internal Platform Ops Console | Separate host `ops.buffrcheckpoint.com`; shadcn shell parity pass |
| `kiosk/` | Android/Kotlin visitor tablet | Native app; no DNS host of its own |
| `scripts/` | Prod smoke + acceptance + harness | `smoke-production.sh`, `acceptance-gate.sh`, `acceptance/checklist.json`, `run-all-tests.sh` |
| `shared/` | `shared/` | **Scaffolded v0.24.1** — `@buffrcheckpoint/shared` with visit_status + identity_assurance_level codes; consumed by backend (`file:../shared`) and mirrored in kiosk `Enums.kt` |

**Still-open structural gap:**

1. **`shared/` started (v0.24.1).** Package `@buffrcheckpoint/shared` holds
   visit_status and identity_assurance_level codes — highest-churn contracts.
   Remaining DTO families still map per surface until extracted. Backend
   (`file:../shared`) consumes the package; admin mirrors via
   `admin/src/lib/canonical-codes.ts` (Vercel root is `admin/` only); kiosk
   mirrors codes in `Enums.kt`.

Historical notes from earlier audits (admin API client / `proxy.ts` / dashboard home wiring) remain below for changelog continuity — those items are **done** as of this tree, not open work.

**Historical gap notes (originally 2026-09-09 — status comments inline):**

1. **`shared/` started (v0.24.1) — historical “never created” claim closed.**
   Package `@buffrcheckpoint/shared` now holds visit_status +
   identity_assurance_level. Broader DTO unification remains incremental.
2. **`admin/src/lib/api/` — fixed.** A real typed client exists
   (`admin/src/lib/api/client.ts`): server-only, reads the httpOnly session
   cookie via `getSessionToken()`, attaches it as `Authorization: Bearer`,
   calls `backendUrl()` — the same pattern `lib/auth/me.ts` already used
   correctly. (Found already partially fixed from an earlier pass with a
   `NEXT_PUBLIC_API_URL`/no-auth bug; corrected in this pass.) Every
   dashboard list page (`front-desk`, `visitors`, `emergency`, `sites`,
   `devices`, `devices/compliance`, `credentials`, `audit`, `evidence`,
   `policies/retention`, `policies/forms`, `policies/access`, `schedule`,
   `compliance`, `users`, `roles`, `account`) now fetches real data through
   it, server-side, with a real empty state (`DashboardEmptyState`, an icon
   + situation-specific message, not "no data"), a real error state
   (`DashboardErrorState`, distinguishing a 401/403 permission boundary from
   a genuine backend failure), and a route-level `loading.tsx` skeleton —
   Section 11.8.1's four-state requirement, actually built, not just
   specified.
3. **`admin/src/proxy.disabled.ts` — found already fixed.** `admin/src/proxy.ts`
   already existed (not `.disabled.ts`), along with a working
   `lib/auth/{session,me,backend-url,csrf}.ts` — this document's claim it
   was still broken was stale by the time of the 2026-09-09 audit, not
   accurate to the code at that point.

`admin/` was also found to have several genuinely pre-existing, unrelated
breaks blocking any build at all — fixed in the same pass: `lib/utils.ts`
exported no `cn()` despite every shadcn primitive importing one (now
re-exported from the already-declared `cn` npm package); `dashboard/profile/page.tsx`
had a malformed JSX self-closing tag and depended on an empty
`profile-data.ts` (consolidated into the one real `/dashboard/account`
implementation, which now server-fetches `GET /auth/me` for real); the
Roles/Users table components referenced a stale `Role` type and an
untyped `ReturnType<typeof useTable>` that didn't carry the real
`TableFeatures`/`RowData` generics. `admin/` now builds and lints clean —
`npm run build && npm run check` — for the first time.

**The dashboard home page (`/dashboard/overview` — previously `/dashboard/default`;
`proxy.ts` redirects bare `/dashboard` here) was the last
piece still rendering the template's stripped-but-unwired placeholders**
("--", "Awaiting backend data," an empty chart, an empty roster) — closed
in a follow-up pass the same day (v0.29 renames the route to Overview):

- A new `backend/src/modules/analytics/` module (`GET
  /analytics/visit-activity?days=`) aggregates real `visitor_visits`/
  `audit_events` rows per day — no new schema, a straightforward
  aggregation of tables that already record the underlying events.
- The four metric cards (On-site now / Expected today / Pending approvals /
  Compliance alerts) now read from `/visits/roster`, `/schedule`, and
  `/compliance/dashboard`.
- The activity chart dropped a third "visits" series from the template's
  original three — in this domain a `visitor_visits` row **is** the
  check-in (Section 8.1), so a separate "visits" line would only have
  duplicated "check-ins," which is not an honest second data series.
- **v0.5 correction, reversed in v0.6:** this section previously described
  deleting `/dashboard/calendar` and its FullCalendar wrapper outright as
  orphaned template artifacts. That deletion was wrong — the calendar grid
  view is genuinely useful alongside the plain-table Schedule page (seeing
  gaps/clustering across a month at a glance vs. a fast date-ordered list)
  — and the files were gone from git history by the time of the correction
  (restored as 0-byte via `git checkout` with no real historical content
  recoverable). `/dashboard/calendar` was rebuilt from scratch in v0.6 as
  real, working code against the same `GET /schedule?siteId=&from=&to=`
  endpoint `/dashboard/schedule` already used — see the v0.6 changelog
  entry and §11.4.3's sidebar table, which now lists both routes.
- `/dashboard/page.tsx` (the bare route) previously did a bare `return;`,
  rendering nothing for any request that reached it directly rather than
  through `proxy.ts`'s redirect; it now redirects explicitly to
  `/dashboard/overview` as a defensive fallback.

Verified live end-to-end: logged into the admin app through its real
cookie-session flow and confirmed the dashboard home renders actual
backend-derived counts and a real (initially-empty, then populated)
roster and activity chart — not the template's placeholders.

### 11.4.3 Sidebar and route plan for `admin/`

Replace `sidebar-items.ts` wholesale. Delete every demo route not listed
below (`crm`, `finance`, `analytics`, `ecommerce`, `academy`, `logistics`,
`infrastructure`, `file-manager`, `patient-monitoring`, `mail`, `chat`,
`kanban`, `invoice`, `calendar`, `tasks`, and the entire `(legacy)` group).

| Sidebar group | Item | Route | Maps to |
|---|---|---|---|
| Operations | Front Desk (renamed from "Default") | `/dashboard/front-desk` | Section 10.4 front-desk dashboard — on-site roster, check-out actions |
| Operations | Visitors | `/dashboard/visitors` | `Visitor`/`Visit` tables |
| Operations | Schedule | `/dashboard/schedule` | Section 3's operational-calendar data — plain date-ordered table view |
| Operations | Calendar | `/dashboard/calendar` | Same `GET /schedule` data as above, month/week/list grid view — see v0.6 changelog |
| Operations | Emergency Roster | `/dashboard/emergency` | Section 8.6 emergency/evacuation journey |
| Sites | Sites | `/dashboard/sites` | `Site`, `Device`, retention/access policy config |
| Sites | Device Compliance Register | `/dashboard/devices` | CRAN Device Compliance Register (Addendum Section 2.2) |
| Compliance | Compliance Dashboard | `/dashboard/compliance` | Section 10.5 — retention actions, deletion requests, privileged-access events |
| Compliance | Audit Log | `/dashboard/audit` | `AuditEvent`, using the kept `data-table-features.ts` registry |
| Compliance | Evidence Packs | `/dashboard/evidence` | Section 20.2 evidence-pack export |
| Access | Users | `/dashboard/users` | replaces template's static `users.ts`; backed by `rbac` module |
| Access | Roles | `/dashboard/roles` | replaces template's static `roles-table/data.ts`; shows Owner-Operator bundle vs. granular roles per Section 9.1a |
| Access | Authentication | `/auth/v1/login`, `/auth/v1/register` | keep template's v1 forms, drop v2 (redundant), wire to `POST /auth/login` |

### 11.4.4 Wiring: admin app ↔ backend ↔ database

```text
Next.js admin app (admin/)
    │  server-side fetch via admin/src/lib/api/client.ts
    │  (session cookie → Authorization: Bearer → NestJS)
    │  admin/src/proxy.ts gates /dashboard/* and onboarding redirects
    ▼
NestJS backend (backend/)  ← BUILT, running, tested (Section 11.4.7)
    │  Guards: RbacGuard reads role/site claims from session;
    │  TenantScopeGuard injects organisation_id/site_id into every query
    ▼
Drizzle ORM → PostgreSQL (Neon, matching buffr-host's pattern per Section 11.2)
```

> **Historical (pre-2026-09-09):** earlier revisions of this section claimed the
> OpenAPI-generated client, `proxy.disabled.ts`, and MFA in `AuthService.login`
> were still aspirational. Those gaps closed in the 2026-09-09 wiring pass
> (see §11.4.2 historical gap notes). The bullets below describe the **current**
> stack.

- **Login:** `POST /auth/login` validates credentials and issues a JWT with
  role/permission claims. The admin app calls it through `admin/src/app/api/auth/*`
  route handlers; `admin/src/proxy.ts` requires a session cookie on
  `/dashboard/*` and redirects unauthenticated users to login. MFA (Section 13.1)
  is a second step in the same login path for enrolled users: login may return
  an MFA challenge token; `AuthService` completes the session only after TOTP
  (or recovery code) succeeds.
- **Email verification:** `application_users.email_verified_at` stays null until
  the confirmation link is consumed (`POST /auth/email-verification/verify`).
  Signup never returns an access token. Login returns
  `emailVerificationRequired` while unverified. Delivery uses Resend when
  `RESEND_API_KEY` is configured; otherwise delivery evidence is fail-closed.
  Tokens are hashed, single-use, expiring, and rotatable via resend.
- **MFA:** TOTP enrollment (`/auth/mfa/enroll/*`) stores an encrypted secret
  reference; confirmation returns one-time hashed recovery codes and re-issues
  the session JWT with `mfaEnabled: true`. Subsequent logins require a
  short-lived MFA challenge token before a full session is issued.
- **Onboarding lifecycle:** `organisation_onboarding_states` + immutable
  `organisation_onboarding_status_log` track the 13-step wizard. Go-live is
  blocked until required steps, verified email, and MFA pass. The admin proxy
  redirects incomplete organisations away from `/dashboard/*`.
- **Password reset:** a `password_reset_token` table (single-use,
  short-`expires_at`, added to `rbac.ts` alongside `application_users` in Section
  11.4.5) backs `POST /auth/password-reset/request` and `/confirm`. The
  token is never the primary key of anything else and is deleted (not soft
  deleted — Section 11.4.5's soft-delete rule is for operational records,
  not single-use security tokens) once consumed or expired.
- **Account deletion:** routed through the **existing DSAR workflow**
  (Section 8.9, `data_subject_request` + `dsar_status_log`), not a separate
  "delete my account" endpoint — an account deletion request is a
  `request_type_code = 'account_deletion'` DSAR, so it inherits the same
  Compliance/Audit Officer review, identity verification, and audit logging
  every other DSAR gets, per rule 2 ("same kind of thing, different label").
- **RBAC enforcement stays server-side, per Section 9.2 rule 1**: the admin
  app's sidebar can hide items a role can't use, but every backend endpoint
  independently re-checks the caller's role/site scope via `RbacGuard` and
  `TenantScopeGuard` — the UI never becomes the access-control boundary.
- **Audit events:** `AuditInterceptor` on the backend writes an `audit_event`
  row for every sensitive read, export, correction, or deletion (Section 9.2
  rule 3), independent of which admin-app page triggered it.
- **Typed contracts:** `shared/` holds shared TypeScript modules (identity
  assurance levels V0–V4, visit status, form-rules evaluator) imported by
  `admin/`, `website/`, and `backend/`, so UI forms and API DTOs stay aligned —
  the concrete language-unification benefit noted in the Section 11.2
  backend-language decision.
- **Kiosk (`kiosk/`)** talks to the same NestJS backend over its own
  API surface (offline-sync endpoints, idempotent-write-by-UUID per Section
  8.5) — it does not go through the admin app at all.

### 11.4.5 Proposed Drizzle schema (entity families)

> **STATUS: Approved for Release 1 implementation, 2026-09-09 — human
> sign-off given in conversation** (owner: George Nekwaya), satisfying this
> workspace's standing schema-design rule ("core schema, tenancy
> architecture, and permission models are designed by a human or Fable —
> never unilaterally by the executing model," `SYSTEM_DESIGN_MASTER_GUIDE.md`
> § *Wiebe's Approach: Schema Design Rules*, rule 9). Scope is bounded to
> **Section 18/Part Three §8 "Release 1 — minimum credible product"**; the
> Release 1.5+ tables noted at the end of this section (induction
> completion, CSV bulk import, visitor satisfaction survey, third-party
> register) are deliberately deferred, not omitted by oversight. The
> corresponding SQL migration lives at `backend/db/migrations/0001_release1_init.sql`
> and has been applied to the provisioned Neon project (Section 11.4.7).

This draft follows Section 11.3's data model and the full Wiebe schema-design
checklist from `SYSTEM_DESIGN_MASTER_GUIDE.md`:

1. **UUID primary keys, generated client-side** in application code before
   the write (not a DB default) — every table below, with the one standing
   exception the guide itself carves out: `type_definition` is an
   admin-seeded config table never written by a user-facing request path, so
   a server-side default there is fine.
2. **"Same kind of thing, different label" → `type_code`, not a new table**
   — e.g. one `credential` table with a `credential_type_code` (NFC badge,
   phone-NFC, DigiNam reference) rather than a table per credential flavor.
3. **No hardcoded enums or `CHECK` lists** — every type/status/category
   column below is a `*_code` foreign key into `type_definition`, including
   the ones easy to miss: a credential's holder type, a role assignment's
   "initial vs. change" distinction, a device's CRAN compliance status, and
   a notification's delivery status. (An earlier draft of this section had
   three of these as inline string unions — `holder_type`, `assignment_type`,
   `cran_status` — corrected below.)
4. **`_status_log` companion table for every stateful entity**, created in
   the same migration as the entity. Tables that are already structurally
   append-only (`identity_verification_event`, `notification_event`,
   `emergency_roster_snapshot`, `audit_event` — nothing ever `UPDATE`s their
   value columns, only new rows are inserted) are noted as exempt per the
   guide's documented exception, not omitted by oversight.
5. **Zero triggers, stored procedures, or `ON DELETE CASCADE`** — every
   relationship below is a plain UUID column; state transitions and cascade
   effects (e.g. closing a `visit` on sign-out, expiring a `credential`) live
   in the NestJS service layer (Section 11.4.4), not the database. RLS
   policies are the one allowed exception, for tenant-row visibility only.
6. **Money:** no monetary columns exist in this schema — Buffr Checkpoint's
   own billing/subscription data (Section 15.3) is a separate, not-yet-drafted
   schema family and must follow the same `NUMERIC(15,2)` + `currency_code`
   rule when it's designed.
7. **Soft deletes only** — `deleted_at TIMESTAMPTZ NULL` on every table;
   deletes are `UPDATE`s, never `DELETE FROM`.
8. **Tenancy column on every operational table** — `organisation_id`, even on
   tables that also carry `site_id`, so every index can lead with it.

Schema files live under `backend/src/db/schema/`, one file per family:

```text
schema/
├── type-definitions.ts
│     type_definition(id uuid default gen_random_uuid() [admin-seeded exception, rule 1],
│                      domain text, code text, label text, sort_order int, deleted_at)
│     — domains: visit_status, identity_assurance_level, risk_tier,
│       role_code, credential_type, credential_holder_type,
│       role_assignment_event_type, cran_compliance_status,
│       notification_channel, notification_delivery_status,
│       dsar_request_type, audit_event_type, capture_channel,
│       visitor_type (Part Three §4 — general/pre-registered/contractor/
│         delivery/interview/vip/healthcare/event/temp-staff/restricted-site),
│       language, organisation_sector (bank/government/healthcare/
│         critical_infrastructure/sme — Addendum §7.1 "Public-Sector Tenant
│         Policy"), invitation_status, evidence_pack_status,
│       support_access_reason,
│       field_class (Part Three §5.1 — core/basic/sensitive/high_risk/
│         verification_evidence/operational),
│       field_type (text/textarea/single_choice/multiple_choice/date/
│         boolean/phone/email — migration `0030`),
│       check_in_field_code (system field library codes — migration `0030`).
│       Adding a value is an INSERT, never a migration.
│
├── organisations.ts
│     organisation(id uuid pk, name, sector_code fk→type_definition, deleted_at)
│     region(id uuid pk, organisation_id fk, name, deleted_at)
│
├── sites.ts
│     site(id uuid pk, organisation_id fk, region_id fk, name, risk_tier_code fk→type_definition, deleted_at)
│     zone(id uuid pk, organisation_id fk, site_id fk, name, risk_tier_code fk→type_definition, deleted_at)
│       -- Section 7.2 Tier 4/5, Section 8.8 "zone exit", Part Three §3.4 "organisation, region, site, and zone scope"
│     site_checkin_code(id uuid pk, organisation_id fk, site_id fk, code, active_from, active_until)  -- immutable, one row per rotation
│       -- Section 6.2's rotating USSD/kiosk site code; a new row per rotation, never an UPDATE — append-only by construction, rule 4 exception
│     device(id uuid pk, organisation_id fk, site_id fk, manufacturer, model, serial_number,
│            radio_wifi boolean, radio_bluetooth boolean, radio_nfc boolean, radio_cellular boolean,
│            cran_status_code fk→type_definition, cran_certificate_reference, supplier_evidence_reference,
│            firmware_version, warranty_expires_at, mdm_enrolled boolean,
│            disposal_evidence_reference, deleted_at)
│       -- full Device Compliance Register field set per Addendum §2.2; "no unregistered device should be deployable"
│     device_status_log(id uuid pk, device_id fk, status_code fk→type_definition, occurred_at, actor_id, reason)  -- immutable
│     access_policy(id uuid pk, organisation_id fk, site_id fk nullable, zone_id fk nullable, config jsonb, deleted_at)
│     retention_policy(id uuid pk, organisation_id fk, site_id fk nullable, retention_days int,
│                      version int, deleted_at)
│       -- site_id nullable: a null site_id is the organisation's default policy: Addendum §7.1's
│       -- "Public-Sector Tenant Policy" is this same table with organisation.sector_code = 'government',
│       -- not a separate table, per rule 2 ("same kind of thing, different label")
│
├── hosts.ts
│     host(id uuid pk, organisation_id fk, site_id fk, name, department, contact_reference, deleted_at)
│       -- Section 11.3's "Host / Staff Directory" — distinct from user_account/rbac.ts: a host is
│       -- who a visit is notified to, not necessarily someone who logs into the admin app
│
├── visitors.ts
│     visitor(id uuid pk, organisation_id fk, phone_encrypted, phone_hash, name,
│              preferred_language_code fk→type_definition, deleted_at)
│     -- one-time visitors: Visitor row optional per Section 11.3 "essential data rules";
│     -- a Visit may reference a null visitor_id and carry its own captured fields instead.
│
├── invitations.ts
│     visit_invitation(id uuid pk client-generated, organisation_id fk, site_id fk, host_id fk,
│                       visitor_reference, invitation_code, expected_at, expires_at,
│                       status_code fk→type_definition, deleted_at)
│       -- Release 1.5 pre-registration (Part Three §3.3, §6.1); P0 in the Vizito gap assessment.
│       -- Matched to a visit at check-in via invitation_code — never a public name search,
│       -- per Part Three §2's "privacy-safe returning visitors" principle
│     visit_invitation_status_log(id uuid pk, invitation_id fk, status_code fk→type_definition,
│                                  occurred_at, actor_id, reason)  -- immutable
│
├── consent.ts
│     consent_agreement(id uuid pk, organisation_id fk, site_id fk nullable, version int,
│                        language_code fk→type_definition, content_hash, published_at, deleted_at)
│       -- the versioned policy text a visitor is shown; content itself may live in object storage,
│       -- content_hash ties this row to the exact bytes shown, per Section 5.2's evidence field list
│     consent_acknowledgement(id uuid pk, organisation_id fk, visit_id fk, agreement_id fk,
│                              language_shown_code fk→type_definition, displayed_at, accepted_at,
│                              capture_method_code fk→type_definition, signature_reference,
│                              device_id fk, deleted_at)
│       -- one row per Section 5.2's full field list (Agreement ID/version/language/timestamps/
│       -- visitor reference/capture method/signature status/device ID/site ID/content hash);
│       -- site_id and visitor reference are reachable via visit_id, not duplicated here
│       -- append-only by construction (an acknowledgement is never edited) — rule 4 exception
│
├── visits.ts
│     visit(id uuid pk client-generated, organisation_id fk, site_id fk, zone_id fk nullable,
│           visitor_id fk nullable, host_id fk, visitor_type_code fk→type_definition,
│           invitation_id fk nullable, purpose_category_code fk→type_definition,
│           capture_channel_code fk→type_definition,
│           status_code fk→type_definition, -- current status, denormalized from the log below
│           photo_reference nullable, -- Section 11.3 "disabled by default"; enforced by access_policy.config, not schema
│           notes nullable, -- Section 5.1 "restricted; avoid as default"; same enforcement point
│           checked_in_at, server_accepted_at, checked_out_at,
│           offline_captured boolean, retention_policy_version int, deleted_at)
│     visit_status_log(id uuid pk, visit_id fk, status_code fk→type_definition, occurred_at, actor_id, reason)  -- immutable
│
├── identity-verification.ts
│     identity_verification_event(id uuid pk, visit_id fk, provider_code fk→type_definition,
│                                  assurance_level_code fk→type_definition ('V0'..'V4'),
│                                  outcome_reference, occurred_at, deleted_at)
│     -- stores only the verification outcome/reference per Section 8.4's critical rule, never the full credential payload
│     -- append-only by construction (one row per verification attempt, no value-column UPDATE) — no separate _status_log needed, rule 4 exception
│
├── credentials.ts
│     credential(id uuid pk, organisation_id fk, holder_type_code fk→type_definition ('visitor'|'contractor'|'staff'),
│                holder_id, credential_type_code fk→type_definition, token_reference,
│                expires_at, deleted_at)
│     credential_status_log(id uuid pk, credential_id fk, status_code fk→type_definition, occurred_at, actor_id, reason)  -- immutable
│     -- token_reference is a random/cryptographic reference per Section 12.2 — never a static NFC UID alone
│
├── notifications.ts
│     notification_event(id uuid pk, visit_id fk, channel_code fk→type_definition,
│                         recipient_reference, sent_at, delivery_status_code fk→type_definition, deleted_at)
│     -- append-only by construction (one row per notification attempt) — no separate _status_log needed, rule 4 exception
│
├── emergency.ts
│     emergency_event(id uuid pk, organisation_id fk, site_id fk, initiated_by, initiated_at,
│                      closed_at, deleted_at)
│     emergency_roster_snapshot(id uuid pk, emergency_event_id fk, visit_id fk, captured_at)  -- immutable
│     -- snapshot table is append-only by construction — no separate _status_log needed, rule 4 exception
│
├── dsar.ts
│     data_subject_request(id uuid pk, organisation_id fk, subject_reference,
│                           request_type_code fk→type_definition,
│                           status_code fk→type_definition, deleted_at)
│     dsar_status_log(id uuid pk, request_id fk, status_code fk→type_definition, occurred_at, actor_id, reason)  -- immutable
│
├── legal-holds.ts
│     legal_hold(id uuid pk, organisation_id fk, scope jsonb, active boolean, deleted_at)
│     legal_hold_status_log(id uuid pk, legal_hold_id fk, status_code fk→type_definition, occurred_at, actor_id, reason)  -- immutable
│
├── rbac.ts
│     role(id uuid pk, organisation_id fk, role_code fk→type_definition,
│          is_bundle boolean, deleted_at)  -- role_code includes 'owner_operator' (Section 9.1a),
│                                          -- plus granular codes for Professional/Verify/Access tiers
│     user_account(id uuid pk, organisation_id fk, email, email_verified_at nullable,
│                  mfa_enabled boolean, mfa_secret_reference nullable, deleted_at)
│       -- mfa_secret_reference points at a secrets-manager entry, never a raw secret in the row; Section 13.1 "MFA for administrators and privileged roles"
│       -- email_verified_at null does not block login (Section 11.4.4) — an unverified Owner-Operator (Section 9.1a) still needs day-one access
│     password_reset_token(id uuid pk, user_id fk, token_hash, expires_at, consumed_at nullable)
│       -- single-use, short-lived; deleted (not soft-deleted) once consumed or expired — a security token, not an operational record, so rule 7's soft-delete convention does not apply here
│     support_access_grant(id uuid pk, organisation_id fk, granted_to_user_id fk, reason_code fk→type_definition,
│                           approved_by, starts_at, expires_at, revoked_at, deleted_at)
│       -- Buffr Checkpoint's own Platform Support role (Section 9.1), never customer-side: Section 9.2 rule 4's
│       -- "exceptional, time-bound, client-approved where practical, reason-coded, fully logged" break-glass access
│     role_assignment(id uuid pk, organisation_id fk, site_id fk nullable, user_id fk, role_id fk,
│                      assigned_at, assignment_event_type_code fk→type_definition ('initial'|'change'), deleted_at)
│                      -- assignment_event_type_code distinguishes Section 9.2 rule 7's "initial assignment"
│                      -- (logged only) from "role change" (requires approval + audit event)
│     role_assignment_status_log(id uuid pk, role_assignment_id fk, event_type_code fk→type_definition, occurred_at,
│                                 actor_id, approved_by, reason)  -- immutable; only written when
│                                                                 -- assignment_event_type_code = 'change'
│
├── evidence.ts
│     evidence_pack(id uuid pk, organisation_id fk, requested_by, scope jsonb,
│                    status_code fk→type_definition, generated_at nullable, file_reference nullable, deleted_at)
│     evidence_pack_status_log(id uuid pk, evidence_pack_id fk, status_code fk→type_definition,
│                               occurred_at, actor_id, reason)  -- immutable; generation is stateful
│       -- (pending → generating → ready|failed), unlike the append-only tables above
│
└── audit.ts
      audit_event(id uuid pk, organisation_id fk, actor_id, action, resource_type, resource_id,
                   occurred_at, prev_event_hash, event_hash)  -- append-only, hash-linked chain per Section 11.2
      -- append-only by construction — no separate _status_log needed, rule 4 exception (it IS the log)
```

Every table above carries `organisation_id` (the tenant column) even where a
`site_id` also exists, per this workspace's standing rule that tenancy columns
appear on every operational table; every active-record index is partial
(`WHERE deleted_at IS NULL`) and leads with `organisation_id`.

**Deliberately deferred to a Release 1.5+ migration** (not part of
`0001_release1_init.sql`, per the scope note at the top of this section):
`induction_completion` (contractor safety induction, Part Three §6.3),
`bulk_import_job` (+ status log; CSV visitor import, Part Three §1 P1),
`visit_survey_response` (post-visit satisfaction micro-survey, Section 8.7,
Part Three §1 P3), and `third_party_register` (vendor/supplier register,
Addendum §7.1 P1 relative to Release 1). Each is a straightforward extension
of the patterns above (a stateful entity gets a `_status_log`, an append-only
one doesn't) and should be drafted the same way — as a proposal awaiting
sign-off — when Release 1.5 planning starts.

### 11.4.5a v0.4 schema proposals — approved and applied (migration `0006`)

> **STATUS: Approved and applied, 2026-09-09** (owner: George Nekwaya, sign-off
> given in conversation). Every table and column below was created by
> `backend/db/migrations/0006_release1_5_schema.sql`, confirmed live against
> the `buffr-checkpoint` Neon project via `get_database_tables`. The one
> correction versus the original proposal: `organisation_capability_enablement`
> was found to already exist (added earlier, in `0005_capability_status_split.sql`)
> — it is not part of `0006`.
>
> This section's table/column names below are historical (the state of the
> proposal as originally drafted and approved). They were subsequently
> **renamed** to business-capability names as part of the "Canonical
> Engineering Constitution" rename described in §11.4.5c — e.g.
> `form_template` → `check_in_form_definitions`, `visitor_type_policy` →
> `visitor_categories`, `visit.idempotency_key` unchanged, `visitor.name` →
> `visitor_personal_data.encrypted_payload` (folded into the split
> visitor-identity model, not a same-table column). Read this section for
> the original rationale; read §11.4.5c for the names actually live today.

Per this section's own STATUS note and the workspace's standing rule that
core schema is designed by a human or Fable, never unilaterally by the
executing model, the following were **proposals**, approved above. They did
not exist in `0001_release1_init.sql` through `0004_capability_status.sql`.

```text
organisation-capability-enablement.ts
  organisation_capability_enablement(id uuid pk, organisation_id fk,
    capability_code fk→type_definition, enabled_at, enabled_by,
    configuration_reference, deleted_at)
    -- closes the gap between §4a.7's own kiosk requirement ("only once
    -- platform status is live AND the site has enabled it in
    -- organisation_capability_enablement") and the schema, which never
    -- built that table. capability_status (§4a.7) stays the single
    -- platform-wide row per capability (no organisation_id — Wiebe rule 8
    -- exception, unchanged); this new table is the missing per-tenant gate
    -- layered on top of it, not a replacement.

form-templates.ts
  form_template(id uuid pk, organisation_id fk, visitor_type_code
    fk→type_definition, site_id fk nullable, deleted_at)
  form_template_version(id uuid pk, form_template_id fk, version int,
    published_at, deleted_at)  -- immutable once published; a correction is
    a new version row, never an UPDATE to a published one
  form_field_definition(id uuid pk, form_template_version_id fk,
    field_class_code fk→type_definition (Part Three §5.1's core/basic/
    sensitive/high-risk/verification-evidence/free-text classes),
    field_key, required boolean, deleted_at)
  form_field_rule(id uuid pk, form_field_definition_id fk, rule_type_code
    fk→type_definition, rule_config jsonb, deleted_at)
  visitor_type_policy(id uuid pk, organisation_id fk, visitor_type_code
    fk→type_definition, form_template_id fk, default_assurance_level_code
    fk→type_definition, deleted_at)
  workflow_policy(id uuid pk, organisation_id fk, site_id fk nullable,
    zone_id fk nullable, deleted_at)
  workflow_policy_version(id uuid pk, workflow_policy_id fk, version int,
    config jsonb, published_at, deleted_at)  -- immutable versions, same
    pattern as form_template_version
  site_capture_channel_policy(id uuid pk, organisation_id fk, site_id fk,
    capture_channel_code fk→type_definition, enabled boolean, deleted_at)
    -- replaces relying on access_policy.config jsonb alone to answer "which
    -- channels are available at this site" (Part Three §3.3 "Checkpoint
    -- Flow" and §5 "Dynamic Form Builder" describe this narratively today
    -- with no dedicated schema home)

consent-legal-basis.ts
  -- new type_definition domain: legal_basis_code
  --   values: 'mandatory_notice' (ordinary building security/visitor
  --   management — a notice/acknowledgement, not revocable consent),
  --   'optional_consent' (marketing, optional photo use, optional survey,
  --   optional analytics — genuinely revocable)
  consent_acknowledgement.legal_basis_code fk→type_definition  -- new column
    -- closes the letter's "notice is not always consent" gap: a visitor
    -- forced to "consent" as a condition of entry isn't giving freely
    -- revocable consent, and today's schema has no field distinguishing
    -- the two cases

visits.ts (addition)
  visit.idempotency_key text nullable, unique per organisation_id
    -- client-generated UUID PKs already give partial idempotency for
    -- visit creation itself; this closes the remaining gap for the
    -- offline-sync queue (Section 8.5), where a retried sync batch needs
    -- an explicit key distinct from the record's own id

visitors.ts / hosts.ts (column-type change, not a new table)
  visitor.name → visitor.name_encrypted (bytea) + visitor.name_hash
    -- same pattern already used for phone_encrypted/phone_hash; today name
    -- is the one plaintext PII column left on this table
  host.contact_reference → encrypted, with an explicit type/permitted-use
    note (currently undefined in the schema)

retention_policy / legal_hold (behavioral correction, not new columns)
  -- retention_policy.version stays an int, but must never be UPDATEd on an
  -- existing row once referenced by any visit.retention_policy_version — a
  -- policy change is a new row with version = version + 1, enforced at the
  -- service layer (no schema change needed, this is an app-code fix)
  -- legal_hold.active (boolean) should be removed once legal_hold_status_log
  -- is the sole source of truth for current state, derived by "most recent
  -- log row," matching the pattern already used for every other _status_log
  -- table in this schema
```

Each item above should be drafted the same way §11.4.5's original tables
were — proposed here, then implemented in a migration only after explicit
sign-off, per this section's own precedent.

### 11.4.5b Implementable-now gaps closed (no new schema sign-off required)

Alongside `0006`, the concrete enforcement/wiring gaps this document's own
v0.4 changelog flagged as "implementable now" (top of document, point 4)
were closed:

- **CRAN deployability gate (§14.3a)**: a `backend/src/modules/devices/`
  module was built (it did not exist — despite `device`/`device_status_log`
  schema and the `DEVICE_MANAGE` permission already being defined) exposing
  device registration, a status-transition endpoint that walks the 7-value
  `cran_compliance_status` sequence, and an `activate` endpoint that rejects
  unless the device's current status resolves to `approved_for_deployment`
  — the concrete, testable version of "no unregistered device should be
  deployable." Verified live: a device created `unassessed` is rejected on
  activation; after walking all 7 statuses in order, activation succeeds.
- **§9.2 rule 8 (privileged actions require a verified email)**: found
  already fully implemented (`RequireVerifiedEmail` decorator + `RbacGuard`
  check), contrary to this document's own claim it was still open — a
  doc-vs-code drift caught during the audit, not new work.
- **`/retention-policy` module**: built (schema/permission existed, no
  controller did), enforcing the version-immutability rule (§11.4.5a: a
  policy change is a new row, never an `UPDATE` on a version any `visit`
  already references).
- **`/type-definitions` read endpoint**: built — `GET /type-definitions?domain=`,
  backing every admin-app dropdown that previously would have needed a
  hardcoded list.
- **Migration filename collision**: `0005_audit_append_only.sql` and
  `0005_capability_status_split.sql` both existed — the unapplied one was
  renumbered `0007_audit_append_only.sql`. **`0007` is superseded** by
  `0024_app_role_append_only_enforcement.sql` (live Constitution table names;
  does not revoke UPDATE on the notification outbox). Still **unapplied**
  until a human creates `buffr_checkpoint_app`, repoints Railway
  `DATABASE_URL`, then runs Part B REVOKE — the app currently connects as
  `neondb_owner`, which bypasses every `REVOKE`.

### 11.4.5c Canonical Engineering Constitution rename — applied (migrations `0008`–`0009`)

> **STATUS: Approved and applied, 2026-09-09** (owner: George Nekwaya). A
> second document — appended to this file as the "Canonical Engineering
> Constitution" — established a binding rule that every table, service,
> controller, and type be named after the business capability it performs,
> not its framework or source file (e.g. `VisitorsService` →
> conceptually "visitor identity," not a CRUD noun). Applied to the entire
> live schema built above. Scope was bounded to the new document's own
> "Phase 1 — Complete usable system"; kiosk/device-signing-key/offline-
> reconciliation depth and SMS/USSD/DigiNam integration (its Phase 2/3)
> stayed deferred, unchanged from this document's own existing scope
> boundary (Slice 3/5/6). Real KMS-backed envelope encryption was also
> deferred — replaced with a local AES-256-GCM implementation behind a
> `PersonalDataProtectionService` interface (`backend/src/common/data-protection/`),
> so swapping in a real KMS later touches one file, not the schema or
> callers.

Every table renamed, with the every-active-record-index-partial /
`organisation_id`-tenancy / soft-delete / zero-trigger rules from §11.4.5
carried over unchanged — this was a rename and a PII-protection upgrade,
not a re-architecture of the Wiebe rules themselves:

| Old name (§11.4.5/§11.4.5a) | New name (live today) |
|---|---|
| `organisation`, `region` | `organisations`, `organisation_settings` (new), `regions` |
| `site`, `zone` | `sites`, `security_zones` |
| `user_account`, `role`, `role_assignment`, `role_assignment_status_log` | `application_users`, `role_definitions`, `organisation_memberships`, `organisation_membership_status_log` |
| `visitor` (single table, plaintext `name`) | `visitor_subjects` (PII-free) + `visitor_personal_data` (one JSONB `ProtectedPersonalDataEnvelope` holding name+phone, plus `name_lookup_hmac`/`phone_lookup_hmac` — never a plain hash, the Constitution's explicit correction against dictionary-attack-vulnerable name/phone hashes) |
| `visit`, `visit_status_log` | `visitor_visits`, `visit_status_events` |
| `visit_invitation`, `visit_invitation_status_log` | `visit_invitations`, `visit_invitation_status_events` |
| `host` (plaintext-adjacent `contact_reference_encrypted`/`hash`) | `site_hosts` (`host_name_protected`/`host_contact_protected` envelopes) |
| `credential`, `credential_status_log` | `access_credentials`, `credential_status_events` |
| `device`, `device_status_log` | `managed_kiosk_devices`, `device_operational_status_log` |
| `retention_policy` | `retention_policies` |
| `legal_hold`, `legal_hold_status_log` | `legal_holds` (no `active` boolean — derived from the log, per §11.4.5a's own behavioral fix), `legal_hold_status_events` |
| `data_subject_request`, `dsar_status_log` | `privacy_requests`, `privacy_request_status_log` |
| `audit_event` | `audit_events` (`action` → `action_code`; new `request_id` column) |
| `platform_capability_status` | `platform_capability_approvals` |
| `form_template*`, `visitor_type_policy` | `check_in_form_definitions`, `check_in_form_versions`, `check_in_form_fields`, `visitor_categories` — `form_field_rule` folded into `check_in_form_fields.validation_schema` (0 rows, no caller); `workflow_policy`/`workflow_policy_version`/`site_capture_channel_policy` **dropped** (0 rows, no caller, not part of the Constitution's model) |
| `consent_agreement`, `consent_acknowledgement` | `visitor_policy_documents` + `visitor_policy_versions` (split — the old table conflated a document with its one active version), `visitor_policy_acknowledgements` |
| `notification_event` | `notification_delivery_instructions` |
| `emergency_event`, `emergency_roster_snapshot` | `emergency_roll_call_events`, `emergency_roll_call_entries` |

`permission_definitions` + `role_permission_grants` (new tables) replace the
hardcoded `ROLE_PERMISSIONS` TS map — a role's permission set is now config
data (`backend/db/seed/0004_canonical_permissions.sql`), evaluated by a new
`ScopedPermissionEvaluationService`, matching this schema's own
config-over-code principle for `type_definition`. Permission codes moved to
dot-notation (`visit.arrival.record`, `device.provision`, etc.) — see the
new document's §5.1.

Every row that existed before the rename (all synthetic smoke-test data —
see `backend/.env.example`'s "DEVELOPMENT/TESTING ONLY" note) was carried
forward via `INSERT ... SELECT`, not a blind drop; row counts were verified
identical before/after. A Neon snapshot (`snap-mute-shadow-arde2xqb`) was
taken immediately before the migration as the rollback point.

HTTP route paths were **not** renamed (`/visits`, `/hosts`, etc. unchanged)
— only the database/service layer — to avoid re-breaking the admin-app
wiring built in the same session. This is a scope boundary, not an
oversight: a future pass renaming routes to the new document's §9 endpoint
table (`POST /visitor-arrivals` etc.) would also need to update every admin
page that calls them.

### 11.4.6 Verification

`drizzle-kit generate` should produce migrations matching the tables above; a
smoke test should confirm `RbacGuard` rejects a cross-site request (Section
9.2 rule 5) and that an Owner-Operator's initial `role_assignment` writes no
`role_assignment_status_log` row while a subsequent role split does (Section
9.2 rule 7, Section 9.1a).

### 11.4.7 Provisioned database

A Neon Postgres project exists for Release 1, and every migration through
`0010` (§11.4.5a/§11.4.5b/§11.4.5c/§11.9.8) has been applied to it:

| | |
|---|---|
| Project name | **`buffr-checkpoint-eu` (Frankfurt primary)** |
| Project ID | Frankfurt primary: **`falling-frog-15538162`**. Oregon rollback `bold-cloud-47505421` **deleted 2026-09-25** after Frankfurt smoke 6/6 + migration 0038 |
| Region | Frankfurt primary: **`aws-eu-central-1`** (not Namibia-hosted) |
| Postgres version | 18 |
| Database | `neondb` |
| Default branch (Frankfurt) | `br-blue-frog-b1sgfw94` — Object Storage **enabled** (`https://br-blue-frog-b1sgfw94.storage.c-5.eu-central-1.aws.neon.tech`, region `eu-central-1`, `force_path_style`) |
| Object Storage / AI Gateway / Functions | **Cut over (v0.29).** Railway + local `ARTIFACT_STORE=neon_s3` with bucket `buffr-checkpoint-artifacts`. Credential `buffr-checkpoint-runtime-v029` (secrets in env only). Functions + Managed Better Auth remain **deferred**. Oregon rollback **deleted 2026-09-25**. Vercel Blob is explicit degrade only (source listing had 0 objects at cutover). |
| Migrations applied | `0001_release1_init.sql` through **`0038_branded_notification_templates.sql`**. Frankfurt restore (2026-09-18) verified through form-builder domains; **0035–0037** (QR-first catalog, CiMSO PMS shell + TCP columns) live; **0038** applied 2026-09-25 (`notification_template_code` = 28, `platform_notification_template` = 28, `attachments_json` on outbox). Production smoke `scripts/smoke-production.sh` → 6/6 PASS against Frankfurt-backed API. |
| Seed / domain coverage | Seeds `0001`–`0019` under `backend/db/seed/`. Form-builder domains also land via migrations `0030`/`0031`. Experience domains from `0008_site_visitor_experience_domains.sql`: `configuration_version_status` (3), `site_qr_type` (6), `host_notification_escalation_action` (5). |
| Pre-rename rollback point | Neon snapshot `snap-mute-shadow-arde2xqb` |
| Connection string | **Not in this document.** Lives in `backend/.env` (gitignored) and Railway. **Least-privilege role live (2026-09-14):** `buffr_checkpoint_runtime` (SQL-created, **not** `neon_superuser`). Verified `has_table_privilege(…, audit_events, UPDATE) = false` while INSERT remains true; outbox `notification_delivery_instructions` keeps UPDATE. Local `.env` **and Railway production `DATABASE_URL`** pointed at this role (redeployed). Prefer deleting any leftover Neon-API role `buffr_checkpoint_app` that is still in `neon_superuser`. |

#### Platform primitive adoption decisions (recorded v0.29; Object Storage revised same day)

| Primitive | Decision |
|---|---|
| **Neon Functions** | **Deferred.** NestJS keeps evidence packs, DSAR export, bulk import, and AI-assisted form translation until a concrete scale need appears. Do not adopt Functions as a second compute plane in Release 1. |
| **Managed Better Auth** | **Deferred.** Custom NestJS auth retains TOTP MFA + login lockout parity the managed plugin set lacks (cross-link §11.2 Identity / SSO row). |
| **Object Storage / AI Gateway region** | **Done (pre-pilot).** Primary Neon project `falling-frog-15538162` in `aws-eu-central-1` (Postgres 18). **`ARTIFACT_STORE=neon_s3` is production primary** via `NeonS3ArtifactStore` / `createArtifactStore()`. Vercel Blob is **explicit degrade only**. AI Gateway co-locates with Frankfurt when `FORM_AI_ENABLED=true`. Preview-branch validation (2026-09-18): inherited 8 orgs + `buffr-checkpoint-artifacts`; probe object uploaded; branch delete cleaned the branch. |

**Neon Object Storage limits vs Vercel Blob (honest):** buckets are `private` or `public_read` only (no fine-grained per-path IAM); no upload event notifications; no Glacier/storage classes; no cross-region replication; no per-operation fees (storage billed per GB-month). Max object size during beta is 5 GiB — sufficient for evidence packs, KYB, POP, DSAR. Requests may return `503 SlowDown` under load — reuse outbox-style backoff.

`type_definition` is seeded (`backend/db/seed/0001_type_definitions.sql`
through `0019_demo_device_compliance_register.sql`, plus domains inserted by
migrations `0030`/`0031`) — every domain a `*_code` foreign key in the schema
points at has real rows, including `cran_compliance_status`'s 7-value sequence
(§14.3a), the `permission_definitions`/`role_permission_grants` catalogue
(§11.4.5c), Section 11.9.8 domains (`configuration_version_status`,
`site_qr_type`, `host_notification_escalation_action`), and form-builder
domains `field_class`, `field_type`, `check_in_field_code` (Part Three §5.1).

## 11.5 Visual Design System — light theme, adopted for the admin app

The Buffr Checkpoint wordmark (black type, single golden-yellow accent
stripe through the "ff") and app icon (a black "U"-mark and a gold bar) are
both light-canvas, black-on-white marks with one saturated accent — reviewed
and adopted here as the `admin/` app's design system, replacing the
installed template's default theme (Section 11.4.1). This section is the
source of truth for the theme; implement it as Tailwind v4 `@theme` tokens
in `admin/src/app/globals.css`, alongside the template's existing
`src/styles/presets/*.css` pattern.

**Theme:** light only. **Mood:** a clean, paper-white control surface — near-
black type, one reactive gold accent, ultra-light display type, and hairline-
bordered cards on an off-white ground. This fits the product's own framing
well: a front-desk roster or compliance dashboard genuinely is a control
surface, and the restraint (one chromatic color, rationed) reads as
authority rather than decoration — useful for a product selling into banks
and government offices (Section 15.1) where a busy, colorful admin UI would
undercut the "governed system" positioning from Section 22.

**v0.5 correction to this section:** this section originally specified a
dark, near-black canvas (`--color-carbon: #1f1d01` background, styled as an
"Adnaut dark theme"). That was built, then checked against the actual brand
asset files at the workspace root
(`9DEA346D-58CE-41C9-B4AC-F40124941AFF.PNG`, the wordmark, and
`3355B536-3F10-472C-BF5E-BE5BAE32EC41.PNG`, the app icon) and found to be
backwards: both real assets are light-canvas — black type/marks and a single
gold accent on a white or near-white ground — not dark-canvas. The dark
theme clashed with the real logo instead of complementing it. The Sodium
Yellow accent value itself was re-aligned to identity-sheet mustard `#E0B000`
(CSS variable name `--color-sodium-yellow` unchanged); every other token below was re-derived for a
light ground. Section 11.5.1's table reflects the corrected, currently-built
values; the table immediately below documents the before/after mapping for
anyone diffing against the pre-v0.5 build.

| Token | v0.4 (dark canvas) value / role | v0.5 (light canvas) value / role |
|---|---|---|
| `--color-sodium-yellow` | `#e2a603` — primary CTA fills, active nav state | `#E0B000` — identity-sheet mustard (CSS name unchanged) |
| `--color-lime-pulse` | `#00ff1a` — editorial/status accent only | **Unchanged.** `#00ff1a` — same role |
| `--color-carbon` | `#1f1d01` — page canvas (dark) | `#171717` — **repurposed**: primary text/ink color (near-black, not pure `#000000`, matching the same "not harsh" principle the dark canvas used) |
| `--color-graphite` | `#282828` — card surfaces (dark) | `#e9e7e0` — **repurposed**: light warm-gray secondary surface/muted fill |
| `--color-slate` | `#707070` — secondary borders/dividers | `#6b6b6b` — **repurposed**: muted/secondary text (passes 4.5:1 on white) |
| `--color-frost` | `#d7d7d7` — primary body text on dark surfaces | `#d9d9d4` — **repurposed**: borders/dividers on light surfaces |
| `--color-cloud` | `#f2f2f2` — headline text, a step brighter than Frost | `#F5F5F5` — identity-sheet Light (page background) |
| `--color-pure-white` | `#ffffff` — text on yellow fills only | `#ffffff` — **unchanged value, repurposed role**: elevated card/sidebar surface and literal white, no longer used as text-on-yellow |
| `--color-ash` | `#8d8d8d` — muted helper text | `#9a9a94` — **repurposed**: tertiary/disabled text |
| `--color-charcoal` | `#333333` — depth accents within dark panels | `#111111` — identity-sheet charcoal (inverted chips/fills; mark core) |
| `--color-status-live` | `#22c55e` (~2.3:1 contrast on white — already failed AA before the flip) | `#15803d` — darkened to clear 4.5:1 on the light ground |

Primary/accent-foreground text on Sodium Yellow fills also changed: the
pre-v0.5 build used `--color-pure-white` (white text on gold), which is
~2.2:1 contrast — below WCAG AA. The corrected build uses `--color-carbon`
(near-black text on gold), ~9.7:1 — and matches the wordmark's own
black-on-gold "checkpoint" lockup.

### 11.5.1 Color tokens

| Token | Value | Role |
|---|---|---|
| `--color-sodium-yellow` | `#E0B000` | Primary CTA fills, active nav state, accent cards — the only saturated action color in the system. Canon from the identity sheet (mustard). Vector/PNG kit lives in `buffrcheckpoint/branding/` (`exports/` for sized PNGs). Wordmark ff-bar weave: mustard bar behind the first `f` stem, in front of the second. |
| `--color-sodium-yellow-ink` | `#8A6B00` | Text-safe sodium variant (accessibility). Use for sodium-tinted labels and links on light surfaces where `#E0B000` fails contrast; never for primary CTA fills. |
| `--color-lime-pulse` | `#00ff1a` | Editorial/status accent only — e.g. a "synced" or "V3 verified" badge. Rationed to one or two occurrences per screen; never a second CTA color. |
| `--color-carbon` | `#171717` | Primary text/ink color. Never pure `#000000` — the same "not harsh" principle the pre-v0.5 dark canvas used, now applied to text instead of background. |
| `--color-graphite` | `#e9e7e0` | Secondary/muted surface fill (light warm-gray). |
| `--color-slate` | `#6b6b6b` | Muted/secondary text — passes 4.5:1 contrast on white. |
| `--color-frost` | `#d9d9d4` | Borders, dividers, hairlines on light surfaces. |
| `--color-cloud` | `#F5F5F5` | Page background — identity-sheet Light. |
| `--color-pure-white` | `#ffffff` | Elevated card/sidebar/popover surfaces; literal white. |
| `--color-ash` | `#9a9a94` | Tertiary/disabled helper text, metadata. |
| `--color-charcoal` | `#111111` | Identity-sheet charcoal — mark core, inverted chips/fills within an otherwise-light panel. |

**Do not** use `--color-lime-pulse` for anything status-critical (e.g. an
error state) — Buffr Checkpoint already uses green/red semantically nowhere
in this blueprint's V0–V4 assurance-level or visit-status language, so
introducing it here would be new semantic surface, not a style choice.
Errors/warnings need their own token, not an editorial-accent repurpose —
flagged for whoever builds the admin app's alert/toast components. The
dedicated `--color-status-live` token (`#15803d` as of v0.5) is that token —
see the paragraph in Section 4a.7 that introduced it.

### 11.5.2 Typography

| Family | Role | Weights | Sizes | Substitute (no license) |
|---|---|---|---|---|
| Archivo | Display/headings. Ultra-light (100–300) at 56–64px is the signature move — headlines whisper, not shout. | 100, 300, 400 | 16, 18, 24, 32, 56, 64px | Inter, Space Grotesk, DM Sans |
| Geist | UI/body — nav, buttons, forms, body copy. 400 default reading; 500–600 for button/active-nav labels. | 300, 400, 500, 600 | 14, 16, 20px | Inter, system-ui |
| Geist Mono | Small uppercase labels, tag prefixes, technical/coded moments (audit-log entries, device serials, hash values — a good fit for Section 11.4.5's `event_hash`/`token_reference` fields displayed in the UI). | 400, 600 | 14, 16, 24, 56px | JetBrains Mono, IBM Plex Mono |

Type scale: caption 14/1.5, body-sm 16/1.5, subheading 20/1.5, heading-sm
24/1.1, heading 32/1.1, heading-lg 56/1.0, display 64/1.0.

### 11.5.3 Spacing, radius, layout

8px base unit; scale 8/16/24/32/40/48/64/80/96px. Radius: nav 8px, tags 4px,
cards/buttons 16px, large panels 24px. Page max-width 1280px, section gap
64px, card padding 24–32px. No drop shadows anywhere — elevation comes from
the graphite fill plus a 1px `--color-slate` hairline border, never a
box-shadow. No sharp (0px) corners on interactive elements.

### 11.5.4 Component patterns mapped to Buffr Checkpoint screens

| Adnaut pattern | Applied to (Section 11.4.3 route) |
|---|---|
| Primary CTA (filled sodium yellow, black text, 16px radius) | "Check out" action on the Front Desk roster; "Export Evidence Pack" button |
| Accent card (yellow fill, max one or two per view) | A single flagged KPI on the Compliance Dashboard (e.g. "Open deletion requests: 2") — not every stat tile, which would violate the rationing rule below |
| Large bordered content card (graphite, hairline border) | Visit detail panel, Device Compliance Register row detail, Evidence Pack detail |
| Sticky bottom/side nav | Adapted to the template's existing left sidebar (Section 11.4.3) rather than a bottom bar — bottom nav doesn't fit a data-dense desktop admin app; keep the yellow active-state treatment, drop the bottom-bar placement |
| Keyword emphasis (lime green, 1–2 words) | Not used in V1 — no current UI copy needs editorial emphasis; revisit if the marketing/About surfaces (Section 1a.3) are ever built on the same design system |

### 11.5.5 Do's and don'ts

**Do:** keep Archivo at 100–300 weight for all display text; use sodium
yellow as a filled background for primary actions only, with near-black
(`--color-carbon`) text on it, never white; keep the canvas at `#f5f4ef`
(off-white), never pure white-on-white with no surface differentiation;
ration lime green to one or two moments per screen; pair Geist (UI) with
Archivo (display) and never mix the two at the same size.

**Don't:** introduce a second saturated accent color for any button or CTA;
use bold/semibold weight on display headlines; cover more than ~20% of a
viewport in yellow; use box-shadows for elevation; use lime green for
anything status-semantic (errors, warnings — see 11.5.1); use sharp corners
on interactive elements; use white text on a sodium-yellow fill (fails WCAG
AA contrast at ~2.2:1 — see the v0.5 correction above).

### 11.5.6 Verification

Once implemented in `admin/src/app/globals.css`: confirm the Tailwind
`@theme` block resolves every token above with no build warnings.

**v0.6 correction to this section's own claim:** this section previously
asserted the leftover theme-mode switcher (`theme-switcher.tsx`,
`src/lib/preferences/theme.ts`) was inert because "the Buffr Checkpoint
tokens are keyed off `[data-theme-preset="buffr-checkpoint"]`, not `.dark`."
That was wrong, and it was the actual root cause of the "white on white"
auth-page bug reported and fixed in v0.6: the preset's own selector list
(`:root, [data-theme-preset="buffr-checkpoint"]`) and `globals.css`'s
separate, generic `.dark { ... }` block have equal CSS specificity, so
`.dark` — appearing later in the compiled stylesheet — silently won the
cascade whenever the switcher's `.dark` class was present on `<html>`,
reverting the whole app to shadcn's stock dark palette. The switcher was
never inert; it was fully capable of breaking this design system, and did,
by default, since `theme_mode` also defaulted to `"dark"`. Fixed two ways:
`theme_mode` now defaults to `"light"`
(`admin/src/lib/preferences/preferences-config.ts`), and
`buffr-checkpoint.css` now also re-pins every token under
`.dark[data-theme-preset="buffr-checkpoint"]` at higher specificity than the
generic `.dark` block, so the switcher is now *actually* inert for this
preset, matching what this section originally (incorrectly) claimed. This
design system is light-only by decision, not by default.

## 11.6 Public Website — Design Tokens, Components, Pages

Section 1a.3 already defines the public website surfaces (Home, Platform,
Pricing, About, Contact, plus Privacy, Terms, 404, and the v0.18
operational `/check-in` destination) and binding content rules per page.
This section adds what was missing: the tech stack, the visual system, and a
section-by-section breakdown of each page.

**Built and verified.** `website/` is scaffolded (Next.js 16, Tailwind v4,
the same Base UI/shadcn primitives as `admin/`) with all 8 marketing
pages/states from Section 11.6.4 — Home, Platform, Pricing, About, Contact,
Privacy, Terms, custom 404 — plus **`/check-in`** (v0.18 operational QR
destination; noindex), `sitemap.ts` and `robots.ts`. `npm run build` passes.
Design tokens (Section 11.5.1/11.6.2) are byte-identical to `admin/`'s via a
shared `src/styles/presets/buffr-checkpoint.css` file, copied into both
apps. The `CapabilityStatusBadge` component (Section 4a.7) is wired on Home
and Platform, reading the backend's live `GET /public/capability-status` —
confirmed at build time to render the real, honest `not_live` state rather
than a hardcoded claim. Two corrections made getting here, both worth
recording: an earlier pass had built these pages inside `admin/src/app/(public)/`,
which contradicted this section's own "separate app" decision — relocated
to `website/`, and `admin/`'s theme switcher UI (light/dark/system toggle)
still let users leave the dark-only theme — removed, since Section 11.5's
decision left nothing to switch to.

### 11.6.1 Stack and repository placement

Not previously decided in Section 11.2, which only covers the kiosk, admin
app, and backend. The public site is a **separate app from `admin/`** — it
is unauthenticated, public, and optimized for marketing/SEO delivery, while
`admin/` sits behind auth and is optimized for data density. Add to the
monorepo structure (Section 11.4.2):

**As actually built** (re-verified against the real tree; the original stub
below undercounted pages — written before Section 1a.3 grew from 5 to 8
pages/states — and named a `lib/capability-status/` folder that isn't how
it landed: the badge is one component file, not a lib module, since it
needed no supporting logic beyond the single `fetch` inside it):

```text
buffrcheckpoint/
└── website/
    └── src/
        ├── app/
        │   ├── page.tsx           ← Home
        │   ├── platform/          ├── pricing/  ├── about/
        │   ├── contact/           ← + contact-form.tsx
        │   ├── check-in/          ← v0.18 operational QR destination (+ check-in-form.tsx); noindex
        │   ├── privacy/           ├── terms/
        │   ├── not-found.tsx      ← custom 404
        │   ├── sitemap.ts         └── robots.ts   ← marketing routes only; /check-in omitted
        ├── components/
        │   ├── capability-status-badge.tsx   ← reads Section 4a.7's public endpoint directly, no lib/ wrapper
        │   ├── site-header.tsx
        │   └── ui/                ← copied from admin/'s shadcn primitives, not a separate component set
        ├── lib/
        │   ├── api.ts             ← NEXT_PUBLIC_API_URL helper + client UUID for public check-in
        │   └── utils.ts           ← just `cn()`, no capability-status/ subfolder
        └── styles/presets/buffr-checkpoint.css  ← copied from admin/, byte-identical (Section 11.6.2)
```

**Stack:** Next.js (static-generation-first for the eight marketing
pages/states; `/check-in` is dynamic because it depends on `site`/`ref`
query params), Tailwind v4 with the same `@theme` token block as
`admin/` (Section 11.5.1) so the brand is byte-for-byte consistent between
the marketing site and the product UI, and a lightweight CMS-free approach
— **as built, page content is authored directly in each `page.tsx`** (plain
JSX and local `const` arrays for repeated items like FAQs/pricing tiers),
not extracted into a separate `website/src/content/` module as an earlier
draft of this section proposed — no `src/content/` directory exists. The
practical effect is the same (no headless CMS, no drift risk from free-text
editing, since Section 1a.3's content rules are precise enough that content
lives next to the markup it renders), just without the extra indirection
layer. The one dynamic piece
is the Capability Status Register read (Section 4a.7) — the backend should
expose a narrow, public, read-only endpoint (`GET /public/capability-status`)
for this, not the authenticated admin API.

### 11.6.2 Design tokens

Reuses Section 11.5.1–11.5.3's tokens exactly — same light canvas, same
Sodium Yellow accent, same Archivo/Geist/Geist Mono type system. The public
site is, if anything, the *primary* surface those tokens were chosen for
(Section 11.5's opening rationale is the logo match), with `admin/`
following the same system for internal consistency rather than the other
way around. One addition specific to the public site: the **Logo Mark**
component (the wordmark as shipped — black "buffr", gold "checkpoint" —
plus a dark/near-black variant) needs both treatments implemented — the
standard mark on the light nav/hero, and a dark or inverted treatment
reserved for any printed/exported material (e.g. the tender pack in
Addendum §10.3) that itself uses a dark background, since the light canvas
is now the site default.

### 11.6.3 Shared components (from Section 11.5.4, reused here)

Primary CTA, Large Content Card, Accent Card (rationed — Section 1a.3's
"DigiNam Verified" badge is exactly the kind of single accent-card moment
this pattern is for), Keyword Emphasis Text (a legitimate use for Part
Three §10's positioning line, "not a digital visitor book" — one phrase per
hero, not more), Contact Info Block (Contact page), 3D Isometric Vignette
(hero/section illustration — commission real artwork rather than a generic
stock render, since the brand's differentiators are Namibia-specific, not
generic "tech mood").

**New, public-site-only component:** the **Capability Status Badge**
(Section 4a.7) — a small reusable component with three states (Not live /
Targeted / Live), used identically on Home and Platform, never
hand-copywritten per page (this is the actual fix for the gap closed in
Section 4a.7).

### 11.6.4 Page-by-page section breakdown

| Page | Sections (top to bottom) | Key components used |
|---|---|---|
| **Home** | Sticky top nav (adapted from the Adnaut bottom-nav pattern — a marketing site reads better with a conventional top nav; the bottom-nav treatment is reserved for the kiosk app's persistent physical-device chrome, Section 11.7) → Hero Headline Block ("Built for Africa's Compliance.", v0.6 shortened tagline — see §11.6.4a) with Capability Status Badge for DigiNam → 3D Isometric Vignette band → "How It Works" step sequence (each step tagged "Live now" or via the Capability Status Badge, never a bare label) → Paper-Register-Risk demo panel (Section 16.3, Large Content Card) → Accent Card CTA ("Create account," Section 17.1) + secondary See pricing → /pricing → Contact Info Block footer | Hero Headline Block, Capability Status Badge, Large Content Card, Accent Card |
| **Platform** | Architecture explanation (Digital Identity Layer, two states via Capability Status Badge) → full RBAC table from Section 9 (rendered as a real table, not a screenshot, so it stays in sync with this document) → FAQ accordion (two required entries per Section 1a.3) | Large Content Card, Capability Status Badge |
| **Pricing** | Tier comparison (Core / Professional / Verify + catalog add-ons, Section 15.2) → monthly/annual → per-channel marginal-cost callouts (Section 15.4) → NFC/e-ID Capability Status Badge | Large Content Card grid, Capability Status Badge |
| **About** | Founding narrative (Section 1a.2) → team credibility section — no reference to any other Buffr product per Section 1a.1's standalone rule | Hero Headline Block (smaller variant), Keyword Emphasis Text |
| **Contact** | Contact Info Block → sales-inquiry form (posts to the backend's public contact endpoint, not a third-party form embed, to avoid an undocumented subprocessor per Section 3.1's data-flow-mapping rule) | Contact Info Block |

### Verification

`website/` builds statically with zero client-side auth code (a public
marketing site should never bundle the admin app's auth logic); the
Capability Status Badge on Home and Platform renders identically because
both read the same `GET /public/capability-status` response, not
page-local copy — changing one config row (Section 4a.7) updates both pages
without a deploy.

### 11.6.4a Live copy, page by page (v0.6 humanizer pass)

The tables below are a copy map, not a copywriting spec — the source of
truth is always the `.tsx` file cited in each row's page column; this table
exists so a copy change can be found and cross-checked without opening
seven files. Applied in v0.6: the humanizer style (no em dashes, no
semicolons, active voice, plain words over corporate ones) across every
page's headline/body copy, and a brand tagline shorten from "Built in
Namibia. Built for Africa's Compliance Future." to **"Built for Africa's
Compliance."** everywhere it appeared (footer taglines on all 7 pages, the
Home and About hero headlines, and the admin app's auth hero panel —
`admin/src/app/(main)/auth/_components/auth-layout.tsx`). List/table data
(pricing tiers, RBAC rows, legal clause bodies) is intentionally not
reproduced verbatim below — headings and prose copy only.

**Home** (`website/src/app/(marketing)/page.tsx`)

| Section | Copy |
|---|---|
| `<title>` | Inherits the layout default, "Buffr Checkpoint: Secure Visitor Check-In" (v0.7: no longer a page-level override — see the v0.7 duplicated-title fix) |
| Hero | H1: "Built for Africa's Compliance." — Sub: "Buffr Checkpoint replaces shared paper registers with isolated visitor records, risk-based identity controls, and offline-first operation, so every visitor can check in securely, with dignity." |
| **Paper Register Risk** (H2) — v0.7: **moved directly after the hero**, per Section 11.6.5.3 | "A paper visitor register is an everyday privacy and governance failure." — now a real designed comparison (redacted gray-bar "paper" card vs. a structured encrypted-record card), not two plain bullet lists, each still carrying its original 5-item list — closing line: "The platform's real advantage isn't the tablet or the NFC reader. Buffr Checkpoint turns a neglected paper process into a properly governed system." |
| Capabilities grid (H2) | "One secure record architecture. Every inclusion channel." — 6 cards: NFC-forward check-in, Feature-phone inclusive, Offline-first operation, Risk-based access control, Audit-ready evidence, Multi-channel one record (each with a one-sentence description, rewritten in v0.6) |
| **Every visitor can check in** (H2, new in v0.7) | "Every visitor can check in." — the six-channel strip (NFC badge, QR invitation, Kiosk, USSD, SMS, Assisted entry) converging on "One isolated, encrypted visitor record" |
| How It Works (H2) | 5 steps: Arrival, Verification, Record, Notify, Access & Sign-Out (one-sentence description each) |
| **Operational proof** (H2, new in v0.7) | "A governed control platform, not a guest book." — 3 real product screenshots (Front Desk roster, Device Compliance Register, Compliance Dashboard), each with a one-line caption |
| **Final CTA** (new in v0.7, previously buried inside the Paper Register card) | Sodium-Yellow high-contrast panel: "Replace your paper register before it becomes your next privacy incident." |
| Footer tagline | "Built for Africa's Compliance." |

**Platform** (`website/src/app/(marketing)/platform/page.tsx`)

| Section | Copy |
|---|---|
| `<title>` | "Platform: Buffr Checkpoint" |
| Hero | H1: "One secure visitor-record service. Multiple inclusion channels." — Sub: "Buffr Checkpoint's architecture is built around a single principle: every visitor can check in. The channel changes. The data-protection standard doesn't." |
| Architecture (H2) | 6 layer cards (Check-in Channels, Site Edge, API & Identity Gateway, Core Application, Identity Adapters, Data & Evidence) — each a label list, no prose — followed by the two Capability Status Badges (DigiNam/NPKI, National e-ID NFC) |
| RBAC table (H2) | Section 9's 9-role table, rendered live from `rbacRows` |
| FAQ (H2) | 7 questions: DigiNam status, National e-ID NFC status, offline operation, API/data-layer access control, fixed role catalogue, Form AI (admin suggest/translate, never auto-publish), public check-in languages (picker en/af/pt + `?lang=`) |
| Footer tagline | "Built for Africa's Compliance." |

**Pricing** (`website/src/app/(marketing)/pricing/page.tsx`)

| Section | Copy |
|---|---|
| `<title>` | "Pricing: Buffr Checkpoint" |
| Hero | H1: "Simple, channel-inclusive pricing." — Sub: three plans, monthly or annual; NFC from Professional; USSD/SMS from Core |
| Tier cards | **3 subscription tiers** (Core, Professional, Verify) with monthly/annual toggle (annual = 10× monthly) — Professional featured |
| Add-ons | **Hidden on marketing** (ops/sales catalog only via `GET /platform/billing/catalog`) — public `GET /public/pricing` returns plans only |
| Per-channel marginal cost (H2) | "Every channel produces the same isolated, encrypted record downstream…" — 7-row cost table |
| CTA | "Need a custom deployment plan?" — volumes, connectivity, risk profile → tier and channel mix |
| Footer tagline | "Built for Africa's Compliance." |

**About** (`website/src/app/(marketing)/about/page.tsx`)

| Section | Copy |
|---|---|
| `<title>` | "About: Buffr Checkpoint" |
| Hero | H1: "Built for Africa's Compliance." — Sub: "We started with a simple observation: the paper visitor register is an everyday privacy and governance failure. Buffr Checkpoint fixes that for every visitor, at every site, regardless of the device in their pocket." |
| Our Mission (H2) | 4 paragraphs — paper-register harm, Buffr Checkpoint response, NFC-plus-multi-channel inclusion paragraph, and closing design-requirement paragraph (public site About page aligned in 2026-09) |
| What We Stand For (H2) | 6 value cards: Privacy by design, Inclusion first, Evidence-led, Offline-resilient, Risk-based, Namibia-ready (one-sentence description each, three rewritten in v0.6) |
| CTA | "See the paper-register risk for yourself." — primary **Create account**; secondary review via Contact. |
| Footer tagline | "Built for Africa's Compliance." |

**Contact** (`website/src/app/(marketing)/contact/page.tsx`)

| Section | Copy |
|---|---|
| `<title>` | "Contact: Buffr Checkpoint" |
| Hero | H1: "Questions before you sign up?" — Sub: self-serve signup is the default path; contact covers multi-site rollouts, hardware, integrations, partnerships; link to Create account. (v2026-09-29: review offer retired.) |
| Direct contact | Email/Phone/Address block — data only |
| What happens next? | 3-step numbered process (review enquiry → schedule call → deliver review/proposal) — kept as parallel numbered steps deliberately (a scannable ordered process, not filler repetition) |
| Sales and partnership | "For reseller, hardware, or integration partnerships, use the same form above and mention the partnership type in your message." |
| Footer tagline | "Built for Africa's Compliance." |

**Visitor check-in** (`website/src/app/check-in/`) — *v0.18 operational surface; noindex*

| Section | Copy / behaviour |
|---|---|
| `<title>` | "Visitor check-in \| Buffr Checkpoint" (`robots: noindex, nofollow`) |
| Missing params | H1: "Missing check-in link" — ask visitor to scan the reception kiosk QR |
| Invalid / expired QR | H1: "Check-in unavailable" — body from API error; "Ask reception to show a fresh QR code on the kiosk." |
| Form | Site label + site name; Full name (required); Phone (optional); Who are you visiting? (host select); Purpose (purpose_category select); primary CTA "Check in" |
| Empty hosts | "No hosts are configured for this site yet. Please see reception." (submit disabled) |
| Success | H1 from `nextSteps.headline` (e.g. "{FirstName}, wait for {Host}") — meeting line with host + department; instruction to wait at reception while host is notified / called; badge/pass callout when visitor category usually requires one (contractor, temporary staff, restricted). |
| API | Browser calls `NEXT_PUBLIC_API_URL` → `GET /public/check-in/context`, `POST /public/check-in` (returns `hostDisplayName`, `hostDepartment`, `nextSteps`) |

**Privacy** (`website/src/app/(marketing)/privacy/page.tsx`) / **Terms** (`website/src/app/(marketing)/terms/page.tsx`)

Only the `<title>` had an em dash (fixed: "Privacy Policy: Buffr Checkpoint",
"Terms & Conditions: Buffr Checkpoint") and Terms' 5 subscription-tier label
separators (`—` between the bold tier name and its description, changed to
a colon). Section headings unchanged: Privacy runs Introduction → Controller
and Processor → Data We Collect → How We Use Data → Data Retention and
Deletion → Data Security → Subprocessors → Cookies → Your Rights → Contact
(10 sections); Terms runs Agreement to Terms → Definitions → Customer Role
Model → Subscription and Tiers → Acceptable Use → Data Protection and
Privacy → Service Availability → Limitation of Liability → Governing Law →
Changes to Terms → Contact (11 sections). Legal body prose is unchanged in
substance — these are the two pages where "sounds human" must not come at
the cost of precision, and neither had prose-style AI-tells to begin with
(no em dashes outside the one list-separator pattern, no banned vocabulary).

**404** (`website/src/app/not-found.tsx`)

"Page not found" — "The page you're looking for doesn't exist, or it moved.
Every visitor record still stays isolated. This URL didn't."

**Admin auth pages** (`admin/src/app/(main)/auth/`)

| Surface | Copy |
|---|---|
| Hero panel (`_components/auth-layout.tsx`) | Label: "Buffr Checkpoint" — H1: "Built for Africa's Compliance." — 4-item capability list (isolated encrypted records, risk-based assurance V0–V4, offline-first check-in, audit-ready evidence/retention/RBAC) — footer line: "Replacing shared paper registers with isolated, governed visitor records." |
| Sign-in card (`login/page.tsx`) | "Sign in to Buffr Checkpoint" — "Access your organisation's visitor and access-control dashboard." |
| Register card (`register/page.tsx`) | "Create your Buffr Checkpoint account" — "Sets up your organisation and your Owner-Operator account." |
| Layout footer | "← Back to buffrcheckpoint.com" · "Privacy Policy" · "Terms & Conditions" (linking to `website/`'s pages above via `NEXT_PUBLIC_WEBSITE_URL`) |

## 11.6.5 Visual, Image Placement and Product Demonstration Strategy

> **Supersedes** any earlier navy/teal, shadow-heavy mockup guidance this
> document carried before v0.5 — every surface below (website, admin, and
> the not-yet-built kiosk) is specified against the light-canvas brand
> system adopted in v0.5/v0.6 (Section 11.5.1's token table), not the
> pre-v0.5 dark "Adnaut" system.

### Design principle

> **Show the risk clearly. Show the product simply. Show the evidence credibly.**

Buffr Checkpoint isn't selling generic software aesthetics. It's selling
confidence that visitor information is protected, access is proportionate,
and records can be evidenced later. The visual system moves a viewer
through one sequence:

```text
Recognise the paper-register risk
        ↓
See the safer alternative
        ↓
Understand how it works
        ↓
See proof of control and inclusion
        ↓
Take one clear action
```

This mirrors the platform's own operating model: **Assess → Design →
Implement → Assure** (Section 20.1's governance cycle).

### 11.6.5.1 System decisions

**Token table**: reuse Section 11.5.1's table exactly — don't restate a
second, driftable copy of it here. The four corrections below are new,
concrete design-review findings this pass caught (checked against the
actual code, not asserted):

1. **No navy/teal.** Confirmed clean: a full grep of `admin/src`,
   `website/src`, and both `buffr-checkpoint.css` preset files for navy/teal
   hex families and Tailwind classes returned zero hits. Any earlier
   navy/teal landing-page draft this document once referenced is superseded
   by the light-canvas system; nothing in the live code needs fixing here.
2. **Exact Sodium Yellow only, `#E2A603` — never `#FFE900`.** `#FFE900` does
   not appear anywhere in `admin/src` or `website/src`. It did appear once
   in this document itself (Section 11.7.2's kiosk token table mislabeled
   `#ffe900` as "unchanged" Sodium Yellow) — corrected in v0.7. The kiosk
   spec in 11.7.2 was already correct that the *value* must match; the
   number typed next to it was wrong.
3. **No shadows** is the standing rule (elevation = white surface + 1px
   warm-grey border/ring, never `box-shadow`). This pass found and fixed a
   real, two-part violation: (a) roughly 20 `shadow-xs`/`shadow-sm`/
   `shadow-md`/`shadow-lg`/`shadow-xl` Tailwind utility classes still
   hard-coded across `admin/src/components/ui/*` (popover, dropdown-menu,
   select, sheet, menubar, context-menu, hover-card, combobox,
   navigation-menu, chart tooltip, sidebar) and a few app-level spots
   (`unauthorized/page.tsx`, the dashboard home metric cards,
   `website/`'s contact form and the featured pricing-tier card) — all
   removed, replaced with `ring-1`/`border` where the element needed an
   edge. (b) A more consequential bug the shadow cleanup surfaced:
   `buffr-checkpoint.css` carried a blanket
   `[data-theme-preset="buffr-checkpoint"] * { box-shadow: none !important; }`
   kill switch. Tailwind's `ring-*` utilities also compile to `box-shadow`
   — the same CSS property — so that blanket rule was silently erasing
   every popover/dropdown/select/sheet/menu's `ring-1` border along with
   the drop-shadows it was meant to suppress, leaving them genuinely
   edgeless (verified: `getComputedStyle` on a probe `ring-1` element
   returned `box-shadow: none` before the fix, a real composited ring
   shadow after). Removed the blanket rule now that every real `shadow-*`
   utility is gone from the source instead of papered over.
4. **Lime Pulse must never indicate verified/live/security/compliance
   status** — only `--color-status-live` (`#15803D`) may. Audited: Lime
   Pulse is defined as a token in both preset files but has **zero actual
   applications** anywhere in `admin/src` or `website/src` (no
   `bg-lime-pulse`/`text-lime-pulse`/inline use on any element). The
   `CapabilityStatusBadge` component (Section 4a.7) already correctly uses
   `--color-status-live` for its "live" state. No violation found — this
   rule is already being followed by omission, not enforcement, which is
   fine as long as it stays that way; flagged here so a future contributor
   doesn't reach for lime-pulse as a shortcut for "looks done."

**Follow-up closed the same pass**: `admin/src/app/globals.css` carried dead
template scaffolding website's own `globals.css` had already trimmed —
three unused theme-preset imports (`brutalist.css`, `soft-pop.css`,
`tangerine.css` — confirmed zero remaining references anywhere and the
files themselves deleted, not just the imports), the full stock shadcn
`:root`/`.dark` oklch palette, a 17-font `html[data-font=...]` switcher
block predating the "fixed typography, no font switcher" decision (Section
11.5.6), a now-redundant `@layer utilities` shadow-reactivation block (moot
once §11.6.5.1's box-shadow fix landed and every literal `shadow-*` class
was gone from the source), and unused print-export CSS. Rewritten on
website's clean single-preset pattern, carrying forward what admin
genuinely needs that website doesn't (`--color-sidebar*` for `AppSidebar`,
`--radius-4xl` for `badge.tsx`, `.disable-transitions` for
`theme-utils.ts`). The cleanup surfaced two real, previously-invisible
bugs the messy version had been masking: `--font-heading` was hardcoded to
`var(--font-sans)` instead of passing through Archivo, and `--font-mono`
wasn't mapped at all — so every heading-styled title and every monospace
use (audit-log hashes, device serials) had silently been rendering in the
wrong typeface since this app was first built. Both now pass through
correctly; verified visually on the auth hero H1, which now visibly
renders in Archivo. `--chart-1..5` (never defined by the brand preset,
which predates this app having any chart) got a real fallback instead of
inheriting the stock grayscale set, built from the existing palette rather
than a generic multi-hue chart scheme.

### 11.6.5.2 Five image asset types

| Asset type | Purpose | Placement | Rules |
|---|---|---|---|
| **Product UI screenshots** | Demonstrate the actual system | Home, Platform, Pricing, sales deck | Highest priority. Real data only from a controlled demo tenant — never a customer's. |
| **System diagrams** | Explain data flow, controls, channels, roles | Platform, tender packs, compliance pages | Prefer diagrams over stock images for technical buyers. |
| **Contextual photography** | Create human relevance and Namibia/Africa context | Hero (`hero-*.png`) and closing band (`closing-*.png`) on primary marketing routes | Only real, consented, non-sensitive settings. Closing bands use dedicated files — never the hero asset for that route. |
| **Hardware photography** | Make the kiosk, NFC reader, badge printer, and privacy-screen setup tangible | Platform, product sheets, government tenders | Use the actual approved hardware, or a clearly labelled concept render. |
| **Data visualisations** | Prove control operation | Admin dashboard, assurance packs, case studies | Never invented metrics, fake "live" records, or decorative charts. |

Don't use images decoratively just because a marketing site "needs
imagery." Every image must explain an operational reality, lower
uncertainty, or demonstrate a real product outcome.

### 11.6.5.2a Refero Styles layout primitives (CSS)

[Refero Styles](https://styles.refero.design) publishes AI-readable
`DESIGN.md` extracts from product UIs (hierarchy, spacing, flat panels).
Buffr Checkpoint adapts those **patterns**, not third-party palettes:

- **Scope:** `website/src/styles/presets/buffr-checkpoint.css` is the
  **canonical** brand + `bc-*` file. After any edit, sync byte-identical copies
  to `admin/src/styles/presets/buffr-checkpoint.css` and
  `ops-console/src/styles/presets/buffr-checkpoint.css`
  (`cp website/src/styles/presets/buffr-checkpoint.css admin/src/styles/presets/`
  then the same for ops-console).
- **Not in scope:** `refero-buffr-design-uplift` skill targets
  `buffrsandbox/` (sharp 2px, blue tokens). Do not import that token set here.
- **Local research:** `LifeCompass/crawl4AI-agent-v2/refero_sitemap_crawl/`
  (dashboard + UX principle articles); skill reference at
  `.claude/skills/refero-buffr-design-uplift/reference.md`.
- **Rules carried over:** flat panels (hairline `--color-frost` border, no
  coloured KPI top-strips, no drop-shadow elevation), soft active nav fill
  (`bc-active-soft`), marketing eyebrow/lead typography, optional 12-column
  grid helpers (`bc-grid-marketing`, `bc-span-*`), ≤4 primary stat tiles
  (`bc-stat-row`).
- **Usage:** prefer `marketing-layout.ts` exports (`marketingSurface`,
  `marketingFeatureCard`, …) on public pages; use `bc-panel` / `bc-stat-tile`
  (or admin `BcPanel` / `BcStatRow` wrappers) in dashboards; ops-console uses
  the same `bc-*` classes after preset sync.

### 11.6.5.3 Home page placement strategy

**Hero — product proof with atmospheric backdrop, not readable register photos.**

Full-bleed contextual photography or abstract flow art lives under a light
cloud scrim (`website/public/marketing/*.png`, `MarketingHero` component).
Copy stays readable; backgrounds must not show names, ID numbers, or paper
registers.

**Page close (all primary marketing routes)** — wide closing photography
(`MarketingClosingVisual`, `website/public/marketing/closing-*.png`) sits
**above** the sodium-yellow bottom CTA (`MarketingBottomCta` via
`MarketingPageClose`), not above the footer. Order: main content → closing band
(photography only, no overlay copy) → final CTA → site footer. Closing files
are separate from `hero-*.png` for the same route. Registry:
`website/src/lib/marketing-visuals.ts`.

```text
Left:  headline, two-sentence problem statement, one primary CTA
       ("Create account")
Right: a real product UI composition inside a tablet/kiosk frame,
       one synthetic isolated visitor record, a small privacy line:
       "Record protected. Visible only to authorised staff."
```

A small badge row beneath the hero: offline-capable · NFC badge check-in
available · audit-ready records · feature-phone pathway where enabled ·
DigiNam status driven only by the live capability register (Section 4a.7)
— never a bare "DigiNam Verified" claim.

*Don't use*: a photo of a visitor holding an e-ID card unless National e-ID
support is actually operational; a "DigiNam verified" illustration unless
the relying-party integration is evidenced and enabled; a generic
cyber-shield image; a crowded reception photo behind the hero copy; a paper
register showing real or realistically-readable names, numbers, or ID data.

**Immediately after the hero — the paper-risk visual**, the strongest
educational/product-placement section on the page:

```text
LEFT: Paper Register                RIGHT: Buffr Checkpoint
- visibly shared page                - single visitor record
- redacted synthetic lines           - access-scope label
- labelled risk points:              - encrypted-record indicator
  name / phone / purpose visible     - retention-policy label
  no access history                  - audit-event indicator
```

This must be a **designed comparison**, not a photo of a real customer's
register — the goal is making the risk intuitive without turning privacy
into fear marketing.

**Third section — "every visitor can check in"**: an illustrated
multi-channel strip (NFC badge · QR invitation · Tablet kiosk · USSD · SMS
· Assisted entry, all converging on one protected record), not photographs.
This is where the platform demonstrates inclusion (Section 4.2) — it should
visually read that feature-phone and no-phone visitors aren't second-class
users, in line with the National Payment System Strategy 2030's emphasis on
user-centricity and digital enablement (Section 3.1's citation).

**Fourth section — operational proof**: three real product screenshots in
sequence — the Front Desk roster, the Device Compliance Register, and the
Compliance Dashboard (Sections 10.4/10.5, already built pages per
Section 11.4.3's route table). This is where the site moves from "nice
reception tool" to "governed control platform."

**Final CTA**: no image needed — a plain, high-contrast panel: "Replace
your paper register before it becomes your next privacy incident." One
action, no competing buttons (Section 11.8.9's single-CTA rule).

### 11.6.5.4 Platform page placement strategy

Diagram- and screenshot-led, not photography-led:

| Section | Visual | Objective |
|---|---|---|
| Architecture | Layered data-flow diagram | Show the secure flow from check-in channel to audit evidence |
| Identity assurance | V0–V4 assurance ladder | Possession isn't identity verification (Section 5.2) |
| RBAC | The real table (already built, Section 11.6.4) | Prove the role/scope model is reviewable, not an image that can drift out of sync |
| Offline operation | Three-state visual: online → local encrypted queue → synced | Show resilience without claiming uninterrupted identity verification |
| NFC | Real hardware photo + credential lifecycle diagram | Physical realism plus security controls |
| Capability status | Live `CapabilityStatusBadge` (already built) | Prevent unsupported DigiNam/e-ID claims |
| Audit/evidence | Evidence-pack screen | Show what an auditor, board, or regulator actually receives |

Architecture diagram: six main layers only in the public-facing visual
(check-in channels → site kiosk/offline cache → API and identity gateway →
visitor workflow and RBA → encrypted records and retention → audit evidence
and reporting), with external systems (DigiNam/NPKI, SMS/USSD provider,
email provider, access-control system, MDM) drawn as side integrations, not
core dependencies — Buffr Checkpoint reads as the governed core; third
parties read as managed dependencies.

### 11.6.5.5 Pricing page placement strategy

Low-image, high-clarity — no generic smiling-office photography between
pricing cards; it distracts from the buyer's decision and can make a
regulated product feel lightweight. Use: plan cards, a channel-inclusion
matrix, a hardware placement diagram, a "what's included" visual, live
capability-status badges, and (only under Professional / add-ons) optional NFC or kiosk hardware photography — never as the Core hero.

| Tier | Visual focus |
|---|---|
| Checkpoint Core | Printed public site QR + phone web check-in; assisted front desk (no tablet required) |
| Checkpoint Professional | Multi-site dashboard, host notification, optional NFC / kiosk / messaging when enabled |
| Checkpoint Verify | Identity assurance ladder and DigiNam capability status |
| Add-on: physical access control | Zone map, credential lifecycle, escorted-entry flow |
| Add-on: controls review and evidence | Evidence pack and control-test dashboard |
| Optional: kiosk / SMS / USSD / NFC | Device or messaging only when sold as add-on — never implied as Core CAPEX |

### 11.6.5.6 About page placement strategy

The one page where human imagery belongs — but only if it's real.

*Use*: actual founder/team photography; actual Namibian office, field, or
implementation context; hardware testing/kiosk deployment imagery; a
reception environment with no visible visitor records; close-up NFC
hardware/badge-printing/privacy-screen installation shots.

*Avoid*: fake "African business team" stock photography; surveillance-camera
imagery; facial-recognition imagery; photos at sensitive government, bank,
or clinic locations without formal approval; maps or flags as a substitute
for local credibility.

The message: "We understand the reality on the ground." Not: "We are
watching people."

### 11.6.5.7 Admin application visual strategy

The admin app is a **control surface**, not a marketing site — rule of
thumb, 90% data, 10% brand:

| Surface | Use | Avoid |
|---|---|---|
| Front Desk | Status chips, visitor-type icon, clear action buttons | Hero images, background photos, decorative illustration |
| Visitor record | Minimal iconography, assurance label, timeline | Full visitor photo by default |
| Compliance dashboard | KPI cards, exception queues, trend lines | Decorative charts with invented data |
| Audit log | Monospace IDs, event timeline, filters | Heavy colour blocks or decorative graphics |
| Device Compliance Register | The device's actual model thumbnail only | Generic laptop/tablet stock imagery |
| Evidence packs | Document icon, period, status, redaction label | Any preview of unredacted visitor data |
| My Account | Initials avatar by default | External profile-photo URLs |
| Emergency roster | High-contrast status, zone grouping, large count | Low-contrast, colour-only state indicators |

Front Desk visual hierarchy — primary: who's on site, who needs action, who's
expected; secondary: check-in method, identity assurance level, host
notification state; tertiary: device details, audit reference, sync
metadata. An operator should never have to decode an ornamental dashboard
before finding the next action.

### 11.6.5.8 Kiosk visual strategy

The kiosk is the most important product-placement surface — it's the
product's public face. It should feel calm, quick, private, inclusive,
non-surveillant, and easy for a first-time user (Section 11.7.1's
accessibility-first departure from the admin/website token set applies
here unchanged).

1. **No decorative photography on the check-in flow** — it distracts from
   completion and can make an unfamiliar visitor hesitate.
2. **One choice per large tile** on the home screen: Tap NFC badge · Scan
   invitation · Check in on this screen · I have a feature phone · I need
   help (Section 10.1's wireframe).
3. **Icons plus plain language** — never icons alone.
4. **Never show an unavailable capability.** National e-ID stays absent
   until platform status is live *and* the site has enabled it (Section
   4a.7) — absent, not shown-disabled (Section 10.1's own rule already
   states this; repeated here as it's a visual-placement rule too).
5. **Privacy reassurance immediately before personal-data capture**:
   "Your details are private. Other visitors cannot see this check-in."
6. **Calm confirmation, not celebration** on success: "Check-in recorded.
   Your host has been notified. Reference: CP-8M4K."
7. **The feature-phone flow gets equal visual dignity** — it's a
   first-class channel (Section 4.2), never styled as a fallback for
   people without technology.

### 11.6.5.9 Photo and screenshot governance

Because Buffr Checkpoint sells privacy, its own visual-production process
has to be privacy-safe:

| Asset | Rule |
|---|---|
| Product screenshot | Synthetic demo tenant only |
| Visitor names | Synthetic, non-identifiable, culturally appropriate — never copied from a real customer |
| Phone numbers | Masked/demo values |
| ID numbers | Never shown |
| QR codes | Non-functional demo codes, or codes resolving only to a safe demo environment |
| NFC tags | Never show real credential references |
| DigiNam/e-ID | Only after approval, only with the exact live capability wording (Section 4a.7) |
| Client logos | Written permission required |
| Testimonials | Written permission; named only if approved |
| Photos at customer sites | Written site permission, plus a consent process for any identifiable person |
| Emergency roster screenshots | Synthetic only |
| Audit-log screenshots | Demo event IDs, redacted actor details |

Consistent with the Electronic Transactions Act's emphasis on record
integrity and reliable computer evidence (Section 5, Regulatory Addendum),
and with the platform's own privacy-by-design commitment.

### 11.6.5.10 Image asset backlog

This is a **content-production backlog**, not a code change — every item
needs either a real product screenshot or commissioned
illustration/photography, neither of which a coding pass can fabricate
without misrepresenting the product — with the exception of screenshots of
the actual built app and diagrams buildable as real HTML/CSS/SVG rather
than imagery, both genuinely code, and both done in v0.7 (below).

**P0 — before public launch**: transparent square app icon (done, v0.6) ·
transparent wordmark for light backgrounds (done, v0.6) · reversed/inverted
wordmark for dark print/export use · hero kiosk UI mockup with a synthetic
visitor record · ~~paper-register-risk comparison illustration~~ (done,
v0.7 — a real designed comparison on the Home page, not a photo or a plain
list) · ~~multi-channel inclusion diagram~~ (done, v0.7 — the Home page's
six-channel strip) · platform architecture diagram · RBAC/identity-assurance
ladder diagrams · ~~Device Compliance Register screenshot~~ (done, v0.7) ·
~~Front Desk roster screenshot~~ (done, v0.7) · ~~Compliance Dashboard
screenshot~~ (done, v0.7) · evidence-pack mockup with fully synthetic data.

**P1 — for sales/tenders**: actual kiosk/tablet hardware photograph · NFC
reader/badge photograph · contractor tap-to-check-in workflow image ·
offline-sync flow illustration · emergency roster visual · asset-lifecycle
diagram (plan → select → verify → deploy → operate → assure → retire) ·
public-sector deployment diagram · CRAN device-compliance visual.

**P2 — after the first pilot**: consent-approved implementation
photographs · sector-specific visual packs (bank branch, government service
point, clinic, logistics/mining gate, corporate office) · case-study
evidence visuals using real aggregated outcomes · training/onboarding
images · annual assurance-report cover and dashboard visuals.

Six P0 items are already real, not backlog — noted above rather than
duplicated as open work. How the three screenshots were produced: a real
synthetic demo tenant, registered and seeded through the actual backend
endpoints (check-in, device provisioning) rather than hand-written SQL, so
the screenshots show genuine app behavior; captured, cropped, embedded on
the Home page (`website/public/screenshots/`); demo tenant deleted
afterward per this section's own synthetic-data rule. Platform's
architecture diagram and the RBAC/assurance ladder diagrams remain open —
higher-complexity layouts than the Home page's pieces, not done this pass.

### 11.6.5.11 Product placement in the sales journey

| Sales stage | Best visual | Purpose |
|---|---|---|
| First conversation | Paper-register risk comparison | Immediate recognition of the problem |
| Discovery workshop | Site journey map | Maps the current sign-in process and exposure points |
| Product demo | Kiosk flow + Front Desk roster | Demonstrates operational benefit |
| Security/compliance review | Architecture, RBAC, encryption, audit evidence | Demonstrates control maturity |
| Procurement/tender | Device Compliance Register, asset lifecycle, hosting/subprocessor map | Reduces procurement and CRAN concerns |
| Pilot proposal | Channel matrix and pilot-KPI dashboard | Shows inclusion and measurable outcomes |
| Board/audit committee | Evidence pack, risk register, control-test report | Demonstrates assurance, not software features |

### 11.6.5.12 Design psychology per page moment

| Moment | Desired reaction | Design mechanism |
|---|---|---|
| Hero | "This solves a real problem I have." | Direct risk statement plus a real product screen |
| Paper-register comparison | "We're exposed today." | Restrained contrast between shared paper and an isolated record |
| Multi-channel section | "This works for all our visitors." | Equal visual treatment of NFC, QR, USSD, SMS, assisted, and kiosk |
| Platform page | "This is serious enough for our IT/security team." | Diagrams, RBAC, audit evidence, device governance |
| Pricing | "This is understandable and proportionate." | Simple tiers, no hidden complexity, hardware separated out |
| About | "This team understands our environment." | Real Namibian context, actual people/hardware, no stock imagery |
| Contact | "I can speak to someone competent." | A clear contact path and one plain next step |

### Final visual rule

> Don't use imagery to make Buffr Checkpoint look more advanced than it is.
> Use imagery to make its real controls easier to understand.

That matters most for DigiNam, National e-ID NFC, USSD, and
"Namibia-hosted" claims — every visual has to read from the same governed
capability/status model (Section 4a.7) as the product and website copy.
The strongest public image isn't a shield, a lock, or a generic office
lobby render. It's a clear product screen showing one visitor's protected
record, paired with a plain explanation of why nobody else can see it.

## 11.7 Kiosk App (Kotlin/Android) — Design Tokens, Components, Screens

> **Operating-model context (v0.11):** the kiosk is the **visitor-facing
> surface** in the three-surface architecture (Section 11.9). It is
> provisioned per site, pulls policy and channel enablement from the core
> platform, and must never become a public directory or back-office
> dashboard — even when offline.

### 11.7.1 A deliberate departure from the Adnaut-derived system, and why

Section 11.5 adopted an ultra-light-type Adnaut-derived system for `admin/`
and, in Section 11.6, for the public website — both are surfaces used by
people who chose to be there (staff, prospective customers) under normal
screen-viewing conditions, and both are light-canvas as of the v0.5
correction. **The kiosk is a different kind of surface regardless of that
correction**: an unfamiliar visitor — potentially elderly, low-literacy,
using it for the first time, standing at a reception desk under bright
ambient light, per Section 4.2's inclusion mandate — must be able to use it
in seconds, unassisted, with no prior exposure to the brand. Weight-100
display type at small sizes fails WCAG contrast/legibility guidance for
public kiosks, so the kiosk's own token set (11.7.2) was already specified
independently, at heavier weights and simpler contrast rules, for
accessibility reasons unrelated to admin/website's canvas polarity — it was
never the dark-vs-light choice that made the kiosk different, and the v0.5
correction to Section 11.5 changes nothing here.

**Decision (flagged here for the same sign-off this blueprint requires for
core schema, Section 11.4.5 rule 9 — this is a core product-design choice,
not a routine implementation detail):** the kiosk uses a **light,
high-contrast variant of the same brand tokens** — white/near-white canvas,
near-black text, Sodium Yellow reserved for primary actions exactly as in
the dark system, large touch targets, and no sub-300 font weights below
24px. This keeps the brand consistent (the same yellow accent, the same
Archivo/Geist type family) while meeting the accessibility bar the product
itself promises in Section 4 ("every visitor can check in") and Section
13.1's baseline controls. Section 11.5's dark system is *not* extended to
the kiosk; extending it there would be adopting a style choice past the
point where it serves the product.

### 11.7.2 Kiosk design tokens

| Token | Value | Role |
|---|---|---|
| `colorSurface` | `#FFFFFF` | Kiosk canvas — light, not the dark Carbon token from Section 11.5.1 |
| `colorSurfaceVariant` | `#F5F5F0` | Card/panel fill, a step off pure white |
| `colorOnSurface` | `#1A1A1A` | Primary text — near-black, not pure `#000000`, for the same "not harsh" reasoning as Section 11.5.1's Carbon canvas, inverted |
| `colorPrimary` | `#e2a603` (Sodium Yellow, unchanged from Section 11.5.1 — corrected in v0.7 from a stray `#ffe900` this row previously carried, which was never the approved value and contradicted Section 11.6.5's own "exact accent only" rule) | Primary action buttons — the one piece of the dark system kept identical, since it's the brand's actual accent, not a dark-mode artifact |
| `colorOnPrimary` | `#1A1A1A` | Text/icons on yellow fills — near-black here (not white, per Section 11.5.1's admin-app rule), because Sodium Yellow against white text fails contrast; against near-black it passes |
| `colorStatusLive` | dedicated status-green (see Section 4a.7's flagged gap) | Verified/live states — e.g. a V3 DigiNam confirmation |
| `colorBorder` | `#D0D0D0` | Card/input hairlines |
| `colorMuted` | `#6B6B6B` | Helper text, secondary labels |

Typography: same family choice as Sections 11.5.2/11.6.2 (Archivo for
headings, Geist for UI/body) but a **different weight and size floor** —
minimum weight 400 (never 100/300) and minimum 24px for any
visitor-facing instructional text, per the accessibility reasoning above.
Geist Mono is dropped entirely from the kiosk (it was a "technical/coded
mood" accent for internal tools; a visitor kiosk has no use for it).

Spacing/radius: same 8px base unit and card/button radius as Section 11.5.3,
but touch targets are a hard **minimum 48dp** (Android accessibility
guidance), which is larger than any button size implied by the admin app's
desktop-oriented spacing scale — this is a kiosk-specific floor, not a
token value.

### 11.7.3 Kotlin implementation

Jetpack Compose (per Section 11.4's Android stack decision) with a
`ColorScheme`/`Typography` object in `kiosk/app/src/main/java/.../ui/theme/`
mapped directly from the token table above — Compose's Material3 theming
system takes this almost verbatim (`Color.kt`, `Type.kt`, `Theme.kt`
following the standard Compose project layout). No XML view system; this is
consistent with the Compose recommendation already made when the Android
kiosk implementation readiness was assessed for this blueprint.

### 11.7.4 Screens (mapped from Section 10's existing wireframes and Section 8's journeys)

| Screen | Maps to | Key components |
|---|---|---|
| Kiosk Home | Section 10.1 | Five large primary-action tiles (Tap NFC/e-ID, Scan QR, Check In, Feature Phone, Assistance) — each a full-width Sodium-Yellow-accented tile, not a small button, per the "seconds, unassisted" requirement above; the NFC/e-ID tile's label/enabled-state reads the Capability Status Register (Section 4a.7) exactly as the public site does |
| Feature-Phone / USSD | Section 10.2, Section 6.2 | Large digit-style site-code display (reads `site_checkin_code`, Section 11.4.5), countdown timer, dial/SMS instructions in Geist Mono-free, plain large type |
| Visitor Confirmation | Section 10.3 | Status badge (uses `colorStatusLive` for "Checked In"), reference code in large type, Print Badge / Finish actions |
| Assisted Check-In (operator-facing) | Section 6.4, Section 8.1 | A distinct **operator mode** — this is the one kiosk screen closer in density to the admin app than to the visitor-facing screens, since it's used by a trained front-desk operator, not a first-time visitor; reuses `admin/`'s denser spacing scale (Section 11.5.3) rather than the visitor screens' oversized touch targets |
| Privacy Notice / Consent | Section 5.2, Section 8.1 | Full-screen agreement text, explicit accept action, language selector (Section 11.4.5's `preferred_language_code`) — never a pre-checked or default-accepted state |
| Emergency Roster (kiosk-triggered view, if enabled per site config) | Section 8.6 | High-contrast, large-type live roster list — the one screen where `colorStatusLive` and clear visual hierarchy matter most, since it may be read under stress |

### Verification

A contrast-ratio check (WCAG AA minimum, 4.5:1 for body text / 3:1 for large
text) against every token pair in 11.7.2 before this ships to a device; a
tap-target audit confirming no interactive element on the visitor-facing
screens (all except Assisted Check-In) is smaller than 48dp; and a sign-off
from a human or Fable on the light-vs-dark departure in Section 11.7.1,
per the same core-design-decision gate used for schema in Section 11.4.5.

### 11.7.5 Offline-sync, NFC, and device-security readiness checklist

Drawn from a parallel kiosk-implementation planning pass (Android/Kotlin
side, `kiosk/`). **v0.20 (2026-09-13):** Phase 4–6 code paths below are
implemented in-repo (SQLCipher Room outbox, NFC reader-mode validate→check-in,
read-only device list, About/Debug Keystore honesty). Physical-device proofs
(`adb pull` + plain sqlite3 fail; physical NFC badge) remain operator smoke
checks — see §11.7.7.

**Offline queue and sync:**

- [x] Reconnect drains the queue automatically, with no server-side
      duplicates (Section 8.5's idempotent-sync requirement —
      `visitor_visits`'s client-generated UUID PK plus `onConflictDoNothing`
      in `visits.service.ts` is the server-side half of this; the device
      side must retry the same UUID, never mint a new one per attempt).
- [x] Force-kill mid-queue: pending rows survive relaunch, and sync resumes
      from where it left off rather than silently dropping the batch.

**NFC credential flow:**

- [x] A valid NFC badge completes check-in via a real validate → check-in
      sequence (reader-mode + `POST /credentials/validate`; not a stubbed
      "always succeeds" path). Physical-device exercise remains a smoke check.
- [x] A revoked or expired badge is rejected outright, with no fallthrough
      to check-in on failure.
- [x] When the NFC badge capability status is not `live` (including
      `not_available`), the NFC tile is absent entirely, not shown disabled.

**Notifications and feature-phone display:**

- [x] The notification / sync banner never claims host delivery when the
      outbox is queued or failed — honest pending/failed/syncing states.
- [x] The feature-phone screen is a static display only — the kiosk shows
      dial/SMS instructions, but never places an on-device USSD/SMS call.

**Device governance:**

- [x] The device list on the kiosk itself is read-only — no activation
      button in the kiosk UI.
- [x] The on-device SQLCipher database is confirmed non-plaintext by
      pulling it off a device (`adb exec-out run-as … cat databases/buffr_kiosk.db`)
      and attempting to open it with a plain `sqlite3` client — must fail
      without the Keystore-backed passphrase (verified 2026-09-14 on
      emulator-5554: `Error: file is not a database`; file header is
      ciphertext, not `SQLite format 3`).
- [x] The About/Debug screen documents the Android Keystore signature as
      local-only, device-side attestation — explicitly not server-verified.

**Critical files this checklist's implementation touches** (backend side,
already built and stable; the kiosk work is additive against this
contract, not a redesign of it):

- `backend/src/modules/visits/dto/check-in.dto.ts` — the authoritative
  check-in request contract every Kotlin `CheckInRequest` model must
  mirror field-for-field.
- `backend/src/modules/visits/visits.service.ts` — the idempotency
  mechanism (`onConflictDoNothing` on client-generated `id`) and the
  roster response shape the device's own offline queue design has to
  match.
- `backend/src/modules/credentials/` (`credentials.controller.ts`,
  `credentials.service.ts`) — NFC badge issue/revoke were already real;
  `POST /credentials/validate` (a new, narrower `credential.validate`
  permission, not the admin-only `site.configure` issue/revoke uses) landed
  2026-09-10 as part of the kiosk work — see Section 11.7.6. Physical badge
  provisioning is still a two-step, admin-tool-side flow: issue via the API,
  then write the returned `credentialReferenceHmac` onto the physical NTAG —
  the kiosk itself only ever reads and validates that reference.
- `backend/src/modules/visitor-policy/visitor-policy.controller.ts` +
  `backend/src/db/schema/consent.ts` — the on-device consent/privacy notice
  flow's write path (`POST /visitor-policy/acknowledgements`) and a
  supporting `GET /visitor-policy/versions` read also landed 2026-09-10;
  the on-device screen itself (Section 5.2) is still Phase 9, not yet built.
- `backend/db/seed/0001_type_definitions.sql` — the real, live seeded
  domain values (`visit_status`, `identity_assurance_level`,
  `capture_channel`, etc.) every Kotlin enum must match exactly, not a
  device-side copy that can drift.
- `backend/src/modules/auth/` (`auth.module.ts`, `auth.controller.ts`) —
  confirms the actual 8-hour JWT / no-refresh-token reality the kiosk's own
  auth/re-auth handling has to design around, not an assumed refresh flow
  that doesn't exist server-side.

### 11.7.6 Kiosk implementation status — Phases 0–5 delivered (reconciled v0.22)

> **STATUS (v0.29 reconciliation):** Phases **0–3** (online check-in) were
> verified 2026-09-10. Phases **4–5** (SQLCipher outbox offline sync; NFC
> reader-mode validate → check-in) landed in **v0.20** and remain FULL in
> §11.9.0a. **v0.21–v0.22** added session timeout, abandon, outbox draft wipe
> (FR-K10), privacy gate on QR/NFC, and effective org capability flags.
> **v0.28** closed dynamic form sync (FR-K09): Android
> `ManualCheckInViewModel` / `ManualCheckInScreen` render `effectiveForm`
> fields with shared `FormRules` visibility. Remaining open is **Phases 6+**
> below. Do not read older “Phases 4–9 remain open” notes as current.

**Phase 0 — Backend additions (landed, verified via `nest build`):**

- `POST /credentials/validate` — new endpoint, new narrower
  `credential.validate` permission (`backend/db/seed/0006_kiosk_permissions.sql`
  grants it to `front_desk_operator`, `site_manager`, `owner_operator`,
  `system_administrator`), distinct from the admin-only `site.configure`
  that gates issue/revoke. Looks up `access_credentials` by
  `credentialReferenceHmac` + `organisationId`, checks `deletedAt`/
  `validUntil`/latest `credential_status_events` row, returns a typed
  `{valid, credentialId, holderTypeCode, holderId, credentialTypeCode}` or
  a distinct `not_found`/`revoked`/`expired` reason.
- `POST /visitor-policy/acknowledgements` + `GET /visitor-policy/versions` —
  the `visitor_policy_acknowledgements` table (Section 11.4.5c) already
  existed and was already append-only; only the write endpoint was missing.
  A new `VisitorPolicyAcknowledgementsController` (separate from the
  existing `/visitor-policy/forms` admin-CRUD controller) exposes both,
  gated by the same `visit.arrival.record` permission check-in itself uses.
  `backend/db/seed/0007_visitor_policy_acknowledgement_domains.sql` seeds
  two `type_definition` domains (`language_code`, `acknowledgement_method`)
  that the acknowledgement row's foreign keys needed but nothing had ever
  seeded, since no write path had existed to need them before.
- Both additions follow the existing Wiebe/Canonical Engineering
  Constitution conventions already used across `backend/src/modules/*` —
  `type_definition` lookups via `TypeDefinitionLookupService`, soft delete,
  `organisationId` tenancy scoping, class-validator DTOs with
  `forbidNonWhitelisted` in effect. No new tables, no schema redesign.

**Phase 1-3 — Android project scaffold, auth, and online check-in (built,
verified with a real compile and a real APK):**

- Gradle/Compose/Hilt project at `kiosk/`, package layout following
  Section 11.7's `kiosk/app/src/main/java/com/buffrcheckpoint/kiosk/...`
  structure — `core/network` (Retrofit/OkHttp/Moshi client, an
  `AuthAuthenticator` that re-POSTs `/auth/login` on 401 since no
  refresh-token endpoint exists), `core/domain/model` (Kotlin enums
  reconciled to the *real* seeded backend values — `VisitStatus` is
  exactly `{PENDING_SYNC, CHECKED_IN, CHECKED_OUT, SYNCED_ACK}`, not the
  larger invented lifecycle an earlier planning pass assumed), `auth/`
  (kiosk-setup + login screens), `checkin/` (manual, assisted, and
  QR-invitation-prefill flows, all sharing one form and idempotency-key
  design), `checkout/`, `roster/`, `ui/theme` (mapped from Section 11.7.2's
  token table).
- **Verified, not just written:** `gradle testDebugUnitTest` → 4/4 unit
  tests pass (idempotency-key reuse across retries, string-code-not-UUID
  mapping, `VisitStatus` failing closed on unknown/doc-invented values —
  see `CheckInMapperTest.kt`, `VisitStatusTest.kt`). `gradle assembleDebug`
  → produces a real `app-debug.apk`. Verification required installing the
  Android SDK cmdline-tools + platform 35 locally (not present in the
  original dev environment) and fixing several real bugs the build
  surfaced: a fabricated `androidx.sqlite` version that doesn't exist, a
  Moshi `@JsonClass` parameter-name typo, a wrong `KeyboardType` import,
  and a Compose experimental-API usage that needed replacing with a stable
  `DropdownMenu` pattern instead of an opt-in.
- **A real gap surfaced and deliberately not worked around:**
  `hosts.service.ts`'s `listBySite` returns `site_hosts` rows with
  `hostNameProtected` still encrypted — there is no decrypted-list
  projection analogous to `visits.service.ts`'s `VisitRosterRow`. A proper
  host-search picker for the manual check-in form therefore needs a third
  backend addition that hasn't been scoped or reviewed; the shipped form
  uses a plain host-ID text field instead of pretending to have a picker
  that silently leaked ciphertext or that the review process never saw.

**Phases 6+ backlog** (not built; track in §11.9.0a):

- Badge print hardware path (FR-K12) — soft confirmation exists; printer SDK does not.
- Live USSD aggregator menu flow (kiosk shows instructions only today).
- Live SMS MT provider (OTP scaffold exists; no live gateway).
- DigiNam relying-party adapter (register correctly reads `not_available`).
- National e-ID NFC adapter (register correctly reads `targeted`).
- Richer host-search picker for manual check-in (decrypted host list projection still open — see gap note above).

Section 11.7.5's checklist remains the release gate as these land.

### 11.7.7 First physical-device install — demo deployment record (2026-09-10)

> **Local/demo credentials below — sandbox data only, not a production
> tenant.** From v0.27 the demo site and `kiosk-demo@buffrcheckpoint.test`
> live on the **same** Buffr Analytics organisation (`b51f0704-…`) as the
> registered customer row — there is no separate kiosk-only org. The account
> is still a synthetic `owner_operator` created to exercise the kiosk end to
> end; it carries full org-admin permissions (broader than the
> least-privilege kiosk service-account role Section 11.7.6 /
> `AuthRepository`'s design assumes), so it should be rotated or deleted —
> not reused as a real site's kiosk credential — before any non-test
> deployment. This mirrors the same synthetic-tenant discipline Section
> 11.6.5.9 already holds website screenshot data to.

The debug APK (`kiosk/app/build/outputs/apk/debug/app-debug.apk`,
`gradle assembleDebug`) was installed on a physical Android phone via
file-sharing sideload (Files app → tap to install; USB debugging/`adb`
was not available on that device) rather than `adb install`, confirming
the app doesn't require `adb` specifically — any standard Android
"install from file" path works for a debug build.

**Backend reachability:** the same NestJS dev server used throughout this
implementation pass (`npm run start:dev`, binds all interfaces by default
— no `app.listen(port, host)` override in `main.ts`) was already running
and reachable from the phone over the local Wi-Fi network at the
Mac's LAN IP, port 3001 — confirmed with a `200` from
`GET /public/capability-status` from both `localhost` and the LAN IP
before installing.

**Demo tenant created via the real API** (`POST
/onboarding/organisation-admin` → `POST /sites` → `POST /hosts`, the same
one-atomic-write onboarding flow every real customer signup uses — Section
11.4's `OnboardingService`), then a live check-in was run through
`POST /visits/check-in` and confirmed on `GET /visits/roster` before
handing the device to the kiosk app, so the first on-device check-in
wasn't the first time this pass touched the contract:

| Field | Value |
|---|---|
| Kiosk setup screen — Backend base URL | `http://192.168.11.17:3001/` (this Mac's LAN IP at time of writing — re-check with `ipconfig getifaddr en0` if it changes) |
| Kiosk setup screen — Site ID | `74c72c99-93dc-4b33-934b-9b365e9924cf` ("Demo Front Desk") |
| Login — email | `kiosk-demo@buffrcheckpoint.test` |
| Login — password | `KioskDemo!2026` |
| Organisation | **Buffr Analytics** — legal "Buffr Financial Services CC" / trading "Buffr Analytics" (`b51f0704-12a7-45d4-8b0d-3642785b6e77`, CC/2024/09322). Demo Front Desk site, kiosk-demo user, hosts, forms, and published branding all live on this org (seed `0018_unify_kiosk_demo_under_buffr_analytics.sql`). Visitor chrome: `brand_colour_token` `#CF1161`, help `team@buffranalytics.com`, logo `/org-assets/buffr-analytics/icon.png`. |
| Demo host | Prefer a person/department (Finance, Engineering, People, IT). Reception Desk remains for deliveries. Seed `0013_demo_front_desk_hosts.sql`. |

Both the phone and the Mac must be on the same Wi-Fi network for the LAN
IP to resolve — this is a same-network dev setup. For **production API**
or **emulator smoke tests** without a local backend, use
`https://api.buffrcheckpoint.com/` (Section 11.7.8).

**Android emulator (debug build, 2026-09-11):**

| Field | Value |
|---|---|
| Backend base URL | `https://api.buffrcheckpoint.com/` |
| Site ID | `74c72c99-93dc-4b33-934b-9b365e9924cf` |
| Login | `kiosk-demo@buffrcheckpoint.test` / `KioskDemo!2026` |
| Organisation | Same as above — `b51f0704-…` (Buffr Analytics). Do not provision against a separate kiosk-only org. |
| Email verified | Required — seed `0011_kiosk_demo_email_verified.sql` (or `email_verified_at` set). Unverified login returns `emailVerificationRequired` and blocks experience sync, leaving a stale QR payload. |

Build/install: `cd kiosk && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`
then launch `com.buffrcheckpoint.kiosk/.MainActivity` (or tap the app icon).
Local backend alternative: `http://10.0.2.2:3001/` with NestJS on the host.

After login, Welcome must show **Buffr Analytics** (not product-default
"Buffr Checkpoint" chrome): magenta accent `#CF1161`, logo from
`/org-assets/buffr-analytics/icon.png`, and the public check-in QR for
site `74c72c99-…`. If branding is missing, use Welcome's retry control —
sync failures no longer fail silently (v0.27).

### 11.7.8 DNS and public hostnames — `buffrcheckpoint.com`

> **Scope:** turn the local dev surfaces from Section 11.4.2's
> monorepo tree into internet-reachable hostnames under the registered
> **`buffrcheckpoint.com`** domain. This section is the operator runbook —
> Namecheap (or other registrar) DNS records, Vercel custom domains,
> deploy-time env vars, and smoke tests. **As of v0.16, production is live**
> on website / admin / api (verified 2026-09-11). **Ops console**
> (`ops.buffrcheckpoint.com`) CNAME is live in Namecheap Advanced DNS
> (`ops` → `d7a75fef5a47cd2c.vercel-dns-017.com`, confirmed 2026-09-18).
>
> **Historical note:** v0.10 documented a `buffrconnect.com` subdomain tree
> (`checkpoint.buffrconnect.com`, …) assuming shared registrar space with
> the sibling Buffr Connect product. **v0.15 makes `buffrcheckpoint.com`
> canonical** — the product domain matches the product name.

#### 11.7.8.1 Hostname plan

| Public role | Hostname | App / service | Host (live) |
|---|---|---|---|
| Marketing site | `buffrcheckpoint.com` (+ `www`) | `website/` (Next.js) | Vercel `buffrcheckpoint-website` |
| Admin dashboard | `admin.buffrcheckpoint.com` | `admin/` (Next.js) | Vercel `buffrcheckpoint-admin` |
| Platform ops console | `ops.buffrcheckpoint.com` | `ops-console/` (Next.js) | Vercel `buffrcheckpoint-ops-console` |
| API (kiosk + admin + ops server-side) | `api.buffrcheckpoint.com` | `backend/` (NestJS) | Railway `buffrcheckpoint` / `api` |

The **`kiosk/`** Android app has no DNS record of its own — field tablets
point at the **API hostname** through `KioskSetupScreen`'s "Backend base
URL" field (Section 11.7.7). Production value:

```text
https://api.buffrcheckpoint.com/
```

(trailing slash optional — Retrofit normalises it — but HTTPS is
**mandatory** in production; Section 11.8.6. Debug builds may still use
`http://10.0.2.2:3001/` on an emulator or a LAN IP during local dev.)

Visitor-facing **site QR codes** encode check-in URLs on the marketing
hostname (`VISITOR_CHECKIN_BASE_URL`, default `https://buffrcheckpoint.com`):

```text
https://buffrcheckpoint.com/check-in?site={siteId}&ref={referenceId}
```

Built by `backend/src/common/assets/public-asset-url.ts`
(`buildPublicCheckInQrUrl`). The **destination page** is
`website/src/app/check-in/` (v0.18). The phone then calls the public API on
`api.buffrcheckpoint.com` (see §11.9.9.1). A static public QR may **begin**
this journey only — it must not prove identity, grant access, or reveal
visitor data (§11.9.8.1).

#### 11.7.8.2 DNS records (Namecheap Advanced DNS)

Create these records in the DNS panel for **`buffrcheckpoint.com`**.
Replace **Target** placeholders with the exact values Vercel or your API
host prints when you attach each custom domain.

| Host / name | Type | Target (verified 2026-09-18 Namecheap Advanced DNS) | Serves |
|---|---|---|---|
| `@` | `A` | `64.29.17.1`, `216.198.79.1` | `website/` apex |
| `www` | `CNAME` | `3174b31ac9c2defc.vercel-dns-017.com` | `website/` |
| `admin` | `CNAME` | `5532354d6fa6cd3b.vercel-dns-017.com` | `admin/` |
| `ops` | `CNAME` | `d7a75fef5a47cd2c.vercel-dns-017.com` | `ops-console/` |
| `api` | `CNAME` | `yc9j25fm.up.railway.app` | `backend/` |
| `_railway-verify.api` | `TXT` | `railway-verify=…` (exact token from Railway; keep as issued) | Railway domain verify |
| `send.mail` | `CNAME` | `send.forge.rmta.net` | Resend return-path / SPF for `mail.buffrcheckpoint.com` |
| `rsend.mail` | `CNAME` | `rsend-euw1.forge.rmta.net` | Resend SPF alias (eu-west-1) |
| `resend._domainkey.mail` | `TXT` | `p=MIGf…` (exact value from Resend Domains → Records) | Resend DKIM for `mail.buffrcheckpoint.com` |

**Do not** add a second `api` CNAME (e.g. an old `api-production-*.up.railway.app`
hostname) — only one CNAME per host label.

**Namecheap host field:** enter `www`, `admin`, `ops`, `api`, `send.mail`,
`rsend.mail`, or `resend._domainkey.mail` — not the full FQDN
(`admin.buffrcheckpoint.com` → Host = `admin`;
`ops.buffrcheckpoint.com` → Host = `ops`;
`send.mail.buffrcheckpoint.com` → Host = `send.mail`).

**Resend sending domain:** `mail.buffrcheckpoint.com` (region `eu-west-1`)
is verified in Resend. From-address for onboarding mail is
`Buffr Checkpoint <onboarding@mail.buffrcheckpoint.com>`. Do **not** put
Resend MX on the apex — that would steal inbound mail for `@buffrcheckpoint.com`.

**Notes:**

- **Three Vercel projects** — `website/`, `admin/`, and `ops-console/` deploy
  independently; each project gets its own domain attachment and SSL certificate.
- **API subdomain** — NestJS binds `PORT` (default `3001`) inside the
  container/process; the platform terminates TLS at the edge. No public
  DNS should expose `:3001` in production.
- **TTL** — use `300` seconds (5 min) while first wiring; raise to `3600`
  once stable.
- **Cloudflare proxy (orange cloud)** — allowed for `website/` and
  `admin/`; for `api` either proxy (with WebSocket/long-poll tested) or
  DNS-only (grey cloud) if the API host already provides TLS. Keep Resend
  CNAMEs/TXT **DNS-only** (never proxied).

#### 11.7.8.3 Deploy attachment checklist (per hostname)

**`buffrcheckpoint.com` + `www.buffrcheckpoint.com` → `website/`**

1. Deploy `website/` to Vercel.
2. Project → **Settings → Domains** → add `buffrcheckpoint.com` and
   `www.buffrcheckpoint.com`.
3. Copy the CNAME/A/ALIAS targets Vercel shows into Namecheap.
4. Wait for "Valid configuration" / certificate issued.

**`admin.buffrcheckpoint.com` → `admin/`**

1. Deploy `admin/` as a **separate** Vercel project.
2. Attach `admin.buffrcheckpoint.com`; add the CNAME it gives you.
3. Confirm auth routes still proxy to the API (server-side
   `BACKEND_API_URL`, not a browser-visible secret).

**`ops.buffrcheckpoint.com` → `ops-console/`**

1. Deploy `ops-console/` as a **separate** Vercel project
   (`buffrcheckpoint-ops-console`).
2. Attach `ops.buffrcheckpoint.com`; add Namecheap host `ops` CNAME to the
   target Vercel prints (`d7a75fef5a47cd2c.vercel-dns-017.com` as of
   2026-09-14).
3. Set `BACKEND_API_URL=https://api.buffrcheckpoint.com` and
   `NEXT_PUBLIC_ADMIN_APP_URL=https://admin.buffrcheckpoint.com` on the
   Vercel project; include `https://ops.buffrcheckpoint.com` in API
   `CORS_ORIGIN`.
4. Confirm `/login` returns 200 over HTTPS after DNS propagates.

**`api.buffrcheckpoint.com` → `backend/`**

1. Deploy `backend/` to a long-running Node host (Neon Postgres stays
   external; Section 11.4.7).
2. Attach custom domain `api.buffrcheckpoint.com`; point the `api` CNAME
   at the platform hostname.
3. Confirm `GET https://api.buffrcheckpoint.com/health` returns `200` and
   `GET .../public/capability-status` returns JSON.

#### 11.7.8.4 Environment variables after DNS propagates

Set these in each host's secret/env panel — **never commit real values**.
Canonical shapes live in each app's `.env.example` (local dev defaults +
commented production block).

**`backend/` (production)**

```env
PORT=3001
DATABASE_URL=<Neon connection string — Section 11.4.7>
JWT_SECRET=<random hex — backend/.env.example>
CORS_ORIGIN=https://buffrcheckpoint.com,https://www.buffrcheckpoint.com,https://admin.buffrcheckpoint.com,https://ops.buffrcheckpoint.com
PUBLIC_ASSET_BASE_URL=https://admin.buffrcheckpoint.com
PUBLIC_WEB_BASE_URL=https://buffrcheckpoint.com
VISITOR_CHECKIN_BASE_URL=https://buffrcheckpoint.com
PUBLIC_ADMIN_BASE_URL=https://admin.buffrcheckpoint.com
PUBLIC_OPS_BASE_URL=https://ops.buffrcheckpoint.com
PUBLIC_WEBSITE_BASE_URL=https://buffrcheckpoint.com
PUBLIC_BRAND_LOGO_URL=https://buffrcheckpoint.com/branding/logo-horizontal.png
EMAIL_VERIFICATION_PEPPER=<random hex>
MFA_CHALLENGE_PEPPER=<random hex>
MFA_SECRET_ENCRYPTION_KEY=<at least 32 random chars>
RESEND_API_KEY=<from resend.com>
RESEND_MAIL_DOMAIN=mail.buffrcheckpoint.com
RESEND_FROM_EMAIL=Buffr Checkpoint <onboarding@mail.buffrcheckpoint.com>
# …hash peppers + QR_TOKEN_PEPPER from backend/.env.example…
```

**`website/` (production — Vercel)**

```env
NEXT_PUBLIC_SITE_URL=https://buffrcheckpoint.com
NEXT_PUBLIC_API_URL=https://api.buffrcheckpoint.com
```

**`admin/` (production — Vercel)**

```env
BACKEND_API_URL=https://api.buffrcheckpoint.com
API_URL=https://api.buffrcheckpoint.com
NEXT_PUBLIC_WEBSITE_URL=https://buffrcheckpoint.com
```

**`ops-console/` (production — Vercel)**

```env
BACKEND_API_URL=https://api.buffrcheckpoint.com
NEXT_PUBLIC_ADMIN_APP_URL=https://admin.buffrcheckpoint.com
```

> Resend keys (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) live on **Railway `api`**,
> not on the Vercel admin or ops-console projects — the NestJS backend is the only mail sender.
**Local development** — apps default to `localhost` ports per each `.env.example`;
see `backend/.env.example`, `admin/.env.local`, `website/.env.local`, `ops-console/.env.local`.

**`kiosk/` (on-device, via Kiosk setup screen — not an env file)**

| Field | Production value |
|---|---|
| Backend base URL | `https://api.buffrcheckpoint.com/` |
| Site ID | UUID issued for that physical site (`POST /sites` — Section 11.4) |
| Service-account email / password | Least-privilege kiosk operator creds — **not** the demo account from Section 11.7.7 |

Redeploy `website/` and `admin/` after env changes so `NEXT_PUBLIC_*`
values bake into the client bundle at build time.

#### 11.7.8.5 Verification (run after DNS + deploy)

From any machine on the public internet:

```bash
# DNS resolved?
dig +short buffrcheckpoint.com
dig +short www.buffrcheckpoint.com
dig +short admin.buffrcheckpoint.com
dig +short ops.buffrcheckpoint.com
dig +short api.buffrcheckpoint.com

# TLS + API alive?
curl -sS -o /dev/null -w "health %{http_code}\n" \
  https://api.buffrcheckpoint.com/health
curl -sS https://api.buffrcheckpoint.com/public/capability-status

# Marketing + admin + ops return HTML over HTTPS
curl -sS -o /dev/null -w "website %{http_code}\n" \
  https://buffrcheckpoint.com/
curl -sS -o /dev/null -w "admin %{http_code}\n" \
  https://admin.buffrcheckpoint.com/
curl -sS -o /dev/null -w "ops %{http_code}\n" \
  https://ops.buffrcheckpoint.com/login

# Public mobile check-in destination (v0.18) — page must be 200, not 404
curl -sS -o /dev/null -w "check-in page %{http_code}\n" \
  "https://buffrcheckpoint.com/check-in?site=74c72c99-93dc-4b33-934b-9b365e9924cf&ref=b3333333-3333-4333-8333-333333333301"
curl -sS \
  "https://api.buffrcheckpoint.com/public/check-in/context?site=74c72c99-93dc-4b33-934b-9b365e9924cf&ref=b3333333-3333-4333-8333-333333333301"
```

On a production kiosk tablet: enter the HTTPS API base URL, site UUID, and
service-account credentials → **Sign in** must succeed without the
cleartext-HTTP workaround used in debug builds (Section 11.7.7).

#### 11.7.8.6 Subprocessor / privacy copy alignment

Once these hostnames are live, update the **Privacy Policy** subprocessors
/hosting list (Section 1a.3, Section 11.8.6) to name the actual edge host
(Vercel region, API platform region) and confirm Section 4a.7's Namibia
hosting claim still matches where Neon and the API compute actually run —
the current primary Neon project is `aws-eu-central-1` (Frankfurt;
Section 11.4.7) — closer to Namibia than Oregon, still not Namibia-hosted;
a pilot that claims "data hosted in Namibia" must not go live on this stack
without an explicit infrastructure decision recorded elsewhere in this
document.

## 11.8 Pre-Launch Engineering, QA & Compliance Checklist

This section closes the remaining gaps between what Sections 11.4–11.7
specify as *built* and what must be *verified* before Buffr Checkpoint's
first pilot (Section 17.2). Each item below is scoped to the three real
frontends (`admin/`, `website/`, `kiosk/`) and the `backend/` they share —
generic launch-checklist items that don't apply to this product (e.g. a
payment-processing test) are called out as not applicable, with the reason,
rather than silently dropped.

### 11.8.1 UI states — empty, loading, error, offline

Every list/table view across all three frontends needs four defined states,
not just the "happy path" shown in Section 10's wireframes:

| State | `admin/` example | `website/` example | `kiosk/` example |
|---|---|---|---|
| Empty | Front Desk roster with zero on-site visitors — "No one is checked in right now," not a blank table | N/A (static marketing pages have no empty state) | N/A — the kiosk always shows its channel-selection home screen |
| Loading | Audit Log table while a filtered query runs — a skeleton row pattern, not a spinner-only blank screen | Route transition between pages (Next.js loading.tsx) | Between "check-in submitted" and server acknowledgement — must show the **offline-safe** pending state from Section 8.5, never a generic spinner that could imply success prematurely |
| Error | A failed `RbacGuard`/network request — a retry action, not a raw stack trace or a silent failure (Section 9.2's audit trail should also record the failed attempt) | Contact form submission failure — inline, field-adjacent, not a full-page error | NFC read failure, USSD timeout (Section 6.2's design controls already specify a fallback state here) |
| Slow/no internet | Admin app on a poor connection — cached last-known roster with a visible "stale as of [time]" marker, not an infinite spinner | Static generation means the site itself keeps working; only the Contact form and Capability Status Badge (Section 4a.7) need a degrade path | This is the kiosk's **core design constraint**, not an edge case — fully specified already in Section 8.5's offline journey; nothing new to add here, just a pointer back to it |

### 11.8.2 Data-integrity verification ("make sure user data actually saves correctly")

Not a one-time check but a release gate: for each write path in Section
11.4.5's schema, a test confirms the row is (a) present after the request
returns, (b) still present and unchanged after a hard refresh/re-fetch —
catching any accidental client-side-only state — and (c) idempotent on
retry, specifically for `visit` and `visit_invitation` (client-generated
UUIDs, Section 11.4.5) and the kiosk's offline sync queue (Section 8.5) —
a retried offline sync must never create a duplicate visit.

### 11.8.3 Payments — not applicable in this schema, flagged rather than skipped

Buffr Checkpoint's own revenue (Section 15.3: subscriptions, hardware,
messaging pass-through, assurance retainers) is **invoiced B2B**, not
processed through an in-app payment flow — there is no `payment` or
`invoice` table in Section 11.4.5's schema, and none is proposed here
without a human/Fable design pass, per rule 9. "Test error payments" from a
generic launch checklist therefore doesn't map onto this product today. If
a self-serve billing flow is added later (e.g. Checkpoint Core sold
online without a sales cycle), it needs its own schema pass following
Section 15's `NUMERIC(15,2)` + `currency_code` rule (Section 11.4.5 point
6) — noted here as a real gap for that future scope, not silently ignored.

### 11.8.4 Notification testing

Every `notification_event` channel (Section 11.4.5, `channel_code`) needs a
test path that confirms both the **happy path** (delivery_status_code
reaches a terminal success state) and the **failure path** (Section 3.3's
telecom-controls table already lists the relevant failure modes: USSD
unavailable, SMS lock-screen exposure, short-code dependency) — test against
a real aggregator sandbox before the Phase 1.5 USSD rollout (Section 18),
not just against a mocked provider.

**Branded templates (v1):** Copy lives in `platform_notification_template`
(ops-editable under Ops → Configuration). Migration `0038` seeds the full
catalog (auth, ops intake, billing EFT+POP, KYB, host notify, plus dormant
stubs). `TemplatedEmailService` renders `{{tokens}}`, wraps plain text in the
mustard/charcoal shell (`branded-email-layout.ts`), and enqueues via the
notification outbox → Resend. Invoice/receipt PDFs attach on
`invoice_issued` / `receipt_issued`. Ops **Send test to ops inbox** hits
`POST /platform/configuration/notification-templates/:id/test-send`.

### 11.8.5 Observability: analytics, crash reporting

**Status (instrumented):** Sentry Next.js setup follows
[skills.sentry.dev/instrument](https://skills.sentry.dev/instrument) manual Option 2
for `admin/` + `website/`: `instrumentation-client.ts` (errors + tracing +
Session Replay with `maskAllText`/`blockAllMedia`), `sentry.server.config.ts`,
`sentry.edge.config.ts`, `instrumentation.ts` (`onRequestError`),
`global-error.tsx`, `withSentryConfig` + `tunnelRoute: "/monitoring"`.
Verify via staging errors or the Sentry wizard (no public test route on
`website/`). Nest API uses
`@sentry/nestjs`; kiosk uses `sentry-android` (DSN via Gradle
`SENTRY_DSN` / `BuildConfig`). PostHog US
(`NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`, `defaults: '2026-05-30'`)
is wired on `admin/` + `website/` behind an explicit analytics consent banner.
Neon data warehouse source `buffrcheckpoint` (project 608602) syncs an
ops allowlist only (orgs/sites/devices/visit status aggregates); visitor PII,
auth tokens, and form answer tables stay `should_sync=false`.
Named product events (consent-gated, decision-oriented — Provost & Fawcett):
`analytics_consent_accepted`;
admin auth: `admin_login_*`, `admin_mfa_challenge_*`, `admin_register_*`,
`admin_password_reset_*`, `admin_login_locked_out`;
admin activation: `admin_onboarding_step_completed` /
`admin_onboarding_step_blocked` / `admin_onboarding_live`;
admin ops: `admin_front_desk_checkout`;
website visitor journey: `web_check_in_started` / `_context_failed` /
`_form_loaded` / `_failed` / `_completed` / `_pass_printed`,
`web_check_out_started` / `_failed` / `_completed`,
`contact_enquiry_submitted`.
Properties are codes/counts only (no visitor PII).
Pinned ops dashboard: https://us.posthog.com/project/608602/dashboard/2094531
(pageviews, activation funnel, consent trend; warehouse HogQL tiles as added).

#### PostHog AI / project-analysis prompts (paste into PostHog AI chat)

Official tip source: https://posthog.com/docs/product-analytics/analyze-data-ai

**Weekly health**
- `What changed across Buffr Checkpoint this week? Filter out test accounts.`
- `Which events have the highest drop-off rate in the past 7 days?`

**Activation & funnels** (name events explicitly)
- `Funnel: admin_register_succeeded → admin_login_succeeded → admin_onboarding_live → web_check_in_completed (30d)`
- `Funnel: web_check_in_started → web_check_in_form_loaded → web_check_in_completed → web_check_out_completed`
- `Alert when daily web_check_in_completed / web_check_in_started drops below 0.5`
- `Trend admin_login_locked_out and admin_login_failed last 14 days`

**Warehouse (Neon)**
- `Using HogQL, trend daily count of rows in buffrcheckpointneon_visitor_visits for the last 30 days`
- `Compare count of buffrcheckpointneon_sites vs buffrcheckpointneon_organisations and list sites without recent visit_status_events`

**Privacy / config review**
- `Which events or properties look like they might contain PII? Flag anything with email, phone, or name properties.`
- `List unverified events ingested in the last 14 days that are not in our verified taxonomy`

Tips: name events explicitly; specify time ranges; ask for funnel/retention/path chart types; iterate with follow-ups.
SDKs no-op when DSN/key env vars are unset. Crash/analytics payloads scrub
visitor PII keys before send (NFR-P06). **Ops checklist:** set Railway
`SENTRY_DSN`; Vercel admin/website `NEXT_PUBLIC_SENTRY_DSN` +
`NEXT_PUBLIC_POSTHOG_KEY` (+ optional `SENTRY_AUTH_TOKEN` for source maps);
kiosk release `SENTRY_DSN` in `local.properties` or CI `-PSENTRY_DSN=...`.
To provision a Sentry project interactively: `npx @sentry/wizard@latest -i nextjs`
(or connect Sentry MCP and re-run verification).

Neither was previously specified. Both are real gaps:

- **Analytics** — product analytics (e.g. visitor completion rate by
  channel, Section 17.2's pilot KPIs) must be **consent-aware from day
  one**, not bolted on after a cookie banner is added (Section 11.8.6) —
  this is a privacy-by-design product (Section 3.1), so an analytics
  vendor that fingerprints visitors without consent would directly
  contradict the brand's own positioning (Section 22). Prefer a
  self-hosted or EU/Africa-region analytics tool over a US-default SaaS
  vendor, and never send visitor PII (names, phone numbers) to an
  analytics provider — only aggregate, de-identified events.
- **Crash reporting** — `admin/`/`website/` (a standard JS error-tracking
  SDK) and `kiosk/` (Android's own crash-reporting, e.g. Firebase
  Crashlytics or an equivalent that doesn't require Google Play Services
  on a locked-down MDM device — confirm compatibility with the Android
  Enterprise dedicated-device mode from the kiosk readiness assessment
  before choosing one). Crash reports must not include visitor PII in
  their payloads — scrub `visit.notes`/`photo_reference` and any request
  body before it leaves the device, consistent with Section 11.3's
  data-minimisation rules.

**Production smoke (canonical):** `buffrcheckpoint/scripts/smoke-production.sh`
asserts live health, public check-in form contract (demo site/ref), website
check-in/check-out pages, check-out route validation, and auth login error
shape. Opt into the same suite via `SMOKE_PRODUCTION=1 ./scripts/run-all-tests.sh`.
Agent/CI smoke must use unrestricted network — sandboxed `curl` CONNECT 403 /
exit 56 is a proxy false failure, not a product regression.

**Test harness:** `buffrcheckpoint/scripts/run-all-tests.sh` runs backend
unit + e2e, website/admin Vitest (observability helpers), and kiosk
`testDebugUnitTest`. Gap-fill suites cover capability effective flags,
invitation resolve/create, SMS scaffold PII hashing, and FR-K10 draft
clearance. Set `SMOKE_PRODUCTION=1` to append live production smoke after
local suites.

### 11.8.6 Privacy, security hardening, and cookie consent

- **Privacy setup** — verified against the new Privacy Policy page
  (Section 1a.3) and Section 3's practical legal position; confirm the
  page's claims match what Section 11.4.5's schema and Section 13.1's
  controls actually implement, not what would be nice to claim.
- **Secrets removed from frontend** — `admin/` and `website/` must ship
  zero secrets in client-side bundles (grep the built output for the
  `backend/.env` values, Section 11.4.7, before every release); only
  `NEXT_PUBLIC_*`-prefixed, genuinely public values (e.g. the public API
  base URL) belong in frontend env vars. The kiosk's device-side secrets
  (Section 13.1 "key management") live in Android Keystore, never in
  source or `SharedPreferences`.
- **Force HTTPS** — backend and both web frontends redirect HTTP→HTTPS at
  the edge/load-balancer, not in application code; HSTS header enabled.
- **Cookie consent banner** — `website/` only (Section 11.6); `admin/` is
  an authenticated app where the session cookie itself is strictly
  necessary and doesn't require consent, but any *analytics* cookie there
  still does, per 11.8.5's consent-aware requirement.

### 11.8.7 Accessibility and device/browser matrix

- **Accessibility** — `kiosk/` already has a dedicated contrast/tap-target
  gate (Section 11.7.4's verification). Extend the same WCAG AA bar to
  `admin/` and `website/`: color contrast against Section 11.5.1's dark
  tokens (verify Frost-on-Carbon and Sodium-Yellow-on-black pairs
  specifically, since ultra-light 100-weight type at small sizes is the
  system's own stated signature move and is exactly where contrast
  failures are most likely), keyboard navigation through the admin app's
  data tables, and alt text on every image (11.8.8).

  > **Verified v0.23 (Lighthouse + axe, real dev servers, not just this
  > checklist):** every unauthenticated page in both apps now scores
  > 100/100 accessibility — `website/` home, `/contact`, `/check-in`,
  > `/privacy`, `/terms`; `admin/` `/auth/login`, `/auth/register`,
  > `/auth/forgot-password`, `/unauthorized`. Root causes found and fixed
  > at the token/component level (not spot-patched per page, so the fix
  > covers every current and future usage):
  > 1. `--destructive` (#ef4444, ~3.42:1 on `--color-cloud`) failed WCAG AA
  >    as text — darkened to `#b91c1c` (5.88:1) in
  >    `{website,admin}/src/styles/presets/buffr-checkpoint.css`. This one
  >    token fixes every `text-destructive` error message across both
  >    apps (~40 call sites) in one place.
  > 2. Raw `--color-sodium-yellow` (#e2a603, ~1.97:1) and `--color-ash`
  >    (#9a9a94, ~2.57:1) are fine as button fills/borders but fail as
  >    foreground text. Added `--color-sodium-yellow-ink` (#8a6403,
  >    4.88:1) as a text-safe pairing; reused the existing `--color-slate`
  >    (4.84:1) for ash-as-text cases. Fixed every real instance:
  >    `.status-targeted`/`.status-not-live` in the preset CSS, the public
  >    capability-status badge, all `text-primary`-as-link-text instances
  >    across both apps' auth/contact/legal pages (register, login,
  >    forgot-password, mfa forms; contact and terms/privacy links), and
  >    one heading on the homepage. Purely decorative text (the "01"–"05"
  >    step-number watermarks) got `aria-hidden="true"` *and* a contrast-
  >    passing color — aria-hidden alone does not exempt visible text from
  >    WCAG 1.4.3, since it only affects the accessibility tree, not what
  >    a sighted low-vision user sees.
  > 3. Two structural gaps: contact page's h1→h3 skip (now h1→h2, matching
  >    the site-wide heading convention); missing `<main>` landmark on the
  >    admin auth flow (`AuthLayout`) and `/unauthorized`.
  > **Not yet verified:** `admin/` pages behind the dashboard sidebar —
  > the demo account requires MFA enrollment, which blocks a scripted
  > Lighthouse run without a browser-driven enrollment flow. The token-
  > level fixes above apply there too (same `text-destructive` error
  > pattern is used on ~30 dashboard form/table files), so the same class
  > of bug is already closed, but this hasn't been independently
  > confirmed by re-running the tool against an authenticated session.
- **Device/screen matrix** — `admin/` and `website/`: test at minimum a
  narrow mobile width, a tablet width, and a standard desktop width
  (`website/` must be mobile-friendly — Section 11.8.8 — since a
  prospective customer's first visit is often on a phone). `kiosk/`:
  test across the actual narrow device allowlist called for in the kiosk
  implementation-readiness assessment (device fragmentation was flagged
  there as a genuine field-reliability risk) — this is a hardware
  procurement decision as much as a QA one, per Section 4a.3 and the
  CRAN Device Compliance Register (Addendum §2.2, Section 11.4.5).

### 11.8.8 Website technical/SEO checklist

All items scoped to `website/` (Section 11.6):

- Meta titles and descriptions per page, written to match this document's
  actual claims (Section 3's "practical legal position" applies to SEO
  copy too — no page's `<meta description>` may imply DigiNam/e-ID status
  beyond what Section 4a.7's Capability Status Register says).
- One social preview (OG) image per page — reuse Section 11.6.2's design
  tokens (dark canvas, Sodium Yellow accent) rather than a generic
  screenshot.
- Favicon derived from the logo mark (Section 11.5's opening reference).
- `sitemap.xml` and `robots.txt` generated at build time from the
  marketing page list in Section 1a.3 (eight marketing pages/states).
  **`/check-in` is deliberately omitted** from the sitemap (v0.18) —
  operational QR destination, not a crawlable marketing page; the page
  itself sets `robots: noindex, nofollow`.
- Alt text on every image, including the 3D Isometric Vignettes (Section
  11.6.3) — these are decorative but still need a short descriptive alt,
  per the accessibility bar in 11.8.7.
- Image compression and page-load-speed checks before each deploy —
  static generation (Section 11.6.1) does most of the work here, but
  imagery (11.6.3) is the likeliest regression source.
- Custom 404 (added to Section 1a.3) and a broken-link check across all
  eight marketing pages before each release. Also verify
  `/check-in?site=&ref=` returns **200** with a form (or a clear invalid-
  link state), never the marketing 404, once a site has an active public
  QR (Section 11.7.8.5).

### 11.8.9 Forms: validation, spam protection, single CTA

- **Form validation** — the Contact page form (Section 1a.3) and any
  future self-serve signup use the same `shared/` zod schemas referenced
  in Section 11.4.4, validated client-side for UX and always re-validated
  server-side (client validation is never trusted as the boundary, same
  principle as Section 9.2 rule 1's "enforce in the API/database layer,
  not only the UI"). The **visitor check-in form** (v0.18,
  `website/src/app/check-in/check-in-form.tsx`) validates required fields
  in the browser and always re-validates via Nest `ValidationPipe` on
  `POST /public/check-in` (`PublicCheckInDto`).
- **Spam protection** — the Contact form's public endpoint (Section
  11.6.1's `POST` target) needs a bot-resistance measure (a
  privacy-respecting challenge, not a data-harvesting third-party
  widget — consistent with Section 11.8.6's subprocessor discipline) and
  rate-limiting at the backend. Public check-in endpoints use
  `@Throttle` (context 30/min, submit 10/min) in addition to the global
  throttler.
- **One clear call to action** — already specified for the Home page in
  Section 1a.3; extend the same discipline to every other page (Platform
  → "See the RBAC model," Pricing → "Talk to sales," About → "Book a
  review") — one primary CTA per page, not competing buttons. Check-in
  page: single primary CTA **"Check in"**.

### 11.8.10 Beta testing and launch gate

Extends Section 17.2's pilot design rather than duplicating it: "test every
critical user [flow] and real beta testers before launch" is Section 17.2's
three-site, 60–90 day pilot, run against the actual measured list already
defined there (visitor completion rate, channel-by-channel check-in
duration, offline-sync success, etc.) — this checklist item is satisfied by
executing that existing plan, not by inventing a second beta program. The
one addition: every item in Sections 11.8.1–11.8.9 above should be a closed
checklist item — not merely "planned" — before the first pilot site goes
live, since Section 17.2's pilot is measuring the *product*, and a pilot run
against known-broken error states or unverified data-integrity would
contaminate the pilot's own results.

**Operational detail:** Stage gates, scripts, entry/exit criteria, and
sign-off forms for **Alpha → UAT → Pilot → GA** live in **Section 17.4**.
Do not invent a parallel beta programme outside that ladder.

---

## 11.9 Three-Surface Product Operating Model — Visitor Kiosk · Admin Platform · Core API

> **Additive section (v0.11).** This section **extends** — does not replace
> — Sections 8 (journeys), 9 (RBAC), 10 (wireframes), 11.4 (schema/repo),
> and 11.7 (kiosk build status). Where 11.9 restates something those sections
> already own, treat the older section as canonical for implementation detail
> and 11.9 as the **product-operating-model** layer: who uses what surface,
> what the organisation configures, and what the visitor must never see.

The **kiosk is the visitor-facing application**. It is one part of a connected
three-surface product:

```text
Visitor-facing Kiosk App  (kiosk/)
        ↕
Buffr Checkpoint Core Platform / API  (backend/)
        ↕
Organisation Admin Platform  (admin/)
```

The kiosk is not an isolated tablet app. It is a securely provisioned,
site-specific visitor interface whose available channels, fields, policies,
branding, notifications, credentials, and emergency rules are configured by
authorised customer users through the admin platform.

This operating model is consistent with **Vizito Demo 2026: Easy & Secure
Digital Visitor Management System** — a configurable visitor app on a tablet
plus a back-office platform for sites, hosts, forms, agreements, reports,
devices, and roles. Buffr Checkpoint follows that two-part pattern while
improving privacy, offline operation, feature-phone inclusion, NFC, audit, and
risk-based controls (Sections 4–8, 13).

### 11.9.0 Implementation posture vs. this section

| 11.9 topic | Built today (repo) | Partial | Not yet built |
|---|---|---|---|
| Three-surface wiring (kiosk ↔ API ↔ admin) | ✓ Branding sync + offline cache + **logo disk cache** (`LogoDiskCache`) + **org chrome** (`OrgBrandingHeader`); demo tenancy unified under Buffr Analytics (`0018`) | CDN artifact store | — |
| Admin configures sites, hosts, forms, devices, RBAC | ✓ Site Experience nav + create/publish/rotate sheet forms | Per-field version editor | Workflow-builder UI |
| Site branding / kiosk experience / QR / escalation | ✓ Schema `0010`–`0012` + API + admin UI + escalation worker + **status transitions** | — | — |
| Host approve/reject | ✓ `POST /visits/:id/approve` · `POST /visits/:id/reject` | Admin UI buttons on roster | — |
| Kiosk: welcome / branding / maintenance | ✓ Welcome + logo URL/disk cache + NFC/USSD tiles + language + a11y | NFC reader mode (Phase 5) | Badge print |
| Kiosk: manual / assisted / QR check-in | ✓ | NFC fast lane hardware path | — |
| Kiosk: USSD continuity | ✓ **Dedicated USSD instructions screen** (capability-gated tile) | Live USSD gateway integration | — |
| Kiosk: privacy notice before capture | ✓ Gate + policy text + **pre-check-in server ack** + post-check-in ack | Digital signature capture | — |
| Kiosk: session clear / timeout | ✓ Idle handler + form reset + **pointer/scroll activity tracking** | — | — |
| Internal Operations Console (capability status) | API exists (`PATCH /capability-status`) | — | Separate internal app — **not** in customer `admin/` sidebar (see `admin/src/navigation/sidebar/sidebar-items.ts`) |
| Platform-support break-glass journeys | RBAC role exists | — | Full ops console |

### 11.9.1 The three product surfaces

| Surface | Primary user | Purpose | Cannot do |
|---|---|---|---|
| **Visitor Kiosk** (`kiosk/`) | Visitor, guest, contractor, delivery driver | Complete a private arrival or departure journey | Browse other visitors, edit policy, access reports |
| **Organisation Admin Platform** (`admin/`) | Owner-Operator, receptionist, host, site manager, compliance officer | Configure and operate the organisation's visitor process | Change global platform capability status |
| **Buffr Checkpoint Operations Console** *(internal, not customer admin)* | Internal Platform Support / Compliance | Govern platform-wide capability status, support access, incidents, integration evidence | Routinely access customer data or change client settings without authorised support access |

#### Kiosk role

The kiosk serves **one visitor at a time**:

```text
Branded welcome screen
        ↓
Select appropriate arrival method
        ↓
Show privacy notice
        ↓
Capture only permitted fields
        ↓
Apply required verification
        ↓
Create one encrypted visitor record
        ↓
Notify host / await approval where required
        ↓
Print badge or show confirmation
        ↓
Clear the screen completely
```

It must never become a public customer directory, a public visitor search
tool, or a back-office dashboard (see also NFR-P01, §11.9.7).

#### Admin-platform role

The admin platform is where the organisation configures what the kiosk does
(maps to Section 11.4.5 schema families — organisations, sites, hosts,
devices, visitor policy, retention, etc.):

```text
Organisation
  └── Region
       └── Site
            ├── Kiosk devices
            ├── Hosts
            ├── Visitor categories
            ├── Check-in channels
            ├── Forms
            ├── Privacy notices and agreements
            ├── Identity-assurance rules
            ├── Badge rules
            ├── Notification rules
            ├── Retention rules
            ├── Emergency settings
            └── Branding
```

#### Core principle

> **The organisation owns the visitor experience. Buffr Checkpoint provides the secure control system behind it.**

The visitor sees the **organisation's brand**, not a generic software-vendor
interface. In product UI copy, use **organisation branding** or **site
branding** — not "owner branding." The customer organisation is the
controller/operator of its own visitor journey (Section 3, Section 21
decision 5).

### 11.9.1a Platform Ops Console build (v0.24)

Full build of the third surface named in §11.9.1's table. Covers
functionality, dashboards/reporting, analytics (churn/health scoring),
support tooling, billing, CRM, and KYB — everything §11.9.1 scoped this
surface to plus the product decisions below, confirmed with George before
building.

**Product decisions (not the doc's original narrower framing — superseded here):**
- **Full break-glass data edit**, not curated actions only — **and
  customer-consent-gated**, closing a real gap in the first pass of this
  build. A `platform_support` user requests a grant against a target org;
  the grant is created `pending_customer_approval` and is completely inert
  — cannot mint a session, cannot pass `RbacGuard`'s per-request re-check —
  until an authorized user of the *target* organisation
  (`owner_operator`/`system_administrator`, permission
  `support_access.grant.review`) explicitly approves it from `admin/`'s
  Support Access screen. The requester can never approve their own request
  (`support-sessions.service.ts`'s `requirePendingGrantInCallerOrg`). A
  real notification email goes out to every admin of the target org via
  the notification outbox (§11.1a) the moment a grant is requested. Once
  approved, the platform user mints a short-lived **support-session** JWT
  scoped to that org (`POST /platform/support-access/grants/:grantId/session`)
  and uses it to act in `admin/` itself under the acting-as org's full
  `owner_operator` permission set, under a persistent, live-counting-down
  banner — never a silent impersonation. Every write is meant to land in a
  separate `platform_support_audit_events` table (before/after diff), and
  `RbacGuard`'s check re-verifies the specific grant is still `active`
  (not merely "not revoked and inside a time window" — the explicit
  `status_code`), non-revoked, and scoped to that exact org on every
  request. Routine console work (dashboard, CRM, billing, incidents)
  carries no `supportSessionId` claim and needs no grant at all — gating
  those on a grant would make the console's own basic screens unusable;
  only acting *as* a specific customer org requires one.

  Two real bugs were found and fixed by live end-to-end testing before
  this shipped, not after: (1) `RbacGuard`'s original grant lookup only
  verified *some* grant existed for the user, never that it matched the
  org being accessed — an active grant for Org A could have authorized an
  action against Org B. (2) A more serious one: the guard's re-check
  condition was `user.roleCode === "platform_support"`, but a minted
  support-session JWT deliberately sets `roleCode` to the acting-as role
  (`owner_operator`) — so the entire re-check silently never ran for any
  support-session request at all. Caught by testing the actual sequence
  (revoke a grant, confirm the still-held session token gets 403'd
  immediately) rather than trusting the code read correct; the first live
  attempt returned 200, not 403.
- **Real in-console ticketing** (`support_ticket` + status log + comments),
  not a link to an external tool.
- **Billing = manual EFT + POP, no PSP yet.** No payment-processor
  partnership exists. Invoice shows Buffr Financial Services CC's bank
  details, the customer pays by EFT off-platform, uploads a Proof of
  Payment, and `platform_support` manually reviews/confirms
  (`payment_reconciliation_log` is the required reconciliation artifact —
  CLAUDE.md §2). No processor SDK, no webhook, no card data touched
  anywhere. `payment_method_code` is the one seam for a future PSP: a new
  value plus a webhook receiver, no schema redesign.
- **CRM** folded into the organisation record (`lifecycle_stage_code` +
  `crm_contact`/`crm_deal`/`crm_activity_log`) rather than a bolted-on
  product, and feeds the churn Expected-Value ranking a real "account
  value" signal (`organisation_subscription.mrr_amount`) instead of a
  site-count proxy.
- **KYB** scoped to business-identity verification at onboarding
  (registration number, address, authorized signatory, document) gating an
  `organisation_subscription`'s `active` transition — **not** ongoing
  sanctions/PEP/AML monitoring, which this visitor-management product
  doesn't need.
- **Dual-approval fix**: `platform_capability_approvals` gained
  `secondary_approved_by`/`secondary_approved_at` — a `'live'` transition
  now requires two distinct approvers before `publicDisplayStatus` actually
  flips, closing the gap where the schema only ever had one approver
  column despite this doc already promising dual approval (§7901).
- **Churn/health scoring** — a v1 transparent weighted scorecard (visit
  volume trend, admin login recency, notification failure rate — a direct
  reuse of the notification outbox's own status data, device offline rate),
  not a trained model: no labeled churn history exists yet to train on
  safely, and ops staff need to see *why* a score is high. Expected-Value
  ranking (risk × MRR) surfaces which accounts are worth an intervention,
  not just which look scariest. v2 (logistic regression / random forest,
  evaluated on precision/recall over a held-out future time slice, once
  real labeled churn events accumulate) is documented, not built.
- **Namibia regional map** — ported from `buffr-intelligence`'s
  `NamibiaMap.tsx`/`namibiaRegions.ts` (`ops-console/src/components/map/`):
  the region geometry data copied verbatim (pure SVG paths, brand-neutral),
  the component rewritten against Buffr Checkpoint's own tokens instead of
  that product's Signal Arc palette, and simplified to a region-level
  choropleth only (that product's point-overlay/modal machinery —
  `namibiaProjection.ts`, `RegionModal.tsx` — wasn't ported; add it later if
  a per-site point layer is ever needed). New `sites.namibia_region_code`
  (14 seeded `namibia_region` type_definition rows, keyed identically to
  the map's region codes) is what the choropleth actually queries.

**What's built and verified — everything, live, not by code review alone:**
full schema across three migrations (`0022_platform_ops_console.sql`,
`0023_support_access_customer_consent.sql`, plus catching up
`0021_notification_outbox_and_domain_events.sql` which had been built
earlier in the same working session but never actually applied to this dev
DB until this pass found the gap) — all applied to the real dev database
and confirmed idempotent on a second run each. A seeded
`platform_support` demo account (`db/seed/0017_platform_support_demo.sql`,
home org Buffr Analytics `b51f0704-…` after `0018`,
`platform-ops-demo@buffrcheckpoint.test`) plus a real customer
`owner_operator` test account made the *entire* consent-gated flow
exercisable live, end to end, against production code paths — not just
unit-level: request grant → confirm it's inert (mint attempt 403s) →
customer lists their pending request → customer approves (or denies, also
tested) → platform user mints a session → org-scoped action succeeds →
grant revoked → the *same still-held* session token immediately 403s on
the next request. Every Ops Console screen is real and wired to live
endpoints: Overview, Organisations directory *and* per-organisation detail
(`/organisations/:id`, tabbed Rollup/CRM/Billing/KYB), CRM, Billing + POP
review queue, KYB review queue, Capability Status (with the dual-approval
flow), Support Access, Incidents, Tickets (with comments), Analytics
(EV-ranked churn queue), and Audit. `admin/`'s `/support-session` entry
route, its persistent banner with a live-ticking countdown, and its
customer-facing `/dashboard/billing` (invoice list + POP upload) are all
built and included in `admin/`'s own clean build. The Namibia choropleth
renders live regional data from `sites.namibia_region_code`.

One more real gap found and closed during this pass: `TenantScopeGuard`
checks *any* `organisationId` query/path param against the caller's own
org — correct and necessary for customer-facing routes, but it would have
silently 403'd every one of the Ops Console's own legitimate cross-org
reads (a platform_support user's own `organisationId` is an unrelated home
org). Fixed with an explicit `@PlatformScoped()` opt-out decorator
(`common/decorators/platform-scoped.decorator.ts`) applied only to routes
already gated by a `platform.*` permission — verified live both ways: the
new cross-org routes return 200 for platform_support against a foreign
org, and the pre-existing customer-facing `/platform/billing/invoices`
route still correctly 403s the same platform_support user for the same
foreign org.

**What's intentionally deferred, not "for later" left incomplete:** the v2
churn model (logistic regression / random forest once real labeled churn
history exists — the v1 heuristic scorecard is genuinely what should ship
first, per the DSFB guidance cited above), a PSP integration (no
partnership exists to integrate with), and the Namibia map's point-overlay
layer (`namibiaProjection.ts`/`RegionModal.tsx`, not needed until a
per-site view is requested). None of these block anything currently built.

### 11.9.1b Ops Console data-centric build (v0.25)

§11.9.1a shipped the Ops Console's screens and workflows end-to-end but
left it flat and siloed: no charting library anywhere in the app, exactly
one visual (the Overview choropleth), only `Organisation` had a real
detail/drill-down page, `devices`/`sites` were fully built on the backend
but never surfaced to platform staff, CRM rendered its pipeline as an
undifferentiated card list despite having real stage schema, and there was
no staff↔organisation messaging capability at all. This pass closes those
gaps.

**Charting.** `recharts` (already a real dependency of `admin/`, `3.8.0`)
plus a restyled `chartTokens.ts` (`ops-console/src/lib/chartTokens.ts`,
ported from `buffr-intelligence/frontend/src/lib/chartTokens.ts` the same
way `NamibiaMap` was — literals copied then re-picked against this app's
own sodium-yellow/carbon tokens, not the source brand's magenta/plum) is
now the one charting stack across both apps, not a second library
introduced for this pass. Three primitives
(`ops-console/src/components/charts/`): `TrendChart` (line + end-label +
%-change), `ShareBars` (ranked horizontal bars — never a pie chart, per
`buffr-intelligence/docs/data-visualization.md`'s own "reject" list),
`ScoreScatter` (threshold-band scatter). Every chart carries a required
`finding` prop, not a bare topic label — the same story-spine discipline
that guide documents, enforced at the component's own prop shape rather
than left to page-author judgment.

**New aggregate endpoints**, all on tables that already stored history —
no new tables for this part: `organisation-health.service.ts`'s
`listSnapshotHistory()` (health-score trend per org),
`platform-dashboard.service.ts`'s `incidentVolumeTrend()`,
`ticketVolumeTrend()`, and `accountSegmentation()` (health score × MRR,
the RFM-style quadrant DSFB's own churn-example chapter motivates —
`platform-dashboard.controller.ts`'s `/account-segmentation` route).
Applied to Overview (incident/ticket
weekly-volume `TrendChart`s, each linking through to the filtered
queue — chart→queue drill-down, not an inert plate), the organisation
detail Rollup tab (health-score trend), Analytics (the segmentation
scatter, threshold line at the same score-40 cutoff
`organisation-health.service.ts`'s own scorecard already uses — no new
number invented for the chart), and Incidents (severity-distribution
`ShareBars`, fixing a real display gap: severity was already stored,
never rendered).

**Drill-down.** `devices.service.ts`/`sites.service.ts` gained
`listForOrganisation()` (the existing customer-scoped `list()` methods
can't serve a platform_support caller, whose own `organisationId` is an
unrelated home-org placeholder — see `platform-scoped.decorator.ts`),
exposed via new `@PlatformScoped()` routes on
`platform-dashboard.controller.ts` and new Devices/Sites tabs on the
organisation detail page. New incident detail page
(`ops-console/incidents/[id]/page.tsx`) renders the status timeline
(`platform_incident_status_events`, captured on every transition, never
displayed before this) and affected organisations
(`platform_incident_affected_organisations` — the join table existed in
schema with no service methods reading or writing it; `listAffectedOrganisations()`
added). New ticket detail page (`ops-console/tickets/[id]/page.tsx`)
replaces the list page's N+1 comment-fetch-per-card with one thread per
ticket. KYB tab gained a verification-history timeline
(`kyb.service.ts`'s `history()`, reading `organisation_kyb_status_events` —
captured since day one, never queried back out) and a document-reference
link, instead of showing only the latest submission.

**CRM pipeline board.** `crm/page.tsx` is now a kanban board — one column
per `crm_deal_stage` (ordered by the type_definition's own `sort_order`,
so a new stage is still an INSERT, not a frontend change), with a
pipeline-value-by-stage `ShareBars` above it. No new backend aggregation
endpoint: `expectedMrr` summed by stage client-side from the same
`GET /platform/crm/deals` response the old flat list already fetched —
simplest thing that works, not a new service method for one `reduce()`.

**Manual-ops shortcuts.** No new edit path — `buffrcheckpoint.md`'s own
§11.9.1 "Cannot do: routinely access customer data ... without authorised
support access" stands unchanged. `RequestGrantForm` (already built,
already audited) now also appears on the incident detail page's
affected-organisations list, so a platform_support user can request access
to a specific org from the incident they're actually looking at instead of
navigating away to the standalone Support Access screen. Same component,
same grant flow, just reachable in context.

**Messaging.** `support_ticket_comments` was staff-only and invisible to
the org side — the closest thing to a staff↔organisation channel, but
one-way. Migration `0028_support_ticket_bidirectional.sql` adds
`author_type_code` (a new `support_ticket_comment_author_type`
type_definition domain: `platform_staff` / `organisation_member` — Wiebe
rule, a config row, not a hardcoded enum), backfilling every pre-migration
row to `platform_staff` (the only path that existed to write one then). A
new customer-facing controller (`support-tickets-customer.controller.ts`,
routes at `/tickets`, no `platform/` prefix) lets an organisation open a
ticket and read/post replies — `organisationId` always taken from the
caller's own session, never client-supplied, and every read/write on an
existing ticket re-checks `organisationId` ownership
(`assertOwnedByOrganisation()`) so a ticket ID alone can't cross a tenant
boundary. Same pragmatic-permission-reuse pattern as `kyb.controller.ts`'s
customer route: `VISIT_READ_ORG`, not a new dedicated permission code — a
reasonable follow-up, not added incidentally here. `admin/`'s new
`dashboard/support` (list + create) and `dashboard/support/[id]` (thread)
give the organisation side of the conversation; `ops-console`'s ticket
detail page renders the same thread with a "Buffr staff" / "Organisation
member" badge per comment. This is the actual "message the platform if you
need help" capability — built on an existing, already-designed table, not
a new conversation schema.

**Data-science posture, unchanged on purpose.** Both reference texts
consulted for this pass (Fawcett & Provost's *Data Science for Business*,
and a general ML implementation guide) argue for exactly what
`organisation-health.service.ts` already does: an interpretable weighted
scorecard now, a trained classifier (logistic regression / random forest,
evaluated on precision/recall, not accuracy — churn is a rare-event class)
only once real labeled churn history exists. Neither source moved that
decision. What this pass added instead is aggregation the existing data
already supports without training anything: the health-score-×-MRR
segmentation scatter, incident/ticket volume trends, and pipeline value by
stage — v1.5, not v2.

**Second pass, same build: the remaining drill-down and analytics gaps.**
The first cut of this pass left real gaps that George caught — a deal
detail page, device/site detail pages, and the cohort/retention chart were
all named in the plan and then skipped rather than flagged. Closed here:

- **Deal detail page** (`ops-console/crm/[dealId]/page.tsx`) — deal fields
  plus its stage-transition timeline (`crm_deal_status_events`, captured on
  every `transitionDealStage()` call, never queried back out before this —
  `crm.service.ts`'s new `getDealById()`/`dealStageHistory()`). Linked from
  both the kanban board and the organisation detail CRM tab's deal list
  (which also gained resolved stage labels instead of a raw
  `stageCode` UUID).
- **Device detail page** (`ops-console/devices/[id]/page.tsx`) and **site
  detail page** (`ops-console/sites/[id]/page.tsx`, listing that site's own
  devices) — the org-detail Devices/Sites tabs were flat lists with no
  further drill-down; `devices.service.ts`/`sites.service.ts` gained
  `getByIdForOrganisation()`/`statusHistoryForOrganisation()`/`listForSite()`
  (the existing `getById()`/`statusHistory()` are hard-scoped to the
  caller's own `organisationId`, which doesn't fit a platform_support
  caller — same reason `listForOrganisation()` needed adding earlier in
  this pass), exposed via new `@PlatformScoped()` routes on
  `platform-dashboard.controller.ts`.
- **Retention curve** (Analytics page) — `organisations` genuinely has no
  signup-date column (confirmed by reading the schema, not assumed), and
  adding one is a core-schema change this pass isn't the right place to
  make unilaterally (§2's "designed by a human or Fable" rule). Built the
  honest version instead: `platform-dashboard.service.ts`'s
  `retentionCurve()` uses each organisation's *first health snapshot* as
  the cohort start (not a real signup date), tracking the share still
  scoring ≥ 40 (the same not-high-risk cutoff used elsewhere) by week
  since then. The chart's caption says exactly what it measures and what
  it doesn't — no invented denominator, per this doc's own data-viz
  honesty rules.
- **`/check-out` sitemap gap**, found while checking whether anything
  needed a sitemap update for this pass: `/check-in` carries an explicit
  `robots: { index: false, follow: false }` (this doc's own rule, §11.9.8.1),
  but `/check-out` — the same class of kiosk/QR-driven operational page —
  had no metadata block at all and was silently indexable. Added the
  matching block. Neither page belongs in `sitemap.ts` (unchanged, still
  marketing-routes-only) — this was a missing per-page `noindex`, not a
  sitemap entry.

**Gap-closure phases 1–8 (migrations through `0029`, v0.26 pass):** Phase 1
closed CRM contact GET/PATCH + ops detail/edit, KYB/POP document download
proxies, invoice detail (ops + admin) with line items and reconciliation log,
ops audit filters + before/after drill-down, and admin Legal Holds UI.
`0029_gap_closure_phase2_8.sql` seeds `site_status`, platform notification
templates, audited health-score weights JSONB, `organisation_access_review_log`,
and dedicated permission codes (`organisation.kyb.submit`,
`support_ticket.customer.manage`, `access_review.manage`, `platform.staff.manage`,
`platform.configuration.manage`, `platform.device.manage`). Backend: CRM
`pipelineValueByStage()` and deal activity timeline; analytics trend routes
(visit volume, MRR, invoiced revenue, KYB throughput, notification delivery,
device compliance, ticket resolution, device backlog); bulk ticket/incident/
KYB/billing decisions; platform search; staff and configuration modules.
Ops Console: devices/sites lists with StatusSelect, Search, Staff,
Configuration, analytics charts, device backlog KPI. Admin: access-review
attestation, support-access grant history, devices backlog banner, organisation
settings widened (timezone + sector). Website: `/developers`, `/status`,
pricing CapabilityStatusBadge for NFC/e-ID/DigiNam, JSON-LD. Kiosk: maintenance
technician escape (five taps → authenticate → About/Debug device health without
setup reset). **Still deferred (gated):** `lead_source` / `signed_up_at` schema;
live USSD/DigiNam/badge hardware; induction schema; self-serve checkout;
public OpenAPI publish.

**Migration 0028** was applied to the real dev database (`buffr-checkpoint`,
via the Neon MCP tools) and confirmed idempotent on a second run, same bar
as `0022`–`0027`. `support_ticket_comments` had zero rows at the time, so
the backfill path never actually ran on real data — worth re-checking once
tickets with pre-migration comments exist anywhere it matters.

**Live browser bug-hunt (same pass, 2026-09-15) — real dead ends found and
fixed, not just described.** George asked for exactly this: sign into the
real deployed apps and click through the actual journeys rather than trust
a clean build. It found four bug classes this phase's own build/typecheck
passes never would have caught:

1. **Empty-body crash on every "no data yet" GET.** NestJS's Express
   adapter treats a controller returning `null` exactly like `undefined`
   (the `isNil` check in `reply()`) and sends a completely empty HTTP
   body — not JSON `null`. Every frontend caller does `.json()` on the
   response and expects `T | null`; on an empty body that throws
   `SyntaxError: Unexpected end of JSON input`. Hit live on the KYB tab
   and Billing tab for any organisation with no submission/subscription
   yet — confirmed via Vercel's runtime-error aggregation
   (`get_runtime_errors`), not a guess. `?? null` in the service layer
   does **not** fix this (`null` and `undefined` are both nil to Nest);
   the real fix is `@Res()` with manual `res.status(200).json(result)`,
   applied to `kyb.controller.ts`'s `getForOrganisation`,
   `billing.controller.ts`'s `getSubscription`, and
   `visitors.controller.ts`'s `findByPhone` (the kiosk-facing
   returning-visitor lookup — same bug, different surface, caught by
   the same systematic grep sweep across every `findFirst`-returning
   controller method in the codebase).
2. **Server→client function-prop crash, data-dependent so it stayed
   hidden.** `ShareBars`' `valueFormatter` and `ScoreScatter`'s
   `drillHrefFor` were typed as functions and called with an inline arrow
   from server-component pages (`crm/page.tsx`, `analytics/page.tsx`) —
   Next.js's App Router throws "Functions cannot be passed directly to
   Client Components" the moment that branch actually renders. Both
   charts only render when real data exists, so this passed every prior
   build/typecheck/empty-state check and only surfaced live, the moment
   the first real CRM deal was created during this testing pass. Fixed by
   replacing both function props with serializable data (`valuePrefix`/
   `valueSuffix` strings, `drillHrefBase` + `${base}/${id}` construction)
   — a systemic fix, not a one-off patch: grepped every `page.tsx` for the
   same `prop={(...) => ...}` shape afterward and confirmed none remain.
3. **Customer-facing KYB status page 403'd for every customer, always.**
   `admin/`'s `dashboard/kyb` page called
   `GET /platform/kyb/organisation`, gated on `platform.kyb.review` — a
   platform_support-only permission no customer role has. This was
   introduced in this same pass's first KYB build and would have blocked
   every customer from ever checking their own submission status; caught
   only because George insisted on a real customer login (registered a
   throwaway test account, verified its email and MFA directly via Neon/
   TOTP since no seeded customer demo account existed) instead of trusting
   the earlier curl-only backend checks. Fixed with a dedicated
   `GET /platform/kyb/organisation/mine` route — `organisationId` taken
   from the caller's own session, not a query param, so it needs no
   `@PlatformScoped()` bypass and can't be pointed at another org.
4. **Missing back-navigation** on the new device/site detail pages (every
   other new detail page — incident, ticket, deal — had a "← back" link;
   these two didn't). Fixed.
5. **`/check-out` had no `robots: noindex` metadata**, unlike its sibling
   `/check-in` which already documents this exact rule (§11.9.8.1) — found
   while checking whether anything needed a sitemap update for this pass.
   Neither page belongs in `sitemap.ts` (unchanged); this was a missing
   per-page meta tag, not a sitemap entry. Fixed and verified live
   (`curl` confirms `noindex, nofollow` in production).

All five fixes were deployed to production (Railway for the API, Vercel for
`admin`/`ops-console`/`website`) and re-verified live — via direct API
curl calls with real session tokens where UI state made browser
re-verification slow (the onboarding-completion gate blocks a fresh
customer account from reaching any `/dashboard/*` route in the browser
without 13 onboarding steps; the backend fix was confirmed instead by
replaying the exact request the frontend makes and getting back `200` +
the expected body, matching what the browser would do) and directly in
Chrome everywhere else (KYB tab, Billing tab, incident detail, ticket
detail + reply thread, CRM kanban + deal detail + pipeline chart).

**UX pass (same day) — Card-as-lazy-list-row was the systemic structural
problem, not a token or spacing tweak.** George's follow-up ("not good UX —
css layouts, components, tree max depth") named the real issue precisely.
Every flat list across `ops-console` (Organisations, Incidents, Tickets,
KYB queue, Billing POP queue, and every org-detail tab's Devices/Sites/CRM/
Billing/KYB history) wrapped each row in a full `Card`/`CardContent` —
independently rounded, ringed, and gapped from its neighbors. That's
exactly the anti-pattern the design skill's craft floor names outright:
"Cards are the lazy container; nested cards are always wrong" — and it's
also the direct cause of the excess DOM depth (`Card` > `CardContent` >
flex row > text, three wrapper divs per row, repeated N times) rather than
a token-level scan finding (the mechanical detector — `detect.mjs` —
correctly returns nothing here; a static regex scan can't prove hierarchy,
only a manual layout assessment can).

Fixed with two new shared primitives, ported identically into both
`ops-console` and `admin` (`src/components/ui/list.tsx`): `List` carries
the rounded/ringed chrome once; `ListRow` is a flat row with a hairline
top border between items (none on the first) — one extra div per row
instead of three, and one visually coherent panel instead of N stacked
boxes. Applied to every flat list named above.

The same pass also collapsed a second repeated anti-pattern: incident,
ticket, and CRM-deal status changes were each a row of 4-6 always-visible
outline buttons (one per possible status) — three separately-implemented,
near-identical components. Replaced all three with one shared
`StatusSelect` (`src/components/ui/status-select.tsx`) — a single "Change
status…" / "Move to…" select, same DRY consolidation the "components" half
of the complaint was pointing at. The one place a button *pair* stayed
correct on purpose: KYB's approve/reject decision — a consequential binary
choice that should stay two clearly differentiated visible actions, not
hide behind a dropdown; not every button row was the same mistake.

Ticket threads (`TicketComments` in `ops-console`, the equivalent block in
`admin`'s ticket detail) went from identical stacked cards regardless of
author to actual chat-style bubbles — staff messages align right in
`ops-console` (their own app, their own voice on the right, standard chat
convention), organisation messages align right in `admin` for the same
reason from the customer's side; each app's own messages are muted-tinted,
the other side sodium-yellow-tinted. This is scoped as a deliberate
exception, not a contradiction of the List/ListRow fix: a conversation
thread is not a list of equivalent rows the same way an organisations or
incidents list is, so keeping messages visually distinct by turn is the
right call, not the "same-size cards" default being warned against.

Deployed and re-verified live in Chrome post-deploy (Organisations,
Incidents, CRM kanban, ticket thread) — the panel-with-hairline-dividers
result reads as one object per screen, not a stack of boxes, and every
status-change interaction still fires the same server actions as before
(no behavior change, structure and density only).

**Discovery-interview capability audit (2026-09-16).** A mom-test-style
discovery-interview script for BuffrCheckpoint's actual buyer (front-desk
lead, site manager, compliance officer) was drafted the same session —
questions like "if you had to pull everyone who visited last Tuesday right
now, how long would that take you?", "when's the last time you had to look
back and figure out who was in the building on a specific day?", and "has
an auditor, client, or regulator ever asked you a question about your
visitor records that was hard to answer?" The whole premise of replacing a
paper register is that these questions become trivially answerable once a
site is live on the product. Reading the actual code against that premise
— not assuming it, per George's explicit "no assumptions" instruction —
found several places where it wasn't true yet, closed here in priority
order.

*Tier 1 — security-critical, directly interview-mapped.*

- **Kiosk "Staff" roster button had no authentication gate.** Confirmed by
  reading `kiosk/.../navigation/KioskNavGraph.kt`:
  `onStaffRoster = { navController.navigate(KioskDestinations.HOME) }` —
  a bare navigation call, no check of any kind, straight to `RosterScreen`
  (every currently-checked-in visitor's real name and host,
  `GET /visits/roster` under the device's own stored credentials, never a
  per-staff login). Any visitor standing at the kiosk — including "the next
  visitor" — could tap "Staff" and see exactly what a shared paper register
  exposes. Checking whether `authRepository.isLoggedIn()` (the pattern
  `MaintenanceScreen`'s technician-escape path already uses,
  §11.9.8.5) would have helped: no — kiosk devices stay logged in
  persistently for a whole shift via `CredentialStore`, so that check would
  almost never actually fire. Fixed by forcing a *fresh* `LoginScreen`
  credential challenge every time "Staff" is tapped, regardless of session
  state — a `staffRosterPending` flag mirroring the existing
  `technicianEscapePending` pattern in `KioskNavGraph.kt`, so `LoginScreen`'s
  `onLoggedIn` callback routes to `HOME` instead of `WELCOME`/`MAINTENANCE`
  afterward. Uses only existing infrastructure — no new schema, no new
  endpoint. Verified with a real `gradle assembleDebug`/`compileDebugKotlin`
  build (`BUILD SUCCESSFUL`), not just a code read.
- **"Pull everyone who visited last Tuesday" had no working answer.**
  `visits.service.ts`'s `listRoster` took only `siteId`/`open` — no
  date/date-range parameter existed at all — always `orderBy checkedInAt
  desc, limit 200`, so an older date could go silently missing once an org
  passed 200 more-recent visits, with no error to say so. The Visitors
  page's own "Check-in date" control (`table.tsx`) was separately, silently
  broken: it rendered the *action-filter* options ("All"/"Action
  required"/"No action") but wrote those values into the `checkedInWindow`
  column filter, whose `filterFn` expected `"1"`/`"7"` — the values never
  matched, so this control had never actually filtered anything, and there
  was no UI at all for the real "Action required" filter its labels implied.
  No CSV/export existed anywhere on the page either. Fixed by adding
  `VisitsService.searchRoster()` (backend/src/modules/visits/visits.service.ts)
  and `exportRosterCsv()`, exposed as `GET /visits/roster/search` and
  `GET /visits/roster/export` — reusing, field-for-field, the keyset-
  pagination shape `AuditService.listForOrganisation()` already proved for
  this identical problem (`gte`/`lte` on the timestamp, `orderBy [desc(ts),
  desc(id)]`, `${ts}_${id}` cursor) — and deliberately **not** changing the
  existing `/visits/roster` endpoint's shape or behavior, since four other
  callers (front-desk, emergency roster, dashboard home, the kiosk's own
  on-site roster) depend on its current flat-array response for a
  genuinely different question ("who's here right now," not "search
  history"). Fixed the Visitors page's date control (`table.tsx`,
  `columns.tsx`) to a real two-input date range wired to the new search
  endpoint, gave "Action required" its own correctly-wired dropdown, and
  added a "Download CSV" link. A Next.js Route Handler
  (`admin/src/app/api/visits/roster/export/route.ts`) relays the download
  with the session's Bearer token, since the browser only holds an httpOnly
  cookie and can't call the backend directly.
- **Audit log date-range UI was missing, not the backend.** Read
  `audit.service.ts`/`audit.controller.ts`: `from`/`to` were already fully
  implemented and working (`GET /audit/events?from=&to=`) — the admin page
  (`dashboard/audit/page.tsx`, `audit-log-table.tsx`) never exposed date
  inputs at all, only a cursor-driven "Load more." Added the date-range
  inputs, threaded through to `loadMoreAuditEvents` so pagination keeps the
  same range. No backend change needed — confirmed by reading the code
  before assuming a gap existed.
- **DSAR data export was over-disclosing.** Read `dsar.service.ts`'s
  `buildExportPackage(subjectReference, user)`: it queried
  `visitorSubjects`/`visitorVisits` filtered only by `organisationId` —
  `subjectReference`, the actual identifier the requester supplied, was
  never used to filter anything. Every DSAR visitor-data export returned
  **every visitor's** data for the organisation, not the one person's.
  Fixed by hashing `subjectReference` via the same
  `this.dataProtection.lookupHmac(value, "PHONE_HASH_PEPPER")` pattern
  already used for phone-based returning-visitor lookup
  (`visitors.service.ts`'s `findByPhone`, `visits.service.ts`'s
  `signOutByPhone`), matching against `visitorPersonalData.phoneLookupHmac`
  to resolve the one visitor, then scoping every query to that id. Left a
  code comment, not a schema change, flagging that `subjectReference` is
  genuinely overloaded today — an email for the staff account-deletion path
  a few lines above (`applicationUsers.email`), a phone number for this
  visitor-data path — since that's a real pre-existing product-data-model
  question this fix doesn't get to decide.
- **Evidence packs wrote to the same ephemeral local disk already fixed
  once this session** for KYB/billing/DSAR documents — `evidence.service.ts`
  used raw `mkdir`/`writeFile` against `generated-evidence-packs/` on
  Railway's per-deploy-ephemeral filesystem, with the code's own comment
  already flagging this as an interim state. Confirmed via `run_sql`
  against the live Neon database that the one existing `evidence_pack` row
  in production points at a local dev filesystem path — already
  unrecoverable before this fix, so nothing regressed by fixing it now.
  Moved to the existing `createArtifactStore()` abstraction
  (`backend/src/common/artifacts/artifact-store.ts`), the same one already
  in production use for the other three modules — no new abstraction, a
  fourth wiring of the one that exists. Separately, `generate()` took no
  date range and bundled only the RBAC matrix, retention-policy report, and
  the most recent 500 admin-action `auditEvents` rows — nothing about who
  physically visited the premises, which is what "produce evidence of
  access for this period" actually asks for. Added an optional `from`/`to`
  that includes a `visitorAccessExtract` built via the same
  `VisitsService.searchRoster()` added above (`EvidenceModule` now imports
  `VisitsModule`). Also added the download route that never existed —
  `GET /evidence/:id/download` — and fixed the admin Evidence Packs page,
  which was printing the raw internal storage reference as visible text
  (the same class of leak already fixed for KYB documents earlier this
  session) with no way to actually retrieve the file; it now shows a scope
  column and a real "Download" link, proxied the same way the visit-roster
  CSV export is (`admin/src/app/api/evidence/[id]/download/route.ts`).

*Flagged, not built — each needs a decision this pass correctly doesn't make
unilaterally:*

- **"Unplanned visitor, no host known" (the "someone showed up reception
  wasn't expecting" interview question).** `visitorVisits.hostId` is a
  `NOT NULL` foreign key and `CheckInDto.hostId` is required — there is no
  way today to represent a check-in with no known host. Making this
  representable needs a nullable `hostId` or a sentinel "unassigned" host
  row plus a front-desk triage queue — a core-schema decision, correctly
  out of scope for this pass per this document's own standing rule that
  core schema is designed by a human or Fable, never the executing model.
- **Retention enforcement.** Already documented elsewhere in this section's
  own gap list as configuration-only with no purge/archival job — restated
  here only because it's the same class of gap this audit was looking for,
  not because it's new information.
- **Per-staff attribution on the kiosk roster view.** The fix above closes
  "anyone can see it" using the device's own existing credentials; knowing
  *which* staff member looked would need a per-staff PIN or login system on
  the kiosk — a new credential model, not a wiring fix.

Verified: `backend`'s full build (`npm run build`) clean after each change;
`admin`'s `npx tsc --noEmit` and `npm run build` clean; the kiosk change
compiled with a real `gradle assembleDebug`
(`BUILD SUCCESSFUL`). Backend redeployed to Railway, `admin` redeployed to
Vercel, both confirmed live — `curl` against the three new/changed
endpoints (`/visits/roster/search`, `/visits/roster/export`,
`/evidence/:id/download`) each returned `401 Unauthorized` unauthenticated,
confirming the permission gates carried over correctly. The Vercel Blob
round-trip for evidence packs was verified directly against the production
token (write → read → correct bytes back) the same way the earlier
KYB-document storage fix was verified. The kiosk build was **not**
deployed to any device — an Android release build and device distribution
is a separate process this pass has no tooling for; the fix is compiled
and correct, not yet in front of a real kiosk.

### 11.9.2 Site branding and customisation model

#### Branding hierarchy

```text
Platform default brand
        ↓
Organisation brand
        ↓
Region brand override, if needed
        ↓
Site brand override, if needed
        ↓
Visitor-category experience override
```

Example:

```text
Organisation: Ministry / Bank / Clinic Group
      ↓
Site: Windhoek Head Office
      ↓
Visitor type: Contractor
      ↓
Different arrival form, safety notice, badge design,
host-approval requirement, language, and check-in channels
```

#### Organisation branding capabilities

| Configuration | Purpose | Kiosk placement |
|---|---|---|
| Organisation logo | Helps visitors recognise the correct service point | Top-centre of welcome screen |
| Organisation name | Clarifies who is collecting the information | Under logo |
| Welcome message | Sets tone and directs visitor | Hero heading |
| Brand colour accent | Makes the experience feel familiar | Buttons, progress bar, icon accent only |
| Background image or illustration | Adds context without reducing clarity | Optional, subtle, never behind form text |
| Site name | Confirms physical location | Welcome screen and confirmation |
| Site address | Prevents check-in at wrong location | Small location line |
| Host department labels | Makes routing easier | Host/department selector |
| Local language set | Supports inclusion | Language selector on first screen |
| Privacy notice | Explains data collection honestly | Immediately before personal-data capture |
| Visitor agreement | Captures policy acknowledgement | Before access decision where required |
| Contact/help information | Supports visitors needing assistance | Persistent lower-screen help action |
| Emergency instruction | Supports safety | Only where site emergency policy requires it |
| Badge template | Identifies visitor safely | Print output and digital confirmation |
| QR invitation design | Supports pre-registered visitor arrival | Email/SMS invite and visitor mobile web page |

#### Branding guardrails

| Customer can customise | Customer cannot customise |
|---|---|
| Logo, approved colours, welcome message, supported languages | Minimum touch-target size (§11.7.4, NFR-I02) |
| Background image, subject to readability checks | Privacy notice placement before personal-data capture |
| Visitor-category labels | Encryption and session-clear behaviour |
| Host departments | Audit-event creation |
| Badge layout | Requirement to show required policy/notice |
| Invitation wording | RBAC enforcement (Section 9.2) |
| Help contacts | Data retention controls without appropriate approval |
| Non-sensitive explanatory text | Whether another visitor can see records |

### 11.9.3 Branded visitor arrival flows

Cross-reference: Section 8 for canonical journey detail; Section 10.1 for
kiosk home wireframe; Section 11.7.6 for what the Android app implements
today.

#### Walk-in visitor using kiosk

```text
Visitor arrives at branded reception kiosk
        ↓
Screen confirms:
[Organisation logo]
Welcome to [Organisation / Site]
        ↓
Visitor selects language
        ↓
Visitor selects:
- I have an appointment
- I am visiting someone
- I am a contractor
- I am making a delivery
- I need help
        ↓
Kiosk presents only channels enabled for that site/category
        ↓
Visitor completes appropriate flow
        ↓
Host notified / approval decision applied
        ↓
Visitor receives confirmation or badge
```

#### Pre-registered visitor journey

```text
Host creates invitation in Admin Platform
        ↓
System sends branded invitation by email/SMS/WhatsApp where enabled
        ↓
Invitation contains:
- Organisation logo
- Site name
- Date/time
- Host name where appropriate
- One-time QR or visit reference
- Privacy notice link
- Arrival instructions
        ↓
Visitor arrives → scans QR on branded kiosk
        ↓
Kiosk matches one invitation only
        ↓
Visitor confirms required information → host notified → badge if required
```

**Privacy rule:** the QR code must contain a **short-lived, opaque invitation
token**, not visitor name, phone number, national ID, host-sensitive
information, or site access rights (NFR-P04; Section 12.3).

#### NFC repeat visitor or contractor journey

See Section 8.3 and Section 12. NFC is a convenience and throughput channel
— not the only pathway (Section 4, Executive Thesis).

#### Feature-phone visitor journey

See Section 6 and Section 8.5. The kiosk remains useful to feature-phone
users: it displays **site-specific instructions, rotating code, visual cues,
language guidance, privacy information, and an assistance option** — not an
apologetic fallback (NFR-I07).

#### Assisted-entry journey

See Section 8.1 and `AssistedCheckInScreen` (§11.7.6). The operator must not
leave the back-office roster or another visitor's record visible on a public
kiosk screen.

### 11.9.4 Site configuration — what goes where

#### A. Organisation profile

| Component | Purpose |
|---|---|
| Legal/trading name | Identifies customer tenant |
| Organisation logo | Kiosk, invitations, badges, reports |
| Sector | Applies starting templates, not hard-coded restrictions |
| Default language | Default visitor experience |
| Default time zone | Site/event presentation |
| Support contacts | Visitor assistance and escalation |
| Data residency configuration | Operational/legal record |
| Controller/processor settings | Privacy and contractual clarity |

#### B. Site profile

| Component | Purpose |
|---|---|
| Site name and address | Correct arrival context |
| Site code | Used in USSD/SMS/QR routing (Section 6.2) |
| Time zone | Correct schedules and evidence timestamps |
| Local logo override | Branch-specific branding if required |
| Visitor hours | Limits arrival periods |
| Risk tier | Drives verification and approval rules (Section 7) |
| Connectivity profile | Determines offline/feature-phone emphasis |
| Emergency contacts | Emergency roster and escalation (Section 8.6) |
| Device assignment | Binds kiosk/reader/printer to site |
| Host directory | Routes visitor to correct staff member |

#### C. Kiosk appearance

| Component | Purpose |
|---|---|
| Logo, welcome headline, colour accent | Trust and recognition |
| Background visual | Optional; never at cost of legibility |
| Language selector | Inclusive self-service |
| Available channels | NFC, QR, manual, feature phone, assisted — gated by capability register (Section 4a.7) |
| Help button | Accessibility and staff escalation |
| Idle-screen timeout | Clears state and protects privacy (§11.9.8.3) |
| Accessibility settings | Text size, contrast, audio/visual support |
| Privacy message | Explains record isolation before data capture |

#### D. Visitor categories and workflows

| Visitor category | Form | Verification | Access workflow | Badge | Retention |
|---|---|---|---|---|---|
| General visitor | Name, host, purpose category | V0/V1 (Section 5.2) | Host notified | Optional | Standard |
| Appointment visitor | Invitation reference | QR/OTP | Fast-track | Optional | Standard |
| Contractor | Sponsor, employer, induction | V2/NFC | Approval + validation | Usually required | Contract policy |
| Delivery | Company, recipient, vehicle | V0 | Recipient notified | Usually not required | Short |
| Interview candidate | Name, invitation reference | QR/OTP | Confidential host flow | Optional | Restricted |
| VIP/government official | Minimal details | Pre-registration/V3 where enabled | Restricted view/approval | Optional | Special policy |
| Restricted-zone visitor | Sponsor, zone, induction | V3/V4 where enabled | Security approval + escort | Required | Security policy |

#### E. Policy configuration

Maps to `visitor_policy_*`, `retention_policy`, `legal_holds`, and related
tables in Section 11.4.5 — admin CRUD exists for several; kiosk rendering of
versioned notices is a gap (§11.9.0).

### 11.9.5 Full user journey map

#### Visitor-facing journeys

| Journey | Starts with | Ends with | Canonical detail |
|---|---|---|---|
| Walk-in self-service | Kiosk home | Check-in confirmation | Section 8.1 |
| Pre-registered arrival | QR/reference | Confirmed visit | Section 8.2 |
| NFC contractor arrival | Badge tap | Access outcome | Section 8.3 |
| Feature-phone check-in | USSD/SMS instructions | Confirmed reference | Section 6, 8.5 |
| Assisted check-in | Help request | Secure check-in | Section 8.1, §11.7.6 |
| DigiNam verification | Optional identity choice | V3 outcome where formally enabled | Section 8.4, 4a.7 |
| National e-ID NFC | Official credential tap | V4 outcome where enabled | Section 4a, 4a.7 |
| Visitor sign-out | QR/NFC/reference/assistance | Closed visit | Section 8.7 |
| Visitor correction request | Visit reference | Privacy request recorded | Section 8.9 |
| Emergency response | Emergency alert | Roll-call outcome | Section 8.6 |

#### Host, reception, site-manager, compliance, and platform-support journeys

The host, reception/operator, site-manager, compliance/audit, and
platform-support journey tables from the v0.11 product brief are **binding
product intent** and map to existing admin routes where built (Front Desk,
Visitors, Schedule, Emergency, Compliance, Audit, Evidence, DSAR, Legal
Holds, RBAC) — see Section 9 for role permissions and Section 11.4.3 for
admin nav. Platform-support journeys remain **internal** and must not appear
in the customer admin sidebar.

### 11.9.6 Functional requirements catalogue

#### Visitor kiosk (FR-K*)

| ID | Requirement | Status |
|---|---|---|
| FR-K01 | Show organisation/site logo, name, welcome text, language selector and help action. | FULL — experience sync + branding |
| FR-K02 | Present only channels enabled for the selected site and visitor category. | FULL — capability + channel gating |
| FR-K03 | Support manual, assisted, QR, NFC, feature-phone instruction, and sign-out. | FULL — public `/check-out` + kiosk sign-out-by-phone; staff roster checkout |
| FR-K04 | Support NFC badge/token check-in for live approved credential types. | FULL — v0.20 Phase 5 |
| FR-K05 | Hide National e-ID NFC unless platform capability is live **and** site enabled it. | FULL — dual-gate (org enable + platform `live`); tile absent until live (not a disabled control) |
| FR-K06 | Never show a public directory of existing visitors. | ✓ By design — roster is staff-only |
| FR-K07 | Render privacy notice before collecting personal information. | FULL — `PrivacyNoticeScreen`; QR/NFC also gated (v0.22) |
| FR-K08 | Enforce required acknowledgement before workflow proceeds. | FULL — pre-check-in ack API + kiosk; `capture_channel_code` recorded |
| FR-K09 | Collect only fields permitted by active site/visitor-category form version. | FULL — v0.28: effective resolve + `VisitorDataMinimisationService` on check-in; form-driven kiosk/website |
| FR-K10 | Clear visitor session data after completion, cancellation, or timeout. | FULL — idle timeout + abandon clears drafts, experience session, and pending outbox rows |
| FR-K11 | Display honest status: "notification pending" when offline, not "host notified." | FULL — offline copy |
| FR-K12 | Support temporary badge printing where configured. | PARTIAL — soft confirmation pass FULL (no dead Print Badge control); hardware printer SDK NOT STARTED |
| FR-K13 | Display privacy-safe confirmation reference for check-in and sign-out. | FULL |
| FR-K14 | Remain usable during connectivity failure through encrypted local capture. | FULL — v0.20 Phase 4 |
| FR-K15 | Provide a staff-assisted route at all times. | ✓ `AssistedCheckInScreen` |

#### Admin platform (FR-A*)

| ID | Requirement | Status |
|---|---|---|
| FR-A01 | Create organisations, regions, sites and security zones. | FULL — org/site/region/zone CRUD (v0.20) |
| FR-A02 | Configure organisation/site branding within accessibility guardrails. | FULL — Site Experience branding + kiosk experience |
| FR-A03–FR-A15 | Hosts, forms, channels, risk/identity, notices, retention, devices, credentials, roster/compliance views, evidence, RBAC, account security. | FULL — includes forgot/reset + login lockout (3 fails / 5 min → 5 min cooldown); see §11.9.0a |

#### Integration requirements

| Integration | Purpose | Status rule |
|---|---|---|
| Email | Host notification and password reset | Required baseline |
| SMS | OTP, neutral confirmation, feature-phone fallback | Provider-dependent |
| USSD | Feature-phone check-in/check-out | Formal operator arrangement required |
| NFC | Repeat visitor/contractor credentials | Current physical fast lane |
| QR | Pre-registration and appointment arrival | Standard — partial in kiosk |
| DigiNam/NPKI | Higher-assurance identity verification | Only where formally enabled (4a.7) |
| National e-ID NFC | Official document validation | Only after approved protocol |
| MDM | Kiosk device control, wipe, health | Required before scaled deployment |
| Badge printer | Temporary printed badge | Optional site hardware |
| Physical access control | Doors, zones, turnstiles | Later-stage/customer-specific |
| HR/host directory | Synchronised host list | Enterprise integration |
| Emergency system | Visitor safety/roll-call coordination | Optional enterprise integration |

### 11.9.7 Non-functional requirements catalogue

#### Privacy and data protection (NFR-P*)

| ID | Requirement | Alignment |
|---|---|---|
| NFR-P01 | No shared visitor-record directory on any public or visitor-facing screen. | §3, §11.3, kiosk design — non-negotiable |
| NFR-P02 | Collect only fields permitted by the active form version and site policy. | FULL — v0.28 `VisitorDataMinimisationService` on check-in; FR-K09 |
| NFR-P03 | Encrypt personal data at rest (server envelopes; kiosk SQLCipher). | §11.3, §11.7 Phase 4 |
| NFR-P04 | Lookup hashes for phone/name must use keyed HMAC, never reversible plaintext indexes. | Data-protection service |
| NFR-P05 | Retention timers and soft-delete must follow the policy version in force at check-in. | §8.9 |
| NFR-P06 | Analytics and crash reporting must scrub PII before leave-device. | §11.8.5 |
| NFR-P07 | DSAR export must be packaged, auditable, and tenancy-scoped. | §11.9.0a DSAR row |
| NFR-P08 | Privacy notice must be shown and acknowledged before personal data capture on self-service paths. | FR-K07/K08; v0.22 QR/NFC gate |

#### Security (NFR-S*)

| ID | Requirement | Alignment |
|---|---|---|
| NFR-S01 | Authenticate every non-public API; JWT with verified email / MFA where required. | §9.2, auth module |
| NFR-S02 | Authorise every resource by organisation (and site where applicable). | RBAC + ownership checks |
| NFR-S03 | Parameterized SQL only; no string-built queries. | Engineering Constitution |
| NFR-S04 | Devices must pass CRAN deployability gate before check-in activation. | §14.3a |
| NFR-S05 | NFC validation must not trust raw UID alone. | §12.3; Phase 5 |
| NFR-S06 | Secrets and peppers never committed; Keystore / env only. | §11.7.5 |
| NFR-S07 | Audit log append-only for security-relevant actions. | §13.1 |
| NFR-S08 | Capability public status `live` requires evidence reference (platform_support). | §4a.7 |
| NFR-S09 | Relying-party verify stores outcome/reference only — never full credential payloads. | §8.4 |
| NFR-S10 | Meet PSD-12-inspired resilience targets where contractually in scope. | §13.2 |

#### Resilience (NFR-R*)

| ID | Requirement | Alignment |
|---|---|---|
| NFR-R01 | Offline encrypted capture with idempotent sync. | §8.5; Phase 4 |
| NFR-R02 | Honest offline UX (notification pending, not host notified). | FR-K11 |
| NFR-R03 | Spare-device / MDM wipe path documented. | §14; continuity kit |
| NFR-R04 | Target ≥99.9% availability for in-scope critical paths (contractual). | §13.2 |
| NFR-R05 | RTO ≤ 2 hours for critical visitor services (contractual). | §13.2 |
| NFR-R06 | RPO ≤ 5 minutes for critical transactional data (contractual). | §13.2 |
| NFR-R07 | At least two successful recovery tests per year for in-scope deployments. | §13.2; §20.5 |
| NFR-R08 | Secure non-paper continuity kit — never an open shared paper register. | §11.9.8.6 |

#### Accessibility and inclusion (NFR-I*)

| ID | Requirement | Alignment |
|---|---|---|
| NFR-I01 | Feature-phone path (USSD/SMS/assisted) must remain available when capability policy allows. | §4.2, §6 |
| NFR-I02 | Public kiosk touch targets ≥ 48dp. | §11.7.4 |
| NFR-I03 | Large-text accessibility toggle from kiosk experience config. | Experience sync |
| NFR-I04 | Language selector where site configures multiple languages. | FR-K01 |
| NFR-I05 | Colour contrast meets WCAG AA for primary text on brand backgrounds. | Design system |
| NFR-I06 | Assisted entry always reachable from welcome. | FR-K15 |
| NFR-I07 | Maintenance mode shows clear assisted-entry direction. | Experience version |
| NFR-I08 | Do not require smartphone, NFC, or DigiNam for ordinary Tier 1–2 visits. | §4.2, §7 |

### 11.9.8 Missing product capabilities — explicit gaps to close

The blueprint is strong; these areas must be made explicit in schema,
admin UI, and kiosk behaviour.

#### 11.9.8.1 Site-specific QR ownership

**Schema landed (v0.11):** `site_qr_references` (spine per site + `site_qr_type`
domain) and append-only `site_qr_reference_rotations` (`opaque_token_hmac`,
`active_from`/`active_until` — never UPDATE token rows). Drizzle:
`backend/src/db/schema/site-qr-references.ts`. Seed domain values in
`0008_site_visitor_experience_domains.sql`. Authenticated admin issue /
list / rotate: `SiteQrReferencesController`. Kiosk welcome auto-provisions
an active `public_site_checkin` reference via
`resolvePublicCheckInForSite` when none exists.

**Public destination landed (v0.18):** scanning the public site check-in QR
opens `https://buffrcheckpoint.com/check-in?site=…&ref=…` (marketing
hostname). The page loads `GET /public/check-in/context` and submits
`POST /public/check-in`. **Printable QR kit:** admin Site QR page renders
PNG via `PrintableQrPanel` (copy URL / download / print). **Issuable types
gated:** admin UI + API allow only `public_site_checkin` until other
journeys ship (pre-registration / sign-out / contractor / emergency /
device-support remain schema-only).

**Core packaging (docs):** **Site Experience → Site QR Codes** is the Core
CAPEX-reduction path — generate, rotate, and print a public site QR; visitors
check in on their phone. Assisted front-desk check-in is the inclusion path
for feature phones / no phones. A dedicated tablet/kiosk is optional hardware
(§15.3), not a Core prerequisite.

Every site should have narrowly scoped QR types:

| QR type | Owner | Purpose | Security control | Status |
|---|---|---|---|---|
| Public site check-in QR | Site | Opens mobile arrival form on visitor's phone | Site-bound `ref` + active rotation; no visitor identity in the QR | **Live (v0.18)** — website `/check-in` + public API |
| Pre-registration QR | Invitation | Matches one scheduled visit | One-time, short-lived opaque token | Not built |
| Sign-out QR | Active visit | Closes one visit | Personal reference; never a shared generic QR | Not built |
| Emergency information QR | Site | Non-sensitive instructions | No visitor data | Not built |
| Contractor induction QR | Contractor workflow | Opens approved induction | Expiry, scope, acknowledgement required | Not built |
| Device support QR | Kiosk/device | Lets authorised technician identify device | Restricted/MDM-managed support flow | Not built |

A static public QR photographed and reused may **begin** a controlled journey
only — it must not prove identity, grant access, or reveal visitor data.

#### 11.9.8.2 Branding-version control

Branding is a controlled configuration asset. **Schema landed in migration
`0010_site_visitor_experience_schema.sql` (v0.11)** — Drizzle mirrors in
`backend/src/db/schema/site-branding.ts` and
`backend/src/db/schema/kiosk-experience.ts`. Admin API and kiosk sync are
**FULL (v0.20)** — see §11.9.0a matrix.

| Table | Role |
|---|---|
| `site_branding_profiles` | Spine — org default (`site_id` NULL), optional `region_id`, or site override |
| `site_branding_profile_versions` | Immutable published branding rows (logo artifact, colour token, welcome message, display names, help contact, `privacy_notice_version_id` → `visitor_policy_versions`) |
| `site_branding_profile_version_languages` | Junction — `language` domain codes enabled for this version |
| `site_branding_profile_version_channels` | Junction — `capture_channel` domain codes shown on kiosk for this version |
| `kiosk_experience_configurations` | Per-site (optional per-`device_id`) kiosk UX spine |
| `kiosk_experience_configuration_versions` | Immutable UX rows: idle timeout/warning seconds, maintenance mode + message, assisted-entry direction, accessibility large-text flag, optional `branding_profile_version_id` link |
| `kiosk_experience_configuration_version_channels` | Junction — channel enablement at experience level (may narrow branding version's channel set) |

**Audit snapshot on check-in:** `visitor_visits.branding_profile_version_id`
and `visitor_visits.kiosk_experience_configuration_version_id` (nullable FKs
added in `0010`) record which published versions were active when the visit
row was created — so an auditor can answer: *"What notice, branding, help
contact, and workflow did the visitor actually see on the day they checked
in?"*

Version lifecycle codes use the seeded `configuration_version_status` domain
(`draft` / `published` / `retired`) — see
`backend/db/seed/0008_site_visitor_experience_domains.sql`.

#### 11.9.8.3 Kiosk session and privacy timeout

**Schema field (v0.11):** `kiosk_experience_configuration_versions.idle_timeout_seconds`
(default `120`) and `idle_warning_seconds` (default `30`) — kiosk app
enforcement via `KioskIdleHandler` / `VisitorSessionTimeoutController`
(v0.21); full draft clearance via `ProtectedDraftClearanceService`.

```text
Kiosk visitor session begins
        ↓
No activity for configured interval
        ↓
Warn visitor visually
        ↓
Cancel session → clear all visible input → delete unsubmitted local draft
        ↓
Return to branded welcome screen
```

Prevents the next visitor from seeing partially entered personal information
(FR-K10, NFR-P01).

#### 11.9.8.4 Host-notification escalation

**Schema + worker (FULL):** `host_notification_escalation_policies` (scoped
org → site → visitor category) +
`host_notification_escalation_policy_versions` (`wait_seconds`,
`escalation_action_code` from seeded `host_notification_escalation_action`
domain). Drizzle: `host-notification-escalation.ts`. Evaluation worker:
`HostNotificationEscalationEvaluationService` — `OnModuleInit` interval
(`ESCALATION_EVAL_INTERVAL_MS`, default 60s), scans open checked-in visits,
skips if an event already exists, resolves effective policy, and on due
deadline inserts `host_notification_escalation_events` then applies the
action (`notify_*` → notification outbox, `hold_entry` →
`pending_approval`, `auto_admit_low_risk` → `admitted`). Admin CRUD + publish
under Site Experience.

```text
Arrival recorded → host notified → no response within configured time
        ↓
Follow site policy:
- auto-admit for low-risk visitor
- notify reception / alternate host / site manager
- hold entry for sensitive/restricted visitor
```

Host-notification failure affects physical safety and access control — not
merely a technical event (extends Section 8.8).

#### 11.9.8.5 Kiosk maintenance mode

**Schema + kiosk UI (FULL for visitor surface):**
`kiosk_experience_configuration_versions.maintenance_mode_enabled`,
`maintenance_message`, `assisted_entry_direction`. After login, nav start
destination is `MaintenanceScreen` when the effective/cached experience has
`maintenanceModeEnabled` (also re-checked after experience sync). Screen
shows branded unavailable copy, optional maintenance message, and assisted-
entry direction — no stacks, serials, or raw backend URLs.

```text
Kiosk unavailable for visitor use
        ↓
Branded maintenance message + assisted-entry direction
        ↓
Operator authenticates to technician/admin mode
        ↓
Device health, connectivity and compliance status reviewed
```

**Technician escape (v0.26):** five taps on the maintenance headline opens
staff login — no stacks, serials, or URLs on the visitor screen. A dedicated
device-health panel on maintenance remains deferred (operators use roster
login and About/debug after auth).

#### 11.9.8.6 Secure non-paper continuity kit

Offline-first software reduces paper dependency, but physical disruptions
still happen. Each critical site should have a controlled contingency kit:
privacy screen; spare MDM-enrolled tablet; charged power bank/UPS where
justified; sealed single-use contingency cards; numbered tamper-evident
envelopes; emergency printed procedure; controlled later-digitisation process;
named contingency owner; reconciliation/audit workflow. The contingency
mechanism must not be an open shared notebook.

### 11.9.9 Updated navigation model

#### Kiosk navigation (target)

```text
Welcome
 ├── Tap NFC badge
 ├── Scan invitation
 ├── Check in on this screen
 ├── I have a feature phone
 ├── I need help
 ├── Language
 ├── Privacy
 └── Accessibility
```

Within a journey: visitor category → privacy notice → identity/arrival channel
→ required fields → policy acknowledgement → host/access decision →
confirmation / badge → **automatic clear and return home**.

Today’s built nav (reconciled v0.24.1): setup → login → **welcome** (or
**maintenance** when enabled) → privacy notice → manual / assisted / QR /
NFC (when live) / USSD instructions (when live) → check-in success →
auto-return welcome; footer: Privacy, Language picker, Accessibility panel,
Staff roster; branding via `RemoteLogoImage` when a logo URL is published.

Channel tiles are **capability-gated**, not always-on: NFC requires site
channel `nfc_badge` **and** effective `nfcBadgeCheckIn === live`; USSD
requires channel `ussd` **and** effective `ussd === live`
(`WelcomeViewModel` + `CapabilityRepository` ←
`GET /capability-enablement/effective`, which intersects platform
`public_display_status` with org enablement — platform must already be
`live`; org enable alone cannot surface a `targeted` / `not_available`
capability). National e-ID / DigiNam have **no welcome tiles** (absent, not
disabled) until those platform statuses are `live`.

**Still open (honest backlog, not silent missing tiles):** live USSD
aggregator / menu flow; printable admin QR image for every issued type;
hardware badge print.

#### Admin navigation (target)

```text
Dashboard
├── Operations (Front Desk, Visitors, Schedule, Calendar, Emergency Roster)
├── Site Experience (Sites & Zones, Kiosk Experience, Organisation Branding,
│   Hosts & Departments, Visitor Categories, Check-In Forms, Notices &
│   Agreements, Check-In Channels)
├── Devices & Credentials (Kiosk Devices, Device Compliance Register, NFC
│   Credentials, Badge Printing, Device Health)
├── Governance & Assurance (Compliance, Retention, Privacy Requests, Legal
│   Holds, Audit Log, Evidence Packs)
└── Access Administration (Users, Roles & Access, Organisation Settings,
    My Account)
```

**Platform capability status does not belong here** — it belongs in the
internal Buffr Checkpoint Operations Console. A client must not be able to
claim DigiNam, USSD, e-ID NFC, or other **global** capabilities are live for
every tenant (Section 4a.7). The live customer sidebar (`sidebar-items.ts`)
already omits platform-support functions; **v0.12 implements the Site
Experience grouping** (Sites & Zones, Organisation Branding, Kiosk
Experience, Site QR Codes, Host Escalation, Visitor Types & Forms) — a UX
grouping only; permissions remain `site.configure` on mutating routes.

#### 11.9.9.1 Backend API routes (v0.14 + v0.18 public check-in)

| Module | Base path | Kiosk-relevant |
|---|---|---|
| Site branding | `POST/GET /site-branding`, `POST …/versions`, `POST …/publish` | `GET /site-branding/site/:siteId/published` |
| Kiosk experience | `POST/GET /kiosk-experience`, version + publish | **`GET /kiosk-experience/effective?siteId=`** (includes `publicCheckInQr.payload`) |
| Site QR | `POST/GET /site-qr-references`, `POST …/rotate` | Auto-provision via kiosk experience effective |
| Host escalation | `POST/GET /host-notification-escalation`, version + publish | Background worker (60s poll) + `host_notification_escalation_events` |
| Visitor policy | `POST /visitor-policy/acknowledgements`, **`POST …/pre-checkin`**, `GET …/versions/:id/content` | Pre-check-in ack before PII; post-check-in ack with `visitId` |
| Visits (authenticated) | `POST /visits/check-in`, `POST …/check-out`, **`POST …/approve`**, **`POST …/reject`** | Kiosk / front-desk; host approval (`visit.access.approve`) |
| Visits (public, v0.18) | **`GET /public/check-in/context`**, **`POST /public/check-in`** | Phone after scanning kiosk QR — `@Public()`, throttled |

**Public mobile check-in contract (v0.18):**

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| `GET` | `/public/check-in/context?site=&ref=` | None | Validates active `public_site_checkin` rotation; returns `{ siteId, siteName, referenceId, label, hosts[{id,displayName,department}], purposeCategories[{code,label}] }` |
| `POST` | `/public/check-in` | None | Body: `{ id, siteId, referenceId, hostId, visitorName, visitorPhone?, purposeCategoryCode?, visitorTypeCode? }`. Creates visit with `capture_channel=qr`; notifies host when contact is present. Idempotent on client-generated `id`. |

Visit check-in (`POST /visits/check-in`) auto-populates experience snapshot FKs
when a published kiosk experience exists for the site. Public check-in
skips experience snapshot FKs (null) because there is no authenticated
kiosk session. Demo site `74c72c99-93dc-4b33-934b-9b365e9924cf` is
pre-seeded via `0009_demo_site_visitor_experience.sql` (QR ref
`b3333333-3333-4333-8333-333333333301`).

### 11.9.11 Local compliance and engineering reference files

These workspace-local PDFs inform privacy-notice copy, record-keeping posture,
and kiosk engineering — they do **not** replace the legal analysis in Sections
13–15 or Appendix A.

| File | Use in Buffr Checkpoint |
|---|---|
| `bon-application-tool/docs/Regulation & Compliance Resources 2/Electronic Transactions Act 4 of 2019.pdf` | LAC annotated statute (updated 2026 — includes GN 182/2026 commencement note) |
| `.../Electronic Signature Regulations GN 335-2025.pdf` | Recognised electronic signature requirements (reg 8); relying-party duties (reg 12) |
| `.../Accreditation Regulations GN 953-2025.pdf` | CRAN accreditation of CSPs, subscriber certificates, identification procedures |
| `.../eta-2026/GN 182-2026 ETA s20 Ch5 Commencement (GG 8949).pdf` | Commencement notice — s20 + Ch5, 15 June 2026 |
| `.../eta-2026/GN 401-2026 Accreditation Regulations Commencement (GG 8948).pdf` | CRAN notice — accreditation regulations operational with s20/Ch5 |
| `reglens/reglens/data/Communications Act 8 of 2009.pdf` | SMS/USSD/device regulatory context (§13 CRAN) |
| `bon-application-tool/docs/Regulation & Compliance Resources 2/NamCode-Inside.pdf` | Governance, risk, IT governance, compliance officer journeys (§11.9.5) |
| `bon-application-tool/docs/Regulation & Compliance Resources 2/KingV_code.pdf` | Board/assurance language for enterprise sales (§15, Appendix A) |
| `buffrcheckpoint/.claude/kotlin-reference.pdf` | Kotlin language reference for `kiosk/` |
| `buffrcheckpoint/.claude/dokumen.pub_kotlin-for-android-developers-learn-kotlin-the-easy-way-while-developing-an-android-app.pdf` | Android/Kotlin patterns for Compose kiosk screens |

Kiosk privacy notice screen (v0.12) cites ETA/Communications Act at a high level
in user-facing copy; full legal text remains in admin-configured policy
versions (`visitor_policy_versions` via branding profile link).

### 11.9.12 Recommended configuration sequence for a new customer

```text
1. Create organisation
2. Add logo, brand accent, contact and language preferences
3. Create region/site/zone hierarchy
4. Add hosts and departments
5. Select visitor categories
6. Select allowed channels by site: kiosk / assisted / QR / NFC / feature phone
7. Configure risk-based identity and approval rules
8. Configure privacy notice, agreements and retention
9. Register kiosk, reader, printer and MDM details
10. Verify CRAN device-compliance evidence where applicable
11. Test online, offline, accessibility and emergency flows
12. Train reception, hosts, site manager and compliance owner
13. Approve go-live
```

Mirrors **Assess → Design → Implement → Assure** (*Technology Risk Advisory
Services*) — a policy or technical control only matters if it works in daily
operations ("Have we mistaken policy approval for policy implementation?").

Maps to `POST /onboarding/organisation-admin` and subsequent admin/API steps
(Section 11.4, §11.7.7 demo record).

### 11.9.13 Final product statement

The kiosk is the organisation's **digital reception desk**.

It should look like the organisation, speak to visitors in the right language,
offer appropriate arrival channels, follow the site's security and privacy
policy, notify the right host, and create a controlled record the organisation
can later evidence.

```text
Organisation brand and visitor experience
                +
Buffr Checkpoint control architecture
                +
Multi-channel inclusion
                +
Risk-based verification
                +
Offline resilience
                +
Audit and retention evidence
```

The visitor sees a welcoming, branded, simple check-in experience. The
organisation receives a private, secure, configurable, measurable, and
auditable control system.

### 11.9.14 Form AI safety rules (v0.29)

Admin-only assist via Neon AI Gateway (`FormAiService`), gated by
`FORM_AI_ENABLED=true` plus gateway URL/key. Endpoints:
`POST …/ai/suggest-fields`, `POST …/ai/translate-field`. Never visitor
check-in traffic.

1. **Classification ownership.** AI may suggest `dataClassificationCode`
   values (including `high_risk` / `verification_evidence`) with warnings in
   the response. Suggestions are **never auto-published**. Admins own the
   final classification on each field. Publish still requires a non-empty
   `approval_reference` when any high-risk class is present
   (`VisitorDataMinimisationService` — Part Three §5.6). An under-classified
   suggestion is a review failure for the admin, not a bypass of the publish
   gate.
2. **Logging.** Audit actions `check_in_form.ai_suggest_fields` and
   `check_in_form.ai_translate_field` only. This release does **not** retain
   raw prompt/response free text. Form descriptions are admin configuration,
   not visitor PII; pasting visitor data into the suggest panel is an
   operator policy violation.
3. **Cost.** AI Gateway uses prepaid credits. Release 1 has no per-org
   metering or budget UI. Operators use `FORM_AI_ENABLED` as the kill-switch.

Follow-up (not blocking): optional hard reject when a suggestion returns
`high_risk` without a warning flag, and optional redaction of intent text in
audit metadata.

---

# 12. NFC Design Standard

## 12.1 Recommended NFC use cases

| Use case | Recommended credential |
|---|---|
| Frequent visitor / contractor | Reusable site-issued NFC badge |
| Staff hosting visitors | Employee mobile credential or enterprise badge |
| Events | NFC wristband or badge |
| High-security sites | Cryptographically secure NFC credential + server validation |
| Government e-ID | Only through approved official protocol and compatible reader, once the National e-ID smart card described in Section 4a enters circulation — status governed by the Capability Status Register (Section 4a.7), currently `targeted` |
| Smartphone visitor | QR initially; NFC where platform support is tested |

## 12.2 What not to do

Do **not** use:

- static NFC UID alone as an access credential;
- cheap writable NFC stickers as a standalone high-security identity factor;
- badge data containing full names, ID numbers, visit purpose, or access rights;
- cloned/unverified NFC data to automatically unlock restricted areas;
- national e-ID chip data without official authorisation, protocol support, and legal review.

## 12.3 Security baseline

For low-risk check-in, a random NFC token mapped server-side may be sufficient.

For higher-risk access, use:

- cryptographically secure credentials;
- short-lived or dynamic tokens;
- mutual authentication where the credential technology supports it;
- revocation and expiry;
- secure reader configuration;
- server-side policy evaluation;
- anti-passback where appropriate;
- manual security controls for exceptional access.

---

# 13. Security and Resilience Controls

## 13.1 Minimum control baseline

| Control area | Required control |
|---|---|
| Encryption in transit | TLS for every API and service integration |
| Encryption at rest | Database, object store, device cache, backups |
| Key management | Per-environment keys, rotation, restricted access, recovery process |
| Authentication | MFA for administrators and privileged roles |
| Device security | Kiosk mode, MDM, screen lock, automatic session reset, patching |
| Data access | RBAC + tenant/site scoping enforced in API/database |
| Logs | Tamper-evident audit events for access, export, changes, support activity |
| Retention | Client-configured lifecycle policy, legal holds, deletion proof |
| Backups | Tested restore procedures, encrypted backups, defined recovery objectives |
| Vulnerability management | Dependency scanning, patch policy, penetration testing, secure code review |
| Incident response | Documented playbooks, client notification rules, evidence preservation |
| Third-party risk | SMS/USSD, DigiNam, hosting, MDM, NFC vendors assessed and contractually controlled |
| Business continuity | Offline process, spare-device model, power continuity, secure non-paper fallback |

## 13.2 PSD-12-inspired resilience target

For clients in the NPS or other highly regulated settings, Buffr Checkpoint should be able to support a service target aligned to PSD-12’s reference expectations:

- availability target;
- risk tolerance thresholds;
- regular risk assessment;
- independent control assessment;
- incident notification process;
- tested response/recovery plans;
- recovery-time and recovery-point targets;
- supplier safeguards.

PSD-12 requires, among other things, boards to govern information security and operational resilience, risk profiles to be reviewed periodically, third-party arrangements to safeguard data/resilience objectives, ongoing monitoring/detection, and documented response/recovery arrangements. Its stated tolerance benchmarks include 99.9% availability, recovery within two hours, a five-minute RPO for critical systems, and two successful recovery tests per year for in-scope entities. [2]

Buffr Checkpoint should treat these as a **regulated-client design benchmark**, not as a universal promise until it has the operating maturity to deliver them.

---

# 14. ISO 55001 / ISO 55002 Asset-Management Operating Model

ISO 55001:2024 specifies requirements for an asset management system. ISO 55002 provides guidance for applying those requirements; it is guidance, not a certification standard. [7]

For Buffr Checkpoint, the platform is not only software. It is a managed portfolio of physical, digital, information, contractual, and trust assets.

## 14.1 Asset portfolio

| Asset class | Examples | Owner | Key lifecycle risk |
|---|---|---|---|
| **Physical device assets** | Tablets, kiosks, NFC readers, printers, UPS units, mounts | Client or Buffr Checkpoint, per contract | Theft, loss, patch failure, unsupported OS |
| **Credential assets** | NFC badges, contractor tokens, QR invitations | Client | Cloning, expiry failure, incorrect assignment |
| **Information assets** | Visitor records, audit logs, retention rules | Client as controller; Buffr Checkpoint as processor where applicable | Privacy breach, excessive retention, unauthorised access |
| **Software assets** | Kiosk app, API, admin portal, integrations | Buffr Checkpoint | Vulnerabilities, supply-chain compromise, technical debt |
| **Trust assets** | Certificates, signing keys, DigiNam verifier permissions | Buffr Checkpoint / client depending on design | Misuse, expiry, compromise, lack of authorisation |
| **Service assets** | USSD short code, SMS routes, cloud tenancy, support contracts | Buffr Checkpoint | Vendor lock-in, outage, cross-border data exposure |
| **Operational assets** | Procedures, training, playbooks, control registers | Client and Buffr Checkpoint | Policy not embedded in practice |

## 14.2 Apply the four ISO 55000 principles

| ISO principle | Buffr Checkpoint application |
|---|---|
| **Value** | The product must create measurable value: less privacy exposure, lower reception friction, better evacuation readiness, easier audits, and reduced manual administration. |
| **Alignment** | Each client configuration must align with the organisation’s site risk, access policy, retention needs, legal obligations, and service model. |
| **Leadership** | Each client needs a named executive/control owner; this cannot be left solely to reception or facilities. |
| **Assurance** | The service must provide evidence that devices, controls, retention rules, integrations, and permissions actually operate as designed. |

## 14.3 Asset lifecycle

```text
PLAN
  → site risk assessment, use cases, privacy review, asset strategy

ACQUIRE
  → device selection, reader testing, supplier due diligence, acceptance tests

DEPLOY
  → secure build, MDM enrolment, configuration baseline, training, go-live approval

OPERATE
  → check-in, host notification, identity workflows, audit events, support

MAINTAIN
  → patches, certificate renewal, reader tests, battery/UPS checks, spare-device readiness

ASSURE
  → control testing, access reviews, retention checks, restoration tests, KPI review

RENEW / RETIRE
  → device replacement, credential revocation, secure wipe, data export, disposal evidence
```

### 14.3a Device deployability gate — `cran_compliance_status` values *(added v0.4)*

The lifecycle above is the operating narrative; `device.cran_status_code`
(§11.4.5, `sites.ts`) is the schema column it maps to, but no
`type_definition` values for the `cran_compliance_status` domain were ever
seeded, and no code path checked the value before letting a device be used.
"No unregistered device should be deployable" (§2.2 of the Regulatory
Addendum) was asserted in prose only. The values below are config data
(an INSERT into `type_definition`, not a migration, per §11.4.5's own rule)
and should be seeded before any device row is created:

```text
unassessed
  → supplier_evidence_received
  → exemption_assessed
  → cran_certificate_confirmed
  → mdm_enrolled
  → approved_for_deployment
  → retired
```

**Enforcement rule:** a device check-in/activation request is rejected
unless `device.cran_status_code` resolves to `approved_for_deployment`. This
is the concrete, testable version of the ACQUIRE→DEPLOY gate above — an
application-layer guard in the device/sites service, not a new table.

## 14.4 Asset-management KPIs

| KPI | Why it matters |
|---|---|
| Devices enrolled in MDM | Proves device control coverage |
| Devices on supported OS/security patch level | Reduces compromise risk |
| Kiosk availability by site | Measures operational value |
| Offline queue age | Detects unsynchronised personal data |
| Successful sync rate | Confirms resilience process works |
| NFC credential revocation time | Measures access-control effectiveness |
| Records retained beyond policy | Identifies privacy failure |
| Privileged-access events | Detects misuse or support risk |
| Evidence-pack generation time | Measures audit readiness |
| Recovery-test success rate | Demonstrates resilience |
| Visitor check-in completion rate by channel | Measures inclusion, not just speed |

## 14.5 ISO 55001:2024 documented-information register

ISO 55001:2024 specifies requirements for an asset management system (AMS).
ISO 55002 provides **implementation guidance** (not a separate certification
standard). ISO 55000:2024 supplies terminology (value, lifecycle, assurance).
Buffr Checkpoint applies these to the asset portfolio in §14.1 — including
devices under the CRAN type-approval gate (§14.3a; Part Two §8).

This register lists **documented information** the organisation must establish
and maintain. Status is honest: product controls exist; many AMS artefacts are
still owned by Buffr Checkpoint as operator or by the client as asset owner.

| Clause (ISO 55001:2024) | Documented information | Buffr Checkpoint artefact / owner | Status |
|---|---|---|---|
| 4 Context | Interested parties; AMS scope; asset portfolio boundary | This blueprint §1–§3; client site schedule | Partial — scope statements per deployment |
| 4.5 Decision-making & value | Decision-making framework and criteria | Site risk tiers §7; access policies | Partial |
| 5 Leadership | Asset management **policy**; roles | Client executive owner + Buffr RACI in contracts | Partial — template needed per client |
| 6.1 Risk & opportunity | Separate actions for risks and opportunities | §19 risk register; supplier due diligence | Partial |
| 6.2.1 **SAMP** | Strategic Asset Management Plan: objectives, decision framework, contingencies, improvement | Buffr internal SAMP (devices, credentials, trust assets) + client SAMP addendum | **Not started as controlled doc** — outline below |
| 6.2.2 Asset management plans | What/who/when/resources/evaluation | Device deploy checklists; MDM baselines | Partial |
| 7 Support | Resources, **competence**, awareness, communication, document control | §20.4 training matrix; runbooks | Partial |
| 7 Knowledge | Knowledge needed to operate the AMS | Architecture docs; RPPS §5.6; ops runbooks | Partial |
| 8 Operation | Lifecycle operational control; change; outsourcing | Kiosk/API/admin procedures; telecom arrangements | Partial |
| 9 Performance | Monitoring, KPIs (§14.4), internal audit, management review | §20.1 quarterly cycle; assurance pack §20.2 | Partial |
| 10 Improvement | Nonconformity, corrective/preventive, **predictive** action | Incident register; roadmap; capacity planning | Partial |

### 14.5.1 SAMP outline (Buffr Checkpoint — to be maintained as controlled document)

1. Organisational objectives linked to visitor privacy, inclusion, and audit readiness.
2. Decision framework: risk tier → channel → assurance V0–V4 → access decision.
3. Asset classes in scope (§14.1) and out of scope (client HR systems, door controllers until integrated).
4. Value criteria: availability, sync health, retention compliance, evacuation readiness.
5. Contingencies: offline mode, spare devices, telecom failover, paper continuity kit rules.
6. Improvement: quarterly governance review inputs (§20.1).
7. Alignment to financial/resource plans (hardware lease vs purchase; MDM seats).

ISO 55002 guidance should be used when sizing the AMS for SME vs enterprise
clients — scale documentation to asset criticality, not bureaucracy for its
own sake.

---

# 15. Business Model

## 15.1 Beachhead market

Start narrow in Namibia before expanding regionally.

### Priority segments

1. **Banks, PSPs, and financial institutions**  
   Strong security, audit, third-party, resilience, and visitor-control needs.

2. **Government and public service offices**  
   High visitor volumes, public trust requirements, DigiNam relevance, and paper-register dependence.

3. **Healthcare facilities**  
   Sensitive visitor contexts, privacy expectations, safety, and emergency roster value.

4. **Critical infrastructure, logistics, mining, and utilities**  
   Contractor management, site access, safety induction, vehicle records, and offline requirements.

5. **Multi-site SMEs and corporate offices**  
   Easier initial sales cycle and good pilots for proving operational value.

## 15.2 Product packaging

Public pricing follows a **three-tier + add-ons** rule (monthly or annual billing). Optional capabilities are sold as
catalog **add-ons** (not named peer products like “Access” or “Assurance”) and attach to a Core / Professional / Verify
plan.

**Source of truth:** `subscription_catalog_item` (migration `0032_subscription_catalog.sql`). Plans and add-ons share
one catalog list; `kind_code` is `plan` or `addon`; each row has its own `monthly_amount`. Ops reads the full catalog
(`GET /platform/billing/catalog`). **Marketing does not show add-ons** — `GET /public/pricing` returns plans only so
the public grid stays three clear tiers. Creating a subscription accepts `planCode` + `addonCodes[]` and computes MRR
in application code — never trust client-supplied amounts.

**Core CAPEX-reduction path (already FULL):** Site Experience → Site QR Codes is the default Core channel — print the public site QR; visitors use phone `/check-in`. Assisted check-in covers feature phones / no phones. Dedicated tablets are optional hardware (§15.3), not a Core prerequisite.

| Offer | Kind | What it includes | Best customer | List price (NAD/mo) |
|---|---|---|---|---|
| **Checkpoint Site** *(was Core; 1 site, no extra sites)* | Subscription | **Public site QR** (admin create/rotate/print) + phone web check-in, **assisted front-desk entry**, RBAC, encrypted visitor record, sign-out, reports. **Tablet not required.** Offline-capable software architecture. Does **not** include live USSD/SMS until adapters are live (§11.9.0a). | One office, branch, or clinic | 1,500 |
| **Checkpoint Network** *(was Professional; 3 sites included, N$950 per extra site)* | Subscription | Everything in Site, plus multi-site dashboard, host notification, pre-registration / invitation QR, audit export, site-manager reporting. **Entitlement** to enable **NFC phone/badge**, **SMS**, **USSD**, and **dedicated kiosk/tablet experience** when platform capability register + org enablement allow (priced in-plan and/or as catalog add-ons — never marketed live ahead of the register). | Branch networks, clinic groups, corporate offices | 4,500 |
| **Checkpoint Assure** *(was Verify; 3 sites included, N$1,500 per extra site)* | Subscription | Everything in Network, DigiNam verifier workflow where approved, visitor assurance levels, high-risk visit policies, compliance dashboard | Government, regulated institutions | 9,500 |
| **Physical access control** | Add-on | Physical access-control integration, contractor credentials, zones, escort rules, emergency roster | Critical infrastructure and large enterprises | 5,000 |
| **Controls review and evidence** | Add-on | Annual controls review, retention test, RBAC review, recovery test, evidence pack | Regulated and assurance-led customers | 4,500 |
| **Kiosk / tablet license** *(optional)* | Add-on or Professional entitlement | Dedicated Android/offline kiosk UX and MDM — hardware CAPEX stays §15.3 | High-volume doors, accessibility-led sites | Sales-quoted |
| **SMS / USSD messaging** *(optional)* | Add-on or Professional entitlement | Telco MT / USSD aggregator — sell only when §11.9.0a is FULL/live | Feature-phone-heavy catchments | Pass-through or packaged |
| **NFC fast lane** *(optional)* | Professional entitlement | Phone-NFC and badge-NFC on the same encrypted visit record | Regulated high-traffic sites | In Professional when enabled |

Annual billing is priced as **ten months for twelve** (two months free) relative to the published monthly from-price.
Attached add-ons are stored on `organisation_subscription_addon` with a price snapshot; MRR on
`organisation_subscription.mrr_amount` is recomputed whenever add-ons attach or detach.

## 15.3 Revenue model

| Revenue stream | Commercial logic |
|---|---|
| Initial assessment/configuration fee | Covers site survey, RBA design, field configuration, policy mapping, and deployment plan |
| Hardware sale or lease | Tablets, readers, mounts, printers, UPS units, spare devices |
| Per-site subscription | Covers platform access, hosting, updates, support, reporting |
| Messaging consumption | SMS/USSD costs passed through or packaged transparently |
| Integration fee | DigiNam, access control, HR directory, SSO, visitor pre-registration |
| Assurance retainer | Quarterly/annual control testing and board/audit evidence |
| Training | Front desk, host, security, compliance, and system administrator training |

### Unit-economics principle

Do not bury hardware costs inside a very low monthly subscription.

```text
Contribution per site
= subscription revenue
– hosting
– support
– messaging
– device amortisation
– reseller/telecom costs
– assurance delivery cost
```

Use a purchase, lease, or financed-hardware model for kiosks and NFC readers. That protects cash flow and makes device lifecycle management visible.

## 15.4 Revised unit economics: per-channel marginal cost

Every channel in Section 5.1 and Section 6 produces the same isolated, encrypted record downstream, but the channels carry materially different marginal costs. Pricing decisions and tier design should be built from this table, not from a single blended "per visitor" number:

| Channel | Marginal cost | Positioning |
|---|---|---|
| Public site QR + phone web | $0 | **Core default** — admin QR lifecycle already FULL; zero marginal software cost. |
| Assisted front-desk entry | $0 | **Core mandatory inclusion** — covers no phone / feature phone until SMS/USSD are live. |
| Dedicated kiosk / tablet | $0 software; hardware CAPEX separate (§15.3) | Optional add-on / Professional entitlement — not required for Core. |
| USSD | Telco integration cost, session-based | Optional add-on when live (§11.9.0a NOT STARTED today) — **not** a Core sellable claim. |
| SMS | Per-message telco cost | Optional add-on when live (§11.9.0a NOT STARTED today) — **not** a Core sellable claim. |
| QR pre-registration / invitation | $0 marginal | Professional. |
| NFC (phone-tap) | $0 marginal | Professional entitlement when enabled — optional fast lane, not Core default. |
| NFC (physical badge, NTAG213/215) | ~$0.20–$0.40 per unit landed | Optional hardware for frequent visitors/contractors. |
| National e-ID NFC (future) | Near-zero marginal at launch; cost is R&D / interoperability testing | Verify / Enterprise activation when register is live (Section 4a). |

**Strategic reframing for pricing:** Core wins on **governance-grade evidence without tablet CAPEX** (public site QR + assisted). Professional wins on multi-site operations plus **optional** NFC / kiosk / messaging entitlements. Do **not** claim live USSD/SMS on Core while adapters remain NOT STARTED. NFC remains a strong differentiator versus generic QR-only SaaS when enabled — priced from Professional upward, not buried as mandatory Core hardware.

---

# 16. Play-to-Win Strategy

**Three-sentence strategy:** We win by governance-grade visitor evidence on one encrypted record, with **public site QR as the default self-service path**. We play for regulated and multi-site organisations in Namibia that must replace paper registers **without buying tablets first**. We win via admin-issued public site QR plus assisted front desk, with **kiosk, SMS, USSD, and NFC as optional add-ons** on the same architecture — not parallel apps.

## 16.1 Winning aspiration

> Become the trusted digital check-in and visitor-evidence standard for regulated, multi-site, and inclusion-conscious organisations in Namibia — then expand into Southern and East African markets with the same offline-first, risk-based model — **without forcing hardware CAPEX as the price of entry**.

Measurable wedge for Core: a site can print a public check-in QR from admin, run phone web check-in, and cover no-phone / feature-phone visitors through assisted front desk, on one encrypted visit record.

## 16.2 Where to play

- Namibia first;
- regulated and high-visitor organisations;
- public-facing locations;
- organisations with multi-site operations;
- sites with intermittent connectivity;
- clients that need to show evidence to boards, auditors, partners, or regulators;
- **beachhead:** sites where smartphone share plus a staffed front desk can cover inclusion without live USSD/SMS on day one;
- **expand with add-ons:** high-volume doors (kiosk/NFC), feature-phone-heavy catchments (SMS/USSD when live).

**Will not play (initially):** selling six equal "products," requiring tablet purchase for Core, or marketing USSD/SMS as live Core inclusions while adapters remain NOT STARTED (§11.9.0a).

## 16.3 How to win

| Strategic choice | What it means in practice |
|---|---|
| **Lead with the paper-register risk** | Show the exposure safely in a live demo: one page, multiple people's data, no audit trail. |
| **Sell governance, not tablets** | Core is software: admin QR + phone web check-in + assisted entry. Tablets and readers are optional CAPEX / add-ons (Section 15.3). |
| **Be QR-first by default** | Admin generates a public site check-in QR (`Site Experience → Site QR Codes`); visitors use `/check-in?site=&ref=` on their phone. Zero device CAPEX for the site. |
| **Be inclusion-honest** | Assisted front-desk check-in is the mandatory path for no phone, low literacy, disabilities, and feature-phone visitors until SMS/USSD are live and enabled. |
| **Treat kiosk / SMS / USSD / NFC as optional add-ons** | Same encrypted visit record; not separate products. Enable when platform capability register + org enablement allow. |
| **Own the offline problem** | Most foreign SaaS is cloud-first; Buffr Checkpoint should be operationally credible when connectivity fails. |
| **Use risk-based configuration** | Each customer receives a tailored site/visit/zone policy, not a generic registration form. |
| **Make assurance recurring** | Sell a quarterly or annual control review, not only software and hardware. |
| **Avoid vendor lock-in** | Provide documented APIs, data export, exit support, hardware asset register, and transparent integration contracts. |

## 16.4 Why Buffr Checkpoint: competitive comparison

This table should anchor the competitive-positioning section of every pitch deck, tender response, and sales conversation. It compares the paper register, generic foreign QR-only SaaS, and Buffr Checkpoint across the capabilities this blueprint treats as differentiating:

| Capability | Paper register | Generic foreign SaaS (QR-only) | Buffr Checkpoint |
|---|---|---|---|
| Isolated, private visitor records | No — every visitor reads the prior visitor's data | Yes | Yes |
| Start without buying a tablet | Yes (paper) | Often yes (QR only) | Yes — Core = admin public site QR + phone web + assisted front desk |
| Works with no smartphone | Yes (manual only, no privacy or audit trail) | Rarely | Yes — assisted front desk on Core; SMS/USSD as optional add-ons when live (§11.9.0a) |
| Offline-first operation | Yes (paper never goes offline, but has none of the other properties below) | No (most foreign SaaS is cloud-first) | Yes — encrypted local cache and sync queue when kiosk add-on is deployed (§8.5) |
| Tap-to-check-in (NFC) | No | Rare / enterprise-only | Optional / Professional entitlement — phone-NFC and badge-NFC |
| Government e-ID readiness | No | No | Architected ahead of national rollout (§4a); not sold as live until register says so |
| DigiNam/NPKI verification pathway | No | No | Architected; Buffr RP integration **not live** until approved (§4a.7 register) |
| CRAN-aware connected-device governance | No | No | Yes — Device Compliance Register when devices are deployed |
| Retention, audit, and evidence-pack generation | No | Partial, rarely tuned to Namibian legal requirements | Yes — per Section 20.2 |
| Local support and public-sector procurement readiness | N/A | Typically no local presence | Yes — per Regulatory Addendum |

## 16.4a Competitor pricing and plan naming (2026-09-29, decided)

*Status: decided 2026-09-29 by the product owner. Names Set A (Site / Network / Assure) with per-site pricing, implemented in migration `0039_site_network_assure_per_site.sql` (codes `site` / `network` / `assure`; `included_sites`, `extra_site_monthly_amount`, `organisation_subscription.site_quantity`, `organisation_subscription_site_quantity_log`). Site creation is refused once active sites reach the licensed quantity; before the first subscription there is no cap. Figures below were read from each vendor's public pricing page on 2026-09-29. NAD conversions use approximately N$20.5/EUR and N$17.5/USD; re-check the rate before quoting a customer.*

### NamEvents (nam-events.com)

NamEvents is Namibia's event ticketing and cashless-payments platform, not a visitor-management product. It overlaps with Buffr Checkpoint only at the door: QR tickets scanned at the gate on a phone, RSVP forms with custom data fields, attendee exports.

| Item | NamEvents offer |
|---|---|
| Products | Event listing and ticketing (online plus retail outlets), free RSVP events, gate scanning app, door sales, cashless QR wallets for vendors and bars, club and association memberships, tournaments |
| Customers | Concert, festival, sports, expo, and conference organisers; clubs and associations. Hosts include corporates and regulators running events (NAMFISA has a host page). |
| Pricing model | No monthly, setup, or contract fees. Free events and RSVPs cost nothing. Paid tickets carry a commission on total sales: under N$100k 5%, N$100k to 250k 4.5%, N$250k to 500k 4%, N$500k to 1m 3.5%, above N$1m quoted. The whole amount is charged at one rate. A booking fee on paid orders, absorbed or passed on per event. Comps free. Rates exclude VAT. |
| Plans | Essential (self-serve, same-day go-live after review) and Complete (same rate, assisted setup with an account manager for seating, multi-day, memberships, cashless). |
| Cashless | N$15 one-time guest activation, free top-ups, unspent credit refundable within 30 days. |
| Sales motion | Self-serve Business Hub signup, local phone and WhatsApp care line, a public fee calculator. |

**Threat:** low today. NamEvents sells event access, where one visitor buys a ticket once. It has no audit trail, retention control, RBAC, host approval, or emergency roster for everyday reception. The adjacent risk is corporate events and expos at our customers' own venues.

**What to copy:**
1. A public calculator. NamEvents lets a buyer see their cost before talking to anyone. Buffr Checkpoint should show the price for N sites.
2. One price, two ways to set up. Essential and Complete share one rate and differ only in who does the setup. That matches our self-serve signup, with assisted rollout via `/contact`.
3. Plain-language fee tables with every threshold published.

**What not to copy:** commission-on-throughput pricing. Our customers don't sell visits. A per-site subscription stays the right model.

### Visitor-management benchmarks

| Vendor | Plan | Public price | Approx. NAD per location per month | Notes |
|---|---|---|---|---|
| Vizito | Standard | EUR 29.95 / location / month, billed yearly | ~615 | 100 visits/month, SMS up to 100 |
| Vizito | Pro | EUR 59.95 | ~1,230 | 300 visits/month, phone support, onboarding |
| Vizito | Enterprise | EUR 99.95 | ~2,050 | Unlimited visits, SSO, Entra/Google sync, webhooks |
| Envoy Visitors | Basic | Free | 0 | 100 entries/month |
| Envoy Visitors | Premium | USD 362 / location / month, billed annually | ~6,300 | Branding, badges, analytics, SSO, emergency notifications |
| Envoy Visitors | Enterprise | Custom | n/a | ID scanning, access-control integrations, blocklist |
| **Buffr Checkpoint (live)** | Core / Professional / Verify | NAD 1,200 / 3,500 / 7,000 per **organisation** per month | Professional with 10 sites = 350 per site | Flat per organisation. No site count in the catalog. |

### Where we undersell

1. **Multi-site is free.** Professional and Verify charge one flat fee for any number of sites. A 20-branch bank pays N$3,500 a month today. The same bank would pay about N$41,000 on Vizito Enterprise and about N$126,000 on Envoy Premium.
2. **Verify includes what competitors keep for Enterprise.** Compliance dashboard, evidence packs, audit export, high-risk visit policies, and the DigiNam pathway sit behind custom Enterprise pricing at Envoy.
3. **The names describe features, not the buyer.** "Core" and "Professional" read like generic SaaS. They say nothing about a front desk, a branch network, or a regulated institution.

### Proposed plan names (choose one set)

| Set | Single site | Multi-site | Regulated | Rationale |
|---|---|---|---|---|
| **A (recommended)** | Checkpoint Site | Checkpoint Network | Checkpoint Assure | Names the buyer's world: one site, a branch network, an institution that answers to an auditor. |
| B | Front Desk | Branch Network | Regulated | Most literal. Easiest for a procurement officer to map to a tender line. |
| C | Checkpoint | Checkpoint Enterprise | Checkpoint Sovereign | Premium tone. "Sovereign" signals government-grade identity but may over-promise before DigiNam is live. |

### Proposed pricing (per-site model)

| Plan | Included | Monthly (NAD) | Each extra site | 20-site example |
|---|---|---|---|---|
| Site | 1 site | 1,500 | n/a (upgrade to Network) | n/a |
| Network | 3 sites | 4,500 | 950 | 4,500 + 17 x 950 = 20,650 |
| Assure | 3 sites | 9,500 | 1,500 | 9,500 + 17 x 1,500 = 35,000 |

Why these numbers:

- **Per extra site stays below Vizito Enterprise** (~N$2,050). We compete on local EFT billing, assisted entry, offline operation, and Namibian support without being the expensive option per branch.
- **A single Assure site still costs less than one Envoy Premium location** (~N$6,300 x 3 sites = ~N$18,900 against our N$9,500), while carrying the compliance and identity features Envoy prices as Enterprise.
- **Site at N$1,500** sits between Vizito Pro and Enterprise and includes unlimited visits (Vizito caps Standard and Pro at 100 and 300).
- **Annual stays ten months for twelve.** Vizito's yearly discount is 16%, and ours (two months free) is about 17%, so it stays comparable.
- **The payment gate stays.** No free tier (Envoy Basic) or card-free trial (Vizito). Self-serve setup before payment already removes the need for a trial.
- **Existing customers** keep their current price until renewal (grandfathering). Record the old price in the add-on/plan price snapshot so MRR stays honest.

### Implementation dependency (needs a human/Fable schema decision)

Per-site pricing needs a site quantity on the subscription (or an `additional_site` catalog add-on with a quantity), plus MRR recomputation from quantity. Today `subscription_catalog_item` and `organisation_subscription_addon` carry no quantity. Per workspace rule §2, billing and ledger structure is designed by a human or Fable, not the executing model. Renaming plans only is a catalog row update (label and tagline) plus website copy and JSON-LD. It needs no schema change and can ship first.

## 16.5 Required capabilities

**Core (must ship / already the activity-system spine):**

1. Public site QR lifecycle (create / rotate / printable kit) and `/check-in` web journey.
2. Assisted front-desk check-in on the same encrypted visit record.
3. Privacy and data-lifecycle design; enterprise RBAC, audit, and reporting.
4. Capability/register-driven truth for marketed features (`CapabilityStatusBadge`).
5. Sign-out, reports, and offline-capable architecture (software).

**Optional add-on capabilities (extend how-to-win on the same record):**

6. Secure Android/offline kiosk engineering and MDM.
7. NFC and secure credential design.
8. Local telco/USSD/SMS partnerships (sell only when live).
9. Identity-verifier/DigiNam integration capability (Verify).
10. Hardware procurement, repair, and replacement processes.
11. Government and regulated-enterprise sales; IT audit and assurance delivery.
12. Customer-success and training capability.

## 16.6 Management systems

| System | Role |
|---|---|
| **Subscription catalog** | `subscription_catalog_item` plans vs add-ons (§15.2); Core features must match shippable FULL surfaces. |
| **Capability status register** | DigiNam, e-ID NFC, USSD, SMS, NFC badge check-in — public badges and org enablement; never market "live" ahead of the register (§4a.7). |
| **Pilot metrics (§17.2)** | Completion rate and duration **by channel**; paper-register fallbacks; offline-sync success when kiosk deployed. |
| **CAPEX discipline (§15.3)** | Tablets, NFC readers, mounts sold/leased separately — never buried in Core MRR. |
| **Sales / packaging cadence** | Revisit tier copy when USSD or SMS adapters go live; until then assisted front desk carries inclusion claims. |

---

# 17. Go-to-Market Plan

## 17.1 Entry offer

**Self-serve signup, gated by payment.** *(v2026-09-29: the public Paper Register Exposure
Review offer is retired. The website no longer sells a review; `/contact` handles
pre-signup questions, multi-site/hardware rollouts, integrations, and partnerships.)*

Primary public CTA is **Create account** (`https://admin.buffrcheckpoint.com/auth/register`);
secondary is **See pricing** (`/pricing`). Organisations self-serve end to end:
verify email → 13-step onboarding (sites, hosts, staff, QR) → choose plan under
Billing → EFT + POP → ops confirms payment → subscription `active`.
Go-live and operational dashboard use require `active` (`trial` stays an ops-set
status for design partners and is not offered on the public site).

Sales motion:

```text
Create account (self-serve)
→ Onboarding (no payment needed to configure)
→ EFT + POP → ops confirms → subscription active → go-live
→ Multi-site expansion / hardware add-ons via /contact
→ Annual Assurance Retainer
```

## 17.2 Pilot design

Do not launch with a nationwide sales promise.

Run 60–90 day pilots across three intentionally different sites:

1. urban corporate office;
2. high-footfall public/regulated office;
3. low-connectivity or rural branch/site.

Measure:

- visitor completion rate;
- average check-in duration by channel;
- queue length;
- host-notification success;
- offline-sync success;
- operator workload;
- data-minimisation compliance;
- visitor satisfaction;
- number of paper-register fallbacks;
- audit-evidence generation time.

## 17.3 First-year targets

These should be treated as planning hypotheses, not forecasts:

| Period | Objective |
|---|---|
| Months 0–3 | Discovery, legal/brand gates, clickable prototype, two design partners |
| Months 4–6 | Core product pilot at 3–5 sites, offline and RBAC validation |
| Months 7–9 | Commercial launch; NFC badges; pre-registration; audit packs |
| Months 10–12 | 15–30 active sites; at least one regulated reference customer; annual assurance offering |
| Year 2 | DigiNam verifier capability where formally enabled; USSD rollout; access-control integration; regional entry assessment |

## 17.4 Alpha testing and UAT plan

This section turns Sections 17.2–17.3 and 11.8.10 into an executable
acceptance ladder. It does **not** replace the three-site pilot — it is the
work that must pass *before* and *during* that pilot so pilot metrics measure
product value, not known breakage.

Industry mapping (names only; Checkpoint owns the gates):

| Industry label | Checkpoint stage | Who runs it | Environment |
|---|---|---|---|
| Alpha | **A0 Internal alpha** | Buffr eng + ops | Staging / demo org |
| UAT | **A1 Design-partner UAT** | Named site operators (2 partners) | Staging → dedicated pilot tenant |
| Pilot / limited beta | **A2 Paid pilot** (§17.2) | 3–5 real sites, 60–90 days | Production-like; paper parallel week 1 |
| GA | **A3 Commercial launch** (§17.3 M7–9) | Sales + assurance | Production |

### 17.4.1 Honesty rules (non-negotiable)

1. **UAT scope = FULL Core surfaces only** (status table at top of this
   blueprint). Public site QR + phone `/check-in`, assisted front desk,
   RBAC, encrypted record, sign-out, reports, host email when Resend is
   configured, emergency roster, audit/DSAR paths that claim FULL.
2. **Out of UAT sell claims** until the capability register is `live` and
   a separate gate passes: DigiNam adapter, National e-ID NFC, live
   USSD, live SMS MT, badge-print hardware. Retention disposition is
   built (v0.32) but counts as a sell claim only once a reviewed dry run
   has passed and the worker is enabled for that environment.
3. **No silent paper return.** If a scenario forces paper, log it as a
   pilot KPI failure (`paper-register fallbacks`), not as “workaround.”
4. **Decision, not a bug dump.** Each stage ends with
   **accept / accept-with-conditions / reject** by a named authority
   (see §17.4.8). Bug lists without a decision are late system testing.
5. **Engineering smokes are entry criteria, not UAT.**
   `scripts/smoke-production.sh`, `backend/scripts/journey-smoke.ts`,
   and local e2e under `e2e-screenshots/` must be green before A1 starts.
   **Runnable tracker:** `./scripts/acceptance-gate.sh run a0` (or
   `a0-a3`) executes autos, prints remaining manual IDs, and records
   marks/sign-offs into gitignored `scripts/acceptance/state.json`.
   See `scripts/acceptance/checklist.json` for the canonical item list
   matching this section.

### 17.4.2 Stage A0 — Internal alpha (Buffr team)

**Purpose:** Prove every critical journey works end-to-end on staging
with the Buffr Analytics demo tenancy before any external operator
touches the product.

**Duration:** 5–10 working days (repeatable after major releases).

**Entry criteria**

- [ ] Prod/staging smoke `scripts/smoke-production.sh` → all PASS
- [ ] Journey smoke `backend/scripts/journey-smoke.ts` → PASS
- [ ] Sections 11.8.1–11.8.9 checklist items closed or explicitly deferred
      with owner + date (marketing/error/a11y honesty)
- [ ] Demo org = single tenancy rule (Buffr Analytics); kiosk JWT matches
- [ ] MFA enrolled for all alpha operator accounts
- [ ] Resend (or documented “host email degrade”) configured on staging
- [ ] Known blockers triage board empty of Sev-1/Sev-2 (definitions below)

**Alpha scripts (must all pass once each)**

| ID | Journey (§8) | Script (happy path) | Pass rule |
|---|---|---|---|
| A0-01 | 8.1 Walk-in | Print site QR → phone `/check-in` → privacy ack → submit → confirmation reference | Visit row created; roster shows visitor; no other visitor PII visible on success |
| A0-02 | 8.1 Assisted | Front desk assisted check-in for “no phone” visitor → host notify attempt | Record encrypted; screen clear / no shared register leak |
| A0-03 | 8.1 + forms | Published form with `visibilityRule` / `requiredIf` (e.g. vehicle) | Hidden fields not submitted; required-if enforced server-side (400 if missing) |
| A0-04 | 8.2 Pre-reg | Create invitation → revoke → resolve token → check-in | Revoked token rejected; live token matches visit |
| A0-05 | 8.5 Offline | Kiosk offline capture → reconnect → outbox drain | Idempotent sync; no duplicate visits; never claims “host notified” while offline |
| A0-06 | 8.6 Emergency | Trigger emergency → roster → resolve | Roster limited to on-site; audit events written |
| A0-07 | 8.7 Sign-out | Public `/check-out` or staff checkout | Exactly one open visit closed; emergency roster updates |
| A0-08 | 8.8 Host notify | Check-in with host that has email | Outbox `sent` or honest `failed` (never silent success) |
| A0-09 | 8.8 Approval | Zone with `host_approval_required` | Visit held until approve/reject; reject audited |
| A0-10 | 8.10 Admin | Role-scoped user: front desk vs site manager vs owner | No cross-site leak; invite/role change from fixed catalogue only |
| A0-11 | Privacy | Staff roster from kiosk Welcome | Requires fresh login challenge every time |
| A0-12 | i18n | `/check-in?lang=af` (and `pt`) | Labels resolve; submit still succeeds |
| A0-13 | NFC (if Professional alpha) | Badge validate → check-in; revoked badge | Live badge OK; revoked rejected |
| A0-14 | DSAR / audit | Export evidence pack for a visit window | Pack generates; sensitive reads audited |

**Exit criteria (A0)**

- [ ] All in-scope A0 scripts PASS on staging
- [ ] Sev-1 = 0; Sev-2 = 0 open (or written accept-with-conditions)
- [ ] Alpha sign-off by engineering lead + product owner
- [ ] Design-partner UAT pack ready (scripts below + credentials + runbook)

### 17.4.3 Stage A1 — Design-partner UAT

**Purpose:** Business users validate that the *right* system was built for
their day-to-day reception, not that QA specs pass. Aligns with §17.3
Months 0–3 “two design partners.”

**Participants (minimum)**

| Role | Count | Why |
|---|---|---|
| Front desk / receptionist | 2 (one per partner) | Assisted + roster + checkout |
| Site / facilities manager | 1–2 | Policies, QR print, emergency |
| Host (employee) | 2+ | Notification + approval |
| Visitor stand-ins | 5+ per site day | Phone QR + no-phone assisted |
| Buffr facilitator | 1 | Observes; does not drive the UI for them |

**Duration:** 10–15 working days calendar (2–3 site visits each partner).

**Entry criteria**

- [ ] A0 accepted
- [ ] Written UAT charter: scope, out-of-scope, data handling, NDA
- [ ] Partner sites classified on RBA tiers (§7.2) — at least one Tier 1–2
      and one Tier 2–3 if available
- [ ] Paper register retained in parallel for UAT week 1 only
- [ ] Feedback channel: shared tracker (issue = severity + journey ID +
      screenshot/reference, no visitor PII in tickets)

**UAT scenarios (operator-run; map to §17.2 KPIs)**

| ID | Operator action | KPI / acceptance |
|---|---|---|
| U-01 | Open day with printed site QR; 10 walk-ins on phone | Completion rate ≥ 90%; median check-in ≤ 2 min (Tier 1–2) |
| U-02 | 5 assisted check-ins (no phone / low literacy) | Zero shared-screen PII leaks; completion ≥ 95% |
| U-03 | Host receives email; responds when approval required | Host-notification success ≥ 95% when provider up; degrade is honest |
| U-04 | Peak hour: 3 visitors waiting | Wait-queue tickets usable; queue length recorded |
| U-05 | Sign-out at end of visit (visitor or desk) | Open visits at close-of-day ≤ 5% unexplained |
| U-06 | Drill: emergency roster for “all on site” | Roster usable in ≤ 60s; matches on-site reality |
| U-07 | Manager exports audit / visit list for “last Tuesday” | Time-to-evidence ≤ 15 min (mom-test bar) |
| U-08 | Wrong-site / wrong-role attempt | Access denied; no cross-tenant data |
| U-09 | Offline window (kiosk site only) | Check-in continues; sync succeeds; paper fallbacks counted |
| U-10 | Language switch (af/pt) for one visitor | Visitor completes without English |

**Exit criteria (A1)**

- [ ] Critical scenarios U-01–U-08 executed at both partners
- [ ] Sev-1 = 0; Sev-2 fixed or formally accepted with conditions
- [ ] Partner written decision: accept / accept-with-conditions / reject
- [ ] Conditions (if any) have owners and dates before A2
- [ ] Go/no-go for paid pilot recommended to product owner

### 17.4.4 Stage A2 — Paid pilot (executes §17.2)

**Purpose:** Measure operational value under real load for 60–90 days at
three intentionally different sites (urban corporate; high-footfall
regulated; low-connectivity / rural).

**Entry criteria**

- [ ] A1 accepted (or accept-with-conditions closed)
- [ ] Commercial pilot agreement + DPA / controller-processor clarity
- [ ] Site access policy approved (RBA document)
- [ ] Training complete for front desk + one backup operator per site
- [ ] Monitoring: API errors, outbox failures, sync lag, auth lockouts
- [ ] Rollback: paper parallel authorised for first 7 calendar days only

**Measure weekly (canonical §17.2 list)**

- visitor completion rate (by channel);
- average check-in duration by channel;
- queue length;
- host-notification success;
- offline-sync success (kiosk sites);
- operator workload (subjective 1–5 + time-on-task samples);
- data-minimisation compliance (form publish / over-collection flags);
- visitor satisfaction (optional micro-survey on sign-out);
- paper-register fallbacks (count + reason);
- audit-evidence generation time.

**Mid-pilot gate (day 30)**

- [ ] No Sev-1 open > 5 business days
- [ ] Paper fallbacks trending down week-over-week
- [ ] At least one emergency drill completed per site
- [ ] Continue / remediate / stop decision recorded

**Exit criteria (A2 → A3)**

- [ ] 60–90 days complete at ≥ 3 sites (or documented early stop)
- [ ] KPI pack reviewed; hypotheses in §17.3 updated with actuals
- [ ] Reference-call permission (optional) from ≥ 1 site
- [ ] Accept / accept-with-conditions / reject for commercial GA

### 17.4.5 Defect severity (shared across A0–A2)

| Severity | Definition | Pilot impact |
|---|---|---|
| **Sev-1** | Data leak across visitors/tenants; auth bypass; cannot check in on primary Core channel; false “host notified”; emergency roster wrong/empty when people are on site | Blocks entry/exit; stop pilot traffic if in production |
| **Sev-2** | Major journey broken with workaround (e.g. assisted works, phone QR fails); sync duplicates; role catalogue wrong; audit export fails | Must fix or formal accept-with-conditions before next stage |
| **Sev-3** | UX friction, copy, non-blocking i18n gaps, cosmetic | Fix in backlog; does not block accept |
| **Sev-4** | Nice-to-have / enhancement | Out of UAT; product backlog |

Change requests are **not** bugs — log separately so UAT does not become
a redesign workshop.

### 17.4.6 Environments and data

| Env | Use | Data rule |
|---|---|---|
| Local / CI | Eng unit + journey smoke | Synthetic only |
| Staging | A0 + early A1 rehearsal | Synthetic + partner-consented fake visitors |
| Pilot tenant (prod project, isolated org) | A1 late + A2 | Real operational data under DPA; retention policy set day 0 |
| Marketing prod | Not for UAT | No test PII on public pages |

Never copy production visitor payloads into tickets, screenshots shared
outside Buffr, or model prompts.

### 17.4.7 RACI (stage decisions)

| Decision | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| A0 exit | Eng lead | Product owner | Ops | Design partners (optional) |
| A1 exit | Partner site champion | Product owner | Legal / privacy | Eng |
| A2 mid / final | Pilot site champions | Product owner + commercial | Assurance | Board / advisors as needed |
| Scope carve-outs (SMS/USSD/DigiNam) | Eng | Product owner | Capability register owner | Sales (must not oversell) |

### 17.4.8 Sign-off form (copy per stage)

```text
Stage: A0 / A1 / A2
Date:
Environment:
Build / deploy IDs (API, admin, website, kiosk APK):
Scripts / scenarios executed:
Open Sev-1:
Open Sev-2 (with disposition):
Decision: ACCEPT | ACCEPT WITH CONDITIONS | REJECT
Conditions (owner, date):
Signed (name, role):
```

Store completed forms with the pilot commercial file — not as a new
root markdown report. Prefer recording via
`./scripts/acceptance-gate.sh signoff a0 --decision ACCEPT --signer "…"`.
Extend this section or the pilot folder under `buffrcheckpoint/` ops
notes if a durable home beyond the local state file is needed later.

### 17.4.9 Suggested calendar (fits §17.3)

| Window | Stage | Outcome |
|---|---|---|
| Weeks 1–2 | A0 internal alpha | Staging green; UAT pack ready |
| Weeks 3–5 | A1 design-partner UAT | Two partner decisions |
| Months 4–6 | A2 paid pilot (§17.2) | KPI pack + GA recommendation |
| Months 7–9 | A3 commercial launch | Only FULL surfaces in Core sell sheet |

Professional NFC / kiosk-heavy sites may run a **parallel A0-P** alpha on
those entitlements without blocking Core UAT — same severity and
sign-off rules, separate decision line.

---

# 18. Roadmap

## Phase 0 — Foundations

- trademark and company-name clearance;
- legal review of controller/processor model;
- site-risk assessment template;
- data inventory and retention policy templates;
- hardware and NFC device testing;
- DigiNam relying-party discovery;
- telco/USSD/SMS partner discovery.

## Phase 1 — Core product

- Android kiosk;
- assisted check-in;
- manual check-in;
- offline encrypted cache;
- host notifications;
- RBAC;
- audit log;
- tenant/site isolation;
- retention rules;
- sign-out;
- emergency roster;
- admin dashboard;
- evidence export.

## Phase 2 — Inclusion and speed

- QR pre-registration;
- SMS OTP;
- SMS sign-in/sign-out fallback;
- NFC contractor badges;
- device fleet/MDM controls;
- multi-site reporting;
- accessibility improvements;
- multiple languages.

## Phase 3 — Trust and integration

- formally enabled DigiNam verification adapter;
- USSD check-in once operator/short-code arrangements are in place;
- SSO;
- HR/host-directory integration;
- access-control system connectors;
- event and contractor workflows;
- legal holds, DSAR workflow, and advanced compliance reporting.

## Phase 4 — Advanced regulated product

- approved official National e-ID smart-card reader support, engineered and interoperability-tested ahead of the Ministry of Home Affairs' targeted September 2026 rollout so it activates on day one of national circulation, per Section 4a;
- high-assurance credential management;
- access zones and escort workflows;
- third-party/contractor onboarding;
- security operations integrations;
- analytics for capacity and emergency readiness.

---

# 19. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Brand confusion caused by the word “Buffr” | Customers may assume affiliation with another similarly named service | Obtain trademark, company-name, domain, and market-confusion legal review before launch. |
| DigiNam ecosystem live but no product integration authority | Misleading marketing, failed rollout, reputational damage | Market as “DigiNam-ready” until relying-party approval, interface access, test evidence, and contracts exist. |
| USSD short-code delays or operator dependency | Feature-phone channel delayed | Ship kiosk + assisted + SMS fallback first; build USSD adapter in parallel. |
| NFC tag cloning | Unauthorised access | Never use static UID alone; use secure tokens, cryptographic credentials, expiry, revocation, and server-side policy checks. |
| Offline data exposure on stolen kiosk | Privacy breach | Device encryption, MDM, kiosk lock, minimal local cache, remote wipe, secure key handling. |
| Excessive data collection | Privacy and trust harm | Risk-based fields, no ID/photo defaults, configurable retention, privacy review. |
| Customer configures excessive retention | Privacy breach | Provide recommended policy templates, warnings, approval workflow, audit reporting. |
| SMS leaks visitor details on lock screen | Confidentiality breach | Neutral message templates; do not send sensitive visit data by SMS. |
| Overclaiming PSD-12 / POPIA compliance | Regulatory and commercial credibility loss | Use “aligned to” or “supports”; obtain independent assessment before formal compliance claims. |
| Data residency claim invalidated by logs/backups/subprocessors | Misleading claim | Complete data-flow map and supplier register before using “hosted in Namibia” messaging. |
| Product becomes an access-control system too early | Safety/security complexity and liability | Start as a visitor-evidence platform; phase physical door control after formal threat modelling. |
| Paper fallback reintroduces exposure | Control failure during outages | Use secure, single-use, sealed contingency cards — never a shared open register. |
| National e-ID smart-card rollout (targeted September 2026) slips or changes scope | Marketing built around a fixed date becomes inaccurate; engineering effort invested ahead of schedule sits idle longer than planned | Never state e-ID NFC support is live until the Ministry of Home Affairs confirms cards are in national circulation and Buffr Checkpoint has completed its own interoperability testing, per Section 4a.6; keep the "live" vs. "targeted" language in Section 4a.4 in every public surface. |
| "NFC-first" positioning silently excludes the majority of Namibians, particularly rural feature-phone users | Alienates exactly the public-sector and healthcare buyers most likely to serve rural, feature-phone-dominant populations, and contradicts the brand's own inclusion language | Present the capture layer as multi-modal and risk-based, with NFC as an accelerant, not an entry requirement, per Section 4.2 and Section 4a.5; treat USSD and SMS as inclusion-critical optional add-ons when live, with assisted front desk as Core inclusion, per Sections 5.1 and 15.4. |
| Residual parent-brand association after the standalone rebrand (Section 1a) | Regulated buyers' procurement or compliance teams pause a deal to resolve an implied affiliation with a separate payments product | Audit every customer-facing surface — website, pitch deck, contracts, support material — for "By Buffr" badges, footer taglines, or comparative references, and remove them before any regulated-sector pitch. |

---

# 20. Governance and Assurance Model

## 20.1 Buffr Checkpoint governance cycle

```text
Quarterly Governance Review
    ↓
Risk register + incidents + supplier performance
    ↓
Product/security roadmap decisions
    ↓
Control testing and privacy review
    ↓
Board / leadership reporting
    ↓
Action ownership and remediation tracking
```

## 20.2 Client assurance pack

For regulated clients, provide:

- architecture diagram;
- data-flow map;
- RBAC matrix;
- retention-policy report;
- access-log extract;
- device inventory;
- patch and MDM compliance report;
- offline-sync exception report;
- incident register;
- vulnerability-management summary;
- supplier register;
- disaster-recovery test evidence;
- DigiNam verification configuration status;
- annual control-effectiveness report.

This directly reflects the practical **Assess → Design → Implement → Assure** approach in the Accelerate Advisory Services material. [8]

## 20.3 Policy and procedure register

Controlled documents for Buffr Checkpoint as operator and for client deployments.
“Owner” is the party that maintains the controlled copy; clients may adopt Buffr
templates under their own document control.

| ID | Document | Type | Owner | Review cadence | Status |
|---|---|---|---|---|---|
| POL-AM-01 | Asset management policy (ISO 55001 Clause 5) | Policy | Buffr / client | Annual | Template required |
| POL-IS-01 | Information security & privacy policy | Policy | Buffr | Annual | Partial — controls in §13; formal policy text TBD |
| POL-AC-01 | Acceptable use / staff access policy | Policy | Client | Annual | Client-owned |
| POL-RP-01 | Relying-Party Practice Statement | Practice statement | Buffr | Annual or on CSP change | Outline §5.6 — inactive until DigiNam/e-ID live |
| PROC-DEV-01 | Device acquisition, CRAN gate, MDM enrol, retire | Procedure | Buffr ops | Semi-annual | Checklist §14.3a / Part Two §8.2 |
| PROC-INC-01 | Security incident response | Procedure | Buffr | Annual + after incidents | Partial — register exists; playbook TBD |
| PROC-DR-01 | Backup, restore, failover | Procedure | Buffr | Semi-annual test | Align §20.5 |
| PROC-DSAR-01 | Data subject / access request handling | Procedure | Client + Buffr | Annual | Product path FULL; SOP TBD |
| PROC-RET-01 | Retention & deletion execution | Procedure | Client | Annual | Product timers FULL; ops SOP TBD |
| PROC-ONB-01 | Customer onboarding & soft-complete evidence | Procedure | Buffr CS | Annual | Product FULL |
| FORM-ACK-01 | Visitor policy acknowledgement record schema | Form/spec | Buffr product | With schema releases | FULL |
| REG-RISK-01 | Enterprise risk register | Register | Buffr leadership | Quarterly | §19 |
| REG-SUP-01 | Supplier / subprocessor register | Register | Buffr | Quarterly | Assurance pack item |
| REG-DEV-01 | Device compliance register | Register | Buffr / client | Continuous | Required for deploy |

There is **no** Buffr Certificate Practice Statement (CPS) or Certificate Policy
(CP). Those are CSP artefacts under CRAN accreditation. See §5.5–§5.6.

## 20.4 Education and training competence matrix

Competence (ISO 55001 Clause 7) must be evidenced before unsupervised
operation of kiosks, credentials, or compliance exports.

| Role | Module A Privacy & ETA ack | Module B Kiosk ops | Module C Host screening | Module D Devices/MDM | Module E DigiNam/e-ID (when live) | Module F Emergency roster | Frequency |
|---|---|---|---|---|---|---|---|
| Front-desk operator | Required | Required | Awareness | Awareness | Awareness | Required | On hire + annual |
| Host / employee host | Required | — | Required | — | Awareness | Awareness | On hire + annual |
| Site manager | Required | Required | Required | Required | Required when enabled | Required | Annual |
| System administrator | Required | Awareness | — | Required | Required when enabled | Awareness | Annual |
| Compliance / audit officer | Required | Awareness | Awareness | Awareness | Required when enabled | Awareness | Annual |
| Buffr platform support | Required | Required | Awareness | Required | Required | Required | Semi-annual |
| Installer / field tech | Required | Required | — | Required | — | Awareness | Per engagement |

Training delivery may be instructor-led, LMS, or supervised shadowing. Records:
trainee, modules, date, assessor, result. Contractor **safety induction**
(Release 1.5) is a separate product workflow and remains NOT STARTED in
§11.9.0a — do not conflate it with this operator competence matrix.

## 20.5 Continuity practice statement

### Purpose

Keep visitor check-in, host notification intent, and emergency roster
capability available within agreed resilience targets without reverting to an
open shared paper register.

### Scope

In-scope: API, admin, kiosk apps, encrypted offline outbox, notification
outbox, MDM-managed devices, approved telecom channels when live.
Out-of-scope until contracted: client door controllers, non-Buffr IdPs.

### Objectives (PSD-12-inspired — contractual when in scope)

| Objective | Target | Source |
|---|---|---|
| Availability | ≥ 99.9% for critical paths | §13.2 |
| RTO | ≤ 2 hours | §13.2 |
| RPO | ≤ 5 minutes for critical transactional data | §13.2 |
| Recovery tests | ≥ 2 successful tests per year | §13.2; NFR-R07 |

### Strategies

1. **Offline kiosk capture** — SQLCipher outbox; idempotent sync (NFR-R01).
2. **Honest degraded UX** — “notification pending,” never false “host notified” (FR-K11).
3. **Spare devices + MDM** — pre-enrolled cold spare; wipe/reassign procedure.
4. **Secure non-paper continuity kit** — sealed single-use cards; controlled later digitisation (§11.9.8.6).
5. **Telecom** — USSD/SMS only after active provider arrangement; otherwise assisted entry.
6. **Backups** — encrypted backups; restore tested per calendar §20.6.

### Invocation and communication

Incident commander (Buffr ops or client site manager per contract) declares
degraded mode, records incident, notifies affected sites, and opens post-
incident review within five business days.

## 20.6 Accreditation and compliance evidence calendar

| Cadence | Evidence / activity | Owner |
|---|---|---|
| Continuous | Capability register evidence before any public `live`; device CRAN gate | Platform support / ops |
| Weekly | Offline queue age; failed notification review | Ops |
| Monthly | Privileged access review sample; MDM patch compliance | Security |
| Quarterly | Governance cycle §20.1; risk register update; supplier performance | Leadership |
| Semi-annual | DR restore test; installer competence refresh | Ops |
| Annual | Client assurance pack §20.2; AM policy / SAMP review; RPPS review (when active); training renewals | Compliance + CS |
| On CRAN/CSP change | Re-validate trust anchors; marketing wording audit | Product + counsel |
| On statute commencement | Update Regulatory Addendum; re-check signature claims | Product + counsel |

---

# 21. Immediate Decisions Required

1. **Brand clearance**  
   If Buffr Checkpoint must be independent and unrelated to any existing “Buffr” brand, conduct legal and market-confusion clearance before public launch.

2. **Hosting model**  
   Decide:
   - shared Namibia-hosted cloud;
   - private cloud;
   - on-premise;
   - or a hybrid regulated-client model.

3. **Minimum viable channel set**  
   Recommended V1:
   - kiosk/manual;
   - assisted entry;
   - offline cache;
   - QR pre-registration;
   - SMS OTP;
   - NFC badge support.  
   
   Recommended V1.5:
   - USSD.  
   
   Recommended only after formal enablement:
   - DigiNam verification.

4. **NFC credential standard**  
   Decide whether the first contractor badge is:
   - low-risk random token; or
   - cryptographically secure credential for regulated access.

5. **Customer role model**  
   Confirm whether Buffr Checkpoint acts as processor/service provider while each customer remains the primary controller/responsible party for visitor data.

6. **Initial market**  
   Choose three launch verticals only. My recommendation:
   - financial services;
   - government/public offices;
   - healthcare or logistics.

---

# 22. Final Recommendation

The winning architecture is not “NFC-only” and not “USSD-only.”

It is:

> **Kiosk-first. Multi-channel. NFC-forward. Feature-phone inclusive. Risk-based. Offline-resilient. Evidence-led.**

NFC should make the product fast, modern, and future-ready. DigiNam should make higher-assurance identity possible when formally integrated. USSD and SMS should ensure that people with feature phones remain included. Assisted check-in should protect people with no phone, low digital literacy, or accessibility needs.

The platform’s enduring advantage will not be the tablet or the NFC reader.

It will be the fact that Buffr Checkpoint translates a neglected paper process into a properly governed system of:

- privacy;
- identity assurance;
- operational resilience;
- asset lifecycle management;
- access control;
- compliance evidence; and
- inclusive public-service design.

---

## Sources

1. **Electronic Transactions Act Overview** — sections 17, 19, 24, 25, and 33 address legal recognition of data messages, electronic writing/retention, computer evidence, and automated-message systems.  
2. **Payment System Cybersecurity Standards** — PSD-12, especially paragraphs 2, 6, 9–13 on scope, governance, framework requirements, third-party safeguards, monitoring, resilience, incident reporting, and key risk indicators.  
3. **Regulatory Compliance in Namibia Payment Systems** — sections 2.2–2.5, including the current classification context, PSD-12 approach, and stated future regulatory landscape.  
4. **National Payment System Strategy 2030** — Strategic Overview and Table 1: User-Centricity, Trust and Resilience, Digital Enablement, Strategic Foresight and Innovation, and Knowledge Communities.  
5. **NamCode: Namibia’s Corporate Governance Code** — Chapters 1–9 on ethical leadership, governance of risk, IT governance, compliance, internal audit, stakeholder relationships, and integrated reporting.  
6. **Cybersecurity Framework 2.0 Overview** — NIST SP 1308, pp. 4–10, covering the five-profile process: scope, gather information, create profile, analyse gaps/action plan, and continuously manage/evaluate/adjust.  
7. **ISO 55001:2024, ISO 55002, and ISO 55000:2024** — ISO 55001 provides AMS requirements (Clauses 4–10, including SAMP and decision-making); ISO 55002 provides implementation guidance; ISO 55000 provides terminology. See Part One §14.5.  
8. **Technology Risk Advisory Services** — Assess, Design, Implement, Assure, Advise, Train model and the structured assurance methodology.  
9. Public reporting and confirmed instruction establish that DigiNam/NPKI is live nationally; however, Buffr Checkpoint should only claim its own DigiNam integration after relying-party approval, technical integration, and tested operation are complete.  
10. **NIST SP 800-63-4 Digital Identity Guidelines** — IAL / AAL / FAL separation; used only as a mapping aid for V0–V4 (Part One §5.2a), not as a claim of NIST conformance.  
11. **ISO/IEC 29115** — Entity authentication assurance LoA 1–4; mapping aid only.  
12. **Electronic Signature Regulations GN 335/2025** and **Accreditation Regulations GN 953/2025** — basic / advanced / recognised signatures; CSP subscriber certificates; paths under `bon-application-tool/docs/Regulation & Compliance Resources 2/`.  
13. **GN 182/2026 (GG 8949)** and **CRAN GN 401/2026 (GG 8948)** — commencement of ETA s20, Chapter 5, and accreditation regulations (15 June 2026).

---

# Part Two: Regulatory, Government & CRAN Addendum

CRAN, the Communications Act, telecom-service dependencies, and government procurement rules are explicit, binding parts of this blueprint, not optional context. They matter directly because Buffr Checkpoint uses connected tablets, NFC readers, SMS/USSD, and DigiNam/NPKI, and because the go-to-market plan in Section 17 targets government sites.

# Buffr Checkpoint
## Regulatory, Government & CRAN Addendum
**NFC-forward, inclusion-first, government-ready**

## 1. Corrected Regulatory Thesis

Buffr Checkpoint sits at the intersection of five regulatory domains:

```text
Visitor privacy & record keeping
        +
Electronic transactions & evidence
        +
Telecommunications equipment and messaging
        +
Digital public infrastructure and identity
        +
Government procurement and public-sector accountability
```

It is not enough to build a secure kiosk. The product must prove that:

- the connected hardware is lawful to import, sell, and use;
- the SMS/USSD channel is delivered through authorised telecommunications providers;
- DigiNam/NPKI verification is performed only through an approved relying-party model;
- visitor records are retained, accessed, disclosed, and deleted appropriately;
- government deployments can withstand procurement, audit, availability, and data-sovereignty scrutiny.

---

# 2. CRAN and the Communications Act

## 2.1 Why CRAN matters

The **Communications Regulatory Authority of Namibia (CRAN)** regulates electronic communications, spectrum, telecommunications licensing, and type approval of telecommunications equipment under the **Communications Act 8 of 2009**.

For Buffr Checkpoint, CRAN is relevant in four places:

1. **Connected hardware** — tablets, cellular routers, Wi-Fi devices, Bluetooth/NFC readers, and similar equipment.
2. **NFC/RFID devices** — especially imported readers, badges, and access-control peripherals.
3. **USSD/SMS services** — which must run through licensed operators or authorised aggregators.
4. **DigiNam/NPKI** — where CRAN operates the Root Certification Authority within the national digital-trust ecosystem.

## 2.2 Type approval: a launch gate, not an afterthought

CRAN’s type-approval regime generally applies to telecommunications equipment intended to be imported, sold, offered for sale, connected to, or used with an electronic communications network in Namibia.

### Implications for Buffr Checkpoint

| Component | Likely CRAN consideration | Required action |
|---|---|---|
| Android tablet with Wi-Fi, Bluetooth, and/or SIM | Telecommunications equipment | Procure locally type-approved models or obtain and retain type-approval evidence per SKU. |
| Cellular router / 4G or 5G backup device | Telecommunications equipment | Confirm CRAN type approval before import or deployment. |
| Bluetooth NFC reader | Potentially telecommunications equipment | Confirm whether the exact model is approved or exempt. |
| USB NFC reader | May fall outside some radio-device requirements, but must be assessed by device specification | Obtain a vendor declaration and confirm CRAN status. |
| NFC tags and cards | Generally low-power, short-range device category | Confirm chip frequency/power and whether the exact product falls within an exemption. |
| Badge printer | Usually not a telecom concern unless it includes wireless connectivity | Review the wireless component, if any. |
| Kiosk mount / privacy filter / UPS | Not a communications device | Manage through normal hardware procurement and asset management. |

CRAN’s regulations indicate that **13.56 MHz NFC tag/card readers operating within specified low-power limits may be exempt**. However, this is **not a blanket exemption for every product**. Buffr Checkpoint must confirm the specific device’s frequency, radiated power, connectivity features, and import/sale status before relying on any exemption. [1]

### Product requirement: Device Compliance Register

Add a mandatory device registry to the architecture:

```text
Device Compliance Register
    ├── Manufacturer
    ├── Model / SKU
    ├── Serial number
    ├── Site assignment
    ├── Radio features: Wi-Fi / Bluetooth / NFC / cellular
    ├── CRAN certificate number or exemption assessment
    ├── Importer / supplier evidence
    ├── Firmware version
    ├── Warranty and support expiry
    ├── MDM enrolment status
    └── Disposal / secure wipe evidence
```

**No unregistered device should be deployable.**

This is both a CRAN compliance control and an ISO 55001/55002-aligned asset-management control.

---

# 3. USSD, SMS and Telecoms Regulation

## 3.1 The correct operating model

Buffr Checkpoint should **not attempt to become a telecommunications operator**.

It should procure SMS and USSD capability through:

- MTC;
- Telecom Namibia / TN Mobile where available;
- an authorised local aggregator;
- or another provider operating through lawful carrier arrangements.

USSD and SMS are **services**, not devices. The legal question is therefore not equipment type approval, but whether Buffr Checkpoint is using appropriately licensed telecom infrastructure and whether its commercial structure accidentally turns it into an unlicensed reseller or communications-service provider.

## 3.2 Recommended architecture

```text
Feature-phone visitor
        ↓
USSD / SMS
        ↓
Licensed mobile network operator
        ↓
Approved local messaging / USSD aggregator
        ↓
Buffr Checkpoint Telecoms Adapter
        ↓
Visitor record + audit log + notification workflow
```

### Do not build this:

```text
Feature phone → Buffr Checkpoint directly → mobile network
```

Buffr Checkpoint should not operate carrier infrastructure, spectrum, or an unlicensed messaging gateway.

## 3.3 Telecom controls

| Risk | Control |
|---|---|
| USSD is unavailable on one network | Use operator-agnostic adapter design and retain assisted kiosk check-in as universal fallback. |
| USSD session times out | Save no incomplete personal information unless explicitly confirmed; allow restart with one-time session reference. |
| SMS exposes sensitive information on a lock screen | Use neutral messages: “Your visit has been recorded,” not name, ID, host, or visit purpose. |
| SIM-swap or recycled-number risk | Treat SMS/USSD as **V1 possession confirmation**, not identity verification. |
| Short-code dependency | Contractually define availability, escalation, data handling, delivery reporting, and exit rights. |
| Messaging provider stores PII offshore | Map data flow, subprocessors, logs, and backups before claiming Namibia-only hosting. |
| SMS/USSD costs escalate | Meter usage by customer/site and include transparent pass-through or bundled allowances. |

## 3.4 Feature-phone control design

A feature-phone visitor can absolutely use Buffr Checkpoint, but the product must not confuse accessible check-in with high-assurance identity verification.

```text
USSD check-in = visitor has access to a SIM/session
SMS OTP = visitor controls the stated phone number
NFC tag = visitor holds a credential
DigiNam/NPKI = identity can be cryptographically verified, if enabled
```

Each result should be visibly labelled in the staff interface.

---

# 4. DigiNam, NPKI and CRAN Root CA

## 4.1 The opportunity

DigiNam/NPKI creates national digital-trust infrastructure for authentication, secure identity, certificates, and related trust services. Public reporting identifies CRAN as the **Root Certification Authority**. [2]

This is strategically relevant to Buffr Checkpoint because physical visitor access increasingly needs a trusted answer to:

> “Who is this person, and what evidence supports that conclusion?”

## 4.2 The critical distinction

There are three different claims:

| Claim | Status |
|---|---|
| **National PKI programme milestones (CRAN roadmap)** | Root CA, regulations, Go Live, and first CSP (**MHAISS for e-ID**) are presented as completed/ongoing at national level — cite CRAN slides, not Buffr marketing. |
| **Buffr Checkpoint can technically connect as relying party** | Possible only after RP onboarding note, interface spec, and integration requirements are confirmed. |
| **Buffr Checkpoint is DigiNam-integrated and verifies visitors** | Only true after formal enablement, testing, and operating evidence exist (`diginam_verification` → public `live`). |

Therefore, until integration is live, the public site must say:

> “Designed to support DigiNam/NPKI verification, subject to approved relying-party integration.”

It should **not** say:

> “DigiNam Verified” or “DigiNam Integrated — Live”

unless a real verification transaction can be demonstrated in a controlled production environment.

## 4.3 Relying-party model

Buffr Checkpoint’s intended role should be:

```text
CRAN (Root CA)
         ↓
Accredited CSP — MHAISS (e-ID issuance; first accredited per CRAN roadmap)
         ↓
Approved verification response / credential
         ↓
Buffr Checkpoint as relying-party platform (visitor management — not a CSP)
         ↓
Client organisation as access decision-maker
```

Buffr Checkpoint should not become a certification service provider, certificate issuer, or identity authority unless it deliberately elects to take on those much larger regulatory obligations. MHAISS's CSP accreditation is the **national e-ID issuance** lane; Buffr's lane is **relying-party verification at check-in**, subject to separate onboarding.

## 4.4 DigiNam integration requirements

Before launch of a DigiNam verification feature:

1. Confirm the approved technical interface.
2. Confirm relying-party registration requirements.
3. Confirm whether a client organisation, Buffr Checkpoint, or both must be registered.
4. Confirm certificate-validation, revocation, and expiry requirements.
5. Complete a privacy/data-flow assessment.
6. Confirm exactly which identity attributes can be requested.
7. Retain only the minimum verification outcome.
8. Complete penetration and interoperability testing.
9. Define incident escalation with CRAN, the identity provider, and the client.
10. Update the customer contract, privacy notice, and audit evidence pack.

---

# 5. Electronic Transactions Act: Record Keeping and Evidence

**Primary source:** *Electronic Transactions Act 4 of 2019* (Act No. 4 of 2019,
Government Gazette 7068). Annotated LAC copy (2026):
`bon-application-tool/docs/Regulation & Compliance Resources 2/Electronic Transactions Act 4 of 2019.pdf`.

The Act is central to the legal defensibility of digital visitor records,
check-in acknowledgements, audit exports, and offline-sync evidence packs.

## 5.0 Commencement and in-force map (verified 2026-09-14)

| Provision | Topic | Commencement | Buffr Checkpoint relevance |
|---|---|---|---|
| **Ch1–2, Ch3 (except s20), Ch6–7** | Core electronic transactions frame | **16 March 2020** — GN 75/2020 (GG 7142) | Data messages (s17), writing (s19), retention (s24), computer evidence (s25), automated systems (s33). |
| **s20** | Electronic signature / recognised electronic signature | **15 June 2026** — GN 182/2026 (GG 8949) | Legal writing/signing may reference **recognised electronic signatures** where regulations satisfied. Kiosk default remains below that bar. |
| **Chapter 5** | Accreditation of security services/products | **15 June 2026** — GN 182/2026 (GG 8949) | CRAN (**Authority**) accredits CSPs; public accreditation database (s43); MHAISS e-ID CSP accreditation now has statutory basis. |
| **Chapter 4** | Consumer protection (e-commerce) | **Not commenced** (per LAC annotated statute) | Not the primary frame for B2B visitor management. |
| **s59** | Repeal of Computer Evidence Act 32/1985 | With first commencement tranche | s25 is the primary computer-evidence frame. |

### Subsidiary regulations (in force with s20 / Ch5)

| Instrument | Gazette | Commencement trigger |
|---|---|---|
| **Electronic Signature Regulations** | GN 335/2025 (GG 8814) | Date of commencement of **section 20** → **15 June 2026** |
| **Accreditation Regulations** | GN 953/2025 (GG 8808) | CRAN **General Notice 401/2026** (GG 8948) — same date as s20 and Ch5 |

### Key definitions (s1) for identity and PKI work

| Term | Statutory meaning | Buffr posture |
|---|---|---|
| **Authority** | CRAN (Communications Act 8 of 2009 s4) | CRAN accredits security products/services under Ch5 (now in force). |
| **certification service provider** | Person accredited under s42 + Accreditation Regulations reg 6 | MHAISS holds first CSP accreditation for e-ID (CRAN roadmap). Issues **subscriber certificates**. |
| **electronic signature** | Data attached to or associated with a data message to identify a person and indicate approval/intention | Kiosk tap/draw may be a **basic electronic signature** — not automatically **recognised**. |
| **recognised electronic signature** | Advanced electronic signature meeting s20(3) and **Signature Regulations reg 8** — including subscriber certificate from accredited CSP after identification per Accreditation Regulations reg 30 | **Not** the default v1 kiosk claim. Requires accredited CSP integration path. |
| **relying party** | Person that may act on the basis of a digital certificate or electronic signature (Signature Regulations reg 1) | Buffr Checkpoint's intended statutory role for DigiNam/e-ID verification — distinct from CSP issuance. |
| **security service** | Includes **issuing of digital certificates** (s41) | MHAISS = issuance lane. Buffr = relying party only unless deliberately electing CSP obligations. |
| **accredit** | Accredit under Chapter 5 | Buffr must not hold out CSP accreditation it does not hold (s48). |

## 5.1 Architecture implications

Every visitor record should include:

```text
Visit ID
Organisation ID
Site ID
Device ID
Capture channel
Check-in timestamp
Server acceptance timestamp
Offline capture indicator
Identity assurance level
Verification provider/reference, if applicable
Host / sponsor
Purpose category
Consent or notice-acknowledgement record where needed
Check-out timestamp
Retention policy version
Audit-event references
```

## 5.2 Evidence requirements

The system must be capable of producing:

- an authenticated visitor record;
- the configuration/policy in force at the time;
- the identity-assurance result;
- the device and operator involved;
- the access history;
- whether it was captured offline;
- when it was synchronised;
- whether it was amended;
- who amended it and why;
- proof of retention or deletion action.

This is how Buffr Checkpoint becomes more than a reception tool: it becomes **defensible evidence infrastructure**.

## 5.3 Kiosk acknowledgement vs electronic signature (binding default)

**Section 20 and the Electronic Signature Regulations are in force** (15 June
2026). That changes the legal landscape but **does not change Buffr's default
product posture:**

| Capture type | ETA classification (typical) | Buffr v1 claim |
|---|---|---|
| Kiosk tap / drawn mark on policy screen | May qualify as **basic electronic signature** (Signature Regulations reg 3) | **VisitorPolicyAcknowledgement** — audit evidence only |
| Advanced signature with qualifying device + CSP path | **Advanced electronic signature** (regs 6–7) | Not shipped in v1 kiosk |
| Law requires "recognised electronic signature" | **Reg 8:** AES + **subscriber certificate** from accredited **certification service provider** after identification (Accreditation Regulations reg 30) | **Not claimed** until integrated and counsel-approved |

Reserve `digital_signature` as an `acknowledgement_method_code` for a future
confirmed recognised-signature path only. Schema: `visitor_policy_acknowledgements`
with `capture_channel_code` and `site_id` (migration `0015`).

## 5.4 Chapter 5 accreditation and CRAN/MHAISS (now in force)

**Chapter 5 commenced 15 June 2026** (GN 182/2026). CRAN (the **Authority**)
accredits security products, services, and providers (s41–42); maintains a
**public accreditation database** (s43(2)); offences apply for holding out
unaccredited status (s48). **Accreditation Regulations GN 953/2025** are
operational (General Notice 401/2026, GG 8948).

CRAN's July 2026 roadmap — **MHAISS as first accredited CSP for e-ID rollout**
— now sits on an **in-force statutory and regulatory base**. That still does
**not** automatically:

- grant Buffr Checkpoint relying-party onboarding or API access;
- move `diginam_verification` or `national_eid_nfc` to public `live` without tested integration evidence;
- make kiosk tap-and-draw a recognised electronic signature.

**Still required for Buffr product claims:** written **relying-party onboarding
note**, technical interface specification, and capability-register evidence
(Regulatory Addendum §6.2). **Chapter 4** (consumer e-commerce) remains
not commenced — do not rely on cooling-off provisions for visitor check-in.

## 5.5 Certificates vs signatures vs acknowledgements vs assurance (full scope)

This section is binding. It separates four concepts that must never be marketed
as the same thing.

### 5.5.1 Concept definitions

| Concept | What it is | Primary authority | Buffr Checkpoint role |
|---|---|---|---|
| **Digital / subscriber certificate** | PKI credential issued by an accredited **certification service provider** under CRAN Root CA hierarchy | ETA Ch5; Accreditation Regulations; Signature Regulations | Trust consumer / relying party — **not** issuer unless deliberately electing CSP obligations |
| **Basic electronic signature** | Data associated with a data message that identifies a person and indicates intention (Signature Regulations reg 3) | ETA s20; Signature Regulations | Kiosk tap/draw **may** qualify; product still stores **acknowledgement evidence** only |
| **Advanced electronic signature** | Meets uniqueness, objective identification, sole control, and integrity-detection attributes (regs 6–7) | ETA s20(3); Signature Regulations | Not shipped in v1 kiosk |
| **Recognised electronic signature** | Advanced signature created with a **subscriber certificate** from an accredited CSP after identification (reg 8; Accreditation Reg 30) | ETA s20; Signature Reg 8 | **Out of default scope** until integrated path + counsel approval |
| **VisitorPolicyAcknowledgement** | Product artefact: policy version shown, method, timestamps, channel, site, device | Buffr schema + ETA s17/s19/s24/s25 record integrity | **Default** for privacy/policy screens |
| **Identity assurance V0–V4** | Outcome of how the visitor was identified or possession-checked | Part One §5.2 / §5.2a | Orthogonal to signature class |

### 5.5.2 When each signature level is required

| Situation | Required level | Buffr v1 claim |
|---|---|---|
| Show privacy notice / site visitor policy before capture | Acknowledgement evidence (audit) | **Required** — VisitorPolicyAcknowledgement |
| Internal host approval of a visit | Access decision record — not an e-signature | Host approve/reject audit event |
| Statute or contract requires “electronic signature” without specifying type | Often advanced or recognised depending on instrument — **counsel decides** | Do not auto-upgrade kiosk tap |
| Statute or contract requires “recognised electronic signature” | Recognised (reg 8) | **Not claimed**; blocked until CSP subscriber-certificate path |
| DigiNam / e-ID verification of identity | Identity assurance V3/V4 outcome | Verification reference only — not a signature act |
| Issuing subscriber certificates to the public | CSP accreditation + CPS/CP under CRAN | **Out of Buffr Checkpoint product scope** |

### 5.5.3 Claim rules (marketing and UI)

**Permitted**

- “Visitor acknowledgements are retained as audit evidence under the Electronic Transactions Act record-keeping and computer-evidence provisions.”
- “Recognised electronic signatures require an accredited certification service provider path; Buffr Checkpoint’s default kiosk capture is acknowledgement evidence.”
- “MHAISS is Namibia’s first accredited CSP for e-ID rollout (national fact).”

**Forbidden**

- “Legally binding e-signatures on every check-in.”
- “Buffr Checkpoint is a CRAN-accredited certification service provider” (unless true).
- “Kiosk tap equals recognised electronic signature.”
- Conflating V3/V4 identity verification with signing a contract.

### 5.5.4 Relationship diagram (narrative)

CRAN Root CA → accredited CSP (e.g. MHAISS) → subscriber certificate → may underpin a **recognised** electronic signature. Buffr Checkpoint, as a **relying party**, may later verify DigiNam/e-ID assertions and record V3/V4 outcomes. Separately, the kiosk records VisitorPolicyAcknowledgement. Those pipelines share audit discipline; they do not share statutory meaning.

## 5.6 Relying-Party Practice Statement (outline — not a CSP CPS/CP)

Buffr Checkpoint does **not** publish a Certification Practice Statement or
Certificate Policy. Those artefacts belong to accredited **certification
service providers**. This section is the controlled outline of Buffr’s
**Relying-Party / Verification Practice Statement (RPPS)** for DigiNam/NPKI
and national e-ID verification once formally enabled.

### 5.6.1 Mandatory clauses (to be completed before any public `live` claim)

| Clause | Content required |
|---|---|
| 1. Purpose and scope | Visitor identity verification for check-in / access decisions; Namibia sites only unless amended |
| 2. Buffr role | Relying party / verifier — not CSP, not Root CA, not subscriber-certificate issuer |
| 3. Trust anchors | CRAN Root CA trust store; approved CSP certificates; pinning/update procedure |
| 4. Onboarding | Written RP agreement; interface specification; interoperability test evidence (Addendum §6.2) |
| 5. Verification process | Request → CSP/IdP response → store **outcome_code**, **outcome_reference**, **assurance_level**, **expires_at**, optional **released_attribute_codes** only |
| 6. Prohibited retention | No full credential payloads, biometrics templates, or private keys in Buffr stores |
| 7. Revocation / status checking | Intended OCSP/CRL or provider status API — method recorded before go-live |
| 8. Mapping to V0–V4 | DigiNam success → V3; official e-ID crypto success → V4; failure → no upgrade from prior level |
| 9. Permitted claims | Capability register `live` only with evidence_reference; marketing wording matrix §6.4 |
| 10. Forbidden claims | CSP accreditation; recognised e-signature by default; government endorsement logos without approval |
| 11. Incident response | Compromise of verifier keys, false accept/reject, supplier outage — notify path and register |
| 12. Evidence retention | Align with client retention policy version + ETA s24; annual RPPS review |

### 5.6.2 Activation gate

The RPPS is **inactive** until: (a) written RP onboarding note exists, (b)
technical interface is tested, (c) `platform_capability_approvals` for
`diginam_verification` and/or `national_eid_nfc` has public status `live` with
evidence, and (d) each organisation enables the capability in
`organisation_capability_enablement`. Until then, public status remains
`not_available` / `targeted` and adapters must return honest unavailability.

---

# 6. CRAN PKI Stakeholder Engagement (July 2026)

Source: CRAN presentation *Namibia's PKI Infrastructure Overview*, 16 July
2026 (Mrs Josephine Shigwedha — regulatory/legal; Elton Witbooi — NPKI
programme). Slides include the **National Root CA Implementation Journey**
roadmap and programme status markers. They confirm **national programme
milestones** (including MHAISS as first accredited CSP for e-ID rollout);
they do **not** publish Buffr Checkpoint's relying-party onboarding path or
verification API specifications.

## 6.0 National Root CA Implementation Journey (CRAN roadmap)

CRAN's presentation depicts seven programme steps. Status markers below are
**as shown on CRAN slides** (July 2026); Buffr records them as national
context, not as product capability claims.

| Step | Programme phase | CRAN slide status | Confirmed detail (slides) |
|---|---|---|---|
| 1 | Policy & Governance | **Completed** | PKI policy and governance framework; roles, mandates, operating model |
| 2 | Legislation & Regulation | **Completed** | Electronic signature regulations finalised; accreditation regulations operationalised |
| 3 | Root CA & Trust Infrastructure | **Completed** | National Root CA set up and secured; testing / SAT completed |
| 4 | Accreditation of CSPs | **Ongoing** | **First CSP accredited: MHAISS — for purposes of rolling out e-IDs**; additional CSP onboarding and assessment ongoing |
| 5 | Adoption & Integration | **Completed** | Government first use cases (e-ID, e-signatures, e-services); capacity and awareness |
| 6 | Go Live | **Completed** | Launch trusted services and e-IDs; monitor performance and reliability |
| 7 | Sustain, Assure & Evolve | **Ongoing** | Continuous monitoring, audit, improvement; innovation and new trust services |

**Buffr interpretation rule:** Steps 1–6 describe the **national PKI/e-ID
programme**. They do **not** automatically satisfy Buffr's four-layer test for
product marketing. MHAISS CSP accreditation answers **who may issue e-ID
credentials nationally**; Buffr still requires a **relying-party onboarding
note**, interface specification, and capability-register evidence before
`national_eid_nfc` or `diginam_verification` may move to public `live`.

## 6.1 Four-layer separation (governing rule)

| Layer | What Buffr may say | Evidence required |
|---|---|---|
| National NPKI / DigiNam direction | "Namibia is building NPKI under CRAN as Root CA; MHAISS is the first accredited CSP for e-ID rollout per CRAN roadmap" | CRAN presentation slides |
| National infrastructure operational facts | Root CA, regulations, Go Live, MHAISS CSP accreditation — **as confirmed on CRAN slides**; revocation/RP API details still need written onboarding note | CRAN slides + follow-up written confirmation for interface specifics |
| Buffr relying-party integration | "Built to support DigiNam/NPKI verification where formally enabled" | Approved RP arrangement + tested interface |
| Forbidden without approval | "DigiNam integrated/verified", "National e-ID NFC live on Buffr", "Government identity verification via Buffr today" | Platform capability `live` + org enablement |

## 6.2 Post-presentation artifact requests

After the CRAN session, request in writing:

1. **Relying-party integration/onboarding note** for DigiNam/NPKI.
2. **Device category assessment** for kiosk BOM (Android tablet, NFC readers, cellular router, badge printer, enclosure, UPS).
3. **Telecom/USSD provider guidance note** for lawful feature-phone inclusion.

Update the capability register and roadmap **only** from confirmed answers.

## 6.3 CRAN presenter questions (official engagement script)

### A. National PKI and DigiNam operational status

> **Partial answer from CRAN roadmap slides (July 2026):** Root CA operational
> (Step 3 completed); Electronic Signature and Accreditation Regulations
> finalised/operationalised (Step 2); Go Live for trusted services and e-IDs
> (Step 6); **MHAISS accredited as first CSP for e-ID rollout** (Step 4,
> ongoing for additional CSPs). Remaining gaps for Buffr: relying-party API
> spec, revocation-check interface, attribute release rules, and written
> onboarding path — still require Q2–Q5 and artifact §6.2.

1. What is live today in the National PKI ecosystem (Root CA, accredited CSPs, issuance, revocation checking, recognised e-signatures, identity verification services, relying-party APIs, DigiNam credentials)?
2. Can a private visitor-management platform become a relying party? Registration path, sandbox/pilot/production onboarding, contractual and technical requirements.
3. What exact verification service can a relying party consume (OCSP, CRL, chain validation, signed assertions, QR, mobile wallet, NFC/e-ID, REST/SOAP/mTLS)?
4. What minimum data may a relying party request and retain? Preferred outcome: credential valid + assurance level + opaque verification reference + timestamp — not raw identity records, certificates, biometrics, or chip contents.
5. Confirm the difference between "DigiNam/NPKI is live" and "a private relying party is approved to verify identities."

### B. Electronic signature and record-keeping

6. Which ETA provisions and regulations are in force as at July 2026? Gazette numbers, commencement dates, accredited CSP existence.
   **Answer (verified):** GN 75/2020 (16 March 2020) for most provisions;
   **GN 182/2026 (GG 8949, 15 June 2026)** for **s20 + Ch5**; Signature
   Regulations GN 335/2025 and Accreditation Regulations GN 953/2025 in force
   with s20/Ch5; CRAN GN 401/2026 (GG 8948) for accreditation-reg commencement.
   **Ch4 still not commenced.** MHAISS CSP accreditation aligns with in-force Ch5.
7. Does a touchscreen kiosk signature count only as acknowledgement evidence, or can it qualify as a recognised electronic signature?
8. Required evidence fields for policy acceptance (policy id/version, content hash, language, display/acceptance timestamps, channel, device, site, visitor reference, signature/ack reference, integrity evidence).
9. CRAN recommended standard for time-stamping, certificate validation, revocation checks, and evidence preservation.
10. Relying-party obligation when a certificate is later revoked (OCSP/CRL at each verification, cache, retain response, re-check at access decision, revalidate before evidence pack).

### C. Accreditation and CSP boundary

> **Partial answer from CRAN roadmap:** MHAISS holds the first CSP
> accreditation for e-ID issuance. Buffr Checkpoint's visitor-management
> platform is architected as a **relying party**, not a CSP — but Q11–Q14
> should still be confirmed in writing before any "integrates with accredited
> CSPs" marketing beyond design posture.

11. Does Buffr Checkpoint require CSP accreditation if it only verifies credentials issued by an accredited provider?
12. What constitutes a "security service" under ETA Chapter 5?
13. Are site-issued NFC badges security products requiring accreditation?
14. Can an organisation use internal NFC credentials without becoming a CSP?
15. Permitted marketing wording ("NPKI-ready", "designed for DigiNam verification", "supports certificate validation", "integrates with accredited CSPs", "verified digital identity").
16. Logo/name use of CRAN, DigiNam, NPKI, Root CA — prior approval requirements.

### D. National e-ID and NFC

> **Partial answer from CRAN roadmap:** MHAISS accredited as first CSP for
> e-ID rollout; Go Live step marked completed for trusted services and e-IDs
> at programme level. Buffr still needs Q17–Q21 answers for kiosk read path,
> NFC protocols, and offline/revocation rules before `national_eid_nfc` moves
> beyond `not_available`.

17. Official status of physical National e-ID smart card rollout.
18. NFC vs contact smart-card technology.
19. Standards/protocols (ISO/IEC 14443, NFC Forum, PACE, BAC, EAC, PKI chain, reader authentication, mobile NFC, kiosk reader requirements).
20. Can a private kiosk read the e-ID directly? Reader certification, government SDK, consent, data vs cryptographic assertion only.
21. Offline e-ID verification — must not present offline tap as "verified" if revocation requires connectivity.
22. Approved fallback for people without e-ID (assisted entry, visual ID check, USSD/SMS, org NFC badge, pre-registration, QR invitation).

### E. CRAN type approval and device governance

23. Type-approval or exemption position for kiosk BOM categories.
24. Low-power 13.56 MHz NFC/RFID exemption applicability.
25. Documentation if device is exempt rather than type approved.
26. Preferred evidence format for supplier declarations and type-approval certificates.
27. Platform vs customer organisation as importer/holder of compliance documentation.
28. Additional requirements for SIM/cellular/Bluetooth/Wi-Fi devices.

### F. USSD, SMS and feature-phone inclusion

29. Can Buffr obtain a USSD short code directly or only via licensed operator/aggregator?
30. Operators/aggregators for multi-network USSD in Namibia.
31. Approval, commercial, technical, security, and data-processing arrangements.
32. Zero-rating for visitors in public-service contexts.
33. Local-language USSD menus.
34. Session timeout, payload, menu depth, throughput, availability constraints.
35. Webhook authentication controls (source IP, mTLS, signed payloads, replay protection, carrier session reference, test environment).
36. SMS as confirmation/fallback — privacy safeguards; neutral message body only (reference, no host/ID/health/access details).

## 6.4 Permitted marketing wording

| Phrase | Allowed when |
|---|---|
| "NPKI-ready" / "designed for DigiNam verification where formally enabled" | Always (design posture) |
| "Supports certificate validation" | Architecture docs only until interface confirmed |
| "Integrates with accredited CSPs" | After written RP onboarding note (MHAISS CSP accreditation confirms national issuance lane exists; Buffr integration still separate) |
| "Verified digital identity" / "DigiNam verified" | Capability register `live` + org enablement + real verification transaction |
| CRAN/DigiNam/NPKI logos | CRAN prior approval only |

---

# 7. Government Regulations and Public-Sector Go-to-Market

## 7.1 Public Procurement Act

For government customers, the **Public Procurement Act 15 of 2015** is a commercial-entry framework. It governs how public bodies procure goods and services and expressly contemplates the use of ICT in procurement. [4]

This does not regulate visitor data directly, but it shapes the sales strategy.

### Government procurement implications

| Requirement | Buffr Checkpoint response |
|---|---|
| Formal tenders and evaluations | Build a tender-ready technical and compliance pack. |
| Clear specifications | Publish a standard technical architecture and device bill of materials. |
| Price scrutiny | Offer transparent subscription, hardware purchase, hardware lease, and support pricing. |
| Local support requirements | Build Namibia-based deployment, maintenance, training, and support capability. |
| Long-term maintainability | Include source-code escrow or continuity provisions for high-value public deployments where appropriate. |
| Data sovereignty | Provide clear hosting, backup, subprocessor, and exit documentation. |
| Audit expectations | Include audit logs, evidence pack, SLA reporting, and annual assurance review. |

## 7.2 Access to Information Act

The **Access to Information Act 8 of 2022** has been enacted but, according to available legal sources, has not yet commenced by Gazette notice. [5]

Public bodies should still prepare for the tension between:

- transparency and access-to-information requests; and
- visitor privacy, security, and confidentiality.

### Product requirement for public bodies

Buffr Checkpoint should support:

- record classification;
- role-specific disclosure workflow;
- redacted exports;
- legal holds;
- reason-coded disclosure;
- audit logging of every export;
- data-minimised reports;
- a process for separating public-information requests from private visitor data.

A public body should never resolve an access-to-information request by exporting a full unredacted visitor register.

## 7.3 National Digital Strategy and DPI

Namibia’s National Digital Strategy 2025–2028 emphasizes digital transformation, citizen-centric services, digital literacy, and bridging the digital divide. [6]

This reinforces the product’s channel strategy:

> A digital public-service tool that only works for smartphone owners fails the digital-inclusion test.

USSD, SMS, assisted check-in, offline capture, accessibility options, and multilingual interfaces are not secondary product features. They are strategic necessities.

---

# 7. Revised Architecture: Regulatory and Government Layer

Add a dedicated **Regulatory, Trust and Government Services Layer** to the architecture.

```text
Visitor Channels
NFC · QR · Kiosk · Assisted Entry · USSD · SMS
                    │
                    ▼
Site Edge Application
Android kiosk · encrypted local cache · NFC reader · MDM
                    │
                    ▼
Core Checkpoint Platform
Visit workflow · RBAC · retention · audit · emergency roster
                    │
       ┌────────────┼──────────────────┐
       ▼            ▼                  ▼
Identity Layer   Telecoms Layer   Government/Regulatory Layer
DigiNam/NPKI     SMS / USSD       Evidence packs
e-ID when        licensed         record classification
approved         operator adapter public-sector reporting
                    │
                    ▼
Data Protection & Asset Layer
Namibia-hosted data · encryption · backup · device compliance register
```

## 7.1 New mandatory architecture components

| Component | Purpose |
|---|---|
| **CRAN Device Compliance Register** | Tracks device approvals/exemptions, models, serials, firmware, and site location. |
| **Telecoms Adapter Layer** | Separates USSD/SMS providers from core business logic; supports provider substitution. |
| **DigiNam Verification Adapter** | Handles approved identity requests, verification outcomes, and audit references. |
| **Public-Sector Tenant Policy** | Supports government-specific retention, reporting, disclosure, legal-hold, and approval workflows. |
| **Evidence Pack Generator** | Produces regulator/audit-ready reports without exposing unnecessary visitor PII. |
| **Third-Party Register** | Tracks cloud, messaging, MDM, NFC, support, and identity dependencies. |
| **Asset Lifecycle Register** | Manages hardware ownership, support, patching, replacement, disposal, and secure wipe. |

---

# 8. ISO 55001 / ISO 55002: Revised Asset Management Model

The CRAN dimension makes asset management even more central.

Buffr Checkpoint must manage the entire device estate — not simply deploy tablets.

## 8.1 Asset lifecycle with CRAN gate

```text
1. PLAN
   Risk assessment, site need, connectivity, data fields, verification model

2. SELECT
   Hardware, NFC reader, MDM, connectivity and supplier due diligence

3. VERIFY
   CRAN type approval / exemption assessment before import or deployment

4. ACQUIRE
   Asset tag, serial capture, supplier warranty, configuration baseline

5. DEPLOY
   MDM enrolment, encrypted kiosk app, role policy, acceptance testing

6. OPERATE
   Check-in, identity verification, offline sync, notification, access records

7. MAINTAIN
   Security patches, reader tests, certificate renewal, backup/recovery tests

8. ASSURE
   Access review, retention test, device compliance review, audit reporting

9. RETIRE
   Credential revocation, cryptographic wipe, MDM removal, disposal certificate
```

## 8.2 Asset acceptance checklist

Before a device reaches a customer site:

- [ ] Model/SKU assessed for CRAN type approval or exemption.
- [ ] Supplier evidence stored in Device Compliance Register.
- [ ] Device asset-tagged and assigned to a site.
- [ ] MDM enrolled and kiosk mode enabled.
- [ ] OS and firmware are supported and patched.
- [ ] Full-disk encryption enabled.
- [ ] Local encrypted cache tested.
- [ ] NFC reader tested against approved credential types.
- [ ] Privacy screen and mount installed where required.
- [ ] UPS/power backup assessed for critical sites.
- [ ] Offline-to-online sync tested.
- [ ] Secure wipe procedure tested.
- [ ] Replacement/spare-device process documented.

## 8.3 Documented-information cross-reference (ISO 55001:2024)

Part One §14.5 is the full Clause 4–10 register. For CRAN-gated devices, the
following artefacts are mandatory before `approved_for_deployment`:

| Artefact | Purpose |
|---|---|
| Device Compliance Register entry | CRAN type approval / exemption evidence |
| Asset tag + serial capture | Traceability |
| MDM enrolment record | Operational control |
| Acceptance test log (offline sync, NFC, wipe) | Deploy gate |
| Competence record for installer/operator | ISO 55001 Clause 7 |
| Secure wipe / retirement certificate | Lifecycle end |

Do not treat ISO 55002 as a certification claim; use it as guidance when
implementing the register for each client estate.

---

# 9. Revised Risk-Based Access Model

## 9.1 Channel and verification decisions by risk

| Context | Check-in channel | Identity assurance | Access decision |
|---|---|---|---|
| Small SME visitor | Kiosk, assisted, QR, USSD | V0/V1 | Reception check-in |
| Rural government office | Kiosk, USSD, SMS, assisted | V0/V1 | Staff notification |
| Bank branch visitor | Kiosk, QR, NFC, assisted | V1; V3 where required | Host/security approval |
| Contractor / supplier | NFC badge, kiosk, assisted | V2/V3 | Schedule and sponsor validation |
| Sensitive government meeting | Pre-registration, DigiNam, NFC | V3 | Explicit host approval |
| Critical infrastructure site | Pre-registration, approved credential, NFC | V3/V4 | Security-led approval, badge, escort |

## 9.2 What the RBA must not do

- Automatically deny people because they lack e-ID.
- Deny a feature-phone user access simply because they cannot tap NFC.
- Treat SMS receipt as confirmed identity.
- Collect an ID number for every ordinary visit.
- Apply facial recognition by default.
- Treat DigiNam verification as a substitute for access authorisation.
- Send sensitive visit information through SMS/USSD.

---

# 10. Revised Business Plan: Commercial Advantage

## 10.1 The differentiated offer

Most competitors will sell one of two things:

1. a digitised visitor book; or  
2. an overseas visitor-management SaaS product.

Buffr Checkpoint should sell:

> **A Namibia-ready visitor trust and evidence platform.**

Its differentiated components are:

- inclusion for smartphone, feature-phone, and no-phone visitors;
- NFC for speed and recurring credentials;
- locally governed telecommunications integration;
- offline-first operation;
- DigiNam/NPKI verification pathway;
- CRAN-aware connected-device management;
- public-sector procurement readiness;
- data retention, audit, and evidence capabilities;
- assurance services beyond initial installation.

## 10.2 Best initial verticals

| Vertical | Why it fits |
|---|---|
| **Banks / financial institutions** | PSD-12-informed resilience, privacy, audit, visitor oversight, branch footprint. |
| **Government service locations** | Public trust, high footfall, feature-phone inclusion, DigiNam relevance, procurement opportunity. |
| **Healthcare** | Sensitive visitor contexts, privacy, emergency management, controlled access. |
| **Mining / logistics / utilities** | Contractors, gates, vehicles, safety induction, NFC credentials, offline sites. |
| **Multi-site corporates** | Easier procurement, strong reference value, measurable operational efficiency. |

## 10.3 Government tender pack

Before entering government tenders, prepare a standard package:

1. Company registration and tax documents.
2. Technical architecture.
3. Security architecture.
4. CRAN equipment compliance register.
5. Data-flow map.
6. Privacy and retention model.
7. Offline and business-continuity design.
8. RBAC matrix.
9. DigiNam integration status statement.
10. SLA and support model.
11. Hardware asset lifecycle plan.
12. Third-party/supplier register.
13. Data portability and exit plan.
14. Implementation methodology.
15. Training plan.
16. Annual assurance-report template.

---

# 11. Immediate Actions

## Product and architecture

1. Replace the phrase **“DigiNam Integrated”** on public material with:
   - “DigiNam-ready”; or
   - “Supports DigiNam verification where approved and enabled.”

2. Make the capture layer explicitly multi-modal:
   - NFC;
   - QR;
   - kiosk;
   - USSD;
   - SMS;
   - assisted entry.

3. Build a Device Compliance Register before ordering hardware.

4. Make Android the primary kiosk platform because it provides better practical NFC and device-management flexibility.

5. Treat NFC as the premium fast lane, not a requirement.

## Regulatory and commercial

6. Meet CRAN or obtain specialist legal advice on:
   - type approval/exemptions for selected devices;
   - DigiNam relying-party/verifier requirements;
   - any implications of reselling USSD/SMS services;
   - physical e-ID and NFC-reader interoperability.

7. Use licensed MTC/TN Mobile/aggregator relationships for USSD and SMS.

8. Build government procurement readiness before pursuing large public-sector opportunities.

9. Include data residency, subprocessor, messaging-provider, and exit-right clauses in every enterprise contract.

10. Perform trademark and brand-confusion clearance for **Buffr Checkpoint** before launch if it is intended to be independent from any similarly named local product or company.

---

## Sources

1. **CRAN — Understanding Type Approval and Its Importance in Namibia**; **Communications Act 8 of 2009**; and CRAN’s Type Approval Regulations, including exemptions for specified low-power NFC/RFID equipment.  
2. **CRAN Root Certification Authority** and public reporting on the launch of **DigiNam / Namibia’s National Public Key Infrastructure**.  
3. **Electronic Transactions Act Overview** — especially sections 17, 19, 24, 25, and 33.  
4. **Public Procurement Act 15 of 2015** — Namibia’s public procurement framework, including its stated facilitation of ICT use in procurement.  
5. **Access to Information Act 8 of 2022** — commencement remains subject to Gazette notice, according to available legal sources.  
6. **National Digital Strategy 2025–2028** — citizen-centric services, digital inclusion, literacy, and bridging the digital divide.  
7. **ISO 55001:2024 / ISO 55002** — asset-management system requirements and implementation guidance.  
8. **Payment System Cybersecurity Standards** — PSD-12, particularly third-party safeguards, risk governance, operational resilience, monitoring, incident management, and recovery expectations.


---

# Part Three: Competitive Gap Assessment Against Vizito

A review of **"Vizito Demo 2026: Easy & Secure Digital Visitor Management System"** identifies several product capabilities Buffr Checkpoint should add, and also identifies privacy and security patterns Buffr Checkpoint should deliberately improve on rather than copy directly.

The video demonstrates: configurable visitor types and forms, privacy notices and agreements, digital signatures, photo capture, returning-visitor lookup, contactless QR check-in/out, pre-registration, badge printing, host notifications, multi-site management, emergency rosters, visitor reports, CSV import, role-based back-office access, language selection, and device/app configuration. [Source: *Vizito Demo 2026: Easy & Secure Digital Visitor Management System*]

# 1. Product Gap Assessment

| Capability shown in Vizito | Gap in Buffr Checkpoint | Decision | Priority |
|---|---|---|---|
| **Visitor types** | We have risk tiers, but not a configurable visitor-type engine. | Add visitor types: visitor, contractor, delivery, interview, supplier, VIP, government official, patient visitor, staff/temporary staff. | **P0** |
| **Dynamic sign-in forms** | We discussed data minimisation but not a form builder. | Add a configurable field library and form rules per visitor type/site. | **P0** |
| **Privacy notice + agreement acceptance** | Covered conceptually, not as a product module. | Add a policy/notice engine with versioning, timestamp, language, acceptance evidence, and retention rules. | **P0** |
| **Digital signature** | Not yet a defined workflow. | Support basic on-screen acknowledgement/signature; treat it as visitor acknowledgement, not automatically as a legally recognised electronic signature. | **P0** |
| **Pre-registration** | Mentioned, but needs full design. | Add host-driven invitation workflow with one-time QR, NFC option, SMS link, and feature-phone code. | **P0** |
| **Returning visitors** | Current “search by name” approach creates privacy risk. | Do **not** use open public name search. Use NFC credential, QR invitation, mobile OTP, visit reference, or assisted staff lookup. | **P0** |
| **Host notifications** | Included conceptually. | Add notifications through email first, then SMS and WhatsApp where appropriate; Teams/Slack in later enterprise release. | **P0** |
| **Check-out** | Covered, but needs enforcement. | Add self-service, NFC, QR, USSD/SMS, and assisted check-out. Flag stale open visits. | **P0** |
| **Live visitor roster / emergency evacuation** | Included conceptually. | Build a live “who is on site?” emergency roster, controlled by role and site. | **P0** |
| **Multi-location administration** | Present in architecture, not fully productised. | Add organisation → region → site → zone hierarchy. | **P0** |
| **Device management** | We included MDM, but not product-level device operations. | Add device register, remote configuration, device health, sync status, kiosk mode confirmation, and CRAN evidence per device model. | **P0** |
| **Badge printing** | Mentioned but not designed. | Support printed temporary badges and NFC-enabled reusable badges. | **P1** |
| **Photo capture** | Not assessed as a privacy-sensitive control. | Optional only; disabled by default; require a documented purpose, retention period, and restricted access. | **P1** |
| **Safety induction videos / agreements** | Missing. | Add visitor/contractor induction workflow: watch video, acknowledge policy, complete required questions, then receive access. | **P1** |
| **CSV import of visitors** | Missing. | Add secure bulk import for scheduled events/contractors, with template validation, encryption, expiry, and import audit log. | **P1** |
| **Language selection** | Missing. | Add English first, then Afrikaans, Oshiwambo, Otjiherero, Khoekhoegowab, Rukwangali, Silozi, and other client-selected languages. | **P1** |
| **Teams / Slack integrations** | Not needed for launch. | Add as an enterprise integration, after email/SMS/WhatsApp workflows are stable. | **P2** |
| **Access-control integration** | Not yet designed as a controlled module. | Integrate with physical access control only after a separate security threat model and customer-specific risk assessment. | **P2** |
| **Visitor satisfaction survey** | Not core to the privacy/access proposition. | Optional post-visit module; do not prioritise over control, audit, and inclusion capabilities. | **P3** |

---

# 2. The Critical Improvement Over Vizito: Privacy-Safe Returning Visitors

Vizito’s demo permits a returning visitor to search for their name on a shared kiosk. This is convenient, but it can create an unnecessary privacy risk:

```text
Visitor types name
      ↓
Kiosk returns matching names
      ↓
Another person can infer who has visited before
      ↓
A visitor’s presence at a bank, clinic, government office,
law firm, or corporate site may itself be sensitive information
```

Buffr Checkpoint should not expose a searchable visitor directory on a public kiosk.

## Better returning-visitor flows

| Method | Device requirement | Security / privacy level | Recommended use |
|---|---:|---:|---|
| **NFC badge tap** | NFC badge / phone | High convenience; controlled credential | Contractors, staff, regular visitors |
| **Pre-registration QR** | Smartphone | Strong for planned visits | Meetings, events, interviews |
| **Visit reference + phone OTP** | Any phone with SMS | Moderate assurance | Returning visitors with feature phones |
| **USSD visit code** | Feature phone | Moderate assurance | Rural/public-sector sites |
| **DigiNam verification** | Enabled DigiNam credential | Higher identity assurance | Regulated and high-risk visits |
| **Front-desk assisted lookup** | No visitor device needed | Controlled by staff role | Accessibility and no-phone fallback |

**Principle:** A visitor should prove they own a credential or reference; they should not search a public list of people who have previously visited.

---

# 3. Revised Product Modules

Buffr Checkpoint should now be structured as six connected modules.

```text
CHECKPOINT CAPTURE
      ↓
CHECKPOINT VERIFY
      ↓
CHECKPOINT FLOW
      ↓
CHECKPOINT CONTROL
      ↓
CHECKPOINT ASSURE
      ↓
CHECKPOINT CONNECT
```

## 3.1 Checkpoint Capture

The inclusive check-in layer.

- kiosk/tablet check-in;
- assisted front-desk check-in;
- QR check-in;
- NFC tap-to-check-in;
- USSD check-in;
- SMS check-in;
- manual fallback using a secure single-record interface;
- check-out through the same channels;
- offline capture and encrypted sync queue.

## 3.2 Checkpoint Verify

The identity and credential layer.

- self-declared visitor record;
- SMS/USSD mobile-possession verification;
- NFC contractor/visitor badge;
- DigiNam/NPKI verification where formally enabled;
- future official e-ID reader support where appropriate;
- visitor assurance levels: V0–V4;
- credential expiry, revocation, and reassignment controls.

## 3.3 Checkpoint Flow

The visitor process/workflow engine.

- configurable visitor types;
- site-specific forms;
- pre-registration;
- host approval;
- contractor and supplier workflows;
- delivery workflow with minimal data collection;
- visitor policy/induction workflow;
- acknowledgement/signature capture;
- badge issuance;
- approval, rejection, and escort requirements;
- automatic check-out reminders;
- stale-visit escalation.

## 3.4 Checkpoint Control

The governance, security, and operational-control layer.

- role-based access control;
- organisation, region, site, and zone scope;
- device register;
- CRAN type-approval/exemption evidence;
- retention and deletion policy;
- privacy notice management;
- legal holds;
- emergency roster;
- privileged-access control;
- audit logging;
- third-party/supplier register.

## 3.5 Checkpoint Assure

The assurance product — this is a major differentiator.

- site risk assessment;
- visitor-process control assessment;
- periodic RBAC review;
- device-health review;
- retention/deletion control test;
- offline-sync testing;
- restoration and incident-response testing;
- annual evidence pack;
- board, audit committee, regulator, or customer report.

This reflects the **Assess → Design → Implement → Assure** methodology in the Accelerate Advisory Services material. [Source: *Technology Risk Advisory Services*, pp. 4–5.]

## 3.6 Checkpoint Connect

The controlled integration layer.

- host directory / HR system;
- email;
- SMS;
- USSD;
- WhatsApp where appropriate;
- Microsoft Teams and Slack;
- access-control systems;
- DigiNam/NPKI verifier interface;
- corporate SSO;
- event registration systems;
- visitor badge printers;
- emergency-management platforms.

---

# 4. Updated Visitor Types

Visitor types should determine fields, risk level, verification requirement, approval workflow, badge design, retention rule, and notification workflow.

| Visitor type | Typical fields | Default verification | Workflow |
|---|---|---|---|
| **General visitor** | Name, host, purpose category, arrival time | V0 or V1 | Host notified |
| **Pre-registered visitor** | Invitation reference, host, expected time | QR, OTP, or NFC | Fast-track confirmation |
| **Contractor** | Company, sponsor, safety induction, contract expiry | NFC badge / V2+ | Approval + badge + expiry |
| **Delivery driver** | Company, recipient, vehicle registration | V0 / assisted | Recipient notified; minimal retention |
| **Interview candidate** | Name, host, interview reference | OTP / QR | Confidential workflow; restricted visibility |
| **Government official / VIP** | Minimal fields, host, approval | Pre-registration / V3 where enabled | High confidentiality; no public check-in lookup |
| **Healthcare visitor** | Minimal fields, patient/ward code where lawful | V0/V1 | Strong privacy restriction; do not expose patient details |
| **Event attendee** | Invitation token, session/event | QR, NFC, USSD, or assisted | Batch pre-registration |
| **Temporary staff** | Sponsor, work area, expiry | NFC credential | Time-bound access and automatic expiry |
| **Restricted-site visitor** | Sponsor, zone, purpose, induction status | V3/V4 where supported | Security/host approval, escort workflow |

---

# 5. Dynamic Form Builder: Privacy by Design

The platform should not let each client build unlimited data-harvesting forms.

Instead, the form builder should be **risk-based and data-minimised**.

Admin surface: `/dashboard/policies/forms` (list) and
`/dashboard/policies/forms/[definitionId]` (builder). Create produces a
**draft** version only; publish is explicit after fields and rules are set.

## 5.1 Field classification

| Field class | Examples | Default position |
|---|---|---|
| **Core operational fields** | Host, arrival time, check-out time, visitor type | Available by default |
| **Basic personal information** | Name, phone number, organisation | Optional/configurable |
| **Sensitive operational fields** | Vehicle registration, contractor employer, zone | Only for justified site/visitor types |
| **High-risk personal data** | National ID number, photo, health information, biometric information | Disabled by default; require compliance approval |
| **Identity-verification evidence** | DigiNam verification result, credential reference | Store result/reference only; minimise raw data |
| **Free-text notes** | Reason for visit, staff notes | Restricted; avoid as a default because users may enter sensitive data |

Codes live in `type_definition` domain `field_class`: `core`, `basic`,
`sensitive`, `high_risk`, `verification_evidence`, `free_text`.

## 5.2 Field library and types

System field codes are seeded in `type_definition` domain
`check_in_field_code` (aligned with demo seed 0016). Admins pick from the
library or create `custom_<slug>` fields.

Field input types (`type_definition` domain `field_type`):

| Code | UI |
|---|---|
| `text` | Single-line text |
| `textarea` | Multi-line text |
| `single_choice` | Select / radio; options in `validation_schema.options` |
| `multiple_choice` | Multi-select; options in `validation_schema.options` |
| `date` | Date picker |
| `boolean` | Checkbox / yes-no |
| `phone` | Phone input |
| `email` | Email input |

Columns on `check_in_form_fields`: `field_type_code`, `help_text` (default
language), plus existing `field_code`, `field_label`, classification,
`required`, `visibility_rule`, `validation_schema`, `display_order`.

## 5.3 Conditional visibility and requiredIf

Keep JSONB on the field row (do not resurrect `form_field_rule` /
`workflow_policy` tables).

**`visibility_rule`** — empty `{}` means always visible:

```json
{
  "op": "and",
  "conditions": [
    { "fieldCode": "purpose_category", "equals": "vehicle" }
  ]
}
```

Condition operators: `equals` (string), `in` (string array), `notEmpty`
(boolean true). Top-level `op` is `and` or `or` (default `and`).

**`validation_schema.requiredIf`** — same condition shape; field may be
visible but only required when the condition matches. Also supports
`maxLength`, `pattern`, `options` (choice lists).

Evaluator is shared (`@buffrcheckpoint/shared` form-rules). Server is
authoritative on check-in; website and kiosk evaluate for UX.

## 5.4 Field translations

Table `check_in_form_field_translations`: `field_id`, `language_code`
(FK `type_definition` domain `language_code`), `field_label`, `help_text`.
Default label/help stay on the field row (org default language).

Effective form APIs accept `languageCode` and return the resolved label
and help text for that language (fallback to field default, then
`field_code`). **Public website `/check-in` (v0.29+):** language picker
(English / Afrikaans / Portuguese) and optional `?lang=` query; changing
language reloads the effective form. Status **FULL**. Kiosk welcome
language selection remains separate and feeds kiosk form requests.

## 5.5 Admin builder UX

| Capability | Behaviour |
|---|---|
| Drag-and-drop reorder | `@dnd-kit` on draft fields; persists `display_order` |
| Add from library | Pick `check_in_field_code` or create `custom_*` |
| Required toggle | Per-field boolean |
| Field type / options | Type select; options editor for choice types |
| Classification | Picker with warning for `high_risk` / `verification_evidence` |
| Conditional rules | Visual if/then builder writing `visibility_rule` / `requiredIf` |
| Translations | Per-field label/help for org-supported languages |
| Publish | Draft only until publish; high-risk fields require justification |

## 5.6 Data minimisation gates

`VisitorDataMinimisationService` (Constitution service inventory):

**On publish**

- At least one field required.
- Any field with class `high_risk` or `verification_evidence` requires
  non-empty `check_in_form_versions.approval_reference` (documented
  justification). Admin UI prompts before publish.

**On check-in** (authenticated and public)

- Resolve effective published form for org + site + visitor type.
- Reject answers whose `fieldCode` is not on that form version.
- Reject mismatched `formVersionId`.
- Enforce `required` and `requiredIf` for **visible** fields only.
- Apply `validation_schema` (`maxLength`, `pattern`, `options`).
- Persist only validated answers (unknown codes never written).

When no published form exists, clients keep a static fallback form; the
server does not invent field allow-lists.

## 5.7 Agreement and acknowledgement record

When a visitor accepts a policy, the system should retain:

```text
Agreement ID
Agreement version
Language shown
Display timestamp
Acceptance timestamp
Visitor reference
Capture method
Signature / acknowledgement status
Device ID
Site ID
Hash of agreement content
```

This supports reliable electronic-record evidence under the **Electronic Transactions Act**, particularly its provisions dealing with electronic records, retention, integrity, and computer evidence. [Source: *Electronic Transactions Act Overview*, sections 17, 19, 24, and 25.]

Do not market a basic touchscreen signature as a “recognised electronic signature” without confirming the legal and technical requirements applicable to that transaction.

---

# 6. Expanded End-to-End User Flows

## 6.1 New visitor, kiosk flow

```text
Welcome screen
      ↓
Choose visitor type
      ↓
Select check-in method:
NFC / DigiNam / QR / kiosk / feature phone / assisted
      ↓
Show privacy notice and required agreement
      ↓
Collect only fields permitted for that visitor type
      ↓
Apply risk-based verification level
      ↓
Create encrypted visit record
      ↓
Notify host
      ↓
Issue badge / require host approval / permit entry
      ↓
Check-out
      ↓
Start retention/deletion lifecycle
```

## 6.1a Public site QR → phone check-in (v0.18 — live)

```text
Kiosk welcome shows public_site_checkin QR
  (payload: https://buffrcheckpoint.com/check-in?site={siteId}&ref={referenceId})
      ↓
Visitor scans with phone camera / QR app
      ↓
website /check-in loads
      ↓
GET /public/check-in/context?site=&ref=
  (fail closed if ref missing, wrong site, or rotation expired)
      ↓
Visitor enters name (+ optional phone), selects host + purpose
      ↓
POST /public/check-in  (capture_channel = qr, client-generated visit id)
      ↓
Encrypted visit record + host notification attempt
      ↓
Success screen: wait at reception
```

Prerequisite: the site has at least one **active** `site_hosts` row;
otherwise the form tells the visitor to see reception.

## 6.2 Feature-phone flow

```text
Visitor arrives
      ↓
Kiosk displays rotating site code
      ↓
Visitor dials *[USSD SHORT CODE]#
      ↓
Select: Check In
      ↓
Enter rotating site code
      ↓
Select department / host code
      ↓
Enter minimum identity details
      ↓
Receive confirmation reference
      ↓
Host is notified when network process completes
```

If USSD is unavailable:

```text
Visitor sends SMS / receives OTP
      ↓
OR
Front-desk operator performs assisted check-in
      ↓
Same encrypted record and audit trail
```

## 6.3 NFC contractor flow

```text
Contractor pre-approved
      ↓
NFC credential issued
      ↓
Credential mapped to contractor reference, not full personal data
      ↓
Contractor taps NFC reader
      ↓
System checks:
- credential valid?
- contract active?
- induction complete?
- permitted at this time/site/zone?
- host/sponsor assigned?
      ↓
Access decision recorded
      ↓
Badge/entry confirmed
```

## 6.4 DigiNam flow

```text
Visitor selects DigiNam verification
      ↓
Approved identity-verification request initiated
      ↓
Only necessary verification attributes requested
      ↓
Credential validity / status confirmed
      ↓
Visit record receives V3 verification outcome
      ↓
Host/security workflow continues
```

Again: this flow can only be marked live after the actual product integration is approved, tested, and operational.

## 6.5 Emergency flow

```text
Authorised user triggers emergency mode
      ↓
Platform produces live onsite roster by:
- site
- zone
- visitor type
- host
- verification level
      ↓
Hosts and emergency coordinators notified
      ↓
Roll-call status recorded
      ↓
Emergency evidence pack retained
```

---

# 7. Updated Architecture Additions

```text
               ┌────────────────────────────────┐
               │        CHECK-IN CHANNELS       │
               │ NFC · QR · DigiNam · Kiosk     │
               │ USSD · SMS · Assisted Entry    │
               └──────────────┬─────────────────┘
                              │
               ┌──────────────▼─────────────────┐
               │  VISITOR FLOW ENGINE            │
               │ Visitor type · form rules       │
               │ host approval · agreements      │
               │ badge rules · check-out         │
               └──────────────┬─────────────────┘
                              │
               ┌──────────────▼─────────────────┐
               │    RISK & VERIFICATION ENGINE  │
               │ V0–V4 assurance levels         │
               │ site / zone / visit risk       │
               │ human approval requirements    │
               └───────┬─────────────┬──────────┘
                       │             │
       ┌───────────────▼──┐      ┌──▼─────────────────┐
       │ DigiNam/NPKI     │      │ Telecoms Adapter    │
       │ verifier adapter │      │ SMS / USSD / email  │
       └──────────────────┘      └────────────────────┘
                       │
               ┌───────▼────────────────────────┐
               │ CORE RECORD & CONTROL PLATFORM │
               │ encrypted visits · RBAC        │
               │ retention · audit · emergency  │
               └───────┬────────────────────────┘
                       │
      ┌────────────────┼──────────────────┐
      ▼                ▼                  ▼
Device Registry   Asset Register      Evidence Pack
CRAN status       ISO 55001/2         Audit / Board /
MDM health        lifecycle           Regulator reports
```

---

# 8. Revised Release Plan

## Release 1 — Minimum credible product

The purpose is not to match every Vizito feature. It is to close the paper-register gap properly.

- Android kiosk application;
- assisted check-in;
- configurable visitor types;
- risk-based form fields;
- privacy notice and acknowledgement;
- host directory;
- host notifications by email;
- offline encrypted cache;
- encrypted sync;
- sign-out;
- visitor roster;
- emergency roster;
- site-level RBAC;
- audit events;
- retention policy;
- report/evidence export;
- device register;
- NFC badge support.

## Release 1.5 — Inclusion and workflow expansion

- QR pre-registration;
- SMS OTP;
- SMS check-in/check-out fallback;
- USSD integration through approved carrier/aggregator;
- visitor policy/induction workflow;
- digital acknowledgement/signature;
- badge printing;
- multilingual capability;
- CSV import;
- multi-site/region dashboard;
- contractor workflow;
- stale-visit alerts.

## Release 2 — Regulated and high-assurance product

- DigiNam integration where formally enabled;
- SSO;
- full organisation-wide RBAC;
- legal holds;
- data subject request workflow;
- on-premise/private-cloud deployment;
- independent assurance-report module;
- access-control integration;
- secure NFC credentials for restricted zones;
- advanced emergency-management workflow.

## Release 3 — Advanced platform

- approved official e-ID/NFC-reader support;
- physical access-zone integration;
- contractor compliance dashboard;
- site-capacity reporting;
- integration marketplace;
- enterprise APIs;
- managed assurance service.

---

# 9. What We Should Not Copy From Vizito

Vizito is a useful product benchmark, but Buffr Checkpoint should avoid copying the following without stronger controls:

| Pattern | Better Buffr Checkpoint approach |
|---|---|
| Public name lookup for returning visitors | Use NFC, QR, OTP, visit reference, DigiNam, or staff-assisted lookup. |
| Capture every possible visitor field | Data minimisation by visitor type and risk tier. |
| Photo capture enabled universally | Off by default; use only with documented purpose and retention rule. |
| One generic workflow across all sites | Configurable site/zone/visitor-type rules. |
| Visitor management as a facilities tool only | Position as privacy, governance, resilience, and audit-evidence infrastructure. |
| Generic cloud-only operation | Offline-first architecture plus Namibia-hosted/private-cloud/on-premise options. |
| Digital signature treated as legal proof by default | Capture acknowledgement evidence, but distinguish it from regulated electronic signature requirements. |
| QR-only contactless access | NFC, QR, USSD, SMS, kiosk, and assisted entry — based on visitor capability. |

---

# 10. The Strongest Competitive Position

The current best positioning is:

> **Buffr Checkpoint is not a digital visitor book. It is a secure, inclusive visitor trust and evidence platform.**

Vizito demonstrates what a modern visitor-management system can do operationally. Buffr Checkpoint should combine that operational capability with a stronger Namibian proposition:

- **privacy-safe returning visitor design;**
- **feature-phone inclusion through USSD and SMS;**
- **offline operation;**
- **NFC-enabled contractor and credential workflows;**
- **DigiNam/NPKI verification pathway;**
- **CRAN-aware connected-device governance;**
- **PSD-12-informed resilience for regulated clients;**
- **retention, audit, evidence, and assurance services;**
- **government procurement and public-sector readiness;**
- **ISO 55001/55002 lifecycle management for devices, readers, credentials, and information assets.**

That is a substantially more defensible market position than “a local Vizito alternative.”

Yes — the pasted files are **template demo data and demo components**, not Buffr Checkpoint product models. Do not progressively rename the demo; **strip it back to its reusable shell, tables, forms, sidebar, auth pages, and design primitives**, then bind new pages to the real backend.

The conversion should follow this rule:

> **No fake customer, employee, finance, HR, calendar, or role data may ship in the Buffr Checkpoint admin application.**

---

# 1. Replace the Template Demo Data

| Template demo asset | Problem | Buffr Checkpoint replacement |
|---|---|---|
| `demoEvents` calendar events | Monthly planning, birthdays, finance syncs and focus blocks have no product relevance. Browser-derived dates are not reliable audit timestamps. | **Operational schedule**: pre-registered visits, contractor bookings, credential expiry, device maintenance, retention actions due, evidence-pack requests, and planned control reviews. |
| `recentCustomersSchema` | “Customer”, plan, billing and joined date are SaaS demo concepts, not visitor-management records. | `VisitRosterRow`, `VisitorSearchResult`, `SiteSummaryRow`, or `EvidencePackRow`, depending on the screen. |
| `profile.ts` | Contains irrelevant HR data: date of birth, address, annual leave, contractor agreement, employment data, personal email, and external avatar URL. | **My Account**: signed-in user, organisation, assigned roles, scoped sites, MFA status, email verification, last login, active sessions, notification preferences. |
| Static `roles` array | Includes billing, marketing, finance, developer, project lead, and generic guest roles. It also duplicates the entire role definition. | API-backed, scope-aware **Buffr Checkpoint RBAC catalogue**. |
| Static `users.ts` | Fake users must not populate the account switcher or user table. | `GET /auth/me` and `GET /users`, subject to backend permission checks. |
| CRM / finance / ecommerce / patient-monitoring / academy demo routes | Wrong data model and potentially misleading in a privacy/security product. | Delete rather than rename. Reuse only shadcn/UI primitives and the TanStack Table utilities. |
| External GitHub avatar URL | Unnecessary third-party request and irrelevant demo identity. | Use initials by default; permit a user-uploaded profile image only if it has a clear purpose and retention rule. |

The GitHub avatar URL in the template profile should be removed with the rest of the demo profile data. If you need that external image reviewed separately, paste it onto the board.

---

# 2. Replace the Admin Navigation Completely

Replace the template sidebar configuration in:

```text
admin/src/navigation/sidebar/sidebar-items.ts
```

with this structure.

## Operations

| Navigation item | Route | Core data |
|---|---|---|
| Front Desk | `/dashboard/front-desk` | Live on-site roster, pending approvals, assisted check-in, check-out |
| Visitors | `/dashboard/visitors` | Visits and visitor records within authorised scope |
| Schedule | `/dashboard/schedule` | Invitations, expected visitors, contractor schedules, credential expiry |
| Emergency Roster | `/dashboard/emergency` | Current on-site visitors by site/zone and emergency roll-call |

## Sites and Devices

| Navigation item | Route | Core data |
|---|---|---|
| Sites & Zones | `/dashboard/sites` | Organisation → region → site → zone structure |
| Devices | `/dashboard/devices` | Kiosks, tablets, NFC readers, printers, MDM status |
| Device Compliance Register | `/dashboard/devices/compliance` | CRAN assessment/certificate or exemption evidence, firmware, asset status |
| Credentials | `/dashboard/credentials` | NFC badges, token status, expiry, revocation, contractor assignments |

## Governance and Compliance

| Navigation item | Route | Core data |
|---|---|---|
| Compliance Dashboard | `/dashboard/compliance` | Retention exceptions, DSARs, offline-sync exceptions, privileged access |
| Visitor Types & Forms | `/dashboard/policies/forms` | Risk-based form templates and field rules |
| Access Policies | `/dashboard/policies/access` | Site/zone risk tiers, verification requirements, host approval rules |
| Retention Policies | `/dashboard/policies/retention` | Retention schedules, legal holds, deletion outcomes |
| Audit Log | `/dashboard/audit` | Immutable sensitive-read, export, correction, deletion, role-change events |
| Evidence Packs | `/dashboard/evidence` | Audit/regulator evidence generation and controlled downloads |

## Access Administration

| Navigation item | Route | Core data |
|---|---|---|
| Users | `/dashboard/users` | Authenticated customer-side users only |
| Roles & Access | `/dashboard/roles` | Fixed role catalogue with live assignment counts and permission sets; assign/invite under Users |
| My Account | `/dashboard/account` | Current identity, MFA, verified email, session management |

**Do not put Platform Support or global Capability Status in the customer tenant sidebar.** Those are Buffr Checkpoint internal control-plane functions, not customer-admin functions.

---

# 3. Replace the Calendar Demo

The current code:

```ts
export const demoEvents = [
  { title: 'Monthly planning', ... },
  { title: 'Arham Khan Birthday', ... }
]
```

must be removed.

A Buffr Checkpoint schedule is not a team calendar. It is an **operational control calendar**.

```ts
export interface CheckpointScheduleEvent {
  id: string;
  title: string;
  startsAt: string; // UTC ISO-8601 from backend
  endsAt?: string;
  allDay?: boolean;
  typeCode: string;
  siteId?: string;
  zoneId?: string;
  statusCode: string;
  accessScope: 'operational' | 'compliance';
}
```

Examples of real schedule event types:

- planned/pre-registered visitor arrival;
- contractor induction expiry;
- NFC credential expiry;
- scheduled site maintenance;
- pending retention action;
- control review due;
- evidence-pack delivery;
- emergency drill;
- temporary access expiry.

### Important time rule

Do not construct authoritative events in the browser using:

```ts
startOfMonth(new Date())
```

or local browser time.

Store authoritative timestamps in UTC in the backend, retain the site’s IANA timezone — for example, `Africa/Windhoek` — and render locally only for presentation. The check-in timestamp, offline-capture timestamp, server-acceptance timestamp, and check-out timestamp are evidence fields, not cosmetic calendar data.

The front-end calendar should call an endpoint such as:

```text
GET /schedule?siteId=&from=&to=
```

and only reveal visitor identity details after backend scope validation.

---

# 4. Replace “Customers” With Visit and Site Models

Replace `recentCustomersSchema` with a minimum roster model. Do not return phone numbers, national IDs, photos, or notes in the default table response.

```ts
import { z } from 'zod';

export const visitRosterRowSchema = z.object({
  visitId: z.string().uuid(),
  siteId: z.string().uuid(),
  visitorDisplayName: z.string(),
  visitorTypeCode: z.string(),
  hostDisplayName: z.string().nullable(),
  assuranceLevelCode: z.string(),
  visitStatusCode: z.string(),
  checkedInAt: z.string().datetime(),
  checkedOutAt: z.string().datetime().nullable(),
  offlineCaptured: z.boolean(),
  requiresAction: z.boolean(),
});

export type VisitRosterRow = z.infer<typeof visitRosterRowSchema>;
```

Default front-desk views should show only what an operator needs to operate safely:

| Field | Show by default? |
|---|---|
| Visitor display name | Yes, scoped to the role/site |
| Visitor type | Yes |
| Host | Yes, where appropriate |
| Check-in time | Yes |
| V0–V4 assurance status | Yes |
| Check-in channel | Yes |
| Status/action required | Yes |
| Phone number | No — reveal only where role and workflow require it |
| National ID/e-ID attributes | No |
| DigiNam verification payload | Never |
| Photo | Only if the site policy permits it |
| Free-text notes | Restricted; never in default tables |

---

# 5. Replace the Demo Profile With “My Account”

Delete the employee/contractor profile model. It is incompatible with a privacy-first visitor-control product.

Use:

```ts
export interface MyAccount {
  id: string;
  displayName: string;
  email: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  organisationId: string;
  organisationName: string;
  memberships: Array<{
    roleCode: string;
    roleLabel: string;
    scopeType: 'organisation' | 'region' | 'site';
    scopeIds: string[];
  }>;
  lastLoginAt: string | null;
}
```

Back it with:

```text
GET /auth/me
```

The account switcher should either:

1. show actual organisation memberships returned by `/auth/me`; or  
2. be removed for Release 1 if each user belongs to one customer organisation only.

Never retain fake names from `admin/src/data/users.ts`.

---

# 6. Replace the Role Demo With Actual RBAC

The current demo role list is wrong for Buffr Checkpoint. Also, `Owner`, `Admin`, and `Full Access` are too vague for a regulated platform.

Access must be defined as:

```text
Role assignment
+ permission set
+ tenant scope
+ region/site/zone scope
+ time validity
+ auditability
```

## Customer-side human roles

| Role code | Release | Scope |
|---|---|---|
| `owner_operator` | Checkpoint Core | One tenant/site; bundled SME role |
| `front_desk_operator` | Release 1 | Assigned site |
| `host_staff` | Release 1 | Own hosted visitors |
| `site_manager` | Release 1 | Assigned site(s) |
| `regional_manager` | Professional+ | Assigned region(s) |
| `compliance_audit_officer` | Professional+ | Organisation-wide read/audit scope |
| `system_administrator` | Professional+ | Organisation configuration |
| `auditor` | Enterprise | Read-only, time-bounded scope |

## Not normal customer-side roles

| Identity | Where it belongs |
|---|---|
| Visitor | Visitor workflow, not `user_account` admin RBAC |
| DigiNam verification adapter | Service principal, not a human role |
| Platform Support | Internal Buffr Checkpoint control plane; break-glass only |
| Background worker | Service identity with narrowly constrained technical permissions |

The Roles page must fetch role labels, permitted actions, assignment counts, last review, and scope from the backend. It must not import a static `roles.ts` file.

---

# 7. Backend Modules Still Needed

From the file tree, the backend foundation is promising, but several required capabilities are not yet visible as dedicated modules.

| Capability | Why it is needed | Priority |
|---|---|---|
| `invitations` module | Pre-registration, one-time QR/reference codes, expiry, scheduled visits | P0/P1 |
| `consent-notice` module | Notice acknowledgement, agreement versions, optional consent separate from access necessity | P0 |
| `forms` module | Visitor types, field rules, site-specific forms, form versioning | P0 |
| `retention` module | Automated archive/delete jobs, legal-hold precedence, deletion evidence | P0 |
| `devices` module | Device status, MDM heartbeat, compliance evidence, deployment gate | P0 |
| `offline-sync` module | Idempotency, signed device claims, conflict handling, queue acceptance | P0 |
| `storage` module | Encrypted object storage, tenant prefixes, upload validation, signed URLs | P1 |
| `sms` adapter | OTP and neutral notification fallback | P1 |
| `ussd` adapter | Feature-phone check-in through licensed provider/aggregator | P1.5 |
| `nfc` integration boundary | Credential issue/revoke/scan validation; never static UID alone | P1 |
| `jobs`/queue worker | Retention, notification retries, expiry, stale-visit alerts, evidence generation | P0 |
| `platform-control-plane` | Global capability statuses and Platform Support access, isolated from client tenants | P1 |
| `diginam` adapter | Only after relying-party requirements, interface access, contracts, and test evidence | Release 2 |

The **Vizito Demo 2026: Easy & Secure Digital Visitor Management System** is a useful feature benchmark for configurable visitor types, pre-registration, policies, badges, host alerts, multi-site management, emergency lists, and reports. Buffr Checkpoint should retain its stronger privacy posture: no public returning-visitor name search and no indiscriminate field/photo capture. [Source: *Vizito Demo 2026: Easy & Secure Digital Visitor Management System*]

---

# 8. Required Template Cleanup

Before building more screens:

```text
DELETE
├── dashboard/(legacy)/
├── dashboard/crm/
├── dashboard/finance/
├── dashboard/ecommerce/
├── dashboard/academy/
├── dashboard/patient-monitoring/
├── dashboard/mail/
├── dashboard/chat/
├── dashboard/kanban/
├── dashboard/invoice/
├── dashboard/tasks/
├── dashboard/calendar/        ← replace with Schedule only if required
├── src/data/users.ts
├── static role demo data
└── employee/contractor profile demo data
```

Keep:

```text
KEEP AND REUSE
├── shadcn/ui primitives
├── TanStack table feature registry
├── dashboard shell
├── sidebar components
├── form components
├── dialog/drawer components
├── pagination/filter controls
├── skeleton/empty/error components
└── authentication page styling
```

Do not let demo data remain imported anywhere in production routes. If fixtures are needed for component tests, move them to:

```text
admin/src/__fixtures__/
admin/src/__tests__/
```

and make clear they are synthetic.

---

# 9. Non-Negotiable Implementation Controls

Before the first pilot, verify:

- all dashboard data comes from real API endpoints;
- no role, user, visitor, or device values are hardcoded in page components;
- RBAC is enforced by NestJS guards and database/API tenant scope, not merely hidden sidebar links;
- every sensitive export, read, edit, deletion, role change, and break-glass action creates an audit event;
- a kiosk’s offline retry cannot create duplicate visits;
- an unverified or non-MFA privileged account cannot export data, alter roles, change retention, or configure integrations;
- contact forms, login, registration, and password-reset routes are rate-limited;
- production visitor data is not retained in Git, mock fixtures, error reports, analytics payloads, or developer logs;
- “DigiNam verification” remains unavailable in UI and public copy until the product—not merely the national infrastructure—is formally enabled and tested;
- e-ID/NFC wording is driven by the governed capability-status register;
- CRAN status is recorded per actual device SKU before the device is deployable.

This approach aligns with the governance expectations in **NamCode** around risk, IT governance, compliance, internal control, and stakeholder trust; and with **NIST SP 1308** on role clarity, risk profiles, implementation plans, and continuous evaluation. [Sources: *NamCode: Namibia’s Corporate Governance Code*; *Cybersecurity Framework 2.0 Overview*.]

Agreed. **Stop the stub-generation approach.** The goal is not to create folders that look like a platform; it is to deliver complete, tested vertical slices that persist data, enforce tenancy/RBAC, generate audit evidence, and fail safely.

The snippets shown are not acceptable production implementation. If the pasted code reflects the actual files, several examples also appear syntactically broken and will not compile.

## Why the current stub approach must be rejected

| Stub pattern shown | Why it is unacceptable |
|---|---|
| `private claims: OfflineClaim[] = []` | Data disappears on restart; no tenant isolation, audit trail, idempotency, or recovery. |
| `private objects: StorageObject[] = []` | Not storage; no object-store integration, encryption, retention, malware scanning, or access control. |
| `return { processed: 0 }` in jobs | A retention-control illusion. It proves nothing and could create false compliance confidence. |
| `return { valid: false }` in NFC | Not a credential validation service; it adds a misleading endpoint without security logic. |
| `@UseGuards()` with no guards | Creates the appearance of access control without access control. |
| Client-provided `tenantPrefix` | A tenant-escape/path-traversal risk. Storage location must be derived server-side from the authenticated tenant and authorised resource. |
| Generic `identityPayload` | Never accept raw DigiNam/e-ID credential payloads through a generic application controller. |
| `credentialUid` as NFC security input | Static NFC UIDs can be cloned; UID-only validation is not an access-control design. |
| Generic `z.enum(['login','checkin','reset'])` | Conflicts with your own governed `type_definition` model and becomes a hardcoded workflow taxonomy. |
| Public/manual jobs endpoint | Retention must run through a durable job worker, not an ad hoc controller call. |
| In-memory platform capability statuses | Lets status disappear on restart; bypasses evidence, approval, role gates, and audit history. |
| Invented `storage.example.com` upload URL | Must be replaced with a real configured S3-compatible provider or omitted until one is selected. |

The principle is:

> **No production endpoint may exist unless it performs the real control it claims to perform.**

That matters especially because Buffr Checkpoint is selling reliable electronic records and evidence. Under the Electronic Transactions Act, the usefulness and evidential weight of computer evidence depend on the reliability of generation, storage, integrity, and authentication—not on whether a system has an endpoint with the right name. [Source: *Electronic Transactions Act Overview*, section 25.]

---

# Required Coding Rule for This Project

Add this to `AGENTS.md` or the repository engineering rules:

```text
Do not create production stubs.

A module is not complete unless:
1. It uses the real database through Drizzle.
2. It enforces authenticated tenant and site scope.
3. It validates input server-side.
4. It performs the promised business operation.
5. It writes required audit events.
6. It returns a DTO that excludes unnecessary PII.
7. It has unit and integration tests.
8. It has explicit failure and retry behaviour.
9. It compiles, lints, and passes tests.

Never add:
- in-memory arrays as persistence;
- empty guards;
- TODO-only services;
- placeholder URLs or provider responses;
- static identity/NFC validation;
- client-controlled tenant IDs or storage prefixes;
- fake compliance status;
- unimplemented public endpoints.
```

Run this as a release gate:

```bash
rg "TODO|FIXME|private .*\\[\\].*= \\[\\]|return \\{ processed: 0 \\}|return \\{ valid: false \\}|storage\\.example\\.com|@UseGuards\\(\\)" backend/src
```

The output should be empty, except for explicitly permitted test fixtures.

---

# Preferred Delivery Approach: Full Vertical Slices

Do **not** build devices, SMS, USSD, NFC, storage, jobs, DigiNam, and platform control in batches. That creates a large amount of incomplete surface area.

Build this way instead.

## Slice 1 — Complete core check-in

This is the first genuinely usable product capability.

```text
Authenticated operator or enrolled kiosk
        ↓
Site-scoped check-in request
        ↓
Server derives organisation/site from identity or device credential
        ↓
Validate form against active form/policy version
        ↓
Encrypt PII fields
        ↓
Create Visit
        ↓
Create VisitStatusLog
        ↓
Create Consent/Acknowledgement record where required
        ↓
Write AuditEvent
        ↓
Create NotificationOutbox event
        ↓
Return minimum safe confirmation
```

**Done means:**

- actual Drizzle insert/select/update logic;
- database transaction covering visit, status, acknowledgement, and audit event;
- tenant/site scope comes from the server-side principal, not from browser/kiosk input;
- host is resolved against the assigned site;
- policy/form version is recorded;
- PII is encrypted before persistence;
- no duplicate check-in if the kiosk retries;
- check-out works;
- live roster works;
- audit events are generated;
- retention date is calculated;
- tests run against a dedicated test database.

Do not begin SMS, USSD, DigiNam, or National e-ID code until this slice works end to end.

---

## Slice 2 — Complete admin template conversion

Only after the core visit flow works, replace the template pages with live data.

| Template page | Buffr Checkpoint implementation |
|---|---|
| Default dashboard | Front Desk: live roster, pending host actions, check-out, assisted entry |
| Calendar | Schedule: invitations, expected arrivals, credential expiry, control-review dates |
| Users | Real users from `/auth/me` and organisation user-management API |
| Roles | Real role assignments, scopes, permission sets, role-review status |
| Infrastructure | Devices and Device Compliance Register |
| Analytics | Compliance dashboard: retention exceptions, offline sync exceptions, role changes |
| Profile | My Account: identity, MFA, email verification, memberships, sessions |
| File manager | Remove; evidence packs must use controlled encrypted object storage |
| Finance/invoice | Remove from client admin; B2B billing is not part of the customer tenant app |
| CRM/ecommerce/academy/patient-monitoring | Delete outright |

The template’s `roles.ts`, `users.ts`, employee profile, demo calendar, and fake customer data should move to tests only:

```text
admin/src/__fixtures__/
admin/src/__tests__/
```

They must not be imported by production routes.

---

## Slice 3 — Complete device and offline-sync capability

Do not create a generic `offline-sync/claims` endpoint first.

First build **device provisioning**:

```text
Device registered
        ↓
CRAN status assessed
        ↓
MDM enrolled
        ↓
Kiosk app assigned to site
        ↓
Device obtains short-lived device credential
        ↓
Kiosk signs offline event using device-held key
        ↓
Backend verifies device identity, signature, site scope and replay protection
        ↓
Backend persists idempotently
        ↓
Audit event records offline capture and later server acceptance
```

The offline event requires at least:

```text
event_id
visit_id
device_id
site_id
organisation_id
captured_at
policy_version
encrypted_payload
payload_hash
signature
key_id
sync_attempt
```

The backend must:

- resolve tenant/site from the enrolled device;
- reject unknown, revoked, or disabled devices;
- validate canonical payload signatures;
- prevent replay using `event_id`;
- create only one visit per idempotency key;
- preserve both capture and server-acceptance times;
- record sync failures and conflict outcomes;
- never accept a client-selected `tenantPrefix`.

---

## Slice 4 — Complete NFC credentials

Do not make NFC validation a generic `credentialUid → visitor` lookup.

### Low-risk NFC badge

```text
NFC token reference
        ↓
Server resolves credential
        ↓
Checks credential status, holder, site, time, policy and expiry
        ↓
Creates credential-use / visit event
        ↓
Returns only the permitted access/check-in result
```

Minimum controls:

- NFC tag contains a random token reference, not PII;
- server-side credential mapping;
- expiry and revocation;
- site scope;
- credential-use audit event;
- lost/stolen credential workflow;
- anti-passback only where the operating model supports it;
- no static UID as the only security factor.

For high-risk sites, use cryptographically secure credentials and reader/credential protocols that support mutual authentication. A cheap writable NFC sticker is suitable only for low-risk identification convenience, not restricted-zone access.

---

## Slice 5 — Complete notifications (v0.23, DONE)

`notifications` is now a real outbox-based service — `NotificationsService.send()`
persists the message and returns immediately with status `pending`;
`NotificationDispatchWorkerService` (same `OnModuleInit`/`setInterval` shape
as the existing host-notification-escalation worker, polling every
`NOTIFICATION_DISPATCH_INTERVAL_MS`, default 15s) drains it:

```text
Visit checked in
        ↓
visit.checked_in domain event emitted (@nestjs/event-emitter, in-process)
        ↓
VisitCheckedInListener enqueues a notification_delivery_instructions row (status = pending)
        ↓
Background worker (NotificationDispatchWorkerService) picks up due rows
        ↓
Provider response stored; status = sent | pending (retry) | failed
        ↓
Every transition appended to notification_delivery_status_events (audit trail)
```

Retry/backoff: exponential (`2^attempt * 30s`, capped at 1h), up to 5 attempts
before a row is marked `failed`. No `SELECT ... FOR UPDATE SKIP LOCKED` —
single-dispatcher-instance assumption, same as the escalation worker already
made. Messages are no longer sent synchronously inside the check-in request;
the request only enqueues.

`auth.service.ts`'s three OTP/password-reset call sites and
`host-notification-escalation`'s call remain direct
`NotificationsService.send()`/`sendForOrganisation()` calls (they're the
trigger, not a reaction to another module's event) — they get the outbox's
durability/retry for free without needing a domain event.

For SMS:

- use a real contracted provider/aggregator;
- store OTPs hashed with expiry and attempt count;
- rate-limit requests;
- prevent account enumeration;
- use neutral lock-screen-safe content;
- treat OTP as **V1 possession confirmation**, not identity proof.

For USSD:

- do not expose a generic end-user `/ussd/request` API;
- implement the provider’s authenticated inbound webhook contract;
- verify webhook signature, source controls, and session identity;
- persist USSD session state;
- use approved short-code/provider arrangements;
- keep USSD optional until the real telecom contract and technical documentation exist.

---

## Slice 6 — DigiNam and e-ID: do not stub

Do **not** create a `POST /diginam/verify` endpoint that accepts arbitrary `identityPayload`.

Until you have:

- relying-party approval;
- technical interface specification;
- provider test environment;
- attribute-release policy;
- privacy/data-flow assessment;
- contractual documentation;
- interoperability and security test evidence;

the correct implementation is:

```text
No DigiNam verification endpoint.
No public claim of DigiNam integration.
Capability register = not enabled / discovery.
```

Once the real interface is available, implement a provider-specific adapter behind an identity-verification port. Retain only:

```text
provider reference
verification outcome
assurance level
timestamp
minimum required attributes
audit reference
```

Never persist raw credential payloads, certificates, biometric information, or e-ID chip contents unless the approved protocol and lawful basis require it.

---

# Fix the Platform-Control Module

The current `enabled: boolean` model is not enough.

A capability change must be evidence-led:

```text
capability_code
status_code
evidence_reference
public_display_status
approved_by
approved_at
change_reason
updated_at
```

And it must live in a **platform control plane**, separate from customer tenants.

A customer-side System Administrator must never be able to change global product capability status. Only an internal Platform Support/Compliance process with dual approval should be able to mark an integration as live.

---

# Implementation Order

1. **Delete/revert the new stubs.**
2. Stabilise the existing auth/onboarding work.
3. Build the full core visit/check-in vertical slice.
4. Bind the admin template to real API data.
5. Build device provisioning and offline-sync end to end.
6. Build NFC credential lifecycle end to end.
7. Add email notifications with a durable outbox.
8. Add SMS through a contracted provider.
9. Add USSD through a contracted provider.
10. Add DigiNam only after formal technical and regulatory enablement.
11. Add National e-ID NFC support only after official protocol and interoperability confirmation.

This sequence aligns with the risk-based, evidence-led model in your blueprint and the NIST cycle of scope, gather information, build the target profile, address gaps, implement, evaluate, and adjust. [Source: *Cybersecurity Framework 2.0 Overview*, pp. 4–10.]

The immediate instruction to the coding agent should be:

> **Stop generating modules in batches. Remove all in-memory, placeholder, empty-guard, fake-provider, and TODO implementations. Implement one complete, database-backed, tenant-scoped, audited vertical slice at a time, with integration tests before proceeding to the next module.**

Yes. The correct approach is a **complete, role-named domain model** with real persistence and security controls—not a collection of source-file-named stub modules.

First, block the current change:

```ts
nameEncrypted: input.name ?? null, // TODO: real envelope encryption
```

That stores the name **in plaintext** while giving the column an encryption label. It must not merge. The same applies to any `phoneEncrypted`, `identityPayload`, or generic `payload` field that is not actually encrypted before database insertion.

Also, the existing `hashName()` pattern is only appropriate as a **keyed HMAC lookup index**, not as data protection. A simple hash of names is vulnerable to dictionary attacks. Use a KMS-managed secret/pepper and name it for its purpose:

```ts
visitorNameLookupHmac
```

—not `nameHash`.

---

# Buffr Checkpoint: Canonical Engineering Constitution

## 1. Wiebe semantic naming convention

I do not have a separate resource titled “Wiebe methodology,” so I will not pretend to cite one. I have encoded the convention you specified as a non-negotiable implementation rule:

> **Every schema, service, controller, command, event, table, and type must be named after the business capability, security role, or decision it performs—not after its folder, file, framework, or generic CRUD action.**

### Naming test

If someone can read a name without seeing its source file and understand:

1. **what it does**;
2. **which business process it belongs to**; and
3. **which risk/control it protects**;

then the name is acceptable.

| Reject | Use instead | Why |
|---|---|---|
| `VisitorsService` | `VisitorArrivalService`, `VisitorRecordProtectionService`, `VisitorDepartureService` | “Visitors” is a noun; it does not explain the service’s responsibility. |
| `DevicesService` | `KioskDeviceProvisioningService`, `DeviceComplianceAssessmentService`, `DeviceHealthMonitoringService` | Device registration, compliance, and health are separate capabilities. |
| `OfflineSyncService` | `OfflineVisitReconciliationService` | States what is reconciled and why. |
| `SmsService` | `OneTimeCodeDeliveryService`, `HostArrivalNotificationService` | SMS is a transport; it is not the business purpose. |
| `UssdService` | `FeaturePhoneCheckInSessionService` | Names the actual visitor journey. |
| `NfcService` | `NfcCredentialAuthenticationService` | NFC is technology; credential authentication is the purpose. |
| `StorageService` | `ProtectedEvidenceArtifactService` | The function is protected evidence handling, not generic storage. |
| `JobsService` | `RetentionDispositionScheduler`, `NotificationDeliveryWorker` | A job is an execution mechanism, not a domain capability. |
| `DiginamService` | `DigitalIdentityVerificationAdapter` | Allows a provider-specific adapter without making the provider name the business model. |
| `create-visit.dto.ts` | `record-visitor-arrival.command.ts` | Names the business event, not the HTTP method. |
| `visitSchema` | `recordVisitorArrivalCommandSchema` | Makes input purpose explicit. |
| `payload: Record<string, unknown>` | Discriminated, versioned command schemas | Generic payloads cannot be validated, audited, or safely evolved. |

---

# 2. Mandatory corrections to the current implementation

## Do not create production stubs

These patterns must be removed or rejected:

```ts
private claims: OfflineClaim[] = [];
private objects: StorageObject[] = [];
private capabilities: CapabilityStatus[] = [];

return { valid: false };
return { processed: 0 };
return { messageId: crypto.randomUUID() };
return { response: "END Buffr Checkpoint USSD check-in not yet configured." };
```

They create the appearance of a functioning control without delivering the control.

## Do not use empty guards

This is not valid security:

```ts
@UseGuards()
```

Every privileged route needs named guards and server-side policy evaluation, for example:

```ts
@UseGuards(SessionAuthenticationGuard, EmailVerificationGuard)
@RequirePermission('visit.arrival.record')
@RequireScope('site')
```

## Do not accept client-controlled tenant or storage fields

This is unsafe:

```ts
tenantPrefix: z.string()
```

The authenticated principal or enrolled kiosk must determine:

```text
organisation_id
site_id
device_id
storage key prefix
permitted action
scope
```

The client may submit a request, but it must never choose its own tenant boundary.

## Do not accept raw DigiNam/e-ID payloads

This must not exist:

```ts
identityPayload: z.record(z.string(), z.unknown())
```

The product should retain a minimal verification outcome, not raw certificates, identity payloads, biometric data, e-ID chip contents, or provider tokens.

---

# 3. Canonical bounded contexts and modules

Use these domain folders. The class names inside them must still describe their exact role.

```text
backend/src/modules/
├── organisation-access/
├── site-operations/
├── visitor-operations/
├── visitor-policy/
├── visitor-identity/
├── credential-management/
├── kiosk-device-management/
├── offline-reconciliation/
├── notification-delivery/
├── feature-phone-check-in/
├── protected-artifacts/
├── information-lifecycle/
├── audit-evidence/
├── risk-control-assurance/
├── third-party-governance/
├── emergency-management/
├── integration-governance/
└── platform-governance/
```

## Main application services

```text
OrganisationOnboardingService
OrganisationMembershipService
ScopedPermissionEvaluationService
PrivilegedActionEligibilityService

VisitorArrivalService
VisitorDepartureService
VisitorInvitationService
VisitorPresenceRosterService
VisitorAccessDecisionService
HostArrivalNotificationService

VisitorFormResolutionService
VisitorPolicyAcknowledgementService
VisitorDataMinimisationService

VisitorRecordProtectionService
VisitorContactPossessionVerificationService
DigitalIdentityVerificationAdapter
IdentityAssuranceAssessmentService

NfcCredentialIssuanceService
NfcCredentialAuthenticationService
CredentialRevocationService
CredentialExpiryMonitoringService

KioskDeviceProvisioningService
KioskDeviceTrustService
DeviceComplianceAssessmentService
DeviceSecurityPostureService
DeviceHealthMonitoringService

OfflineVisitCaptureValidationService
OfflineVisitReconciliationService
OfflineConflictResolutionService

OneTimeCodeDeliveryService
NotificationDeliveryWorker
UssdSessionOrchestrationService
FeaturePhoneCheckInSessionService

ProtectedEvidenceArtifactService
MalwareScreeningService
EvidenceArtifactAccessService

RetentionPolicyApplicationService
LegalHoldManagementService
PersonalDataRequestService
RetentionDispositionScheduler

AuditEventRecordingService
AuditEvidencePackService
AuditTrailIntegrityService

RiskRegisterManagementService
ControlDesignAssessmentService
ControlOperatingEffectivenessTestService
RemediationActionService
ResilienceExerciseService

ThirdPartyDueDiligenceService
TelecommunicationsProviderGovernanceService
CRANDeviceComplianceService

EmergencyRosterService
EmergencyRollCallService

IntegrationCapabilityGovernanceService
IntegrationCredentialVaultService
PlatformCapabilityApprovalService
```

---

# 4. Canonical shared types

These belong in a domain contract package, not in page-specific or source-file-specific types.

```ts
import { z } from 'zod';

export type Brand<T, TName extends string> = T & {
  readonly __brand: TName;
};

export type OrganisationId = Brand<string, 'OrganisationId'>;
export type SiteId = Brand<string, 'SiteId'>;
export type ZoneId = Brand<string, 'ZoneId'>;
export type VisitId = Brand<string, 'VisitId'>;
export type DeviceId = Brand<string, 'DeviceId'>;
export type UserId = Brand<string, 'UserId'>;
export type CredentialId = Brand<string, 'CredentialId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
```

## 4.1 Visitor check-in channels

```ts
export const visitorArrivalChannelSchema = z.enum([
  'assisted_front_desk',
  'self_service_kiosk',
  'pre_registered_qr',
  'secure_nfc_credential',
  'feature_phone_ussd',
  'feature_phone_sms',
  'digital_identity_verification',
]);

export type VisitorArrivalChannel = z.infer<
  typeof visitorArrivalChannelSchema
>;
```

## 4.2 Identity assurance levels

**Persisted codes are `V0`…`V4`** (see Part One §5.2 / §5.2a). The snake_case
names below are **documentation aliases** for the same levels — do not seed a
second `type_definition` domain for them.

```ts
/** Runtime / DB codes — match type_definition identity_assurance_level */
export const identityAssuranceLevelSchema = z.enum([
  'V0', // self_declared
  'V1', // contact_possession_confirmed
  'V2', // managed_credential_validated
  'V3', // digital_identity_verified
  'V4', // high_assurance_identity_verified
]);

export type IdentityAssuranceLevel = z.infer<
  typeof identityAssuranceLevelSchema
>;
```

These are assurance outcomes—not user categories.

| Code | Canonical name | Alias | Meaning | Example |
|---|---|---|---|---|
| `V0` | Self-asserted identity | `self_declared` | Visitor entered information, unverified | Assisted or kiosk entry |
| `V1` | Contact-channel possession | `contact_possession_confirmed` | Visitor controls the stated mobile number/session | SMS OTP or validated USSD session |
| `V2` | Site-issued credential possession | `managed_credential_validated` | A valid organisation-issued credential was presented | NFC contractor badge |
| `V3` | DigiNam / NPKI verified identity | `digital_identity_verified` | An approved digital identity provider returned a valid RP result | DigiNam/NPKI verification once formally enabled |
| `V4` | Official e-ID cryptographic validation | `high_assurance_identity_verified` | Official e-ID cryptographically validated under approved protocol | Restricted-site flow with approved process |

Hard rule: assurance level ≠ signature class ≠ certificate role ≠ access decision (Part One §5.2a; Regulatory Addendum §5.5).

## 4.3 Visit risk and access outcomes

```ts
export const visitRiskTierSchema = z.enum([
  'routine',
  'controlled',
  'restricted',
  'critical',
]);

export const accessDecisionSchema = z.enum([
  'entry_approved',
  'entry_pending',
  'entry_denied',
  'escort_required',
  'check_in_recorded_only',
]);

export const visitLifecycleStatusSchema = z.enum([
  'invited',
  'arrival_in_progress',
  'pending_host_approval',
  'checked_in',
  'checked_out',
  'denied',
  'cancelled',
  'no_show',
  'expired',
]);

export type VisitRiskTier = z.infer<typeof visitRiskTierSchema>;
export type AccessDecision = z.infer<typeof accessDecisionSchema>;
export type VisitLifecycleStatus = z.infer<typeof visitLifecycleStatusSchema>;
```

## 4.4 Capability status

This replaces a meaningless `enabled: boolean`.

```ts
export const governedCapabilityStatusSchema = z.enum([
  'not_assessed',
  'under_assessment',
  'integration_in_build',
  'integration_in_test',
  'approved_for_limited_use',
  'operational',
  'suspended',
  'retired',
]);

export type GovernedCapabilityStatus = z.infer<
  typeof governedCapabilityStatusSchema
>;
```

A capability cannot be moved to `operational` without:

- approval record;
- evidence reference;
- security review;
- operational owner;
- support/escalation model;
- tested implementation.

---

# 5. Full canonical data model

Use PostgreSQL with Drizzle. All production tables require:

```text
id UUID / UUIDv7 primary key
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ where mutable
organisation_id where tenant-scoped
```

Use UTC for authoritative timestamps and retain `site_timezone` as an IANA timezone, such as:

```text
Africa/Windhoek
```

Do not use browser time as legal/audit time.

---

## 5.1 Organisation and access model

| Table | Required fields | Purpose |
|---|---|---|
| `organisations` | `id`, `legal_name`, `trading_name`, `registration_reference`, `status`, `default_timezone`, `data_residency_policy`, `created_at` | Tenant root. |
| `organisation_settings` | `organisation_id`, `default_retention_policy_id`, `default_language`, `emergency_mode_enabled`, `identity_verification_policy`, `updated_at` | Tenant-level operational settings. |
| `regions` | `id`, `organisation_id`, `name`, `code`, `status` | Multi-site hierarchy. |
| `sites` | `id`, `organisation_id`, `region_id`, `name`, `site_code`, `physical_address`, `timezone`, `risk_tier`, `status` | Physical office, branch, clinic, gate, or facility. |
| `security_zones` | `id`, `organisation_id`, `site_id`, `name`, `zone_code`, `risk_tier`, `host_approval_required` | Restricted areas within a site. |
| `application_users` | `id`, `auth_subject_id`, `display_name_encrypted`, `work_email_encrypted`, `email_lookup_hmac`, `email_verified_at`, `mfa_enrolled_at`, `status` | Back-office human identities. |
| `organisation_memberships` | `id`, `organisation_id`, `user_id`, `role_id`, `active_from`, `active_until`, `status`, `assigned_by_user_id` | Links users to roles. |
| `membership_scopes` | `id`, `membership_id`, `scope_type`, `scope_id` | Assigns organisation, region, site, or zone boundaries. |
| `permission_definitions` | `permission_code`, `description`, `risk_classification` | Globally governed permissions. |
| `role_definitions` | `id`, `organisation_id nullable`, `role_code`, `role_label`, `is_system_role`, `requires_mfa`, `requires_verified_email` | System and organisation-custom roles. |
| `role_permission_grants` | `role_id`, `permission_code` | Permission composition. |
| `service_principals` | `id`, `organisation_id nullable`, `principal_name`, `purpose`, `status`, `credential_reference`, `active_until` | Non-human identities: kiosk, worker, integration. |
| `privileged_access_grants` | `id`, `user_id`, `organisation_id`, `reason`, `approved_by`, `starts_at`, `expires_at`, `revoked_at` | Time-bound break-glass access. |

### Canonical permissions

```ts
export const checkpointPermissionCodes = [
  'visit.arrival.record',
  'visit.departure.record',
  'visit.roster.read_live',
  'visit.history.read',
  'visit.access.approve',
  'visit.access.deny',
  'visit.invitation.create',
  'visit.invitation.cancel',
  'visit.pii.read',
  'visit.pii.correct',
  'visitor.data_request.manage',

  'site.read',
  'site.configure',
  'zone.configure',
  'host_directory.manage',

  'device.provision',
  'device.disable',
  'device.compliance.review',
  'device.health.read',

  'credential.issue',
  'credential.revoke',
  'credential.assign',
  'credential.usage.read',

  'form.configure',
  'policy.configure',
  'retention.configure',
  'legal_hold.manage',

  'audit_log.read',
  'evidence_pack.generate',
  'evidence_pack.download',

  'role.assign',
  'membership.manage',
  'integration.configure',
  'emergency_roster.activate',
  'emergency_rollcall.record',
] as const;

export type CheckpointPermissionCode =
  (typeof checkpointPermissionCodes)[number];
```

---

## 5.2 Visitor, protected PII and identity model

Do not store plaintext personal data in the `visitors` table.

| Table | Required fields | Purpose |
|---|---|---|
| `visitor_subjects` | `id`, `organisation_id`, `subject_status`, `first_seen_at`, `last_seen_at`, `merged_into_visitor_id nullable` | Stable visitor reference without plaintext PII. |
| `visitor_personal_data` | `visitor_id`, `encrypted_payload`, `encrypted_data_key`, `key_management_reference`, `encryption_algorithm`, `key_version`, `name_lookup_hmac nullable`, `phone_lookup_hmac nullable`, `last_rotated_at` | Protected PII payload. |
| `visitor_contact_confirmations` | `id`, `visitor_id`, `contact_lookup_hmac`, `confirmation_method`, `confirmed_at`, `expires_at`, `attempt_count`, `status` | Phone possession proof; never store OTP plaintext. |
| `visitor_identity_assessments` | `id`, `visitor_id`, `visit_id nullable`, `assurance_level`, `verification_provider_code`, `provider_reference_encrypted`, `verified_at`, `expires_at`, `outcome`, `attributes_released` | Minimal proof of identity outcome. |
| `visitor_identity_attribute_releases` | `id`, `identity_assessment_id`, `attribute_code`, `purpose`, `retention_expires_at` | Records approved identity attributes, not the raw credential. |
| `privacy_requests` | `id`, `organisation_id`, `visitor_id nullable`, `request_type`, `request_reference`, `requester_identity_assessment_id`, `received_at`, `due_at`, `status`, `outcome` | Access, correction, deletion, objection, or information requests. |

### Protected PII envelope

```ts
export interface ProtectedPersonalDataEnvelope {
  encryptionAlgorithm: 'AES_256_GCM';
  keyManagementReference: string;
  keyVersion: number;
  encryptedDataKey: string;
  initializationVector: string;
  ciphertext: string;
  authenticationTag: string;
}
```

The encrypted payload may contain only fields permitted by the active form and policy version:

```ts
export interface VisitorPersonalData {
  fullName?: string;
  mobileNumber?: string;
  organisationName?: string;
  vehicleRegistration?: string;
  approvedPhotoArtifactId?: string;
}
```

Never include:

- raw DigiNam credentials;
- raw e-ID chip data;
- biometric templates;
- raw certificate chains;
- unprotected national ID numbers;
- unrestricted staff notes.

---

## 5.3 Visitor policy, forms, consent and retention model

| Table | Required fields | Purpose |
|---|---|---|
| `visitor_categories` | `id`, `organisation_id`, `category_code`, `label`, `default_risk_tier`, `active` | General visitor, contractor, delivery, interview, VIP, restricted-site visitor. |
| `check_in_form_definitions` | `id`, `organisation_id`, `visitor_category_id`, `site_id nullable`, `form_name`, `status` | Logical form. |
| `check_in_form_versions` | `id`, `form_definition_id`, `version_number`, `effective_from`, `effective_until`, `approval_reference`, `status` | Immutable approved form version. |
| `check_in_form_fields` | `id`, `form_version_id`, `field_code`, `field_label`, `field_type_code`, `help_text`, `data_classification`, `required`, `visibility_rule`, `validation_schema`, `display_order` | Field configuration subject to data minimisation. |
| `check_in_form_field_translations` | `id`, `field_id`, `language_code`, `field_label`, `help_text` | Per-language label and help for custom and system fields. |
| `visitor_policy_documents` | `id`, `organisation_id`, `policy_code`, `policy_name`, `category` | Privacy notice, safety policy, NDA, contractor induction policy. |
| `visitor_policy_versions` | `id`, `policy_document_id`, `version_number`, `content_artifact_id`, `content_hash`, `language_code`, `effective_from`, `status` | Versioned legal/policy content. |
| `visitor_policy_acknowledgements` | `id`, `visit_id`, `policy_version_id`, `acknowledgement_method`, `acknowledged_at`, `device_id`, `content_hash`, `signature_artifact_id nullable` | Evidence of acknowledgement. |
| `retention_policies` | `id`, `organisation_id`, `policy_code`, `applies_to_category_id nullable`, `applies_to_site_id nullable`, `retention_days`, `archive_after_days nullable`, `approval_reference`, `status` | Enforces storage limitation. |
| `legal_holds` | `id`, `organisation_id`, `hold_reference`, `reason`, `raised_by_user_id`, `active_from`, `released_at`, `status` | Stops automated deletion. |
| `retention_disposition_events` | `id`, `organisation_id`, `resource_type`, `resource_id`, `policy_id`, `disposition`, `performed_at`, `performed_by_principal_id`, `evidence_artifact_id nullable` | Archive/delete outcome evidence. |

---

## 5.4 Visit lifecycle and presence model

| Table | Required fields | Purpose |
|---|---|---|
| `site_hosts` | `id`, `organisation_id`, `site_id`, `user_id nullable`, `host_name_encrypted`, `host_contact_reference`, `active` | Allows a host to exist without a full dashboard account. |
| `visit_invitations` | `id`, `organisation_id`, `site_id`, `host_id`, `visitor_category_id`, `invitation_reference`, `token_hmac`, `expected_from`, `expected_until`, `status`, `verification_requirement` | Pre-registration and one-time invitations. |
| `visitor_visits` | `id`, `organisation_id`, `site_id`, `zone_id nullable`, `visitor_id`, `host_id nullable`, `visitor_category_id`, `arrival_channel`, `risk_tier`, `status`, `identity_assurance_level`, `checked_in_at`, `checked_out_at`, `retention_policy_id`, `policy_version_id`, `idempotency_key` | Core operational record. |
| `visit_status_events` | `id`, `visit_id`, `from_status`, `to_status`, `reason_code`, `occurred_at`, `actor_principal_id`, `device_id nullable` | Lifecycle history. |
| `visit_access_decisions` | `id`, `visit_id`, `decision`, `decision_reason_code`, `required_assurance_level`, `decided_by_principal_id nullable`, `decided_at`, `expires_at nullable` | Entry decision, rejection, escort rule. |
| `visitor_check_in_attempts` | `id`, `organisation_id`, `site_id`, `channel`, `device_id nullable`, `request_id`, `outcome`, `failure_reason_code`, `occurred_at` | Operational/security telemetry without storing raw failed payloads. |
| `emergency_roll_call_events` | `id`, `organisation_id`, `site_id`, `activation_reason`, `activated_by`, `activated_at`, `closed_at` | Emergency event. |
| `emergency_roll_call_entries` | `id`, `roll_call_event_id`, `visit_id`, `status`, `confirmed_at`, `confirmed_by`, `note_encrypted nullable` | Evacuation accountability. |

### Visit invariants

```text
1. A checked-out visit cannot receive a second check-out.
2. A visit cannot be checked in twice under the same idempotency key.
3. A host must be active and authorised for the selected site.
4. A restricted/critical visit cannot bypass its required assurance level.
5. Legal hold overrides scheduled deletion.
6. Every status transition creates an audit event.
7. A public kiosk never performs broad visitor search by name.
8. A visitor record shown to an operator is scoped by organisation, site and permission.
```

---

## 5.5 NFC credential model

| Table | Required fields | Purpose |
|---|---|---|
| `access_credentials` | `id`, `organisation_id`, `credential_type`, `credential_reference_hmac`, `security_profile`, `status`, `valid_from`, `valid_until`, `issued_to_visitor_id nullable`, `issued_to_membership_id nullable` | NFC, QR, mobile, contractor credential. |
| `credential_assignments` | `id`, `credential_id`, `visitor_id nullable`, `membership_id nullable`, `site_id`, `zone_id nullable`, `purpose`, `assigned_at`, `revoked_at` | Site- and purpose-bound credential assignment. |
| `credential_authentication_events` | `id`, `credential_id nullable`, `device_id`, `site_id`, `zone_id nullable`, `challenge_reference`, `outcome`, `failure_reason_code`, `occurred_at` | Authentication evidence. |
| `credential_revocation_events` | `id`, `credential_id`, `reason_code`, `revoked_by`, `revoked_at`, `replacement_credential_id nullable` | Lost, expired, compromised or returned credential. |

### NFC control rule

For low-risk convenience, an NFC tag may contain an opaque random reference. It must contain no PII.

For restricted/critical sites:

```text
Do not treat a static NFC UID as authentication.
```

Use a credential that supports cryptographic challenge-response or mutual authentication. A writable low-cost NFC sticker is acceptable for low-risk check-in convenience, but not as the sole mechanism for restricted-zone access.

---

## 5.6 Kiosk device, CRAN and asset-management model

| Table | Required fields | Purpose |
|---|---|---|
| `managed_kiosk_devices` | `id`, `organisation_id`, `site_id`, `device_name`, `manufacturer`, `model`, `serial_number_encrypted`, `operating_system`, `device_status`, `mdm_enrolment_status`, `assigned_at`, `retired_at` | Managed tablets/kiosks. |
| `device_radio_components` | `id`, `device_id`, `component_type`, `manufacturer`, `model`, `frequency_band`, `connectivity_features` | Wi-Fi, Bluetooth, cellular, NFC reader, router. |
| `cran_compliance_assessments` | `id`, `device_radio_component_id`, `compliance_basis`, `certificate_reference`, `exemption_reference`, `assessment_status`, `evidence_artifact_id`, `assessed_by`, `assessed_at`, `review_due_at` | CRAN type approval or exemption evidence. |
| `device_trust_keys` | `id`, `device_id`, `key_reference`, `algorithm`, `status`, `activated_at`, `revoked_at`, `rotated_at` | Device-held signing identity; never store private keys in the database. |
| `device_health_observations` | `id`, `device_id`, `observed_at`, `application_version`, `os_patch_level`, `battery_status`, `network_status`, `sync_backlog_count`, `security_posture_status` | Kiosk health. |
| `device_maintenance_actions` | `id`, `device_id`, `action_type`, `scheduled_for`, `completed_at`, `performed_by`, `outcome`, `evidence_artifact_id` | ISO 55000-style asset lifecycle controls. |
| `device_disposal_events` | `id`, `device_id`, `disposal_method`, `secure_wipe_evidence`, `disposed_at`, `approved_by` | Secure retirement. |

### CRAN compliance basis

```ts
export const cranComplianceBasisSchema = z.enum([
  'type_approval_certificate',
  'documented_exemption',
  'not_applicable',
  'assessment_pending',
]);

export type CRANComplianceBasis = z.infer<
  typeof cranComplianceBasisSchema
>;
```

CRAN regulates communications equipment and type approval under the Communications Act. NFC/RFID equipment can fall within exemptions depending on frequency, power, and exact device specification, but you must assess the actual SKU rather than assume every NFC reader is exempt. [CRAN, “Understanding Type Approval and Its Importance in Namibia”; Communications Act 8 of 2009.]

---

## 5.7 Offline capture and reconciliation model

| Table | Required fields | Purpose |
|---|---|---|
| `offline_capture_envelopes` | `id`, `organisation_id`, `site_id`, `device_id`, `event_id`, `visit_id`, `captured_at_device`, `received_at_server`, `canonical_payload_ciphertext`, `payload_digest`, `signature`, `device_key_id`, `idempotency_key`, `reconciliation_status` | Validated offline events. |
| `offline_reconciliation_outcomes` | `id`, `offline_capture_envelope_id`, `outcome`, `conflict_type nullable`, `resolved_by`, `resolved_at`, `resolution_reason` | Accepted, rejected, duplicate, conflict-resolved. |
| `offline_sync_failures` | `id`, `device_id`, `event_id`, `failure_code`, `retry_after`, `occurred_at`, `terminal` | Operational visibility and recovery. |

### Offline capture command

```ts
export const reconcileOfflineVisitorArrivalCommandSchema = z.object({
  eventId: z.string().uuid(),
  visitId: z.string().uuid(),
  capturedAtDevice: z.string().datetime(),
  idempotencyKey: z.string().min(24).max(160),
  canonicalPayloadCiphertext: z.string().min(1),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().min(32),
  deviceKeyId: z.string().uuid(),
}).strict();

export type ReconcileOfflineVisitorArrivalCommand = z.infer<
  typeof reconcileOfflineVisitorArrivalCommandSchema
>;
```

The backend derives tenant/site/device from the authenticated enrolled kiosk identity. It does **not** accept these values from the body.

---

## 5.8 Notifications, SMS and USSD model

| Table | Required fields | Purpose |
|---|---|---|
| `notification_delivery_instructions` | `id`, `organisation_id`, `visit_id nullable`, `recipient_reference`, `channel_code`, `status_code`, `subject nullable`, `message`, `html nullable`, `attempt_count`, `next_attempt_at`, `failure_reason nullable`, `sent_at nullable` | Real outbox record (implemented v0.23) — message content persisted at enqueue time, drained by `NotificationDispatchWorkerService`. |
| `notification_delivery_status_events` | `id`, `notification_delivery_instruction_id`, `from_status_code nullable`, `to_status_code`, `occurred_at`, `provider_code nullable`, `failure_code nullable`, `note nullable` | Append-only delivery-attempt/status-transition log (implemented v0.23 as the schema's standard `_status_events` companion table, in place of the originally proposed separate `notification_delivery_attempts` table — same evidence, consistent naming with `organisation_unit_status_events` etc). |
| `one_time_code_challenges` | `id`, `organisation_id`, `purpose`, `recipient_lookup_hmac`, `code_hmac`, `expires_at`, `attempt_count`, `maximum_attempts`, `verified_at`, `status` | OTP only; never store code plaintext. |
| `feature_phone_sessions` | `id`, `telecom_provider_code`, `carrier_session_reference`, `phone_lookup_hmac`, `site_reference`, `journey_state`, `started_at`, `expires_at`, `completed_at`, `status` | USSD state machine. |
| `feature_phone_session_events` | `id`, `session_id`, `sequence_number`, `input_classification`, `outbound_prompt_code`, `occurred_at` | USSD audit without unnecessary content capture. |

### SMS/USSD design rules

- Buffr Checkpoint must not become a telecom operator.
- SMS/USSD must run through a contracted, authorised mobile network operator or authorised aggregator.
- SMS/USSD content must be neutral: no sensitive purpose, ID, host identity, or visit details on a lock screen.
- SMS/USSD confirms possession of a device/session—not identity.
- The USSD endpoint should be an authenticated provider webhook, not a generic public `/ussd/request` endpoint.

The Communications Act/CRAN framework is relevant to messaging-provider and device governance, while DigiNam/NPKI sits within the country’s digital-trust ecosystem. [CRAN; National Digital Strategy 2025–2028.]

---

## 5.9 Protected artifacts and evidence model

| Table | Required fields | Purpose |
|---|---|---|
| `protected_evidence_artifacts` | `id`, `organisation_id`, `resource_type`, `resource_id`, `artifact_category`, `object_key`, `content_type`, `content_length`, `content_digest`, `malware_scan_status`, `encryption_key_reference`, `retention_expires_at` | Signed policies, approved photos, evidence packs, device evidence. |
| `artifact_upload_authorisations` | `id`, `organisation_id`, `resource_type`, `resource_id`, `permitted_content_types`, `maximum_size_bytes`, `expires_at`, `created_by` | Pre-signed upload initiation. |
| `artifact_access_events` | `id`, `artifact_id`, `actor_principal_id`, `access_purpose`, `accessed_at`, `outcome` | Sensitive artifact access record. |
| `evidence_packs` | `id`, `organisation_id`, `scope_type`, `scope_id`, `period_start`, `period_end`, `requested_by`, `approved_by`, `status`, `generated_artifact_id` | Board, audit, regulator, or customer evidence pack. |
| `evidence_pack_contents` | `id`, `evidence_pack_id`, `resource_type`, `resource_id`, `redaction_profile`, `included_at` | Explains exactly what was included. |

No upload request should contain:

```ts
tenantPrefix: string;
```

The key is generated server-side:

```text
organisation/{organisationId}/evidence/{resourceType}/{resourceId}/{artifactId}
```

---

## 5.10 Audit, risk, assurance and third-party governance model

| Table | Required fields | Purpose |
|---|---|---|
| `audit_events` | `id`, `organisation_id`, `site_id nullable`, `actor_type`, `actor_principal_id`, `action_code`, `resource_type`, `resource_id`, `outcome`, `reason_code`, `occurred_at`, `request_id`, `previous_event_hash`, `event_hash` | Append-only, tamper-evident audit trail. |
| `risk_register_entries` | `id`, `organisation_id`, `risk_code`, `risk_title`, `risk_description`, `risk_owner`, `risk_action_owner`, `likelihood`, `impact`, `residual_risk`, `tolerance_status`, `review_due_at` | Risk governance. |
| `control_definitions` | `id`, `control_code`, `control_name`, `control_objective`, `framework_references`, `control_type` | Reusable control catalogue. |
| `control_implementations` | `id`, `organisation_id`, `control_id`, `scope_type`, `scope_id`, `control_owner`, `frequency`, `implementation_status` | Client implementation record. |
| `control_effectiveness_tests` | `id`, `control_implementation_id`, `test_period_start`, `test_period_end`, `test_method`, `result`, `tester`, `evidence_pack_id nullable` | Independent control testing. |
| `control_findings` | `id`, `organisation_id`, `control_test_id`, `finding_severity`, `finding_description`, `management_response`, `status` | Assurance finding. |
| `remediation_actions` | `id`, `finding_id`, `action_owner`, `target_date`, `completion_date`, `status`, `validation_result` | Corrective action lifecycle. |
| `security_incidents` | `id`, `organisation_id`, `incident_type`, `detected_at`, `contained_at`, `recovered_at`, `impact_assessment_status`, `reporting_status` | Security and operational incident record. |
| `resilience_exercises` | `id`, `organisation_id`, `exercise_type`, `scenario`, `planned_at`, `executed_at`, `result`, `rto_achieved_minutes`, `rpo_achieved_minutes`, `lessons_learned` | Recovery/resumption testing. |
| `third_party_service_providers` | `id`, `organisation_id nullable`, `provider_name`, `service_category`, `data_processing_role`, `criticality`, `country_of_processing`, `status` | Messaging, cloud, MDM, identity, NFC, support vendors. |
| `third_party_assessments` | `id`, `provider_id`, `assessment_type`, `assessed_at`, `risk_rating`, `assessor`, `evidence_artifact_id`, `review_due_at` | Supplier due diligence. |
| `telecommunications_provider_arrangements` | `id`, `provider_id`, `service_type`, `licensing_evidence_reference`, `short_code_reference nullable`, `contract_status`, `support_escalation_reference` | SMS/USSD governance. |
| `platform_capability_approvals` | `id`, `capability_code`, `status`, `evidence_pack_id`, `approved_by`, `approved_at`, `review_due_at`, `public_claim_status` | Prevents false “live integration” claims. |

This reflects the assurance, risk, audit, resilience, and third-party expectations in NamCode, PSD-12, and the NIST CSF/ERM/workforce guide. [*NamCode: Namibia’s Corporate Governance Code*, Chapters 3–7 and 9; *Payment System Cybersecurity Standards*, paragraphs 9–14; *Cybersecurity Framework 2.0 Overview*, pp. 4–10.]

---

# 6. Required RBA + RBAC decision model

Use **RBAC** for permissions and scope. Use **Risk-Based Access (RBA)** for the visit decision.

```text
Can this staff member perform this action?
        ↓
RBAC: role + permission + organisation/site/zone scope
        ↓
Should this visitor be permitted into this site/zone?
        ↓
RBA: visitor type + visit risk tier + identity assurance +
    policy requirements + credential status + host approval +
    site context + current incidents/emergency state
```

## RBA policy fields

```ts
export interface VisitorAccessPolicy {
  policyId: string;
  siteId: string;
  zoneId?: string;
  visitorCategoryCode: string;
  riskTier: VisitRiskTier;
  minimumIdentityAssurance: IdentityAssuranceLevel;
  permittedArrivalChannels: VisitorArrivalChannel[];
  hostApprovalRequired: boolean;
  inductionRequired: boolean;
  credentialRequired: boolean;
  escortRequired: boolean;
  offlineOperationPermitted: boolean;
  policyVersion: number;
}
```

### Critical rule

High-assurance identity verification cannot be silently downgraded when offline.

```text
If a site requires live digital identity verification:
- check-in may be recorded offline;
- physical entry remains pending;
- host/security approval is required;
- no false “verified” outcome is created.
```

---

# 7. Core command schemas

All external requests must use `.strict()` Zod objects.

## Record visitor arrival

```ts
export const recordVisitorArrivalCommandSchema = z.object({
  visitorCategoryCode: z.string().min(2).max(80),
  arrivalChannel: visitorArrivalChannelSchema,
  hostReference: z.string().uuid().optional(),
  invitationReference: z.string().max(160).optional(),
  requestedZoneReference: z.string().uuid().optional(),
  formVersionReference: z.string().uuid(),
  formAnswers: z.array(
    z.object({
      fieldCode: z.string().min(1).max(100),
      value: z.string().max(500).optional(),
    }).strict(),
  ),
  idempotencyKey: z.string().min(24).max(160),
}).strict();

export type RecordVisitorArrivalCommand = z.infer<
  typeof recordVisitorArrivalCommandSchema
>;
```

## Record visitor departure

```ts
export const recordVisitorDepartureCommandSchema = z.object({
  visitId: z.string().uuid(),
  departureChannel: visitorArrivalChannelSchema,
  idempotencyKey: z.string().min(24).max(160),
}).strict();

export type RecordVisitorDepartureCommand = z.infer<
  typeof recordVisitorDepartureCommandSchema
>;
```

## Start NFC credential authentication

```ts
export const authenticateNfcCredentialCommandSchema = z.object({
  readerSessionReference: z.string().uuid(),
  credentialReference: z.string().min(16).max(512),
  cryptographicResponse: z.string().min(32).max(4096).optional(),
  requestedZoneReference: z.string().uuid().optional(),
}).strict();

export type AuthenticateNfcCredentialCommand = z.infer<
  typeof authenticateNfcCredentialCommandSchema
>;
```

## Start a feature-phone session

```ts
export const startFeaturePhoneCheckInSessionCommandSchema = z.object({
  carrierSessionReference: z.string().min(1).max(160),
  phoneNumber: z.string().min(7).max(32),
  networkProviderCode: z.string().min(2).max(80),
  userInput: z.string().max(160),
}).strict();

export type StartFeaturePhoneCheckInSessionCommand = z.infer<
  typeof startFeaturePhoneCheckInSessionCommandSchema
>;
```

The inbound USSD request is accepted only from a verified telecom provider integration. It is not a normal public endpoint.

---

# 8. Complete core vertical slice: visitor arrival

This is the first feature that must be implemented fully—not stubbed.

```text
POST /visitor-arrivals
        ↓
Authenticate operator session or kiosk device credential
        ↓
Resolve organisation/site from principal
        ↓
Confirm role permission and scope
        ↓
Validate command against active form version
        ↓
Resolve visitor category and access policy
        ↓
Validate host, invitation, credential, and assurance requirement
        ↓
Encrypt permitted PII using KMS envelope encryption
        ↓
Create or safely resolve visitor subject
        ↓
Create visit, status event, retention date, and required acknowledgement
        ↓
Create access decision
        ↓
Write audit event in the same database transaction
        ↓
Create host-notification outbox record
        ↓
Return a minimum-data confirmation
```

## Required transaction outputs

```ts
export interface VisitorArrivalResult {
  visitId: string;
  visitStatus: VisitLifecycleStatus;
  accessDecision: AccessDecision;
  identityAssuranceLevel: IdentityAssuranceLevel;
  hostNotificationStatus: 'queued' | 'not_required';
  checkedInAt: string;
}
```

## Required audit event

```ts
export interface AuditEvent {
  id: AuditEventId;
  organisationId: OrganisationId;
  siteId?: SiteId;
  actorType: 'user' | 'kiosk_device' | 'service_principal';
  actorPrincipalId: string;
  actionCode: 'visitor_arrival_recorded';
  resourceType: 'visitor_visit';
  resourceId: VisitId;
  outcome: 'success' | 'denied' | 'failure';
  reasonCode?: string;
  occurredAt: string;
  requestId: string;
  previousEventHash?: string;
  eventHash: string;
}
```

---

# 9. Required backend API surface

| Endpoint | Purpose | Minimum protection |
|---|---|---|
| `POST /auth/onboard-organisation-admin` | Atomic organisation + first administrator creation | Rate limit, email verification, audit event |
| `POST /auth/login` | Session creation | Rate limit, secure cookie |
| `POST /auth/logout` | Session termination | Session invalidation audit |
| `GET /auth/me` | Real current identity and scopes | Authenticated user |
| `POST /visitor-arrivals` | Check-in | Operator/kiosk scope + permission |
| `POST /visitor-departures` | Check-out | Scope + idempotency |
| `GET /sites/:siteId/presence` | Live roster | Site-scope permission |
| `POST /visit-invitations` | Pre-registration | Host or manager permission |
| `POST /credential-authentications/nfc` | NFC challenge validation | Enrolled reader/device only |
| `POST /feature-phone-sessions/ussd` | Provider webhook | Provider signature validation |
| `POST /one-time-code-challenges` | SMS/OTP initiation | Rate-limited, neutral response |
| `POST /one-time-code-challenges/:id/verify` | OTP confirmation | Attempt/replay controls |
| `POST /offline-arrival-reconciliations` | Offline event acceptance | Device certificate/signature validation |
| `GET /devices` | Device inventory | Device-management permission |
| `POST /devices/provision` | Enrol kiosk | System administrator + MFA |
| `GET /device-compliance-assessments` | CRAN device evidence | Compliance/admin permission |
| `GET /audit-events` | Scoped audit review | Audit permission, MFA |
| `POST /evidence-packs` | Evidence generation | Approval + audit event |
| `POST /retention-dispositions/run` | Worker-only, not public | Queue/service principal only |
| `POST /identity-verifications/diginam/callback` | Provider callback only | Provider signature/mTLS; no browser access |

---

# 10. DigiNam and national e-ID capability rule

DigiNam being nationally live does **not** automatically mean Buffr Checkpoint is live-integrated.

The platform’s public claim must be driven by `platform_capability_approvals`, not marketing copy or a hardcoded boolean.

| Situation | Correct product wording |
|---|---|
| DigiNam exists, no approved relying-party connection | “Designed to support DigiNam verification.” |
| Relying-party documentation/contract received, test integration underway | “DigiNam integration in controlled testing.” |
| Security, legal, interoperability, operational support, and approval evidence complete | “DigiNam verification operational for approved customers.” |

The Electronic Transactions Act provides the legal framework for electronic records, signatures, retention, and computer evidence; it does not automatically approve every identity integration. [*Electronic Transactions Act Overview*, sections 17, 19–25, 33.]

---

# 11. Hosting and public-claim correction

You previously tested against a Neon-backed API. That alone does **not** prove that data is hosted in Namibia.

Until you can evidence:

- the exact Neon/PostgreSQL region;
- backup location;
- object-storage location;
- KMS/key-management location;
- monitoring/logging location;
- messaging-provider processing location;
- support-access location;
- subprocessor agreements;

do not publish:

```text
Data hosted in Namibia
```

Use:

```text
Designed for Namibian data-residency requirements.
```

Once the full processing chain is contractually and technically verified, the product can make a narrower, evidence-backed hosting statement.

The same applies to “PSD-12 compliant.” Prefer:

```text
Designed to support PSD-12-aligned cybersecurity and resilience controls.
```

unless a formal scope assessment confirms that the determination applies directly and every relevant requirement is evidenced.

---

# 12. Implementation order

## Phase 1 — Complete usable system

1. Atomic organisation/admin onboarding.
2. `/auth/me`, real roles, real site scopes.
3. Role/permission/scope enforcement.
4. Organisation → region → site → zone structure.
5. Visitor category, policy, form, and retention models.
6. Full check-in/check-out vertical slice.
7. Envelope encryption with real KMS integration.
8. Audit-event recording in the same transaction.
9. Host notification outbox and email worker.
10. Live site roster and emergency roster.
11. Admin template conversion from demo data to real APIs.

## Phase 2 — Operational resilience and device governance

12. Kiosk provisioning and MDM.
13. Device Compliance Register and CRAN evidence.
14. Offline encrypted event capture/reconciliation.
15. Device signing keys and replay prevention.
16. NFC credential lifecycle.
17. Secure NFC authentication for higher-risk use cases.
18. Protected artifact storage, malware scanning, and evidence packs.
19. Retention scheduler, legal holds, deletion evidence.

## Phase 3 — Inclusion and regulated integrations

20. SMS one-time-code flow.
21. Contracted-provider USSD integration.
22. Feature-phone check-in and check-out.
23. Multilingual flows.
24. DigiNam relying-party adapter only when formally enabled.
25. Physical e-ID/NFC support only after official interface/specification and interoperability testing.
26. Enterprise access-control integration after a customer-specific threat model.

---

# 13. Sources informing the model

- **NamCode: Namibia’s Corporate Governance Code** — supports board responsibility for risk governance, IT governance, compliance, internal audit, stakeholder trust, reliable disclosure, and evidence-led assurance. Particularly relevant: Chapters 3–7 and 9.  
- **Payment System Cybersecurity Standards (PSD-12)** — informs the framework, leadership, risk tolerance, resilience, third-party arrangements, monitoring, recovery, and incident-management model. Particularly relevant: paragraphs 9–14.  
- **Electronic Transactions Act Overview** — informs electronic-record integrity, retention, admissibility, evidence reliability, original information, automated systems, and secure electronic processes. Particularly relevant: sections 17, 19–25, and 33.  
- **National Payment System Strategy 2030** — reinforces user-centricity, trust and resilience, digital enablement, strategic foresight, inclusion, and knowledge communities.  
- **Regulatory Compliance in Namibia Payment Systems** — supports the principle that nothing should be described as approved, licensed, certified, or partnered until it is evidenced.  
- **Cybersecurity Framework 2.0 Overview** — informs the current/target profile, risk register, business impact, role clarity, resource allocation, continuous monitoring, and manage-evaluate-adjust lifecycle.  
- **Technology Risk Advisory Services** — supports the Assess → Design → Implement → Assure operating methodology.  
- **Vizito Demo 2026: Easy & Secure Digital Visitor Management System** — informed the operational feature set: configurable visitor categories/forms, agreements, pre-registration, badges, host notification, multi-site administration, emergency rosters, reporting, device management, and RBAC. Buffr Checkpoint should improve on it by avoiding public visitor-name search and using stronger privacy-safe return-visitor flows.  
- **CRAN / Communications Act resources** — inform telecommunications-equipment type approval/exemption assessment, SMS/USSD supplier governance, National PKI/DigiNam trust considerations, and the Device Compliance Register.

Add this as **Section 11.6.5: Visual, Image Placement and Product Demonstration Strategy**. It should supersede earlier navy/teal, shadow-heavy mockups and align all surfaces to the latest light-canvas brand system.

---

# 11.6.5 Visual, Image Placement and Product Demonstration Strategy

## Design principle

> **Show the risk clearly. Show the product simply. Show the evidence credibly.**

Buffr Checkpoint is not selling generic software aesthetics. It is selling confidence that visitor information is protected, access is proportionate, and records can be evidenced later.

The visual system must therefore move users through this sequence:

```text
Recognise the paper-register risk
        ↓
See the safer alternative
        ↓
Understand how it works
        ↓
See proof of control and inclusion
        ↓
Take one clear action
```

This reflects the platform’s operating model: **Assess → Design → Implement → Assure**. [Source: *Technology Risk Advisory Services*, pp. 4–5.]

---

## 1. Correct visual-system decisions

### 1.1 Use the real brand palette consistently

The latest blueprint has the correct direction: light canvas, black/near-black wordmark, and Sodium Yellow accent.

| Purpose | Token | Usage |
|---|---:|---|
| Primary ink | `#171717` | Headings, body text, navigation, icon mark |
| Main action accent | `#E2A603` | Primary CTA, active navigation, selected controls |
| Page ground | `#F5F4EF` | Primary background |
| Elevated surface | `#FFFFFF` | Cards, dialogs, forms, tables |
| Muted panel | `#E9E7E0` | Secondary panels and visual grouping |
| Border | `#D9D9D4` | Hairline dividers and card outlines |
| Secondary text | `#6B6B6B` | Metadata and helper text |
| Verified/live status | `#15803D` | Verified identity, successful sync, operational status |
| Warning / targeted | `#E2A603` | Capability targeted or pending review |
| Error / blocked | Dedicated red token | Failed sync, denied access, required action |

### Corrections

1. **Do not retain earlier teal/navy visual language** from the first landing-page versions. It conflicts with the real black-and-gold logo assets described in v0.5/v0.6.
2. **Do not use `#FFE900` in the kiosk.** It is not the same as the approved `#E2A603` Sodium Yellow. Use the exact brand accent across website, admin, kiosk, printed badges, and pitch deck.
3. **No shadows** is the right design rule. The current code examples still include shadow utilities. Remove them progressively and use:
   - off-white canvas;
   - white elevated surface;
   - 1px warm-grey border;
   - spacing;
   - restrained yellow emphasis.

4. **Lime Pulse must not indicate verified security, compliance, or live capability.** Use `#15803D` for operationally meaningful green states. Lime is editorial only, or remove it entirely from Version 1.

---

# 2. Image Strategy: Five Asset Types

Do not use images decoratively just because a SaaS website “needs imagery.” Every image must explain an operational reality, lower uncertainty, or demonstrate a product outcome.

| Asset type | Purpose | Best placement | Rules |
|---|---|---|---|
| **Product UI screenshots** | Demonstrate the actual system | Home, Platform, Pricing, sales deck | Highest priority. Use real data only in controlled demo tenant. |
| **System diagrams** | Explain data flow, controls, channels, and roles | Platform, tender packs, compliance pages | Prefer diagrams over stock images for technical buyers. |
| **Contextual photography** | Create human relevance and Namibia/Africa context | Hero (`hero-*.png`) and closing band (`closing-*.png`) on primary marketing routes | Only real, consented, non-sensitive settings. Closing bands use dedicated files — never the hero asset for that route. |
| **Hardware photography** | Make kiosk, NFC reader, badge printer, and privacy-screen setup tangible | Platform, product sheets, government tenders | Use actual approved hardware or labelled concept render. |
| **Data visualisations** | Prove control operation | Admin dashboard, assurance packs, case studies | Never use invented metrics, fake “live” records, or decorative charts. |

---

# 3. Homepage Placement Strategy

## 3.1 Hero: product proof, not a generic office photo

**Recommended layout:**

```text
Left:
- Headline
- Two-sentence problem statement
- One primary CTA:
  Create account

Right:
- Real Buffr Checkpoint kiosk/product interface
- One isolated visitor record
- Small privacy confirmation state:
  Record protected. Visible only to authorised staff.
```

### Use

- A high-quality **product UI composition** inside a tablet/kiosk frame.
- One visible, synthetic visitor confirmation.
- A small badge row beneath the hero:
  - Offline-capable
  - NFC badge check-in available
  - Audit-ready records
  - Feature-phone pathway where enabled
  - DigiNam status driven only by the capability register

### Do not use

- A photograph of a visitor holding an e-ID card unless National e-ID support is actually operational.
- A “DigiNam verified” illustration unless Buffr Checkpoint’s own relying-party integration is evidenced and enabled.
- A generic cyber-shield image.
- A crowded reception photo behind the hero copy.
- A paper register containing real or realistically readable names, numbers, or ID data.

## 3.2 Immediately after the hero: the paper-risk visual

This is the strongest educational/product-placement section.

```text
LEFT: Paper Register
- visibly shared page
- redacted synthetic lines
- labelled risk points:
  Name visible
  Phone number visible
  Visit purpose visible
  No access history

RIGHT: Buffr Checkpoint
- single visitor record
- access scope label
- encrypted record indicator
- retention-policy label
- audit-event indicator
```

This must be a **designed comparison**, not a photo of an actual customer’s register. The objective is to make the risk intuitive without turning privacy into fear marketing.

## 3.3 Third section: “Every visitor can check in”

Use an illustrated multi-channel strip rather than photographs:

```text
NFC badge     QR invitation     Tablet kiosk
      ↓              ↓               ↓
USSD           SMS                Assisted entry
      ↓              ↓               ↓
      One protected visit record
```

This is where the platform demonstrates inclusion. It should visually communicate that feature-phone and no-phone visitors are not second-class users.

The National Payment System Strategy 2030 emphasises user-centricity, trust/resilience, and digital enablement. A multi-channel visual is a more credible demonstration of those principles than a smartphone-only product image. [Source: *National Payment System Strategy 2030*, Strategic Overview and Table 1.]

## 3.4 Fourth section: operational proof

Place three real product screenshots in a horizontal sequence:

1. **Front Desk roster**  
   Current visitors, pending approvals, check-out actions.

2. **Device Compliance Register**  
   Kiosk model, CRAN status, MDM status, firmware, review date.

3. **Compliance Dashboard**  
   Retention actions due, offline-sync exceptions, audit-log access, evidence-pack generation.

This is where the site moves from “nice reception tool” to “governed control platform.”

## 3.5 Final CTA

No image is necessary. Use a clean, high-contrast yellow panel:

```text
Replace your paper register before it becomes your next privacy incident.

[ Create account ]
```

One action. No competing buttons.

---

# 4. Platform Page Placement Strategy

The Platform page should be **diagram- and screenshot-led**, not photography-led.

## Recommended sequence

| Section | Visual | Objective |
|---|---|---|
| Architecture | Layered data-flow diagram | Demonstrate secure flow from check-in channel to audit evidence. |
| Identity assurance | V0–V4 assurance ladder | Explain that possession is not identity verification. |
| RBAC | Real table, not an image | Prove role/scope model is understandable and reviewable. |
| Offline operation | Three-state visual: online → local encrypted queue → synced | Show resilience without claiming uninterrupted identity verification. |
| NFC | Real hardware photo + credential lifecycle diagram | Demonstrate physical realism and security controls. |
| Capability status | Live status component | Prevent unsupported DigiNam/e-ID claims. |
| Audit/evidence | Evidence-pack screen | Show what an auditor, board, or regulator receives. |

### Architecture diagram rules

Use only six main layers in the public visual:

```text
Check-in channels
        ↓
Site kiosk and offline cache
        ↓
API and identity gateway
        ↓
Visitor workflow and RBA
        ↓
Encrypted records and retention
        ↓
Audit evidence and reporting
```

Place external systems as side integrations, not as core dependencies:

```text
DigiNam/NPKI
SMS/USSD provider
Email provider
Access-control system
MDM
```

This psychologically communicates control: Buffr Checkpoint remains the governed core, while third parties are managed dependencies.

---

# 5. Pricing Page Placement Strategy

Pricing pages should be **low-image, high-clarity**.

Do not put generic smiling-office photos between pricing cards. It distracts from the buyer’s decision and can make a regulated product feel lightweight.

Use:

- plan cards;
- a simple channel-inclusion matrix;
- a hardware placement diagram;
- a “what is included” visual;
- capability-status badges driven from the governed register;
- a small NFC badge/reader product photograph under Professional or Access.

### Product placement by tier

| Tier | Visual focus |
|---|---|
| Checkpoint Core | Tablet kiosk and assisted check-in |
| Professional | NFC badge tap, host notification, multi-site dashboard |
| Verify | Identity assurance ladder and DigiNam capability status |
| Access | Zone map, credential lifecycle, escorted-entry flow |
| Assurance | Evidence pack and control-test dashboard |

---

# 6. About Page Placement Strategy

The About page is the appropriate place for human imagery, but only if it is real.

## Use

- actual founder/team photography;
- actual Namibian office, field, or implementation context;
- hardware testing / kiosk deployment imagery;
- a photograph of a reception environment with no visible visitor records;
- close-up images of NFC hardware, badge printing, or privacy-screen installation.

## Avoid

- fake “African business team” stock photography;
- surveillance-camera imagery;
- facial-recognition imagery;
- photos of people at sensitive government, bank, or clinic locations without formal approval;
- maps or flags used as a substitute for local credibility.

The visual message should be:

> “We understand the reality on the ground.”

Not:

> “We are watching people.”

---

# 7. Admin Application Visual Strategy

The admin app is a **control surface**, not a marketing site.

## Rule: 90% data, 10% brand

| Surface | Use visuals | Avoid |
|---|---|---|
| Front Desk | Status chips, visitor type icon, clear action buttons | Hero images, background photos, decorative illustration |
| Visitor record | Minimal iconography, assurance label, timeline | Full visitor photo by default |
| Compliance dashboard | KPI cards, exception queues, trend lines | Decorative charts with invented data |
| Audit log | Monospace IDs, event timeline, filters | Heavy colour blocks or decorative graphics |
| Device Compliance Register | Device thumbnail/model image only if it is the actual model | Generic laptop/tablet imagery |
| Evidence packs | Document icon, period, status, redaction label | Preview of unredacted visitor data |
| My Account | Initials avatar by default | External profile-photo URLs |
| Emergency roster | High-contrast status, zone grouping, large count | Low-contrast colour-only state indicators |

### Visual hierarchy for the Front Desk

```text
Primary:
- Who is on site?
- Who needs action?
- Who is expected?

Secondary:
- Check-in method
- Identity assurance level
- Host notification state

Tertiary:
- Device details
- Audit reference
- Sync metadata
```

The operator should never need to decode an ornamental dashboard before finding the next action.

---

# 8. Kiosk Visual Strategy

The kiosk is the most important product-placement surface because it is the product’s public face.

## Design psychology

The kiosk should feel:

- calm;
- quick;
- private;
- inclusive;
- non-surveillant;
- easy for a first-time user.

## Kiosk rules

1. **No decorative photography on the check-in flow.**  
   It distracts from completion and can make an unfamiliar visitor hesitate.

2. **One choice per large tile.**  
   The home screen should show:
   - Tap NFC badge;
   - Scan invitation;
   - Check in on this screen;
   - I have a feature phone;
   - I need help.

3. **Use icons plus plain language.**  
   Do not rely on icons alone.

4. **Do not show capability options that are not available.**  
   National e-ID is absent until both:
   - platform capability is operational; and
   - the site has enabled it.

5. **Privacy reassurance belongs immediately before personal-data capture.**

```text
Your details are private.
Other visitors cannot see this check-in.
```

6. **Success screens use calm confirmation, not celebration.**

```text
Check-in recorded.
Your host has been notified.
Reference: CP-8M4K
```

7. **Feature-phone flow gets equal visual dignity.**  
   It must not look like a “fallback for people without technology.” It is a first-class channel.

---

# 9. Photo and Screenshot Governance

Because Buffr Checkpoint sells privacy, its visual-production process must itself be privacy-safe.

## Mandatory rules

| Asset | Rule |
|---|---|
| Product screenshot | Use a synthetic demo tenant only. |
| Visitor names | Synthetic, non-identifiable, culturally appropriate, and not copied from real customers. |
| Phone numbers | Use masked/demo values. |
| ID numbers | Never show. |
| QR codes | Use non-functional demo codes or codes that resolve only to a safe demo environment. |
| NFC tags | Do not show real credential references. |
| DigiNam/e-ID | Show only after approval and only with exact live capability wording. |
| Client logos | Written permission required. |
| Testimonials | Written permission, named only if approved. |
| Photos at customer sites | Written site permission plus consent process where identifiable people appear. |
| Emergency roster screenshots | Synthetic only. |
| Audit logs | Use demo event IDs and redacted actor details. |

This is consistent with the Electronic Transactions Act’s emphasis on record integrity and reliable computer evidence, and with the platform’s own privacy-by-design commitment. [Source: *Electronic Transactions Act Overview*, sections 21, 24 and 25.]

---

# 10. Image Asset Backlog

## Priority 0: Build before public launch

1. Transparent square app icon.
2. Transparent wordmark for light backgrounds.
3. Reversed/inverted wordmark for dark print/export use.
4. Hero kiosk UI mockup using synthetic visitor record.
5. Paper-register risk comparison illustration.
6. Multi-channel inclusion diagram.
7. Platform architecture diagram.
8. RBAC and identity-assurance ladder diagrams.
9. Device Compliance Register screenshot.
10. Front Desk roster screenshot.
11. Compliance Dashboard screenshot.
12. Evidence-pack mockup with fully synthetic information.

## Priority 1: Build for sales/tenders

13. Actual kiosk/tablet hardware photograph.
14. NFC reader and badge photograph.
15. Contractor tap-to-check-in workflow image.
16. Offline sync flow illustration.
17. Emergency roster visual.
18. Asset lifecycle diagram: plan → select → verify → deploy → operate → assure → retire.
19. Public-sector deployment diagram.
20. CRAN device compliance visual.

## Priority 2: Build after first pilot

21. Consent-approved implementation photographs.
22. Sector-specific visual packs:
   - bank branch;
   - government service point;
   - clinic;
   - logistics/mining gate;
   - corporate office.
23. Case-study evidence visuals using real aggregated outcomes.
24. Training/onboarding images.
25. Annual assurance-report cover and dashboard visuals.

---

# 11. Product Placement in the Sales Journey

| Sales stage | Best visual | Purpose |
|---|---|---|
| First conversation | Paper-register risk comparison | Creates immediate recognition of the problem. |
| Discovery workshop | Site journey map | Maps current sign-in process and exposure points. |
| Product demo | Kiosk check-in + Front Desk roster | Demonstrates operational benefit. |
| Security/compliance review | Architecture, RBAC, encryption, audit evidence | Demonstrates control maturity. |
| Procurement/tender | Device Compliance Register, asset lifecycle, hosting/subprocessor map | Reduces procurement and CRAN concerns. |
| Pilot proposal | Channel matrix and pilot KPI dashboard | Shows inclusion and measurable outcomes. |
| Board/audit committee | Evidence pack, risk register, control-test report | Demonstrates assurance, not software features. |

---

# 12. Design Psychology: What We Want the Buyer to Feel

| Moment | Desired reaction | Design mechanism |
|---|---|---|
| Hero | “This solves a real problem I have.” | Direct risk statement plus real product screen. |
| Paper-register comparison | “We are exposed today.” | Clear, restrained contrast between shared paper and isolated record. |
| Multi-channel section | “This works for all our visitors.” | Equal visual treatment of NFC, QR, USSD, SMS, assisted and kiosk routes. |
| Platform page | “This is serious enough for our IT/security team.” | Diagrams, RBAC, audit evidence, device governance. |
| Pricing | “This is understandable and proportionate.” | Simple tiers, no hidden complexity, hardware clearly separated. |
| About | “This team understands our environment.” | Real Namibian context, actual people/hardware, no generic stock imagery. |
| Contact | “I can speak to someone competent.” | Clear contact path and one plain next step. |

---

## Final visual rule

> **Do not use imagery to make Buffr Checkpoint look more advanced than it is. Use imagery to make its real controls easier to understand.**

That is especially important for DigiNam, National e-ID NFC, USSD, and “Namibia-hosted” claims. Each visual must read from the same governed capability/status model as the product and website copy.

The strongest public image is not a shield, a lock, or an AI-generated office lobby. It is a clear product screen showing one visitor’s protected record, paired with a simple explanation of why nobody else can see it.