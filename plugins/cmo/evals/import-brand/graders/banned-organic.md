---
type: regex
target: {source: file, path: .cmo/brand/claims.json}
pattern: '"banned"[\s\S]*organic'
flags: i
match: contains
---
