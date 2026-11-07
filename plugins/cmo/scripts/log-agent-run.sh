#!/bin/sh
# Appends one line to .cmo/agent-runs.jsonl each time a cmo agent finishes, so the history
# never depends on an agent remembering to log. The hook input is already JSON; JSON strings
# can't contain raw newlines, so joining lines keeps it valid while making it one line.

ws="${CLAUDE_PROJECT_DIR:-$PWD}/.cmo"
[ -d "$ws" ] || exit 0

input=$(tr -d '\n\r')
case "$input" in
  "{"*) ;;
  *) exit 0 ;;
esac

at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '{"at":"%s","event":"agent_finished","hook":%s}\n' "$at" "$input" >> "$ws/agent-runs.jsonl"
exit 0
