# Security policy

Report a vulnerability to team@buffranalytics.com. Do not open a public issue.

- Reports are acknowledged within 3 business days.
- Include what you found, where, and the steps to reproduce it. Do not include real personal data or visitor records.
- Good-faith research that stays within these limits will not be pursued legally: test only accounts you own, stop when you reach personal data, do not degrade the service, and give us reasonable time to fix before disclosure.
- Controls and evidence follow `buffr-ai/BUFFR_SOC2_PROGRAMME.md`.

## Vulnerability handling (SOC 2 CC7.1)

Dependencies are checked on every pull request (`npm audit --omit=dev --audit-level=high` blocks the merge) and weekly by Dependabot, which waits 7 days before proposing a new release. Findings are fixed within these times, counted from the day the advisory reaches us:

| Severity | Fix or documented mitigation within |
|---|---|
| Critical | 2 days |
| High | 7 days |
| Moderate | 30 days |
| Low | Next routine update |

A finding that cannot be fixed in time (no patched release, or the fix breaks the product) is recorded with the reason, the compensating control and a review date, and is raised to the owner. Security updates are exempt from the 7-day wait. State on 2026-10-06: all four packages (`backend`, `admin`, `ops-console`, `website`) audit clean.

## Reporting and response

Incidents follow `docs/incident-response.md`. Production recovery targets and the backup method are in the same file.
