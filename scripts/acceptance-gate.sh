#!/usr/bin/env bash
# Buffr Checkpoint acceptance gate — A0 → A3 (§17.4).
#
# Runs automatable entry checks (smoke + journey + form-rules) and tracks
# manual / sign-off checklist items in a local state file.
#
# Usage:
#   ./scripts/acceptance-gate.sh status
#   ./scripts/acceptance-gate.sh run a0 [--auto-only]
#   ./scripts/acceptance-gate.sh run a0-a3          # alias: all stages
#   ./scripts/acceptance-gate.sh mark A0-02=pass [--note "..."]
#   ./scripts/acceptance-gate.sh mark U-09=skip --note "no kiosk at partner A"
#   ./scripts/acceptance-gate.sh signoff a0 --decision ACCEPT --signer "Name <role>"
#   ./scripts/acceptance-gate.sh print a1
#
# Env (same as existing smokes):
#   API_BASE   default https://api.buffrcheckpoint.com (or http://localhost:3001 for local)
#   WEB_BASE   default https://buffrcheckpoint.com
#   DEMO_EMAIL / DEMO_PASSWORD  for journey-smoke
#   ACCEPTANCE_STATE  override state path (default scripts/acceptance/state.json)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECKLIST="$ROOT/scripts/acceptance/checklist.json"
STATE="${ACCEPTANCE_STATE:-$ROOT/scripts/acceptance/state.json}"

API_BASE="${API_BASE:-https://api.buffrcheckpoint.com}"
WEB_BASE="${WEB_BASE:-https://buffrcheckpoint.com}"
export API_BASE WEB_BASE

if [[ ! -f "$CHECKLIST" ]]; then
  echo "acceptance-gate: missing checklist at $CHECKLIST" >&2
  exit 2
fi

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

ensure_state() {
  python3 - "$CHECKLIST" "$STATE" <<'PY'
import json, os, sys, datetime
checklist_path, state_path = sys.argv[1], sys.argv[2]
with open(checklist_path) as f:
    checklist = json.load(f)
if os.path.exists(state_path):
    with open(state_path) as f:
        state = json.load(f)
else:
    state = {"version": 1, "items": {}, "signoffs": {}}
# seed missing item keys
for stage, body in checklist["stages"].items():
    for item in body["items"]:
        state["items"].setdefault(item["id"], {
            "status": "pending",
            "note": "",
            "updatedAt": None,
            "stage": stage,
        })
state["updatedAt"] = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
os.makedirs(os.path.dirname(state_path), exist_ok=True)
with open(state_path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
PY
}

stages_for() {
  case "$1" in
    a0) echo a0 ;;
    a1) echo a1 ;;
    a2) echo a2 ;;
    a3) echo a3 ;;
    a0-a3|all)
      echo a0
      echo a1
      echo a2
      echo a3
      ;;
    *)
      echo "acceptance-gate: unknown stage '$1' (use a0|a1|a2|a3|a0-a3|all)" >&2
      exit 2
      ;;
  esac
}

run_smoke() {
  echo ""
  echo "=== auto: smoke-production ==="
  bash "$ROOT/scripts/smoke-production.sh"
}

run_journey() {
  echo ""
  echo "=== auto: journey-smoke ==="
  (
    cd "$ROOT/backend"
    npx --yes ts-node scripts/journey-smoke.ts
  )
}

run_form_rules() {
  echo ""
  echo "=== auto: form-rules unit ==="
  (
    cd "$ROOT/backend"
    npm test -- --testPathPatterns=form-rules.spec
  )
}

