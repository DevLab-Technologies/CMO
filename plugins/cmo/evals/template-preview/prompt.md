---
name: template-preview
tags: [render]
runs: 1
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, Agent]
---

/cmo:templates install headline-card

(This case needs the renderer installed: `npm install --prefix ~/.cmo/render playwright-core`, Chrome, and network access for web fonts.)
