#!/usr/bin/env bash
# Production smoke — fails only on real product contract errors.
# Requires unrestricted network (agent sandbox curl often fails with CONNECT 403 / exit 56).
# Usage: ./scripts/smoke-production.sh
set -euo pipefail

API_BASE="${API_BASE:-https://api.buffrcheckpoint.com}"
WEB_BASE="${WEB_BASE:-https://buffrcheckpoint.com}"
# A site with an active public check-in QR, for the form check. There is deliberately no default: the old demo site no longer exists in
# production, and a default that points at nothing fails every run for the wrong reason. Without both, that check is reported as SKIPPED.
SITE_ID="${SITE_ID:-}"
REF_ID="${REF_ID:-}"

TMPDIR_SMOKE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SMOKE"' EXIT

PASS=0
FAIL=0
SKIP=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
}

skip() {
  echo "SKIPPED (not run): $1"
  SKIP=$((SKIP + 1))
}

# One retry on curl transport failures only (exit != 0 from curl itself).
# Does not retry when HTTP status is returned (even 4xx/5xx).
curl_http() {
  local out="$1"
  shift
  local code
  if code=$(curl -sS -o "$out" -w "%{http_code}" --connect-timeout 15 --max-time 45 "$@" 2>/dev/null); then
    echo "$code"
    return 0
  fi
  sleep 2
  if code=$(curl -sS -o "$out" -w "%{http_code}" --connect-timeout 15 --max-time 45 "$@" 2>/dev/null); then
    echo "$code"
    return 0
  fi
  echo "000"
  return 1
}

snippet() {
  local file="$1"
  head -c 280 "$file" 2>/dev/null | tr '\n' ' '
  echo
}

echo "=== Buffr Checkpoint production smoke ==="
echo "API=$API_BASE WEB=$WEB_BASE site=$SITE_ID"

# 1) Health
BODY="$TMPDIR_SMOKE/health.json"
CODE=$(curl_http "$BODY" "$API_BASE/health" || true)
if [[ "$CODE" == "200" ]]; then
  pass "GET /health → $CODE"
else
  fail "GET /health → $CODE (expected 200); body=$(snippet "$BODY")"
fi

# 2) Public check-in form contract
FORM_URL="$API_BASE/public/check-in/form?site=${SITE_ID}&ref=${REF_ID}&visitorTypeCode=general"
BODY="$TMPDIR_SMOKE/form.json"
if [[ -z "$SITE_ID" || -z "$REF_ID" ]]; then
  skip "GET /public/check-in/form: set SITE_ID and REF_ID to a site with an active public check-in QR"
  CODE="skipped"
else
  CODE=$(curl_http "$BODY" "$FORM_URL" || true)
fi
if [[ "$CODE" == "skipped" ]]; then
  :
elif [[ "$CODE" == "200" ]]; then
  if python3 - "$BODY" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
fields = data.get("fields") or []
name = data.get("formName")
ok = isinstance(fields, list) and len(fields) >= 1 and bool(name)
print(f"formName={name!r} fields={len(fields) if isinstance(fields, list) else 0}")
sys.exit(0 if ok else 1)
PY
  then
    pass "GET /public/check-in/form → $CODE + form contract"
  else
    fail "GET /public/check-in/form → $CODE but contract failed; body=$(snippet "$BODY")"
  fi
else
  fail "GET /public/check-in/form → $CODE (expected 200); body=$(snippet "$BODY")"
fi

# 3) Website check-in page
CHECKIN_URL="$WEB_BASE/check-in${SITE_ID:+?site=${SITE_ID}&ref=${REF_ID}}"
BODY="$TMPDIR_SMOKE/checkin.html"
CODE=$(curl_http "$BODY" "$CHECKIN_URL" || true)
if [[ "$CODE" == "200" ]]; then
  pass "GET website /check-in → $CODE"
else
  fail "GET website /check-in → $CODE (expected 200)"
fi

# 4) Website check-out page
BODY="$TMPDIR_SMOKE/checkout.html"
CODE=$(curl_http "$BODY" "$WEB_BASE/check-out" || true)
if [[ "$CODE" == "200" ]]; then
  pass "GET website /check-out → $CODE"
else
  fail "GET website /check-out → $CODE (expected 200)"
fi

# 5) Public check-out route exists (empty body → validation 400; do not check out a visitor)
BODY="$TMPDIR_SMOKE/checkout-api.json"
CODE=$(curl_http "$BODY" -X POST "$API_BASE/public/check-out" \
  -H "content-type: application/json" \
  -d '{}' || true)
if [[ "$CODE" == "400" ]]; then
  pass "POST /public/check-out empty body → $CODE (route present)"
else
  fail "POST /public/check-out empty body → $CODE (expected 400); body=$(snippet "$BODY")"
fi

# 6) Auth login soft check — 401 invalid creds, or 429 lockout, both prove route health
BODY="$TMPDIR_SMOKE/login.json"
CODE=$(curl_http "$BODY" -X POST "$API_BASE/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"smoke-nonexistent@example.com","password":"DefinitelyWrongPass1!"}' || true)
if [[ "$CODE" == "401" || "$CODE" == "429" ]]; then
  pass "POST /auth/login bad password → $CODE"
else
  fail "POST /auth/login bad password → $CODE (expected 401 or 429); body=$(snippet "$BODY")"
fi

# 7) Sector list for sign-up is public and flat: at least one value, no duplicate codes
BODY="$TMPDIR_SMOKE/sectors.json"
CODE=$(curl_http "$BODY" "$API_BASE/public/organisation-sectors" || true)
if [[ "$CODE" == "200" ]] && python3 - "$BODY" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1]))
codes = [r["code"] for r in rows]
sys.exit(0 if codes and len(codes) == len(set(codes)) and all(set(r) == {"code", "label"} for r in rows) else 1)
PY
then
  pass "GET /public/organisation-sectors → $CODE, flat list with unique codes"
else
  fail "GET /public/organisation-sectors → $CODE or contract failed; body=$(snippet "$BODY")"
fi

# 8) USSD is gone from the capability list
BODY="$TMPDIR_SMOKE/capabilities.json"
CODE=$(curl_http "$BODY" "$API_BASE/public/capability-status" || true)
if [[ "$CODE" == "200" ]] && python3 - "$BODY" <<'PY'
import json, sys
sys.exit(0 if "ussd" not in json.load(open(sys.argv[1])) else 1)
PY
then
  pass "GET /public/capability-status → $CODE, no ussd key"
else
  fail "GET /public/capability-status → $CODE or still lists ussd; body=$(snippet "$BODY")"
fi

# 9) Short links sent by text message redirect to the check-out and rating pages
for kind in "o:check-out?v=" "r:rate?t="; do
  prefix="${kind%%:*}"; target="${kind#*:}"
  token="$(printf 'A%.0s' $(seq 1 41))"
  LOCATION=$(curl -s -o /dev/null -m 30 -w "%{redirect_url}" "$WEB_BASE/$prefix/$token" || true)
  if [[ "$LOCATION" == "$WEB_BASE/$target$token" ]]; then
    pass "GET website /$prefix/<token> → redirects to /$target"
  else
    fail "GET website /$prefix/<token> → redirect '$LOCATION' (expected $WEB_BASE/$target$token)"
  fi
done

echo ""
echo "=== Summary: $PASS passed, $FAIL failed, $SKIP skipped ==="
if [[ "$FAIL" -ne 0 ]]; then
  echo "smoke-production: FAILED — treat as product/network contract failure (not agent sandbox)."
  exit 1
fi
echo "smoke-production: OK"
exit 0
