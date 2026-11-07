---
name: storytelling
description: How cmo turns a fact into a story — the story brief fields, which narrative structure fits which format, how one story becomes a video script, carousel, post and email, and the story bank rules. Used by the storyteller and by anyone writing from a story brief.
user-invocable: false
---

# Storytelling

A feature is a fact ("we added Fawry bill pay"). A story is why a person should care ("your life is abroad, but your bills are still in Egypt"). Every campaign gets a story before any content is written.

## 1. The story brief

`story.md` always has these fields, in this order:

| Field | What it holds | Rule |
|---|---|---|
| **Audience** | The one audience this story is for, from `audiences.md` | One audience per story. Two audiences need two stories |
| **Hero** | The customer, in their situation | Never the brand |
| **Problem** | What's in their way, and how it feels | Concrete and specific: a moment, not a category |
| **Stakes** | What it costs them if nothing changes | Honest, not fear-mongering |
| **Guide** | The brand: what it makes possible | The brand helps; the hero acts |
| **Plan** | The few steps the hero takes | Three steps or fewer |
| **Proof** | The fact that makes it believable | Must come from `claims.json` or a cited source |
| **Turning point** | The moment things change | One moment |
| **Call to action** | One next step | One per piece |
| **Ending** | What life looks like after | Specific, believable |
| **Core line** | The story in one sentence of 12 words or fewer | Becomes the headline or hook |
| **Tone** | Which register from `brand.json.voice.registers` | |

Below the fields, `story.md` has a section per format the campaign uses (section 3).

## 2. Structures by format

Pick the structure from the format. Name the structure you used in `story.md`.

| Format | Structure | Shape |
|---|---|---|
| Short video, 6–30 s | Hook, tension, resolution | First 2 s: the problem or a striking line. Middle: the plan and proof. End: the call to action, then the logo |
| Long video, 60 s+ | Three acts | Setup (hero and problem), confrontation (stakes, turning point), resolution (ending, call to action) |
| Post or ad | Before, after, bridge | Life before, life after, and the brand as the bridge |
| Carousel | One beat per slide | Slide 1 the hook; one idea per slide; last slide the call to action |
| Brand or founder story | Story spine | "Every day… until one day… because of that… because of that… until finally… and ever since…" |
| Short persuasive copy | And, but, therefore | "[Situation] and [more context], but [problem], therefore [what changes]" |
| Email | Problem, agitation, solution | Problem in the subject or first line, why it matters, the solution and one link |
| Customer story | Situation, complication, resolution | Real customer, real numbers, with consent (section 5) |

## 3. One story, many formats

From one brief, the storyteller writes a section for each format in the plan:
- **Video:** a beat sheet. One row per scene: time, what's on screen, the line of text, what the viewer should feel. This is what the video producer builds from.
- **Carousel:** one row per slide: the text and what the visual shows.
- **Post:** the angle (which beat leads) and the first line.
- **Email:** subject line ideas, the preview text, the order of the body.

The beats stay the same across formats; only their length changes. Never tell a different story in a different format of the same campaign.

## 4. Hooks

The first line or the first two seconds decide whether anyone stays. Strong hooks:
- name the hero's moment ("Your life abroad. Your bills in Egypt.");
- state a surprising, true fact from the proof;
- ask a question only the audience would answer yes to;
- show the "after" first, then rewind.

Weak hooks: the brand name first, a generic question ("Looking for a better way to pay?"), a feature list.

## 5. The story bank

`.cmo/brand/story-bank/` holds reusable stories, one file each:

```markdown
# <title>

- Type: founder | customer | milestone | mission | product
- Source: where the facts come from (interview, document, data)
- Consent: who agreed, when, for which uses, until when (customer stories only)
- Approved by: name, date
- Facts: the numbers and details that may be quoted

<the story, in the story brief fields>
```

Rules:
- Customer stories need consent recorded before use, and only for the uses listed. No consent, no story.
- Never invent a customer, a quote, a number or a result, and never make a composite look like one real person.
- A story bank entry is told the same way by every agent. Change it only through the brand pack, with a version bump.

## 6. Local stories

An Arabic (or any other language) version gets its own story check, not just translation:
- Is the hero's moment the same for this audience? (A diaspora audience and a home-market audience live different moments.)
- Do the stakes, the proof and the ending still hold?
- Are names, places, holidays and references local and right?

If the moment differs, write a separate brief for that audience.
