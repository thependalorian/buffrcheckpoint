# Incident response and recovery

Status: proposed 2026-10-06 for owner approval. The recovery targets below are what the current setup can honestly meet; the owner confirms or changes them (BUFFR_SOC2_PROGRAMME.md, decisions D3 and D4).

## What counts as an incident

Any event that exposes or could expose visitor or customer data, stops visitors checking in, or lets someone act without the right access. Examples: a leaked secret, a customer user reaching another organisation's data, the API or database down, a failed or suspicious deploy, a lost kiosk device.

## Severity

| Level | Meaning | Respond within |
|---|---|---|
| Sev 1 | Data exposed, or visitor check-in down for all customers | 1 hour |
| Sev 2 | One customer affected, or a control failed with no known exposure | 4 hours |
| Sev 3 | Degraded or cosmetic, no data risk | Next business day |

## First hour

1. Confirm what happened and write it down with the time. Keep one running log (a private note is fine).
2. Contain: revoke the credential or session, disable the account, turn off the feature flag, or roll back (Railway: previous deployment, Redeploy; Vercel: `vercel rollback`).
3. Preserve evidence before changing anything else: audit events are append-only and hash-chained per organisation (`GET` the audit chain check in the admin or run `verifyChainIntegrity`), and Sentry holds the error trail.
4. Tell the owner. For a Sev 1 involving personal data, the owner decides on notifying customers and the regulator; the Namibia DPA Bill text is in the repository root.
5. Personal data breach (processor duty). Checkpoint is the processor and each customer is the controller. Notify every affected customer without undue delay, and do not wait for the investigation to finish. Give: what happened and when; the categories and approximate number of people affected; the likely consequences; what has been done and what is proposed. This lets the customer meet its own deadline to notify the authority (72 hours in the draft Bill, section 22). Keep a record of every breach with the facts, effects and remedial action. Encryption of the affected data is stated in the notice, because it can remove the duty to notify the people concerned (draft Bill, section 23).
6. After recovery, write a short review: cause, what worked, what to change. Add a decision-log entry if a standing decision changes.

## Recovery targets (proposed)

| Item | Target | Based on |
|---|---|---|
| RTO, API and web | 4 hours | Railway redeploy of the previous build plus a Vercel rollback each take minutes; the margin covers diagnosis |
| RPO, database, within the last 6 hours | Under 5 minutes | Neon point-in-time restore. Project `falling-frog-15538162` keeps 6 hours of history (21,600 s) |
| RPO, database, older than 6 hours | Up to 24 hours | Daily Neon snapshot branches (`scripts/neon-daily-snapshot.sh`), kept 14 days. Needs `NEON_API_KEY` in the repository secrets and the scheduled workflow |

Restore a database: in Neon, restore the branch `main` to a point in time (or promote a snapshot branch), then confirm `GET /health` returns `"database":"ok"` and run the smoke script `scripts/smoke-production.sh`.

Test the restore on a throwaway branch every quarter and keep the result as evidence (date, branch, what was checked).

## Contacts

Security reports: `team@buffranalytics.com`. Platform status and uptime checks are listed in the Deploy, rollback and monitoring runbook in `buffrcheckpoint.md`.

## Notification clocks (standard IR-4 to IR-7)

The clocks start when the first person suspects an incident, not when it is confirmed. Write the start time in the running log.

| Clock | Who is told | Deadline | What the notice states |
|---|---|---|---|
| Customer (controller) | Each affected customer's administrators, through the `customer_breach_notice` template | Without undue delay, in the first hour of a confirmed personal data breach | Nature, categories and approximate number of people, likely consequences, measures taken |
| Data protection authority | Done by the controller; Checkpoint gives the customer what it needs | 72 hours from awareness | The same four points, with reasons if late |
| Bank of Namibia | Only where a customer in the national payment system is affected and the contract puts the duty on Checkpoint | Preliminary notice within 24 hours of a successful cyberattack | What happened and what is being done |
| Bank of Namibia impact report | As above | Within one month of the incident becoming known | Financial loss, data loss, and minutes of unavailability |
| People affected | Through the controller | Without undue delay when the risk is high, unless the data was encrypted so as to be unintelligible | Plain language, what to do |

Every breach is recorded with its facts, effects and remedy. AI-specific scenarios (prompt injection, data leaving to a provider, an ungrounded answer reaching a customer, tool misuse) follow the same steps; Form AI has no tools and never sees visitor data (see the AI inventory in `docs/system-description.md`).

## Tabletop exercise (IR-9)

Held at least once a year. Record the scenario, participants, times, findings and the remediation with an owner. Starting scenario: a staff laptop with a signed-in ops session is lost. Walk through revoking the refresh chain (`POST /auth/sign-out-everywhere`, or `markCredentialsChanged` through support), checking the audit chain verifier result, deciding who tells which customer, and starting the 72 hour clock. No exercise has been held yet.

## Restore and replay (RC-3, RC-5, DL-10)

After any restore: start in restricted mode, list `deletion_recovery_tombstone` rows whose `replay_until` is in the future, erase each subject again, run the audit chain verifier and the reconciliation checks, then open traffic. The replay command is not built yet; until it is, the tombstone list is checked by hand.
