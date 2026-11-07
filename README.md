# cmo

A chief marketing officer for Claude Code. It turns a business goal into a strategy, campaigns, stories, copy, images, video and audio through specialist agents. Every output is checked against your brand and approved by you before it goes anywhere.

`cmo` is a working name while the plugin is being tested.

## What it does

- **Learns your brand:** imports your guidelines, or builds a brand pack with you through an interview. Every agent works from it.
- **Runs campaigns:** strategy, research, the story, a plan with a calendar and budget, then copy in each language and channel.
- **Makes the media:** fills approved templates to render posts, carousels and videos in 9:16, 4:5, 1:1 and 16:9 from one source, with subtitles and your sound logo.
- **Checks everything:** a brand guardian reviews every piece for truth, banned claims, brand rules, contrast, accessibility and rights.
- **Waits for you:** approval gates for the story, the final assets, publishing and spend. It publishes only with your yes for each post.
- **Learns:** reads results honestly, runs experiment readouts, and records what worked for the next campaign.
- **Works as a team:** everything lives in `.cmo/` in your repository, and a verified export lets you share it with a teammate.

New to it? Start with the [user guide](docs/user-guide.md).

## Try it locally

From the project you want to market:

```bash
claude --plugin-dir ~/Dev/cmo/plugins/cmo
```

Then in the session:

```text
/cmo:init
/cmo:brand-import path/to/brand-guidelines.pdf      or  /cmo:brand-build
/cmo:templates check                                is rendering ready on this computer
/cmo:templates install headline-card                preview a starter with your brand
/cmo:cmo launch our new feature to existing customers
/cmo:status
```

After editing the plugin, run `/reload-plugins` in the session.

### Rendering images and video

Templates render with Node.js 18+, Playwright, Chrome and ffmpeg (ffmpeg is for video only). `/cmo:templates check` reports what's missing. The usual setup on a Mac:

```bash
npm install --prefix ~/.cmo/render playwright-core
```

```bash
brew install ffmpeg
```

Without rendering, cmo still plans, writes and reviews; visual tasks stop and say what's needed.

## Install from this marketplace

```bash
claude plugin marketplace add ~/Dev/cmo
```

```bash
claude plugin install cmo@devlab-cmo
```

## Test

Deterministic tests, with no model calls (about two minutes with rendering):

```bash
sh plugins/cmo/tests/run.sh
```

Model-graded evals (these use your Claude usage; `--scaffold` runs the cases' own setup scripts, which stage a fictional brand):

```bash
cd plugins/cmo && claude plugin eval . --trust-plugin --scaffold --no-publish --allow-tools Write Edit Bash --threshold 0.8
```

Run one group with `--tag smoke` (or `guardrail`, `brand`, `planning`, `measurement`, `community`, `render`). The `render` case needs Playwright installed as above.

Validate the manifests:

```bash
claude plugin validate ~/Dev/cmo && claude plugin validate ~/Dev/cmo/plugins/cmo --strict
```

## How it works

- **The brand pack** in `.cmo/brand/` is the source of truth: `guidelines.md`, `brand.json`, `claims.json`, assets with rights records, and approved templates.
- **The CMO** (`/cmo:cmo`) is the only orchestrator. It turns a request into a campaign with tasks, starts specialist agents, sends every output to the brand guardian, and stops for your approval at each gate.
- **Agents communicate through files** in `.cmo/campaigns/<slug>/`: task files, versioned outputs, reviews and an append-only event log. Anyone on the team can resume a campaign from disk.
- **People approve, agents propose.** Nothing is published, scheduled, sent or paid for without your explicit yes.

The full design is in [docs/architecture.md](docs/architecture.md). The contract every agent follows is in [the protocol skill](plugins/cmo/skills/protocol/SKILL.md), and the template format is in [the template contract](plugins/cmo/skills/templates/contract.md).

## Layout

```
.claude-plugin/marketplace.json     the marketplace (devlab-cmo)
docs/
  architecture.md                   the design
  user-guide.md                     how to use it, step by step
plugins/cmo/
  .claude-plugin/plugin.json        the plugin manifest
  skills/                           commands (/cmo:<name>) and shared knowledge
    cmo/            /cmo:cmo            the orchestrator
    init/           /cmo:init           set up .cmo/
    status/         /cmo:status         where everything stands
    brand-build/    /cmo:brand-build    build a brand pack by interview
    brand-import/   /cmo:brand-import   import existing guidelines
    templates/      /cmo:templates      templates, render.mjs, contract.md, starters/
    review/         /cmo:review         check any file with the brand guardian
    calendar/       /cmo:calendar       combined calendar, clashes, .ics export
    publish/        /cmo:publish        publish approved posts, a yes per post
    report/         /cmo:report         campaign results and weekly or monthly reports
    routine/        /cmo:routine        recurring read-and-report routines
    connections/    /cmo:connections    what's connected and the rules for it
    export/         /cmo:export         pack the context for a teammate (pack.sh)
    import/         /cmo:import         verify and merge a teammate's pack (verify-pack.sh)
    protocol/                           the workspace contract (agents)
    brand-pack/                         the brand pack format and guidelines template (agents)
    compliance/                         the review rulebook (agents)
    storytelling/                       story brief, structures, story bank (agents)
    channels/                           platform sizes, limits and practice (agents)
    measurement/                        metrics, experiments (abtest.mjs), results data (agents)
    audio/                              sound logo, beds, voice-over, loudness, mix.mjs (agents)
  agents/                           strategist, researcher, storyteller, planner, copywriter,
                                    designer, video-producer, audio-producer, brand-guardian,
                                    analyst, community-manager
  hooks/hooks.json                  session summary, automatic agent log
  scripts/                          hook scripts (POSIX sh)
  tests/                            run.sh, check-plugin.mjs, fixtures (fictional brand)
  evals/                            model-graded cases for claude plugin eval
```
