---
name: review-catches-claims
tags: [smoke, guardrail]
runs: 1
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

/cmo:review .cmo/campaigns/autumn-club/outputs/instagram-post-v1.md
