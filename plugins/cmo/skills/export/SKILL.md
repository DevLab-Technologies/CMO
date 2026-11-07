---
name: export
description: Export the cmo context — the brand pack, learnings and decisions, and optionally campaigns — as a verified zip a teammate can import with /cmo:import.
argument-hint: "[--with-campaigns] [output.zip]"
disable-model-invocation: true
---

Export the cmo workspace for a teammate. Arguments: **$ARGUMENTS**

## Steps

1. No `.cmo/brand/brand.json`: stop. There's nothing to share without a brand pack.
2. If `--with-campaigns` was given, warn the user before packing that campaign outputs can be large (video, images) and may contain unreleased work, and confirm they want it included.
3. From the project root, run:
   ```bash
   "${CLAUDE_SKILL_DIR}/pack.sh" $ARGUMENTS
   ```
   The script copies the brand pack (without older versions in `brand/previous/`), `learnings/`, `decisions.md` and, if asked, `campaigns/`. It writes a `manifest.json` with the brand name and version, who exported it and when, and a SHA-256 checksum for every file, then zips it. It never includes `agent-runs.jsonl`.
4. Report the file path, the brand version, the file count, and whether campaigns are included.
5. Remind the user:
   - the teammate runs `/cmo:import <file>` in their project;
   - for ongoing team work, committing `.cmo/` to a shared git repository is better than passing zips around, because git keeps one history;
   - the pack contains the brand's claims rules and possibly unreleased campaigns, so share it only with the team.

Needs `zip` (standard on macOS and Linux). On Windows, run it from WSL or Git Bash.
