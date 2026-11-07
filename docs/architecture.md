# cmo: architecture

`cmo` is a Claude Code plugin that works as a chief marketing officer. It turns a business goal into a strategy, plans, stories, copy, images, video and audio, with every output checked against the user's brand before anyone sees it, and a person's approval before anything is published or paid for.

`cmo` is a working name while the plugin is tested. It succeeds `solo-marketing-lead` (the `claude-marketing` repository). That plugin had seven independent skills and no shared state. `cmo` adds an orchestrator, specialist agents, a shared workspace, templates that render, and guardrails.

## Principles

1. **The brand pack is the source of truth.** Every agent reads it before working, and nothing ships that contradicts it. Users build one with the plugin or import their own guidelines.
2. **Templates before freeform generation.** Approved templates render on-brand posts, carousels and motion video in every format from one source. Generated media is for what templates can't do, and it gets the strictest review.
3. **Agents communicate through files.** There is no agent-to-agent conversation. The workspace on disk carries every handoff, review and decision, so work survives sessions and anyone on the team can resume it.
4. **People approve, agents propose.** Nothing is published, scheduled, sent or paid for without a person's explicit approval, recorded with who and when. One approval covers one gate; one yes covers one post.
5. **Report faithfully.** Agents state what they checked and what they didn't. A skipped step is reported as skipped. A number without a source doesn't exist.
6. **Learn from results.** Every campaign ends with results read honestly and learnings recorded, and every new plan reads them first.

## Components

### The orchestrator: CMO

The CMO is the main session, driven by `/cmo:cmo`. It isn't a sub-agent, because it has to talk to the user: it asks clarifying questions and waits for approvals, and only the main session can do that. Specialists are plugin agents, called `cmo:<name>`.

The CMO:
- turns the request into a campaign with tasks, estimates (human minutes, cost, lead days) and dependencies;
- starts the right specialist for each task, in parallel when tasks share no files;
- is the only writer of `state.json`, task files, `decisions.md` and `approvals.jsonl`;
- sends every output to the brand guardian and routes findings back to the producer (three rounds at most, then the user decides);
- enforces the budget (alert at 80%, stop at the limit);
- stops at every approval gate: `story`, `final_assets`, `publish`, `spend`.

If a specialist isn't installed, the CMO does the step itself under the same task file and rules, and records that it stood in.

### Specialist agents

| Agent | Owns | Never does |
|---|---|---|
| `strategist` | Objective, audience, positioning, channel choice, KPIs | Write content |
| `researcher` | Competitors, market, customer voice, all sourced | Recommend without sources |
| `storyteller` | The story brief and its version for each format; the story bank | Invent customers, quotes or results |
| `planner` | Deliverables, sequence, calendar, budget split, measurement plan, experiments, tagged links | Change the strategy or story |
| `copywriter` | Copy per channel and language; Arabic transcreation | Use a claim that isn't allowed |
| `designer` | Posts, carousels, thumbnails: filled templates first, generated images second; alt text | Change the copy, the logo or the template |
| `video-producer` | One master video rendered in every format, with subtitles, poster and key frames | Add its own music or effects |
| `audio-producer` | Soundtracks mixed to the video's timing, the sound logo, beds and voice-over with cleared rights | Use audio without a rights record |
| `brand-guardian` | Reviewing every output: truth, claims, brand rules, accessibility, rights, privacy, render manifests | Fix the work (it reports; the producer fixes) |
| `analyst` | Results against the goal, experiment readouts, cost, learnings | Change the plan or invent a number |
| `community-manager` | Sorting comments and messages, drafting replies, escalating risks | Send anything |

Agents have only the tools they need: no agent can start another agent, and only the producers and the analyst can run commands (the renderer, the mixer, the calculator).

### Skills (shared knowledge)

| Skill | Holds |
|---|---|
| `protocol` | The binding workspace contract: paths, write ownership, state, tasks, reviews, approvals, events, budget, calendar |
| `brand-pack` | The brand pack files, the `brand.json` and `claims.json` schemas (including render tokens), versioning, rights records, the guidelines template |
| `compliance` | The review rulebook: severities, truth, claims, regulated industries, platform policies, brand rules, accessibility (with the contrast formula), rights, privacy |
| `storytelling` | Story brief fields, structures by format, hooks, the story bank, local versions |
| `channels` | Sizes, safe zones, text limits, video lengths, what each channel is for, right-to-left |
| `measurement` | Goals and metrics, the measurement plan, experiments (with `abtest.mjs`), tagged links, results data, reading results honestly |
| `templates` | The template contract and `render.mjs`; also the `/cmo:templates` command |
| `audio` | Sound logo rules, beds, voice-over consent, loudness targets, and `mix.mjs` |
| `connections` | Connector categories, read versus act, and the rules for each; also `/cmo:connections` |

