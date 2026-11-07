---
name: review
description: Check any file — a post, a caption, an email, an image, a script, a plan — against the brand pack, claims rules, platform policies, accessibility and asset rights, using the brand guardian. Works inside or outside a campaign.
argument-hint: <file to review> [channel or format, e.g. "instagram 4x5"]
---

Review this with the brand guardian:

**$ARGUMENTS**

Load the `cmo:protocol` skill.

## Steps

1. No `.cmo/brand/brand.json`: stop and suggest `/cmo:brand-import` or `/cmo:brand-build`. A review without a brand pack would only check general rules, so say so if the user wants it anyway.
2. Find the file. If it isn't a fixed version inside a campaign, review it where it is.
3. Decide where the review goes:
   - inside a campaign: the campaign's `reviews/REVIEW-NNN.md` (next free number) and a task file for the guardian;
   - outside a campaign: `.cmo/reviews/REVIEW-<YYYYMMDD>-<file name>.md`, with the task details written at the top of the review request instead of a task file.
4. Start the `cmo:brand-guardian` agent with: the file, the channel or format (ask the user only if it changes the rules and can't be inferred), and the review path.
5. Read the review it wrote. Show the user the verdict and the findings table, with blockers first, and link the review file.
6. Inside a campaign, record a `review_passed` or `changes_requested` event.

Don't fix anything yourself. If the user wants fixes, offer to run the change through `/cmo:cmo` so it's revised as a new version and reviewed again.
