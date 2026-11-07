# Template contract (`cmo.template/1`)

A template is a folder:

```
.cmo/brand/templates/<id>/
  template.json   what it is, which formats, which slots
  index.html      draws the piece from window.CMO
  example.json    a complete fill file used for previews
  assets/         images or fonts the template itself needs (optional)
```

## template.json

```json
{
  "schema": "cmo.template/1",
  "id": "announce-video",
  "title": "Announcement video",
  "kind": "video",
  "description": "Hook, message, proof and end frame, 10 to 30 seconds",
  "formats": ["9x16", "4x5", "1x1", "16x9"],
  "directions": ["ltr", "rtl"],
  "fps": 30,
  "pages": null,
  "slots": {
    "scenes": { "type": "list", "required": true, "min": 2, "max": 8, "help": "one item per scene, see the template's notes" },
    "captions": { "type": "list", "required": false, "help": "the voice-over script with timings; defaults to the on-screen text" }
  },
  "brand_tokens": ["signature", "on_signature", "dark", "on_dark", "light", "on_light"],
  "notes": "anything a person filling it needs to know",
  "version": "1.0.0",
  "source": "starter | custom",
  "approved": null
}
```

When the user approves a template, `approved` becomes `{ "by", "at", "sha256", "preview", "review" }`. `sha256` is the template's content hash (`render.mjs --hash --template <dir>`: every file except `example.json`, and `template.json` without `approved`). A template whose content no longer matches its hash renders as unapproved, with a warning.