mark_item() {
  local id="$1"
  local status="$2"
  local note="${3:-}"
  python3 - "$STATE" "$id" "$status" "$note" <<'PY'
import json, sys, datetime
path, item_id, status, note = sys.argv[1:5]
allowed = {"pass", "fail", "skip", "pending"}
if status not in allowed:
    raise SystemExit(f"status must be one of {sorted(allowed)}")
with open(path) as f:
    state = json.load(f)
if item_id not in state["items"]:
    raise SystemExit(f"unknown checklist id: {item_id}")
state["items"][item_id]["status"] = status
state["items"][item_id]["note"] = note
state["items"][item_id]["updatedAt"] = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
state["updatedAt"] = state["items"][item_id]["updatedAt"]
with open(path) as f:
    pass
with open(path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
print(f"marked {item_id}={status}" + (f" ({note})" if note else ""))
PY
}

record_auto_result() {
  local id="$1"
  local ok="$2"
  if [[ "$ok" == "1" ]]; then
    mark_item "$id" pass "auto runner"
  else
    mark_item "$id" fail "auto runner"
  fi
}

apply_auto_coverage() {
  # If an auto item passed, mark manual items that list it in autoCoveredBy.
  python3 - "$CHECKLIST" "$STATE" <<'PY'
import json, sys, datetime
checklist_path, state_path = sys.argv[1], sys.argv[2]
with open(checklist_path) as f:
    checklist = json.load(f)
with open(state_path) as f:
    state = json.load(f)
now = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
changed = 0
for stage, body in checklist["stages"].items():
    for item in body["items"]:
        covered = item.get("autoCoveredBy") or []
        if not covered:
            continue
        cur = state["items"].get(item["id"], {})
        if cur.get("status") in ("pass", "fail", "skip") and cur.get("note") != "auto-covered":
            # respect explicit human marks
            if cur.get("note") and not str(cur.get("note", "")).startswith("auto"):
                continue
        if all(state["items"].get(dep, {}).get("status") == "pass" for dep in covered):
            if cur.get("status") != "pass":
                state["items"][item["id"]] = {
                    "status": "pass",
                    "note": "auto-covered",
                    "updatedAt": now,
                    "stage": stage,
                }
                changed += 1
                print(f"auto-covered {item['id']} via {','.join(covered)}")
state["updatedAt"] = now
with open(state_path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
print(f"auto-coverage updates: {changed}")
PY
}

print_stage() {
  local stage="$1"
  python3 - "$CHECKLIST" "$STATE" "$stage" <<'PY'
import json, sys
checklist_path, state_path, stage = sys.argv[1:4]
with open(checklist_path) as f:
    checklist = json.load(f)
with open(state_path) as f:
    state = json.load(f)
body = checklist["stages"][stage]
print(f"\n=== Stage {stage.upper()}: {body['name']} ===")
print(f"Authority: {body['authority']}")
counts = {"pass": 0, "fail": 0, "skip": 0, "pending": 0}
blocking_pending = []
blocking_fail = []
for item in body["items"]:
    st = state["items"].get(item["id"], {}).get("status", "pending")
    note = state["items"].get(item["id"], {}).get("note", "")
    counts[st] = counts.get(st, 0) + 1
    req = "req" if item.get("required", True) else "opt"
    kind = item.get("kind", "manual")
    mark = {"pass": "PASS", "fail": "FAIL", "skip": "SKIP", "pending": "...."}[st]
    line = f"  [{mark}] {item['id']:24} ({req}/{kind}) {item['title']}"
    if note:
        line += f" — {note}"
    print(line)
    if item.get("required", True):
        if st == "pending":
            blocking_pending.append(item["id"])
        elif st == "fail":
            blocking_fail.append(item["id"])
so = state.get("signoffs", {}).get(stage)
if so:
    print(f"  sign-off: {so.get('decision')} by {so.get('signer')} at {so.get('at')}")
    if so.get("conditions"):
        print(f"  conditions: {so['conditions']}")
print(
    f"  summary: pass={counts['pass']} fail={counts['fail']} "
    f"skip={counts['skip']} pending={counts['pending']}"
)
if blocking_fail:
    print(f"  BLOCKED by FAIL: {', '.join(blocking_fail)}")
if blocking_pending:
    print(f"  remaining required: {', '.join(blocking_pending)}")
PY
}

stage_gate_ok() {
  local stage="$1"
  python3 - "$CHECKLIST" "$STATE" "$stage" <<'PY'
import json, sys
checklist_path, state_path, stage = sys.argv[1:4]
with open(checklist_path) as f:
    checklist = json.load(f)
with open(state_path) as f:
    state = json.load(f)
ok = True
for item in checklist["stages"][stage]["items"]:
    if not item.get("required", True):
        continue
    st = state["items"].get(item["id"], {}).get("status", "pending")
    if st in ("pending", "fail"):
        ok = False
so = state.get("signoffs", {}).get(stage) or {}
decision = (so.get("decision") or "").upper().replace(" ", "_")
# accept-with-conditions stored as ACCEPT_WITH_CONDITIONS
if decision not in ("ACCEPT", "ACCEPT_WITH_CONDITIONS"):
    # signoff item itself must be pass, which mark_item sets on signoff cmd
    sign_item = next(
        (i for i in checklist["stages"][stage]["items"] if i.get("kind") == "signoff"),
        None,
    )
    if sign_item and state["items"].get(sign_item["id"], {}).get("status") != "pass":
        ok = False
sys.exit(0 if ok else 1)
PY
}

do_signoff() {
  local stage="$1"
  local decision="$2"
  local signer="$3"
  local conditions="${4:-}"
  python3 - "$CHECKLIST" "$STATE" "$stage" "$decision" "$signer" "$conditions" <<'PY'
import json, sys, datetime, re
checklist_path, state_path, stage, decision, signer, conditions = sys.argv[1:7]
norm = re.sub(r"[^A-Z]+", "_", decision.upper()).strip("_")
allowed = {"ACCEPT", "ACCEPT_WITH_CONDITIONS", "REJECT"}
if norm not in allowed:
    raise SystemExit(f"decision must be ACCEPT | ACCEPT_WITH_CONDITIONS | REJECT (got {decision})")
if not signer.strip():
    raise SystemExit("--signer is required")
with open(checklist_path) as f:
    checklist = json.load(f)
with open(state_path) as f:
    state = json.load(f)
if stage not in checklist["stages"]:
    raise SystemExit(f"unknown stage {stage}")
now = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
state.setdefault("signoffs", {})[stage] = {
    "decision": norm,
    "signer": signer,
    "conditions": conditions,
    "at": now,
}
sign_item = next(i for i in checklist["stages"][stage]["items"] if i.get("kind") == "signoff")
status = "pass" if norm in ("ACCEPT", "ACCEPT_WITH_CONDITIONS") else "fail"
state["items"][sign_item["id"]] = {
    "status": status,
    "note": f"{norm} — {signer}" + (f"; {conditions}" if conditions else ""),
    "updatedAt": now,
    "stage": stage,
}
state["updatedAt"] = now
with open(state_path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
print(f"sign-off {stage}: {norm} by {signer}")
PY
}

run_autos_for_stage() {
  local stage="$1"
  local failed=0
  local ids
  ids=$(python3 - "$CHECKLIST" "$stage" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    checklist = json.load(f)
stage = sys.argv[2]
for item in checklist["stages"][stage]["items"]:
    if item.get("kind") == "auto":
        print(f"{item['id']}\t{item.get('runner','')}")
PY
)

  while IFS=$'\t' read -r id runner; do
    [[ -z "${id:-}" ]] && continue
    echo ""
    echo ">>> running auto $id ($runner)"
    ok=0
    case "$runner" in
      smoke-production)
        if run_smoke; then ok=1; fi
        ;;
      journey-smoke)
        if run_journey; then ok=1; fi
        ;;
      form-rules-unit)
        if run_form_rules; then ok=1; fi
        ;;
      *)
        echo "FAIL: unknown runner '$runner' for $id"
        ok=0
        ;;
    esac
    record_auto_result "$id" "$ok"
    if [[ "$ok" != "1" ]]; then
      failed=1
    fi
  done <<< "$ids"

  apply_auto_coverage
  return "$failed"
}

