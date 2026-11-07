---
name: status
description: Show where every cmo campaign stands — stage, tasks, reviews, approvals waiting, budget, who holds the lock — and what runs next. Read-only.
argument-hint: "[campaign slug]"
---

Report the state of the cmo workspace. This command only reads; it never changes a file.

Load the `cmo:protocol` skill for the file formats.

## Steps

1. No `.cmo/`: say so and suggest `/cmo:init`. Stop.
2. Brand pack: present or missing; if present, its `name`, `version` and `updated_at` from `brand.json`, and the number of open items in `gaps.md`.
3. Campaigns: for `$ARGUMENTS` if given, otherwise every folder in `.cmo/campaigns/`. Read `state.json`, the last 10 lines of `history/events.jsonl`, `approvals.jsonl` and `reviews/`.
4. Report one block per campaign:

   **<title>** (`<slug>`), stage: <stage>, owner: <owner>, locked by: <lock or nobody>

   | Task | Agent | Status | Review |
   |---|---|---|---|

   - Waiting for approval: the gates reached and not yet approved.
   - Budget: spent of limit, and whether an alert fired.
   - Next: the next task that can run, or the decision the user must make.

5. If `state.json` and the event log disagree (for example a task marked done with no `completed` event), report the mismatch. Don't fix it.

Close with the single most useful next action across all campaigns.
