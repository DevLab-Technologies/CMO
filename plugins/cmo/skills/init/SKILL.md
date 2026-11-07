---
name: init
description: Set up the cmo workspace (.cmo/) in the current project, then point the user to building or importing their brand.
---

Set up the cmo workspace in this project. Load the `cmo:protocol` skill first; it defines every path below.

## Steps

1. If `.cmo/` already exists, don't overwrite anything. Report what's there (brand pack present or missing, number of campaigns) and stop.
2. Create:
   ```
   .cmo/
     brand/assets/
     brand/templates/
     brand/story-bank/
     learnings/learnings.md
     decisions.md
     campaigns/
   ```
   - `learnings.md` starts with the heading `# Learnings` and one line: "What worked and what didn't, with evidence. Newest last. Each entry starts `## YYYY-MM-DD: title`."
   - `decisions.md` starts with the heading `# Decisions` and one line: "Decisions and why. Newest last. Each entry starts `## YYYY-MM-DD: title`."
   - `brand/assets/rights.json` starts as `[]`.
3. If the project is a git repository, tell the user that `.cmo/` should be committed so the team shares one history, and that large media in `campaigns/*/outputs/` may belong in Git LFS or shared storage instead.
4. Tell the user the next step:
   - `/cmo:brand-import <file or URL>` if they already have brand guidelines;
   - `/cmo:brand-build` to create a brand pack through a short interview.

Report exactly what you created.