cmd="${1:-}"
shift || true

ensure_state

case "$cmd" in
  ""|-h|--help|help)
    usage 0
    ;;

  status)
    for s in a0 a1 a2 a3; do
      print_stage "$s"
    done
    echo ""
    echo "State file: $STATE"
    ;;

  print)
    stage="${1:-}"
    [[ -n "$stage" ]] || usage 2
    for s in $(stages_for "$stage"); do
      print_stage "$s"
    done
    ;;

  mark)
    spec="${1:-}"
    [[ -n "$spec" ]] || usage 2
    shift || true
    note=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --note) note="${2:-}"; shift 2 || true ;;
        *) echo "unknown arg: $1" >&2; exit 2 ;;
      esac
    done
    id="${spec%%=*}"
    status="${spec#*=}"
    if [[ "$id" == "$status" ]]; then
      echo "usage: mark ID=pass|fail|skip|pending [--note text]" >&2
      exit 2
    fi
    mark_item "$id" "$status" "$note"
    ;;

  signoff)
    stage="${1:-}"
    [[ -n "$stage" ]] || usage 2
    shift || true
    decision=""
    signer=""
    conditions=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --decision) decision="${2:-}"; shift 2 ;;
        --signer) signer="${2:-}"; shift 2 ;;
        --conditions) conditions="${2:-}"; shift 2 ;;
        *) echo "unknown arg: $1" >&2; exit 2 ;;
      esac
    done
    [[ -n "$decision" && -n "$signer" ]] || {
      echo "signoff requires --decision and --signer" >&2
      exit 2
    }
    # only single stages
    case "$stage" in a0|a1|a2|a3) ;; *)
      echo "signoff stage must be a0|a1|a2|a3" >&2
      exit 2
      ;;
    esac
    do_signoff "$stage" "$decision" "$signer" "$conditions"
    print_stage "$stage"
    ;;

  run)
    stage="${1:-}"
    [[ -n "$stage" ]] || usage 2
    shift || true
    auto_only=0
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --auto-only) auto_only=1; shift ;;
        *) echo "unknown arg: $1" >&2; exit 2 ;;
      esac
    done

    overall=0
    for s in $(stages_for "$stage"); do
      echo ""
      echo "######## RUN STAGE $s ########"
      if ! run_autos_for_stage "$s"; then
        overall=1
      fi
      print_stage "$s"
      if [[ "$auto_only" == "1" ]]; then
        echo "(--auto-only: manual items not required for this invocation exit)"
        continue
      fi
      if stage_gate_ok "$s"; then
        echo "GATE $s: OPEN (required items pass + sign-off)"
      else
        echo "GATE $s: CLOSED — mark remaining items or record sign-off"
        overall=1
      fi
    done
    exit "$overall"
    ;;

  *)
    echo "unknown command: $cmd" >&2
    usage 2
    ;;
esac
