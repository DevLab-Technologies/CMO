---
name: calendar
description: Show the combined content calendar across every cmo campaign — what's publishing when, on which channel, in which language, and its status — with clashes, gaps and items not ready by their date. Can export a calendar file (.ics) for Google, Apple or Outlook calendars.
argument-hint: "[days ahead, default 14] [--ics]"
---

Show the content calendar. Arguments: **$ARGUMENTS**

Load the `cmo:protocol` skill (section 11 defines `calendar.json`). This command only reads campaign files; the one file it may write is the `.ics` export.

## Steps

1. Read every `.cmo/campaigns/*/calendar.json`. Skip campaigns whose `state.json` stage is `closed`, and items with status `cancelled`.
2. Keep items from today through the number of days given (default 14). Show each item in its calendar's timezone, and say which timezone that is.
3. Show one table, by date:

   | Date | Time | Channel | Placement | Language | Title | Campaign | Status | Owner |
   |---|---|---|---|---|---|---|---|---|

4. Below it, list what needs attention:
   - **Not ready:** items due within 3 days that aren't `approved` or later, with what's missing (copy, asset, review, approval).
   - **Clashes:** two or more items on the same channel on the same day, or two campaign launches in the same week aimed at the same audience.
   - **Gaps:** channels in an active campaign's plan with nothing scheduled for 7 days or more.
   - **Unowned:** items with no owner.
5. **With `--ics`:** write `.cmo/exports/calendar-<YYYYMMDD>.ics` containing one event per listed item:
   - the file starts `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//cmo//calendar//EN` and ends `END:VCALENDAR`; lines end with CRLF;
   - `UID`: `<campaign>-<item id>@cmo`, so re-importing updates events instead of duplicating them;
   - `DTSTAMP`: the export time in UTC (`YYYYMMDDTHHMMSSZ`);
   - `DTSTART`: the item's date and time converted from the calendar's timezone to UTC (`YYYYMMDDTHHMMSSZ`), so no timezone definition is needed; and `DURATION:PT15M`;
   - `SUMMARY`: `[<channel>] <title>`;
   - `DESCRIPTION`: campaign, status, owner, copy and asset paths, and the tagged link;
   - text values escape `\`, `;`, `,` and new lines (`\\`, `\;`, `\,`, `\n`), and lines longer than 75 octets are folded (a CRLF followed by one space).

   Tell the user how to import the file, and that it's a snapshot: re-export after the plan changes.

End with the single most urgent item.
