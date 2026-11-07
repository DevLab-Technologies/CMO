---
name: import-brand
tags: [brand]
runs: 1
max_turns: 40
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

/cmo:brand-import acme-guidelines.md

If you need to ask me anything, assume the defaults you would suggest and continue.
