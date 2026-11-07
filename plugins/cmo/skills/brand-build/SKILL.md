---
name: brand-build
description: Build a brand pack from nothing through a short interview — business, audiences, positioning, voice, claims, colors, type, logo use, layout, motion and sound — and write guidelines.md, brand.json, claims.json, audiences.md and gaps.md. Use when a project has no brand guidelines yet. For existing guidelines, use brand-import instead.
argument-hint: "[website URL or notes to start from]"
---

Build a brand pack with the user. Load the `cmo:protocol` and `cmo:brand-pack` skills first; the brand pack skill defines every file and schema you write.

Starting material, if any: **$ARGUMENTS**

## Before the interview

1. No `.cmo/`: run the `/cmo:init` steps first.
2. A brand pack already exists (`.cmo/brand/brand.json`): don't overwrite it. Ask whether the user wants to extend it (fill the gaps in `gaps.md`) or start a new major version. Continue only with a clear answer.
3. If the user gave a website or notes, read them first and pre-fill every answer you can, marked as "from your website" so the user can confirm or correct it rather than start from blank.

## The interview

Run it in rounds. Each round is one message with at most four questions, each with a suggested answer the user can accept as is. Don't move on until the round is answered. Write the files after each round, so a stopped interview keeps its progress, and say which round comes next.

**Round 1: the business**
- What you sell, to whom, in one sentence.
- The one thing customers get from you that they can't easily get elsewhere.
- Where you operate, and which languages you market in.
- Three competitors, and how you're different from each.

**Round 2: audiences**
- Your two or three most important audiences. For each: who they are, what they need, what they worry about, where they spend time online.
- Who you're not for.

**Round 3: positioning and voice**
- Finish this: "For [audience], [brand] is the [category] that [benefit], because [reason to believe]."
- Three words for how the brand should sound, and three it must never sound like.
- Show three short sample lines in different voices for the same message, and ask which is closest. Use the choice to set `voice.traits`, `voice.do` and `voice.dont`.
- Capitalization: sentence case or title case for headlines.

**Round 4: claims**
- What you can promise and prove (each with its evidence).
- What you must never say (legal limits, regulators, things that aren't true for every customer).
- Disclaimers your industry requires.
- Is your industry regulated? (finance, health, alcohol, gambling, education, children's products and others)

Warn the user about absolute words (free, guaranteed, best, instant) and record them as banned unless they give evidence.

**Round 5: the look**
- Existing logo files: ask the user to put them in `.cmo/brand/assets/` (SVG preferred, PNG at least 1,000 px wide) and record their rights. If there's no logo yet, record that as a gap; don't design one. A logo needs a designer.
- Colors: existing brand colors, or a direction ("calm and trustworthy", "loud and young"). Propose a palette of one signature color, one dark, one light and two neutrals as hex values. Compute contrast for every text/background pair (method in `cmo:compliance` section 6); only pairs of at least 4.5:1 go in `color_pairs.allowed`, and failing pairs go in `forbidden`.
- Type: existing typefaces, or a direction. Propose freely licensed families (for example from Google Fonts) for display, text and every script the brand uses, and record the license.
- A signature device: one recurring visual move that makes the brand recognizable (a color block, a shape, a crop, a type treatment). Offer two or three ideas that fit the voice.

**Round 6: layout, motion and sound (optional)**
- Margins and where the headline and logo sit.
- Motion: how things move (or "no motion rules yet").
- Sound: a sound logo, music, voice (or "not yet").
- Social formats the brand uses most.

## Writing the brand pack

Write, following `cmo:brand-pack` exactly:
- `guidelines.md` in the [template structure](../brand-pack/guidelines-template.md), written as clear rules with examples of right and wrong;
- `brand.json` and `claims.json`, with `source: "built"` and `version: "1.0.0"`, including `tokens` (the grounds and type colors the user chose, each pair checked for 4.5:1 contrast) and `formats` in the schema's shape (the four standard ratios with sizes and the 9:16 safe zone from `cmo:channels`, plus any others the user named);
- `audiences.md`;
- `gaps.md`: every field left `null` or "Not defined yet", one line each starting with `- `, with what's needed to close it;
- `assets/rights.json` entries for every file the user added.

Never invent facts, evidence, legal requirements or a logo. Anything the user didn't confirm goes in `gaps.md`.

## Finish

Record the brand creation in `.cmo/decisions.md`. Show the user:
- a one-screen summary: name, positioning line, voice, palette with contrast results, type, signature device;
- the open gaps, most important first;
- the next step: `/cmo:review` on an existing piece to see the guardian apply the new brand, or `/cmo:cmo` to start a campaign.
