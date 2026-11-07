#!/usr/bin/env node
// Static checks for the cmo plugin: frontmatter, cross-references, bundled files, JSON validity.
// Usage: node tests/check-plugin.mjs   (from the plugin root or anywhere)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = path.join(d, f);
  return statSync(p).isDirectory() ? (f === 'node_modules' || f === 'results' ? [] : walk(p)) : [p];
});
const files = walk(root);
const rel = (p) => path.relative(root, p);

function frontmatter(p) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(p, 'utf8'));
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

const skills = readdirSync(path.join(root, 'skills')).filter((d) => existsSync(path.join(root, 'skills', d, 'SKILL.md')));
const agents = readdirSync(path.join(root, 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'Skill', 'WebSearch', 'WebFetch'];

for (const s of skills) {
  const fm = frontmatter(path.join(root, 'skills', s, 'SKILL.md'));
  if (!fm) { problems.push(`skills/${s}: no frontmatter`); continue; }
  if (fm.name !== s) problems.push(`skills/${s}: name "${fm.name}" doesn't match the folder`);
  if (!fm.description || fm.description.length < 40) problems.push(`skills/${s}: description missing or too short`);
}
for (const a of agents) {
  const fm = frontmatter(path.join(root, 'agents', `${a}.md`));
  if (!fm) { problems.push(`agents/${a}: no frontmatter`); continue; }
  if (fm.name !== a) problems.push(`agents/${a}: name "${fm.name}" doesn't match the file`);
  if (!fm.description) problems.push(`agents/${a}: no description`);
  if (fm.color && !COLORS.includes(fm.color)) problems.push(`agents/${a}: color "${fm.color}" is not one of ${COLORS.join(', ')}`);
  for (const t of (fm.tools || '').split(',').map((x) => x.trim()).filter(Boolean))
    if (!TOOLS.includes(t)) problems.push(`agents/${a}: unexpected tool "${t}"`);
  if ((fm.tools || '').includes('Agent')) problems.push(`agents/${a}: agents must not start other agents`);
  const body = readFileSync(path.join(root, 'agents', `${a}.md`), 'utf8');
  if (/Bash|node "|ffmpeg/.test(body.split('---').slice(2).join('---')) && !(fm.tools || '').includes('Bash'))
    problems.push(`agents/${a}: runs commands but has no Bash tool`);
}

// Cross-references: cmo:<name>, ${CLAUDE_SKILL_DIR}/<file>, relative markdown links.
for (const f of files.filter((p) => p.endsWith('.md') && !rel(p).startsWith('tests/fixtures'))) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/`cmo:([a-z][a-z-]*)`/g)) {
    if (!skills.includes(m[1]) && !agents.includes(m[1])) problems.push(`${rel(f)}: cmo:${m[1]} is neither a skill nor an agent`);
  }
  for (const m of text.matchAll(/\/cmo:([a-z][a-z-]*)/g)) {
    if (!skills.includes(m[1])) problems.push(`${rel(f)}: /cmo:${m[1]} is not a skill`);
  }
  for (const m of text.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([\w./-]+)/g)) {
    if (!rel(f).startsWith('skills/')) problems.push(`${rel(f)}: \${CLAUDE_SKILL_DIR} used outside a skill`);
    else if (!existsSync(path.join(path.dirname(f), m[1]))) problems.push(`${rel(f)}: bundled file ${m[1]} not found`);
  }
  for (const m of text.matchAll(/\]\(([^)#:\s]+\.(md|json|mjs|sh))\)/g)) {
    if (!existsSync(path.join(path.dirname(f), m[1]))) problems.push(`${rel(f)}: link to ${m[1]} is broken`);
  }
  for (const m of text.matchAll(/```json\n([\s\S]*?)```/g)) {
    if (m[1].includes('...') || m[1].includes('/*')) continue;
    try { JSON.parse(m[1]); } catch (e) {
      if (!m[1].trim().split('\n').every((l) => { try { JSON.parse(l); return true; } catch { return false; } }))
        problems.push(`${rel(f)}: a json block doesn't parse (${e.message.slice(0, 60)})`);
    }
  }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) problems.push(`${rel(f)}: contains emoji`);
}

for (const f of files.filter((p) => p.endsWith('.json'))) {
  try { JSON.parse(readFileSync(f, 'utf8')); } catch (e) { problems.push(`${rel(f)}: invalid JSON (${e.message})`); }
}

// Starter templates follow the contract.
for (const t of readdirSync(path.join(root, 'skills/templates/starters'))) {
  const dir = path.join(root, 'skills/templates/starters', t);
  for (const need of ['template.json', 'index.html', 'example.json'])
    if (!existsSync(path.join(dir, need))) problems.push(`starter ${t}: ${need} missing`);
  const tpl = JSON.parse(readFileSync(path.join(dir, 'template.json'), 'utf8'));
  if (tpl.schema !== 'cmo.template/1' || tpl.id !== t) problems.push(`starter ${t}: schema or id wrong`);
  if (tpl.approved !== null) problems.push(`starter ${t}: starters ship unapproved (approved: null)`);
  const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
  if (tpl.kind === 'video' && !/window\.setTime\s*=/.test(html)) problems.push(`starter ${t}: no window.setTime`);
  if (/requestAnimationFrame|setTimeout|setInterval|transition:/.test(html)) problems.push(`starter ${t}: uses timers or CSS transitions`);
  if (/linear-gradient|radial-gradient/.test(html)) problems.push(`starter ${t}: uses a gradient`);
  if (/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org[^"']*/g, ''))) problems.push(`starter ${t}: loads something from the network`);
}

console.log(`skills: ${skills.length} (${skills.join(', ')})`);
console.log(`agents: ${agents.length} (${agents.join(', ')})`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('static checks: ok');
