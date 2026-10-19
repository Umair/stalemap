#!/usr/bin/env bash
# Entry point of the stalemap GitHub Action (see action.yml). Inputs arrive as env vars.
set -euo pipefail

MODE="${STALEMAP_MODE:-check}"
CMD="${STALEMAP_CMD:-npx -y stalemap@${STALEMAP_VERSION:-latest}}" # STALEMAP_CMD: local testing override
MARKER="<!-- stalemap-pr-comment -->"
OUT="${GITHUB_OUTPUT:-/dev/null}"

args=()
[ -n "${STALEMAP_MODEL:-}" ] && args+=(--model "$STALEMAP_MODEL")
[ -n "${STALEMAP_CUTOFF:-}" ] && args+=(--cutoff "$STALEMAP_CUTOFF")
# shellcheck disable=SC2206 # intentional word splitting of extra args
[ -n "${STALEMAP_ARGS:-}" ] && args+=($STALEMAP_ARGS)

case "$MODE" in
  check)
    set +e
    $CMD check ${args[@]+"${args[@]}"}
    code=$?
    set -e
    case $code in
      0) echo "status=fresh" >>"$OUT" ;;
      1) if [ -f AGENTS.md ] && grep -q "stalemap:start" AGENTS.md || { [ -f CLAUDE.md ] && grep -q "stalemap:start" CLAUDE.md; }; then
           echo "status=stale" >>"$OUT"
         else
           echo "status=missing" >>"$OUT"
         fi ;;
    esac
    exit $code
    ;;

  comment)
    if [ -z "${PR_NUMBER:-}" ]; then
      echo "stalemap: comment mode only runs on pull_request events; skipping."
      echo "status=skipped" >>"$OUT"
      exit 0
    fi
    json="$(mktemp)"
    $CMD scan --json ${args[@]+"${args[@]}"} >"$json"
    body="$(node "$(dirname "$0")/comment.mjs" "$json" "$MARKER")"
    existing="$(gh api "repos/$REPO/issues/$PR_NUMBER/comments" --paginate \
      --jq ".[] | select(.body | contains(\"$MARKER\")) | .id" | head -n1)"
    if [ -z "$body" ]; then
      if [ -n "$existing" ]; then
        gh api -X PATCH "repos/$REPO/issues/comments/$existing" -f body="$MARKER
### stalemap
No dependency in this pull request changed after the model's training cutoff." >/dev/null
        echo "status=updated" >>"$OUT"
      else
        echo "status=skipped" >>"$OUT"
      fi
      exit 0
    fi
    if [ -n "$existing" ]; then
      gh api -X PATCH "repos/$REPO/issues/comments/$existing" -f body="$body" >/dev/null
      echo "status=updated" >>"$OUT"
    else
      gh api -X POST "repos/$REPO/issues/$PR_NUMBER/comments" -f body="$body" >/dev/null
      echo "status=commented" >>"$OUT"
    fi
    ;;

  *)
    echo "stalemap: unknown mode '$MODE' (use check or comment)" >&2
    exit 2
    ;;
esac
