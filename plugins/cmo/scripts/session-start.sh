#!/bin/sh
# Adds a short cmo summary to the session context: the brand and the open campaigns.
# Silent in projects without a .cmo/ workspace. Uses only POSIX tools, so it runs anywhere.

ws="${CLAUDE_PROJECT_DIR:-$PWD}/.cmo"
[ -d "$ws" ] || exit 0

# First value of a top-level "key": "value" pair in a JSON file written one field per line.
field() { sed -n "s/^[[:space:]]*\"$2\":[[:space:]]*\"\{0,1\}\([^\",]*\)\"\{0,1\},\{0,1\}[[:space:]]*$/\1/p" "$1" 2>/dev/null | head -n 1; }

echo "cmo workspace found (.cmo/). For marketing work, use /cmo:cmo; for an overview, /cmo:status."

brand="$ws/brand/brand.json"
if [ -f "$brand" ]; then
  gaps=0
  [ -f "$ws/brand/gaps.md" ] && gaps=$(grep -c '^- ' "$ws/brand/gaps.md")
  echo "Brand: $(field "$brand" name), version $(field "$brand" version), $gaps open gaps. Load the cmo:brand-pack skill before producing anything."
else
  echo "Brand: missing. Run /cmo:brand-build or /cmo:brand-import before any production work."
fi

open=0
for state in "$ws"/campaigns/*/state.json; do
  [ -f "$state" ] || continue
  stage=$(field "$state" stage)
  [ "$stage" = "closed" ] && continue
  open=$((open + 1))
  [ "$open" -le 10 ] || continue
  slug=$(basename "$(dirname "$state")")
  lock=$(field "$state" lock)
  case "$lock" in ""|null) lock="nobody" ;; esac
  echo "- Campaign $slug: \"$(field "$state" title)\", stage $stage, locked by $lock"
done
[ "$open" -eq 0 ] && echo "No open campaigns."
[ "$open" -gt 10 ] && echo "...and $((open - 10)) more. Run /cmo:status for all of them."
exit 0
