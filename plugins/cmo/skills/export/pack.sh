#!/bin/sh
# Packs the cmo workspace into a shareable zip with a manifest and a SHA-256 checksum per file.
# Usage: pack.sh [--with-campaigns] [output.zip]
# Run from the project root (the folder that contains .cmo/), or set CMO_WORKSPACE.
set -eu

with_campaigns=0
out=""
for arg in "$@"; do
  case "$arg" in
    --with-campaigns) with_campaigns=1 ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) out="$arg" ;;
  esac
done

ws="${CMO_WORKSPACE:-$PWD/.cmo}"
brand="$ws/brand/brand.json"
[ -f "$brand" ] || { echo "No brand pack at $brand. Nothing to export." >&2; exit 1; }
command -v zip >/dev/null || { echo "The zip command is required." >&2; exit 1; }

field() { sed -n "s/^[[:space:]]*\"$2\":[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1; }
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

name=$(field "$brand" name)
version=$(field "$brand" version)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
slug=$(printf '%s' "${name:-brand}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//')
[ -n "$out" ] || out="$PWD/cmo-pack-$slug-${version:-0}-$stamp.zip"
case "$out" in /*) ;; *) out="$PWD/$out" ;; esac

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
pack="$tmp/pack"
mkdir -p "$pack"

cp -R "$ws/brand" "$pack/brand"
rm -rf "$pack/brand/previous"
[ -d "$ws/learnings" ] && cp -R "$ws/learnings" "$pack/learnings"
[ -f "$ws/decisions.md" ] && cp "$ws/decisions.md" "$pack/decisions.md"
if [ "$with_campaigns" -eq 1 ] && [ -d "$ws/campaigns" ]; then
  cp -R "$ws/campaigns" "$pack/campaigns"
fi
find "$pack" -name '.DS_Store' -type f -delete

by=$(git config user.name 2>/dev/null || true)
[ -n "$by" ] || by="${USER:-unknown}"

{
  printf '{\n'
  printf '  "format": "cmo.pack/1",\n'
  printf '  "created_at": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "created_by": "%s",\n' "$(json_escape "$by")"
  printf '  "brand": "%s",\n' "$(json_escape "$name")"
  printf '  "brand_version": "%s",\n' "$(json_escape "$version")"
  printf '  "includes_campaigns": %s,\n' "$([ "$with_campaigns" -eq 1 ] && echo true || echo false)"
  printf '  "files": [\n'
  first=1
  (cd "$pack" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) | while IFS= read -r f; do
    [ "$first" -eq 1 ] || printf ',\n'
    first=0
    printf '    {"path": "%s", "sha256": "%s"}' "$(json_escape "$f")" "$(sha "$pack/$f")"
  done
  printf '\n  ]\n}\n'
} > "$tmp/manifest.json"
mv "$tmp/manifest.json" "$pack/manifest.json"

rm -f "$out"
(cd "$pack" && zip -qr "$out" .)
count=$(grep -c '"sha256"' "$pack/manifest.json" || true)
echo "Wrote $out"
echo "Brand: ${name:-unknown} ${version:-unversioned}, $count files, campaigns included: $([ "$with_campaigns" -eq 1 ] && echo yes || echo no)"
