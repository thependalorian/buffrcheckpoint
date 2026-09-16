#!/usr/bin/env bash
# Production smoke — fails only on real product contract errors.
# Requires unrestricted network (agent sandbox curl often fails with CONNECT 403 / exit 56).
# Usage: ./scripts/smoke-production.sh
set -euo pipefail

API_BASE="${API_BASE:-https://api.buffrcheckpoint.com}"
WEB_BASE="${WEB_BASE:-https://buffrcheckpoint.com}"
SITE_ID="${SITE_ID:-74c72c99-93dc-4b33-934b-9b365e9924cf}"
REF_ID="${REF_ID:-b3333333-3333-4333-8333-333333333301}"

TMPDIR_SMOKE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SMOKE"' EXIT

PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
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
CODE=$(curl_http "$BODY" "$FORM_URL" || true)
if [[ "$CODE" == "200" ]]; then
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
CHECKIN_URL="$WEB_BASE/check-in?site=${SITE_ID}&ref=${REF_ID}"
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

echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -ne 0 ]]; then
  echo "smoke-production: FAILED — treat as product/network contract failure (not agent sandbox)."
  exit 1
fi
echo "smoke-production: OK"
exit 0