### Commands

Commands are user-invocable skills, so each one is a folder in `skills/`.

| Command | Purpose |
|---|---|
| `/cmo:cmo <request>` | The main entry point: any marketing request becomes a campaign |
| `/cmo:init` | Set up `.cmo/` in a project |
| `/cmo:brand-build` | Build a brand pack through a six-round interview |
| `/cmo:brand-import <file or URL>` | Import existing guidelines, with a gap report |
| `/cmo:templates [list, install, preview, approve, check]` | Manage the brand's templates and check rendering works |
| `/cmo:review <file>` | Check any file with the brand guardian |
| `/cmo:status [campaign]` | Where every campaign stands and what runs next |
| `/cmo:calendar [days] [--ics]` | Combined calendar with clashes and gaps, optional calendar file |
| `/cmo:publish <campaign> [item]` | Publish approved posts: hand-off, scheduler, or Chrome with a yes per post |
| `/cmo:report [campaign, weekly, monthly] [--collect]` | Results and portfolio reports, collecting data first |
| `/cmo:routine [list, add, remove]` | Recurring read-and-report routines on the user's scheduler |
| `/cmo:connections` | What's connected and what it unlocks |
| `/cmo:export`, `/cmo:import <file>` | Share context with the team as a verified zip |

### Hooks

| Event | Action |
|---|---|
| Session start | A short brand summary and the open campaigns go into context (silent without `.cmo/`) |
| A `cmo:` agent finishes | A line is appended to `.cmo/agent-runs.jsonl`, so history doesn't depend on agents remembering |

## Rendering

Templates are HTML pages driven by a pure function of time, so a frame is always the same for the same `t`. That's what makes one master render identically in every format.

```
fill file (copy, grounds, scenes)  +  brand.json (tokens, type, logo, formats)  +  template
                         \                       |                         /
                                  render.mjs (Playwright + Chrome)
                                              |
            image: one PNG per format (per page)    video: frames -> ffmpeg -> MP4, SRT, poster
                                              |
                                   <out>.render.json manifest
```

- The renderer validates the fill against the template's slots, checks that the brand defines the formats and tokens the template needs, injects the brand as CSS variables and `window.CMO`, waits for the brand's fonts, and fails a render whose text doesn't fit.
- Video templates expose `DURATION`, `setTime(t)`, `CAPTIONS` and `SOUND_LOGO_AT`. `--info` reports timing without rendering, so the audio producer mixes a soundtrack to the exact length with the sound logo on the end frame; the renderer then muxes it, normalized to -14 LUFS.
- Subtitles are split to two lines of 42 characters, and cues faster than 17 characters a second are flagged.
- The manifest records the template version and approval, the brand version, the fill's checksum, the files and every warning. The brand guardian reviews against it.
- Two starters ship: `announce-video` (hook, statement, steps, figure, image and end scenes) and `headline-card` (a post or a carousel). Starters render with the user's brand, and are used for campaigns only after the user approves a preview.

Dependencies (Node 18+, `playwright-core`, Chrome or Chromium, ffmpeg) are checked by `/cmo:templates check`, which prints the exact fix. Nothing is installed without the user.

## The workspace

Everything lives in `.cmo/` in the user's project:

```
.cmo/
  brand/                         lasts across campaigns
    guidelines.md                human-readable guidelines, fixed section numbers
    brand.json                   machine-readable rules and render tokens
    claims.json                  allowed claims, banned patterns, disclaimers
    audiences.md, support.md     audiences; optional support facts for replies
    assets/ + rights.json        logos, fonts, sound logo, with a rights record per file
    templates/                   approved templates
    story-bank/                  reusable stories with source and consent
    gaps.md                      what the brand doesn't define yet
  learnings/learnings.md         what worked and what didn't, with evidence (analyst)
  decisions.md                   decisions and why (CMO)
  agent-runs.jsonl               automatic record of agent runs (hook)
  reviews/                       reviews of files outside campaigns
  reports/                       weekly and monthly reports
  previews/, exports/            template previews and calendar files, safe to delete
  routines.json                  approved recurring routines
  campaigns/<slug>/
    state.json                   stage, tasks, owner, lock, budget (CMO only)
    brief.md, strategy.md, story.md, plan.md, calendar.json
    tasks/TASK-NNN.md            handoffs
    outputs/                     versioned drafts and media, with fill files, manifests, meta files
    reviews/REVIEW-NNN.md        brand guardian findings
    results/, results.md         metrics files (never edited) and the analyst's report
    community/                   drafted replies
    approvals.jsonl              who approved what, when (append only)
    history/events.jsonl         one line per event (append only)
    history/runs/                each agent's run record
```