- `kind`: `video` (MP4, plus subtitles and a poster frame) or `image` (PNG).
- `formats`: keys of `brand.json.formats`. The renderer refuses a format the brand doesn't define, and uses the size and safe zones from the brand.
- `pages`: for images, the fill key whose list gives one page each (for example `"slides"` for a carousel). `null` means one page.
- `slots`: every key the fill file may have. Types: `text` (with optional `max_chars`), `number`, `enum` (with `values`), `image` (a path relative to the project root), `list` (with optional `min`, `max` and `items` describing each item's keys the same way), `object`. The renderer validates the fill against the slots and refuses to render on any error.
- `brand_tokens`: the `brand.json.tokens` the template always needs (its default grounds). The renderer also needs `<ground>` and `on_<ground>` for every `ground` value in the fill, and refuses to render, naming the token, when one is `null`.

## What the renderer gives the page

The renderer serves a copy of `index.html` with the brand injected at the top of `<head>` (a `<base>` pointing at the template folder, the font stylesheet, the CSS properties below and `window.CMO`), so all of it exists before any template script runs:

```js
window.CMO = {
  format: "9x16",
  size: [1080, 1920],
  safe: { top: 250, bottom: 300, left: 0, right: 0 },
  direction: "ltr",          // from the fill's "direction", default ltr
  language: "en",            // from the fill's "language", default the brand's first language
  page: 0,                   // which page, for multi-page images
  data: { /* the fill file */ },
  root: "file:///path/to/project/",   // resolve image slots with new URL(path, CMO.root)
  brand: {
    name, version, tokens, typography, ratios,
    logo: { black, white },      // file URLs, or null when the file is missing
    logo_side: "start",          // "start" or "end", from brand.json.logo.placement and the direction
    gradients, layout, signature_device, motion
  }
};
```

It also sets these CSS custom properties on `:root`, so most templates need no script for styling:

| Property | Value |
|---|---|
| `--w`, `--h` | the format's size in px |
| `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` | the format's safe zones in px |
| `--margin` | 8% of the short side, or `brand.json.layout.margin_ratio` of it when set |
| `--logo-h` | 4% of the short side |
| `--headline`, `--subhead` | `--logo-h` × `typography.ratios.headline_to_logo` (default 2.5), and × `subhead_to_headline` of that (default 0.5) |
| `--signature`, `--on-signature`, `--dark`, `--on-dark`, `--light`, `--on-light`, `--surface`, `--on-surface`, `--muted` | `brand.json.tokens` |
| `--font-display`, `--font-text`, `--font-mono` | the brand's families for the fill's script (Arabic families when `language` is `ar` and the brand defines them) |
| `--display-weight`, `--display-tracking` | from `typography.display` when they're single values |

Fonts load from `typography.<role>.files` when given (brand-pack skill: paths, or `{ "path", "weight", "style" }` so each weight has its own file), otherwise from Google Fonts by family name. If a font can't load, the render manifest says so.

A template may load files (its own `assets/`, the brand's logo and fonts, images named in the fill) and the web-font hosts. Every other network request is blocked and reported, so a template can't send the fill anywhere.

## What the page must provide

| Name | Kind | Meaning |
|---|---|---|
| `window.DURATION` | number, video only | total length in seconds |
| `window.setTime(t)` | function, video only | draws the frame at `t` seconds. It must be a pure function of `t`: the same `t` always draws the same frame, whatever was drawn before. No timers, no CSS transitions, no `requestAnimationFrame` |
| `window.CAPTIONS` | list, video, optional | `[{ "start": 0.0, "end": 2.4, "text": "..." }]`, written to an `.srt` file |
| `window.POSTER_AT` | number, video, optional | the time of the poster frame (default: one second before the end) |
| `window.SOUND_LOGO_AT` | number, video, optional | where the brand's sound logo should start, so the audio producer can mix to it |
| `window.SCENES` | list, video, optional | `[{ "type", "start", "end" }]` in seconds, so producers can take a key frame from each scene |
| `window.PAGES` | number, image, optional | the page count when the template works it out itself |
| `window.cmoReady` | promise, optional | the renderer waits for it before capturing |

Warnings for the person reviewing go to `console.warn` starting with `cmo:`; the renderer copies them into the manifest. Errors that make the piece wrong go to `console.error` starting with `cmo:`, and fail the render.

## Brand rules a template enforces itself

- Only `brand.json.tokens` colors; never a gradient when `brand.json.gradients` is false.
- Type sizes from `--headline` and `--subhead`, so the brand's ratios hold in every format.
- The logo from `CMO.brand.logo` only, at `--logo-h`, in its allowed color for the ground, on the side `CMO.brand.logo_side` gives (logical start or end, so RTL mirrors it). Never redraw or retype the logo; if the file is missing, leave it out and warn.
- Text inside the safe zones and margins.
- The signature device exactly as `brand.json.signature_device.rule` says.
- Motion that follows `brand.json.motion` (for example hard cuts, ease-out, nothing it bans).
- `dir="rtl"` and the Arabic families when `direction` is `rtl`.

## Finding the timing before mixing

`node render.mjs ... --info` loads the template with the fill and prints each format's `duration`, `pages`, `scenes`, `sound_logo_at` and `poster_at` without rendering (no `--out` needed). The audio producer mixes the soundtrack to exactly that duration and puts the sound logo at `sound_logo_at`. If the audio given to a render is a different length, the video's length wins (short audio is padded with silence, long audio is cut) and the manifest warns.

## Rendering options

- `--formats a,b`: the formats to render. Without it, every template format that `brand.json.formats` defines; skipped ones are warned about.
- `--audio <file>`: the soundtrack. `--loudness -14` (the default) normalizes it; pass `--loudness off` for a soundtrack the mixer already normalized, or another target (for example `-23`) for broadcast.
- `--force`: overwrite existing outputs. Without it, the renderer refuses to replace any file for the same `--out`, because reviews point at fixed files: write a new version instead. Use `--force` only for previews.
- `--fps`: 1 to 60 (default the template's, else 30).

## The render manifest

Every render writes `<out>.render.json` next to its files. Paths are relative to the folder the renderer ran in (the project root):

```json
{
  "schema": "cmo.render/1",
  "template": { "id": "announce-video", "version": "1.0.0", "sha256": "...", "approved": true },
  "brand_version": "1.2.0",
  "data": { "path": ".cmo/campaigns/x/outputs/reel-fill-v1.json", "sha256": "..." },
  "rendered_at": "UTC ISO 8601",
  "files": [
    { "format": "9x16", "path": ".cmo/campaigns/x/outputs/reel-v1-9x16.mp4", "duration": 18.0,
      "scenes": [{ "type": "hook", "start": 0, "end": 2.5 }], "sound_logo_at": 15.3,
      "loudness": { "integrated_lufs": -14.1, "true_peak_dbtp": -1.2 },
      "subtitles": ".cmo/campaigns/x/outputs/reel-v1-9x16.srt", "poster": ".cmo/campaigns/x/outputs/reel-v1-9x16-poster.png" }
  ],
  "audio": { "path": "...", "normalized_to": null },
  "warnings": [],
  "failed": false
}
```

`template.approved` is true only when the template is approved and its content still matches the approved hash. `loudness` is measured on the finished file. `failed` is true when a template error or render error happened; such a render is not an output. The brand guardian reads this manifest to check that the template was approved, the brand version is current, and every warning was dealt with.
