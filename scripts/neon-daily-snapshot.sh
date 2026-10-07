#!/usr/bin/env bash
# Daily recovery point beyond Neon's 6-hour history window: a copy-on-write branch of main that Neon deletes after 14 days.
# Needs NEON_API_KEY (repository secret). Never prints a connection string.
set -euo pipefail
PROJECT_ID="${NEON_PROJECT_ID:-falling-frog-15538162}"
NAME="snapshot-$(date -u +%Y%m%d)"
EXPIRES="$(date -u -d '+14 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+14d +%Y-%m-%dT%H:%M:%SZ)"
if npx --yes neonctl@2 branches list --project-id "$PROJECT_ID" --output json | grep -q "\"name\": *\"$NAME\""; then
  echo "snapshot $NAME already exists; nothing to do"
  exit 0
fi
npx --yes neonctl@2 branches create --project-id "$PROJECT_ID" --name "$NAME" --expires-at "$EXPIRES" --output json >/dev/null
echo "snapshot $NAME created, expires $EXPIRES"
