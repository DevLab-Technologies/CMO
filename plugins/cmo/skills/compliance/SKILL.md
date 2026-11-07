---
name: compliance
description: The cmo review rulebook — how to check marketing output for brand rules, claims and disclaimers, platform ad policies, AI-content labelling, regulated-industry care, accessibility (contrast, alt text, captions) and asset rights, with severities. Used by the brand guardian and by anyone checking work before it ships.
user-invocable: false
---

# Compliance and review rules

Apply these checks to every output. The brand pack (`cmo:brand-pack`) supplies the brand-specific rules; this skill supplies the method and the general rules that apply to every brand.

Severities:

When the brand's guidelines grade their rules (`brand.json.rule_strength`, for example MUST, NEVER and SHOULD), a broken MUST or NEVER rule is at least **major**, and a broken SHOULD rule is **minor**.
- **blocker**: can't ship. Legal, safety, truth or rights problems, banned claims, a misused logo.
- **major**: must be fixed before approval. Clear brand violations, missing disclaimers, accessibility failures.
- **minor**: fix if cheap. Style drift, weak wording, small layout issues.

## 1. Truth (always blocker)

- Every number, result, customer, quote, review or award must have a source in the inputs or the brand pack. No source means blocker.
- Testimonials and customer stories need a story-bank entry with recorded consent.
- No implied endorsements: a partner or customer logo needs permission recorded in `assets/rights.json`.
- Comparisons with competitors must be specific, current and sourced, or removed.

## 2. Claims (`claims.json`)

1. Search the output for every `banned[].pattern` (case-insensitive unless the entry sets `case_sensitive: true`; entries with a `scope`, such as `headlines`, apply only there). Every match is a candidate, not a verdict:
   - the matched sentence is exactly one of the entry's `except` texts: allowed;
   - it makes or implies the banned claim ("Get paid fast"): **blocker**;
   - it doesn't ("Breakfast today?" against a speed rule): dismissed. List every dismissed match in the review with the reason, so a person can check the judgment.
2. Check that every factual promise in the output is one of the `allowed` claims, or plainly true from the inputs. An unlisted promise about speed, price, safety, savings or results is **major** and goes to the user to approve or reword.
3. For each `disclaimers[].when` that applies, the disclaimer text must appear in the piece or its caption. Missing means **major**.
4. Words that need evidence in any brand: free, guaranteed, best, #1, cheapest, fastest, safest, risk-free, instant, unlimited, certified, approved by. Unsupported means **major**; if the brand bans them, **blocker**.

## 3. Regulated industries

When `claims.json.regulated` names an industry, apply its care rules. For financial services and payments:
- No language that implies a banking licence, deposit protection, interest, investment returns or savings unless the brand pack says it's true and gives the wording.
- Fees and exchange rates: never "no fees" or "best rate"; say they're shown before the customer pays.
- Speed: only the exact speed claims allowed in `claims.json`.
- Promotions with conditions (bonuses, referral rewards) need the key conditions in the piece and a link to full terms.
- Financial-promotion rules differ by country (for example the UK FCA regime, US FTC and state rules, Egypt FRA and CBE rules). When a piece targets a country, list it in the review as "needs local compliance check" unless the brand pack records that check is done.

For health, alcohol, gambling, crypto, children's products, housing, employment and credit, flag the piece "needs specialist review": platforms and regulators restrict all of these.

## 4. Platform policies

- **Ads on Meta, Google, TikTok, LinkedIn, X:** no personal attributes in the copy ("Are you in debt?", "Other Egyptians abroad like you"), no before/after implying guaranteed results, no misleading buttons or fake interface elements, landing page must match the ad.
- **Special ad categories** (credit, employment, housing, social issues, financial products in some regions): flag them so the user selects the category when launching.
- **Text on images:** platforms no longer penalize it, but legibility on a phone still matters (section 6).
- **AI-generated media:** label it where the platform requires (photo-realistic people, places or events, and anything in political or social topics). Follow `claims.json.ai_labelling`. Missing label where required means **major**.
- **Music and sound:** only licensed or owned audio (section 7). Platform music libraries are for organic posts; ads usually need commercially cleared tracks.

## 5. Brand rules (`brand.json`)

Check what applies to the format:

| Area | Check |
|---|---|
| Name | Spelled exactly as `name`; `name_rules` respected |
| Voice | Matches `voice.traits`, the right register, no `voice.dont` items, capitalization rule |
| Logo | An approved file from `logo.files`, an allowed color pair, at least `min_width`, clear space respected, placement per `logo.placement`, none of `logo.never` (**blocker** if misused) |
| Color | Only brand colors; every type/background pair is in `color_pairs.allowed`; none from `forbidden` (**major**); no gradients when `gradients` is false |
| Type | Brand families and weights; ratios from `typography.ratios` within about 10% |
| Signature device | Used as its rule says (for example one highlight per view) |
| Layout | Margins, headline position, logo position, one idea per piece |
| Icons and imagery | Style and the `never` lists; no emoji when `icons.emoji` is false |
| Motion and sound | `motion` and `sound` rules for video and audio |
| Formats | Correct size, content inside the safe zones for the format |
| Templates and renders | Made from an approved template (`template.approved` in the render manifest); the manifest's `brand_version` is current; `failed` is false; every manifest warning is addressed in the meta file |

## 6. Accessibility

- **Contrast:** text needs at least 4.5:1 against its background, or 3:1 for large text (24 px and up, or 19 px bold and up). Compute it:
  1. For each color channel c (0–255): s = c/255; linear = s/12.92 if s ≤ 0.04045, else ((s+0.055)/1.055)^2.4.
  2. Luminance L = 0.2126 R + 0.7152 G + 0.0722 B (linear values).
  3. Contrast = (L_lighter + 0.05) / (L_darker + 0.05).
  Failing contrast is **major**.
- **Alt text:** every image post and email image has alt text that says what the image shows and why it matters. Missing means **major**.
- **Captions:** every video with speech or meaningful sound has captions or subtitles; every video works with the sound off. Missing means **major**.
- **Legibility on a phone:** body text at least about 28 px on a 1080 px-wide frame; no essential text in the platform's safe-zone overlays.
- **Plain language:** short sentences; no unexplained jargon or acronyms.
- **Links:** descriptive link text, never "click here".

## 7. Asset rights

- Every logo, font, photo, illustration, music track and voice in the piece must have an entry in `assets/rights.json` (or in the campaign's outputs record for generated assets). No entry, unknown rights or a past `expires` date means **blocker**.
- People in photos need a model release recorded; places and products may need property releases.
- Fonts must be licensed for the use (web, app, video, print).
- Generated media: record the service, the prompt and the date; check the service's terms allow commercial use.

## 8. Privacy

- No real customer names, faces, amounts or messages without consent recorded in the story bank.
- No personal data in links (tracking parameters carry campaign data only).
- Screenshots of the product use example data, never real accounts.

## 9. Writing the review

Follow the review format in `cmo:protocol` section 6:
- one row per finding, quoting the exact text or describing the exact place;
- the rule it breaks (the brand pack field, the claims entry, or this skill's section);
- the required change, specific enough to apply without guessing;
- **Checked** and **Not checked** lists. If you couldn't verify something (motion you couldn't watch, a country's rules, a license you can't see), it goes under Not checked with the reason. Never mark it as passed.

The verdict is `pass` only with no blockers and no majors.
