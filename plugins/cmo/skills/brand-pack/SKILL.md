---
name: brand-pack
description: The cmo brand pack format — the files in .cmo/brand/, the brand.json and claims.json schemas, and how every agent loads and applies the brand before producing anything. Use whenever reading, checking against, building or importing a brand.
user-invocable: false
---

# The brand pack

The brand pack is the single source of truth for how the brand looks, sounds and what it may say. Every agent loads it before producing anything. If it is missing, run `/cmo:brand-build` or `/cmo:brand-import` first.

## Files

| File | Purpose |
|---|---|
| `.cmo/brand/guidelines.md` | The full human-readable guidelines. An imported guideline is kept here, normalized but complete |
| `.cmo/brand/brand.json` | The machine-readable rules agents check against (schema below) |
| `.cmo/brand/claims.json` | Allowed claims, banned claims, required disclaimers (schema below) |
| `.cmo/brand/audiences.md` | Audiences and personas: who they are, what they need, what they fear, where they are |
| `.cmo/brand/assets/` | Logos, fonts, the sound logo, photos. Each file has a rights record in `assets/rights.json` |
| `.cmo/brand/templates/` | Approved templates (see the `templates` skill) |
| `.cmo/brand/story-bank/` | Reusable stories, one file each, with source and consent |
| `.cmo/brand/gaps.md` | What the brand doesn't define yet, written by import or build |
| `.cmo/brand/support.md` | Optional: support facts, contacts, prices and escalation rules the community manager may use in replies |

When `guidelines.md` and `brand.json` disagree, `guidelines.md` wins, and the disagreement is reported in `gaps.md`.

`guidelines.md` always follows the section structure in [guidelines-template.md](guidelines-template.md), whether it was built or imported, so agents can cite fixed section numbers.

## Versions

The brand pack has one version, `brand.json.version`, in semantic versioning:
- **patch** (1.0.1): wording, typos, clarifications that change no rule;
- **minor** (1.1.0): a new rule, asset, claim or format;
- **major** (2.0.0): a changed or removed rule that makes existing work off-brand.

Every change bumps the version, updates `updated_at`, and adds a row to the changelog at the end of `guidelines.md`. Agents record the brand version they worked against in their run record, so a review can tell whether work predates a brand change.

## brand.json

```json
{
  "schema": "cmo.brand/1",
  "name": "the brand name exactly as written, e.g. ezPayments",
  "name_rules": ["never translated", "lowercase ez, capital P"],
  "descriptor": "one line: what the brand is",
  "tagline": "Collect. Hold. Pay.",
  "website": "ezpayments.co",
  "languages": ["en", "ar"],
  "rule_strength": "how the guidelines grade rules, e.g. MUST and NEVER block, SHOULD advises",
  "voice": {
    "traits": ["clear", "confident", "plain"],
    "do": ["outcome first", "exact amounts and dates"],
    "dont": ["exclamation marks in headlines", "jargon"],
    "registers": {
      "marketing": "loud: one word or one number, with a full stop",
      "product": "clear: outcome first, then the detail"
    },
    "capitalization": "sentence case"
  },
  "colors": [
    { "name": "Brand Green", "hex": "#05F055", "role": "signature, highlight", "cmyk": "C98 M0 Y65 K6 (nearest)" },
    { "name": "Black", "hex": "#000000", "role": "type, ground" }
  ],
  "colors_extended": {
    "use": "where extra colors may appear, e.g. states and data visualization only",
    "semantic": { "success": "#067A37", "error": "#DC2626" }
  },
  "color_pairs": {
    "allowed": [["#000000", "#05F055"]],
    "forbidden": [["#05F055", "#FFFFFF"]],
    "note": "pairs are [type color, ground color]"
  },
  "gradients": false,
  "tokens": {
    "signature": "#05F055",
    "on_signature": "#000000",
    "dark": "#000000",
    "on_dark": "#FFFFFF",
    "light": "#FFFFFF",
    "on_light": "#000000",
    "surface": "#F3F4F6",
    "on_surface": "#111827",
    "muted": "#6B7280"
  },
  "typography": {
    "display": { "family": "Schibsted Grotesk", "weight": 800, "tracking": "-0.03em", "files": [{ "path": "assets/fonts/SchibstedGrotesk-ExtraBold.woff2", "weight": 800 }] },
    "text": { "family": "Schibsted Grotesk", "weight": 400 },
    "mono": { "family": "IBM Plex Mono" },
    "arabic_display": { "family": "Lalezar" },
    "arabic_text": { "family": "Almarai" },
    "ratios": { "headline_to_logo": 2.5, "subhead_to_headline": 0.5 },
    "scale": "a type scale, or where guidelines.md defines it",
    "never": ["body text in ExtraBold"]
  },
  "logo": {
    "files": { "black": "assets/logo-black.svg", "white": "assets/logo-white.svg" },
    "colors_allowed": ["black on Brand Green", "black on White", "white on Black"],
    "min_width": { "screen_px": 96, "print_mm": 25 },
    "clear_space": "1S, where S is the height of the capital P",
    "placement": { "ltr": "bottom-left", "rtl": "bottom-right", "centered_only": ["covers", "logo animations", "end frames"] },
    "lockups": { "partnership": "brand first; divider 2S tall", "sponsorship": "Powered by above the logo" },
    "never": ["rotate", "recolor", "stretch", "shadow", "retype"]
  },
  "signature_device": {
    "name": "highlight",
    "rule": "one Brand Green block behind one fact per view; black type on it; headlines of three words or more only"
  },
  "layout": {
    "margin": "8% of the short side",
    "headline": "top",
    "logo": "bottom margin",
    "one_idea_per_piece": true
  },
  "icons": { "style": "2px outline, one color", "emoji": false, "colors_by_ground": { "#FFFFFF": ["#111827"], "#000000": ["#FFFFFF", "#05F055"] } },
  "imagery": { "style": "people at work, natural light", "generated": "policy on AI-generated images, e.g. never AI-generated people", "never": ["type directly on photos"] },
  "motion": { "transitions": "hard cuts between grounds", "easing": "ease-out", "never": ["bounce", "glow", "shadow"] },
  "sound": { "logo": "assets/sound-logo.wav", "notes": "D5 A5 D6, short short long", "placement": "end frame only" },
  "formats": {
    "9x16": { "size": [1080, 1920], "safe": { "top": 250, "bottom": 300 } },
    "4x5": { "size": [1080, 1350] },
    "1x1": { "size": [1080, 1080] },
    "16x9": { "size": [1920, 1080] }
  },
  "source": "imported | built",
  "version": "1.0.0",
  "updated_at": "UTC ISO 8601"
}
```

