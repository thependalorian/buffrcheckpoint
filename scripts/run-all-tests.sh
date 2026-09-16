#!/usr/bin/env bash
# Run every Buffr Checkpoint automated test suite that exists today.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
failed=0

run_step() {
  local label="$1"
  shift
  echo ""
  echo "=== $label ==="
  if (cd "$ROOT" && "$@"); then
    echo "OK: $label"
  else
    echo "FAIL: $label"
    failed=1
  fi
}

run_step "backend unit" bash -lc "cd '$ROOT/backend' && npm test"
run_step "backend e2e" bash -lc "cd '$ROOT/backend' && npm run test:e2e"
run_step "website vitest" bash -lc "cd '$ROOT/website' && npm test"
run_step "admin vitest" bash -lc "cd '$ROOT/admin' && npm test"
run_step "kiosk unit" bash -lc "cd '$ROOT/kiosk' && ./gradlew :app:testDebugUnitTest --no-daemon"

if [[ "${SMOKE_PRODUCTION:-0}" == "1" ]]; then
  # Live contract checks — needs unrestricted network. Agent sandbox curl often
  # fails with CONNECT 403 / exit 56; that is not a product regression.
  run_step "production smoke" bash -lc "'$ROOT/scripts/smoke-production.sh'"
fi

echo ""
if [[ "$failed" -ne 0 ]]; then
  echo "run-all-tests: one or more suites failed"
  exit 1
fi
echo "run-all-tests: all suites passed"
if [[ "${SMOKE_PRODUCTION:-0}" != "1" ]]; then
  echo "(skipped production smoke — set SMOKE_PRODUCTION=1 to include)"
fi
