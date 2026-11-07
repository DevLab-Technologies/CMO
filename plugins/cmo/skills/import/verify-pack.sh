#!/bin/sh
# Unpacks a cmo pack into a folder and verifies it against its manifest.
# Usage: verify-pack.sh <pack.zip> <empty destination folder>
# Exit 0 when every file matches its checksum; 1 when anything is missing, changed or unlisted.
set -eu

[ $# -eq 2 ] || { echo "Usage: verify-pack.sh <pack.zip> <empty destination folder>" >&2; exit 2; }
zipfile=$1
dest=$2
[ -f "$zipfile" ] || { echo "No such file: $zipfile" >&2; exit 2; }
command -v unzip >/dev/null || { echo "The unzip command is required." >&2; exit 2; }
mkdir -p "$dest"
[ -z "$(ls -A "$dest")" ] || { echo "Destination is not empty: $dest" >&2; exit 2; }

sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# Refuse archives with absolute paths or parent-directory entries before extracting.
if unzip -Z1 "$zipfile" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Refused: the archive contains unsafe paths." >&2
  exit 1
fi
unzip -q "$zipfile" -d "$dest"

manifest="$dest/manifest.json"
[ -f "$manifest" ] || { echo "Not a cmo pack: no manifest.json." >&2; exit 1; }
grep -q '"format": "cmo.pack/1"' "$manifest" || { echo "Unsupported pack format." >&2; exit 1; }

problems=0
listed="$dest/.listed"
: > "$listed"
grep '"sha256"' "$manifest" | sed 's/.*"path": "\(.*\)", "sha256": "\([0-9a-f]*\)".*/\2  \1/' | while IFS= read -r line; do
  want=${line%%  *}
  path=${line#*  }
  printf '%s\n' "$path" >> "$listed"
  if [ ! -f "$dest/$path" ]; then
    echo "MISSING  $path"
  elif [ "$(sha "$dest/$path")" != "$want" ]; then
    echo "CHANGED  $path"
  fi
done > "$dest/.problems"

(cd "$dest" && find . -type f ! -name manifest.json ! -name .listed ! -name .problems | sed 's|^\./||' | LC_ALL=C sort) | while IFS= read -r f; do
  grep -qxF "$f" "$listed" || echo "UNLISTED $f"
done >> "$dest/.problems"

if [ -s "$dest/.problems" ]; then
  cat "$dest/.problems"
  problems=1
fi
rm -f "$listed" "$dest/.problems"

sed -En 's/^  "(created_at|created_by|brand|brand_version|includes_campaigns)": (.*),$/\1: \2/p' "$manifest"
echo "Files: $(grep -c '"sha256"' "$manifest")"
if [ "$problems" -eq 0 ]; then echo "Verified: every file matches the manifest."; else echo "Verification failed." >&2; exit 1; fi
