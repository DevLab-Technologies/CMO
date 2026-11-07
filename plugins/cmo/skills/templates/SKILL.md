---
name: templates
description: Manage the brand's approved templates — list them, install a starter, render a preview with the brand pack, approve one, or check that rendering works on this computer. Templates are how cmo makes on-brand images and videos in every format from one source.
argument-hint: "list | install <starter or folder> | preview <template> | approve <template> | check"
---

Manage templates. Arguments: **$ARGUMENTS**

Load the `cmo:protocol` and `cmo:brand-pack` skills. The template format is in [contract.md](contract.md); read it before writing or changing a template.

A template is an HTML page that draws one kind of piece (an announcement video, a headline post, a carousel) from the brand pack and a fill file. The renderer turns it into PNG or MP4 files in every format the template supports, so one approved design produces the 9:16, 4:5, 1:1 and 16:9 versions at once. Designers and video producers fill approved templates first, and only generate images or video when no template fits.

## Commands

### `list` (the default)

List the templates in `.cmo/brand/templates/` (id, kind, formats, version, approved or not) and the starters that ship with the plugin in `${CLAUDE_SKILL_DIR}/starters/` that aren't installed yet. Say which kinds of work have no template.

### `check`

Run:

```bash
node "${CLAUDE_SKILL_DIR}/render.mjs" --check
```

Report what it found. If something is missing, give the user the exact command it printed. The renderer needs Node.js 18 or newer, Playwright (the `playwright-core` package is enough), a Chrome or Chromium browser, and ffmpeg for video. Nothing is installed without the user's say-so.

### `install <starter or folder>`

1. No brand pack: stop and offer `/cmo:brand-build` or `/cmo:brand-import`.
2. Check `brand.json.tokens` and the logo files. A starter can't render without the tokens; if they're `null`, say which ones are missing and stop.
3. Copy `${CLAUDE_SKILL_DIR}/starters/<starter>/` (or a drafted template's folder, such as a campaign's `outputs/templates/<id>/`) to `.cmo/brand/templates/<id>/`. If that folder exists, ask before replacing it. Set `"approved": null` in its `template.json`.
4. Render a preview (below) so the user sees it with their brand before approving.

### `preview <template>`

Render the template with its `example.json` (or a fill file the user names) into `.cmo/previews/<template>/`:

```bash
node "${CLAUDE_SKILL_DIR}/render.mjs" --brand .cmo/brand --template .cmo/brand/templates/<template> \
  --data .cmo/brand/templates/<template>/example.json --out .cmo/previews/<template>/preview --force
```

Add `--formats 1x1` for a fast single-format check, and `--audio <file>` for a video soundtrack. Show the user the files, the render manifest's warnings, and a frame or page from each format. Then have the brand guardian review the preview against the brand (write the task in `.cmo/reviews/`, protocol section 1). The task must say it's a template preview, so the guardian checks the design and skips the "made from an approved template" rule. Then ask for approval.

### `approve <template>`

Only after the user has seen a preview and says yes:
1. Get the content hash: `node "${CLAUDE_SKILL_DIR}/render.mjs" --hash --template .cmo/brand/templates/<template>`.
   Set `"approved": { "by": "<user>", "at": "<UTC ISO 8601>", "sha256": "<hash>", "preview": "<manifest path>", "review": "<review path>" }` in `template.json`.
2. A template is part of the brand pack: bump `brand.json.version` (minor), update `updated_at`, and add a changelog row to `guidelines.md` (brand-pack skill, Versions).

An unapproved template may be previewed but never used for campaign outputs. Changing any file of an approved template breaks its hash, so it renders as unapproved until it is previewed and approved again.

## Writing a new template

When the brand needs a kind of piece no template covers, the designer or video producer may draft one in a campaign's `outputs/templates/<id>/`, following [contract.md](contract.md). It becomes a brand template only through `install` from that folder, a preview, a review and the user's approval. Never change an approved template in place: copy it to a new version, preview, review and approve it again.
