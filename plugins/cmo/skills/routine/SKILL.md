---
name: routine
description: Set up recurring cmo routines — a Monday calendar check, a weekly or monthly report, a results pull after each publication, a learnings review before planning — on the user's own scheduler, with the user's approval for each one. Use when the user wants marketing work to happen on a schedule.
argument-hint: "[list | add <routine> | remove <routine>]"
disable-model-invocation: true
---

Manage recurring routines. Arguments: **$ARGUMENTS**

Load the `cmo:protocol` skill. Routines only ever run read-and-report commands; nothing scheduled may publish, send, spend or approve. Those always wait for a person.

## The routines

| Routine | Runs | When (default) | Writes |
|---|---|---|---|
| `calendar-check` | `/cmo:calendar 14` | Mondays 09:00 | nothing; the report is the run's output |
| `weekly-report` | `/cmo:report weekly` | Mondays 10:00 | `.cmo/reports/` |
| `monthly-report` | `/cmo:report monthly` | 1st of the month 10:00 | `.cmo/reports/` |
| `results-pull` | `/cmo:report <campaign> --collect-only` for campaigns with publications in the last 7 days | Thursdays 10:00 | `results/` files and events only |
| `status` | `/cmo:status` | weekdays 09:00 | nothing |

Times are in the timezone of the user's calendar (`calendar.json.timezone`) unless they say otherwise.

## Steps

1. **`list`** (the default): show the routines above, which ones the user already has (from `.cmo/routines.json`), and when each last ran if the scheduler can say.
2. **`add <routine>`:**
   1. Show the user exactly what will run, when, in which folder, and that it only reads and reports.
   2. Find a scheduler available in this session, in this order: scheduled tasks (a `scheduled-tasks` or routine tool), the `/schedule` command for cloud routines (only if the project is in a git repository the cloud can reach; say that `.cmo/` must be committed for the cloud to see it), or `/loop` for the current session only. If none is available, give the user the command to run in their own scheduler (cron, launchd, Task Scheduler), from the project folder, with only the tools a read-and-report run needs:
      ```bash
      claude -p "/cmo:report weekly" --allowedTools "Read,Glob,Grep,Skill,Write(.cmo/**)"
      ```
      For `results-pull`, add only the read tools of the user's analytics connector by name (for example `mcp__ga4__run_report`). Never suggest `--dangerously-skip-permissions` or allowing a connector's write tools for a routine: a scheduled run reads comments and pages no one has checked.
   3. Only after the user says yes, create it, and record it in `.cmo/routines.json` (`{"routines":[{"name","command","schedule","scheduler","id","created_by","created_at"}]}`) and a `decisions.md` entry.
3. **`remove <routine>`:** confirm, remove it from the scheduler, and update `routines.json`.

A scheduled run has no one to answer questions: routines must never be ones that ask (no `/cmo` production runs, no approvals). If a routine's run finds something that needs a person (an item due with no approval), it says so at the top of its output.
