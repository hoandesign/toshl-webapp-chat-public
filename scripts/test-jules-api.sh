#!/usr/bin/env bash
# Test Jules API locally (same parsing as sync-to-public GitHub Action).
#
# Usage:
#   export JULES_API_KEY="your-key-from-jules.google.com/settings"
#   ./scripts/test-jules-api.sh list-sources
#   ./scripts/test-jules-api.sh inspect 3377306911815430081
#   ./scripts/test-jules-api.sh extract 3377306911815430081
#   ./scripts/test-jules-api.sh create-session   # starts a new session (slow)

set -euo pipefail

API="https://jules.googleapis.com/v1alpha"
SOURCE="sources/github/hoandesign/toshl-webapp-chat"

if [ -z "${JULES_API_KEY:-}" ]; then
  echo "Set your API key first:"
  echo '  export JULES_API_KEY="..."'
  echo "Get one at: https://jules.google.com/settings#api"
  exit 1
fi

auth() {
  curl -sS -H "x-goog-api-key: $JULES_API_KEY" "$@"
}

extract_from_activities() {
  local json="$1"
  local msg

  msg="$(printf '%s' "$json" | jq -r '
    [.activities[]?
      | select(.agentMessaged?.agentMessage != null)
      | .agentMessaged.agentMessage] | last // empty
  ')"
  if [ -n "$msg" ] && [ "$msg" != "null" ]; then
    printf '%s' "$msg"
    return 0
  fi

  msg="$(printf '%s' "$json" | jq -r '
    [.activities[]?.artifacts[]?
      | select(.changeSet?.gitPatch?.suggestedCommitMessage != null)
      | .changeSet.gitPatch.suggestedCommitMessage] | last // empty
  ')"
  if [ -n "$msg" ] && [ "$msg" != "null" ]; then
    printf '%s' "$msg"
    return 0
  fi

  msg="$(printf '%s' "$json" | jq -r '
    [.activities[]?
      | select(.progressUpdated?.title != null)
      | select(.progressUpdated.title | test("^(fix|feat|chore|docs|style|refactor|perf|test|build|ci|revert)"; "i"))
      | if ((.progressUpdated.description // "") | length) > 0 then
          .progressUpdated.title + "\n\n" + .progressUpdated.description
        else
          .progressUpdated.title
        end
    ] | last // empty
  ')"
  if [ -n "$msg" ] && [ "$msg" != "null" ]; then
    printf '%s' "$msg"
    return 0
  fi

  msg="$(printf '%s' "$json" | jq -r '
    [.activities[]?
      | select(.progressUpdated?.title == "Code reviewed")
      | .progressUpdated.description] | last // empty
  ')"
  if [ -n "$msg" ] && [ "$msg" != "null" ]; then
    printf '%s' "$msg"
    return 0
  fi

  msg="$(printf '%s' "$json" | jq -r '[.. | strings | select(contains("|||"))] | last // empty')"
  if [ -n "$msg" ] && [ "$msg" != "null" ]; then
    local title="${msg%%|||*}"
    local body="${msg#*|||}"
    title="$(printf '%s' "$title" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    body="$(printf '%s' "$body" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [ -n "$body" ]; then
      printf '%s\n\n%s' "$title" "$body"
    else
      printf '%s' "$title"
    fi
    return 0
  fi

  return 1
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  list-sources)
    echo "=== Connected Jules sources ==="
    auth "$API/sources" | jq .
    ;;

  inspect)
    SESSION_ID="${1:?Usage: $0 inspect SESSION_ID}"
    OUT="/tmp/jules-session-${SESSION_ID}.json"
    echo "=== Session state ==="
    auth "$API/sessions/$SESSION_ID" | jq '{id, title, state, url, prompt: .prompt[0:120]}'
    echo ""
    echo "=== Saving full activities to $OUT ==="
    auth "$API/sessions/$SESSION_ID/activities?pageSize=100" | tee "$OUT" | jq '
      .activities[] | {
        originator,
        agentMessage: (.agentMessaged.agentMessage // "" | .[0:120]),
        title: .progressUpdated.title,
        description: (.progressUpdated.description // "" | .[0:200]),
        suggested: .artifacts[]?.changeSet?.gitPatch?.suggestedCommitMessage
      }
    '
    echo ""
    echo "Raw JSON saved. Open with: jq . $OUT"
    ;;

  extract)
    SESSION_ID="${1:?Usage: $0 extract SESSION_ID}"
    JSON="$(auth "$API/sessions/$SESSION_ID/activities?pageSize=100")"
    echo "=== Parsed commit message (workflow logic) ==="
    if extract_from_activities "$JSON"; then
      echo ""
      echo "=== OK: extraction succeeded ==="
    else
      echo "(nothing parsed — workflow would use private commit or fallback)"
      exit 1
    fi
    ;;

  create-session)
    echo "=== Creating test session (may take many minutes) ==="
    PROMPT='Review only. Write a git commit subject and body for a one-line TypeScript fix. Do NOT change any files.'
    PAYLOAD="$(jq -n \
      --arg prompt "$PROMPT" \
      --arg source "$SOURCE" \
      --arg title "Local API test" \
      '{
        prompt: $prompt,
        title: $title,
        sourceContext: {
          source: $source,
          githubRepoContext: { startingBranch: "main" }
        },
        requirePlanApproval: false
      }')"
    RESP="$(auth -X POST "$API/sessions" -H "Content-Type: application/json" -d "$PAYLOAD")"
    echo "$RESP" | jq .
    SESSION_ID="$(echo "$RESP" | jq -r '.id')"
    echo ""
    echo "Poll with: $0 inspect $SESSION_ID"
    echo "Then:      $0 extract $SESSION_ID"
    ;;

  *)
    echo "Commands:"
    echo "  list-sources              List repos connected to Jules"
    echo "  inspect SESSION_ID        Show session + save activities JSON"
    echo "  extract SESSION_ID        Run same commit-message parser as CI"
    echo "  create-session            Start a new Jules session (slow)"
    ;;
esac