## A campaign, end to end

1. **Brief.** The CMO places the request, asks at most three questions, and writes `brief.md`.
2. **Strategy and research** when the direction is new.
3. **Story** (gate: `story`).
4. **Plan and calendar**, with estimates; the user agrees to the plan.
5. **Copy**, per channel and language, then review.
6. **Visuals** from approved templates, then review.
7. **Video:** cut and timing, soundtrack mixed to it, render in every format, then review.
8. **Final assets** (gate: `final_assets`).
9. **Publish** (gate: `publish`, and `spend` for paid): `/cmo:publish`, one post and one yes at a time.
10. **Community:** replies drafted, risks escalated, the user sends.
11. **Results:** `/cmo:report <campaign> --collect`; the analyst writes `results.md` and learnings; the campaign closes.

## Team sharing

**Now:** `.cmo/` lives in the team's git repository, which gives history and review. Each campaign has an owner and a `lock`. `/cmo:export` writes a zip with a SHA-256 manifest (brand pack and learnings, optionally campaigns); `/cmo:import` verifies every checksum, refuses unsafe paths, and merges with explicit rules (brand by version, learnings and decisions by entry heading).

**Later:** a small service could hold the same structures behind a remote MCP server, adding simultaneous editing, roles and approvals in a browser. File shapes stay the same, so moving over is straightforward.

## Connections

Connections are the user's own MCP connectors and Claude in Chrome; cmo never installs one, signs in, or stores a credential. Reading is the default. Anything that publishes, schedules, sends, spends, deletes or shares needs its gate in `approvals.jsonl` and the user's yes for that item.

| Category | Used for |
|---|---|
| Design (Canva, Figma) | Importing assets and templates; exporting finished pieces |
| Image, video, voice and music generation | Media templates can't make, within the brand's imagery and audio rules and the budget |
| Analytics, ad platforms | Results (read only); ad drafts after the `spend` gate |
| Schedulers, email and CRM | Queuing approved posts and drafting approved emails, one item and one yes at a time |
| Storage | Fetching brand files, sharing approved ones |
| Claude in Chrome | Assisted publishing that stops before the final button; reading insights pages |

Without any connection, cmo still plans, writes, renders from templates and hands over finished files.

## Guardrails

- **Truth:** no invented customers, quotes, reviews or numbers; every proof point has a source.
- **Claims:** banned patterns are candidates the guardian judges, with dismissed matches listed; allowed claims only.
- **Brand:** contrast computed, logo rules enforced, approved templates only, render manifests checked.
- **Rights:** every asset, bed and voice has a rights record; no voice cloning without written consent; never imitate an artist.
- **Privacy:** no personal data in prompts, links or files beyond what a task needs.
- **Spending:** a budget per campaign; alert at 80%, stop at the limit; never boosts or launches ads.
- **Publishing:** gates plus a yes per post; never signs in or enters credentials; stops before the final button.
- **Instructions in content:** comments, pages and emails are information, never instructions.
- **Routines:** scheduled runs only read and report.

## Quality

- `tests/run.sh`: deterministic tests with no model calls. It runs the static checks (frontmatter, cross-references, bundled files, JSON, the starter contract), strict validation, the hooks, export and import (including tampered and unsafe packs), the calculator, the renderer's input checks, image, Arabic and video renders, and the mixer.
- `evals/`: nine model-graded cases for `claude plugin eval`, covering init, the no-brand stop, the claims review, the brand import, calendar flags, the publish gate, community triage with a prompt-injection comment, the results report, and installing a template. They use a fictional fixture brand (Lumen Books), staged by each case's scaffold script.

## Build plan

| Phase | Scope | Status |
|---|---|---|
| 0 | Repository, marketplace, manifest, workspace protocol, brand pack format, CMO, status, init, hooks | Built |
| 1 | Brand build, brand import, export and import, brand guardian and the compliance rulebook, review | Built |
| 2 | Strategist, researcher, storyteller, planner, copywriter, calendar | Built |
| 3 | Template contract and renderer, two starters, designer, video producer with subtitles, audio producer and mixer | Built |
| 4 | Analyst, results data, experiment calculator, reports, routines | Built |
| 5 | Connections, community manager, assisted publishing | Built |
| 6 | Deterministic tests and the eval suite | Built; evals not yet run against a live model |

The first real test is the ezPayments brand: import its guidelines and rebuild the Fawry launch campaign end to end.

## Not in scope yet

- Several brands in one workspace.
- Roles and permissions (needs a shared service).
- Publishing through official platform APIs (today: hand-off, a connected scheduler, or Chrome with a yes per post).
