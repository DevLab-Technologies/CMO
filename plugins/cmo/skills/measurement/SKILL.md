---
name: measurement
description: How cmo measures marketing — choosing metrics for a goal, writing a measurement plan, designing experiments, building tagged campaign links, and reading results honestly. Used by the strategist, planner and analyst.
user-invocable: false
---

# Measurement

Every campaign has one measurable goal and a plan for measuring it before anything is produced.

## 1. Goals and metrics

| Goal | Primary metric | Supporting metrics |
|---|---|---|
| Awareness | Reach (unique people) | Impressions, frequency, video views (3 s and complete), cost per thousand |
| Consideration | Clicks to the site or app | Click-through rate, engagement rate, saves, shares, time on page |
| Acquisition | Sign-ups or first transactions | Conversion rate, cost per acquisition |
| Activation | Customers completing the first key action | Time to first action |
| Retention | Repeat use within a period | Churn, active users |
| Advocacy | Referrals | Reviews, mentions |

Pick one primary metric per campaign. Likes and followers are never the primary metric unless the goal is literally community size.

## 2. The measurement plan

`plan.md` contains a measurement section:
- **Goal:** one sentence with a number and a date ("200 first bill payments from the UAE and Saudi Arabia by 31 December").
- **Primary metric** and where it's measured (which analytics tool, which report).
- **Baseline:** the current number, from past campaigns or `learnings.md`. If unknown, say so.
- **Target** and why it's realistic.
- **Supporting metrics.**
- **Tagged links** for every channel (section 4).
- **When results are read:** the dates, and who reads them.

## 3. Experiments

Test one thing at a time, only when the answer will change what you do next.
- **Hypothesis:** "Leading with the problem ('Your bills in Egypt') gets more clicks than leading with the feature ('Fawry bill pay is here') among Egyptians in the Gulf."
- **Variable:** exactly one (hook, visual, call to action, audience, time).
- **Variants:** two, sometimes three.
- **Split and duration:** an even split, long enough to reach roughly 100 or more conversions per variant (or the platform's significance indicator). Fewer means the result is a hint, not a conclusion, and is reported that way.
- **Decision rule:** written before the test ("if B beats A by 20% or more on clicks, use B's hook for the rest of the campaign").

Read an experiment with the bundled calculator, never by eye:

```bash
node "${CLAUDE_SKILL_DIR}/abtest.mjs" --a <conversions>/<exposures> --b <conversions>/<exposures>
```

It gives each rate, the lift, a confidence interval and a p-value. Its verdict follows the rule above: under 30 conversions in the smaller variant is too small to compare, 30 to 99 is a hint only, and 100 or more is a conclusion. With three variants, compare each challenger with the control and add `--comparisons 2`. Quote its verdict as it is.

## 4. Tagged links

Every link in campaign content carries tags so results can be traced:

```
https://<site>/<path>?utm_source=<platform>&utm_medium=<type>&utm_campaign=<campaign slug>&utm_content=<variant or asset>
```

- `utm_source`: instagram, tiktok, linkedin, youtube, facebook, x, newsletter, whatsapp.
- `utm_medium`: social (organic), paid_social, email, video, referral.
- `utm_campaign`: the campaign slug from `.cmo/campaigns/`.
- `utm_content`: the asset or variant, for example `reel-9x16-hook-a`.
- Lowercase, hyphens, no spaces. Never put personal data in a link.

## 5. Results data

Results for a campaign live in `campaigns/<slug>/results/`, one file per source and pull, never edited after it's saved:

- `metrics-<source>-<YYYYMMDD>.csv` with these columns (leave a cell empty when the source doesn't report it):
  `date,channel,placement,utm_content,variant,impressions,reach,video_views,clicks,conversions,spend,currency,source`
- the raw export the user gave (the platform's own file), kept beside it so every number can be traced.

Sources, in order of preference: a connected analytics or ads connector (read-only); an export the user downloads from the platform; the platform's insights pages read in the user's Chrome with their permission (`/cmo:report` explains). Every number in a report names its file.

## 6. Reading results honestly

- Report the primary metric against the target first, then the supporting metrics.
- Separate correlation from cause: a spike that coincides with a holiday isn't proof the post worked.
- Small numbers are reported as small ("12 sign-ups; too few to compare variants").
- Note what wasn't measured and why.
- Every finding that should change future work becomes an entry in `learnings.md`:

```markdown
## 2026-12-31: Problem-led hooks beat feature-led hooks for diaspora audiences

- Campaign: fawry-launch
- Evidence: hook A (problem) 2.4% CTR vs hook B (feature) 1.1%, 18,400 impressions each, Instagram Reels, UAE and KSA
- Confidence: medium (one campaign, one channel)
- Apply: lead with the hero's moment in diaspora campaigns; retest on TikTok
```
