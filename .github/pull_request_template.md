## What and why

## Change type
- [ ] Feature or fix
- [ ] Database migration (number: ____ ; additive, or destructive with the release order written below)
- [ ] Security or access-control change
- [ ] Dependency change (versions pinned exactly; nothing published in the last 7 days)
- [ ] Documentation only

## Evidence (SOC 2 CC8.1: every change to production is authorised, tested and traceable)
- [ ] Tests added or updated, and CI is green (typecheck, tests, build, secrets scan, dependency audit)
- [ ] For a migration: tried on a Neon branch first; rollback point named (branch or point in time)
- [ ] For an access or MFA change: the route-policy audit (`npm run audit:routes` in `backend/`) shows 0 mutating routes without a policy
- [ ] No secrets, personal data or demo credentials in the diff
- [ ] Decision log entry added in `buffrcheckpoint.md` if a standing decision changed

## Release order and rollback
