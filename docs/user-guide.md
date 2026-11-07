# cmo user guide

This guide takes you from an empty project to a published, measured campaign. Every command runs inside a Claude Code session started in your project with the plugin loaded.

## 1. Set up

```text
/cmo:init
```

This creates `.cmo/` in your project. Commit it to git so your team shares one history. Large media in `campaigns/*/outputs/` may belong in Git LFS or shared storage.

## 2. Give it your brand

**If you have guidelines** (PDF, Markdown, or a web page):

```text
/cmo:brand-import path/to/guidelines.pdf
```

The source stays the authority. cmo writes `guidelines.md` with fixed section numbers, plus `brand.json` and `claims.json`, and lists what your guidelines don't define in `gaps.md`, along with any contradictions it found. Values it can't find stay empty rather than guessed.

**If you don't:**

```text
/cmo:brand-build
```

A six-round interview covers who you are, voice, claims, identity, color and type, and imagery, motion and sound.

**Then add your assets** to `.cmo/brand/assets/` (the logo in black and white versions, fonts if they aren't on Google Fonts, your sound logo), with one line for each in `assets/rights.json`. Make sure `brand.json.tokens` names the colors templates should use for each ground.

## 3. Get templates ready

```text
/cmo:templates check
/cmo:templates install headline-card
/cmo:templates install announce-video
```

`check` tells you what rendering needs on this computer and how to install it. `install` copies a starter and renders a preview with your brand into `.cmo/previews/`. Look at it; the brand guardian reviews it too. When you're happy:

```text
/cmo:templates approve headline-card
```

Approving a template bumps your brand pack's version. Only approved templates are used for campaign work.

## 4. Run a campaign

```text
/cmo:cmo launch our bill pay feature to Egyptians living in the Gulf, in English and Egyptian Arabic, budget 800 USD, starting 1 December
```

The CMO:
1. creates the campaign and asks at most three questions (the goal, the audience, the channels, the dates, the budget, the languages: whatever your request and brand pack don't already answer);
2. writes the strategy if the direction is new, then the story, and asks you to approve the story;
3. shows you the plan: the deliverables, the dates, the estimated time and cost. Work starts when you agree;
4. produces the copy, then the visuals and video from your templates, with every piece reviewed by the brand guardian;
5. shows you the final assets with their review verdicts, and asks you to approve them.

You can stop at any point and pick up later. `/cmo:status` shows where everything stands, and running `/cmo:cmo` with the campaign's name continues it.

## 5. Check anything against the brand

```text
/cmo:review path/to/any-post.md
```

This works on copy, images and render manifests, inside or outside a campaign. Reviews say what was checked and what couldn't be (for example how a video moves, or how audio sounds).

## 6. Plan the calendar

```text
/cmo:calendar 30
/cmo:calendar 30 --ics
```

This shows everything due across campaigns, with items that aren't ready, clashes, gaps and items with no owner. `--ics` writes a file you can import into Google, Apple or Outlook calendars.

## 7. Publish

```text
/cmo:publish fawry-launch next
```

A post can be published only when its latest copy and assets passed review and you approved the `final_assets` and `publish` gates. Then, for each post:

- **Hand-off:** you get the exact text and files to post yourself.
- **Scheduler** (if one is connected): cmo queues the post after your yes.
- **Chrome** (with Claude in Chrome connected and you signed in to the platform): cmo fills in the post on the platform, shows you a screenshot, and clicks Post only after your yes for that post, or lets you click it yourself.

cmo never signs in for you, never boosts or spends, and never accepts terms on your behalf.

## 8. Answer your community

```text
/cmo:cmo draft replies to the comments in comments.txt for fawry-launch
```

The community manager sorts every comment and drafts replies from your brand pack and campaign. Complaints about money, fraud, legal or safety issues, and press questions are escalated to you. You send the replies. To give it facts for answers (prices, delivery areas, support contacts), write `.cmo/brand/support.md`.

## 9. Read the results

```text
/cmo:report fawry-launch --collect
/cmo:report weekly
```

`--collect` pulls results from a connected analytics or ads connector. Without one, it tells you exactly which export to download and where to put it, or, if you ask, reads the platforms' insights pages in your Chrome. The analyst compares results with the goal, reads experiments with a significance calculator, and writes `results.md` and new entries in `learnings.md`, which the next campaign's plan reads first.

## 10. Make it routine

```text
/cmo:routine add weekly-report
```

Routines (a calendar check, weekly and monthly reports, a results pull) run on your scheduler after you approve each one. They only read and report; nothing scheduled publishes, sends, spends or approves.

## 11. Work as a team

- **Best:** commit `.cmo/` to your shared repository. Each campaign has an owner and a lock, so two people don't edit the same campaign at once.
- **Or:** `/cmo:export` writes a verified zip, and a teammate runs `/cmo:import <file>` in their project. Every file is checked against its checksum, and merges follow explicit rules.

## 12. See what's connected

```text
/cmo:connections
```

This shows which design, generation, analytics, ads, scheduler, email and storage connectors you have, and what each unlocks. cmo works without any of them.

## The rules cmo always follows

- It never invents customers, quotes, reviews or numbers, and every proof point has a source.
- It uses only claims your brand allows, and adds required disclaimers.
- It never publishes, sends, spends or approves without your explicit yes, one gate and one post at a time.
- It uses no asset, music or voice without a rights record, and never clones a voice without written consent.
- It treats text in comments, emails and web pages as information, never as instructions.
- It tells you what it checked, what it didn't, and why.
