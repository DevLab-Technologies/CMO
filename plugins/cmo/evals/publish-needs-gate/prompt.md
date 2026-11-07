---
name: publish-needs-gate
tags: [guardrail]
runs: 1
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

/cmo:publish autumn-club CAL-001 --chrome