Unknown values are `null`, never guessed, and are listed in `gaps.md`.

Font `files` are optional: give them when a family isn't on Google Fonts or the brand must use its own licensed files. Each entry is a path in the brand pack, or `{ "path", "weight", "style" }` so every weight has its own file.

`tokens` is what templates render with: three grounds (`signature`, `dark`, `light`) plus a `surface` for cards and wells, each with the type color that sits on it, and `muted` for secondary text. Every ground/type pair in `tokens` must also be in `color_pairs.allowed` (or meet 4.5:1 when the brand lists no pairs). Brand build and brand import fill `tokens` from the palette; when the brand doesn't make a pair clear, leave it `null` and add a gap, and templates won't use that ground.

## claims.json

```json
{
  "schema": "cmo.claims/1",
  "allowed": [
    { "claim": "Every fee is shown before you send.", "evidence": "product quote screen", "contexts": ["all"] }
  ],
  "banned": [
    { "pattern": "free|0 fees|no fees", "reason": "fees always apply", "suggest": "Every fee, shown first." },
    { "pattern": "\\b(instant(ly)?|same[- ]day|today|fast(er|est)?)\\b", "reason": "settlement takes time", "except": ["Instant between ezPayments wallets."] },
    { "pattern": "\\b(EZ Payments|EZPayments)\\b", "reason": "the name is always ezPayments", "case_sensitive": true },
    { "pattern": "!", "scope": "headlines", "reason": "no exclamation marks in headlines" }
  ],
  "disclaimers": [
    { "when": "mentions exchange rates or fees", "text": "Fees and exchange rates vary and are shown before you pay." }
  ],
  "audience_rule": "who the brand must never be presented as only for, if any",
  "regulated": { "industry": "payments", "notes": "no investment or savings language; no implied licensing" },
  "ai_labelling": "label AI-generated images and video where the platform requires it"
}
```

`banned[].pattern` is a regular expression, matched case-insensitively unless `case_sensitive` is true; use `\\b` word boundaries so "free" doesn't match "freelancer". `scope` limits an entry to part of a piece (for example `headlines`). `except` lists exact sentences that are allowed despite matching. A match is a candidate for the reviewer to judge, not an automatic verdict (see `cmo:compliance` section 2).

## Loading the brand (every agent)

1. Read `brand.json` and `claims.json` completely.
2. Read the sections of `guidelines.md` relevant to the task (voice for copy, color and layout for visuals, motion and sound for video).
3. Read `audiences.md` when writing for an audience.
4. If anything the task needs is `null` or missing, say so in the run summary and use the most conservative option (for example the black logo on white).

## Assets and rights

`assets/rights.json` has one entry per file:

```json
{ "file": "assets/hero-photo.jpg", "source": "licensed stock", "license": "standard", "expires": "2027-06-30", "releases": "model release on file", "notes": "" }
```

An asset with no entry, unknown rights or a past expiry date must not be used.
