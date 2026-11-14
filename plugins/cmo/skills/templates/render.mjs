#!/usr/bin/env node
// cmo template renderer. Renders a cmo.template/1 template with a brand pack and a fill file
// into PNG (image templates) or MP4 + SRT + poster (video templates), one file per format.
//
//   node render.mjs --check                                   is rendering ready on this computer
//   node render.mjs --hash --template <dir>                   the template's content hash (for approval)
//   node render.mjs --brand .cmo/brand --template <dir> --data <fill.json> --info
//                                                            timing per format, without rendering
//   node render.mjs --brand .cmo/brand --template <dir> --data <fill.json> --out <dir/name>
//                   [--formats 9x16,1x1] [--audio <file>] [--loudness -14|off] [--fps 30]
//                   [--force] [--keep-frames]
//
// Needs Node 18+, playwright or playwright-core, Chrome or Chromium, and ffmpeg (video only).
// Exit codes: 0 ok, 1 render failed, 2 bad input, 3 missing dependency.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir, platform } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SETUP = 'npm install --prefix ~/.cmo/render playwright-core';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur'];
// Tokens every template may fall back to; other grounds are checked against the fill.
const BASE_GROUNDS = ['signature', 'dark', 'light'];

// ---------- arguments ----------
function fail(code, msg) {
  console.error(`error: ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  const a = { formats: null, fps: null, keepFrames: false, check: false, info: false, hash: false, force: false, loudness: '-14' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) fail(2, `${k} needs a value`);
      return argv[++i];
    };
    if (k === '--check') a.check = true;
    else if (k === '--hash') a.hash = true;
    else if (k === '--info') a.info = true;
    else if (k === '--force') a.force = true;
    else if (k === '--keep-frames') a.keepFrames = true;
    else if (k === '--brand') a.brand = v();
    else if (k === '--template') a.template = v();
    else if (k === '--data') a.data = v();
    else if (k === '--out') a.out = v();
    else if (k === '--audio') a.audio = v();
    else if (k === '--loudness') a.loudness = v();
    else if (k === '--formats') {
      a.formats = v().split(',').map((s) => s.trim()).filter(Boolean);
      if (!a.formats.length) fail(2, '--formats is empty');
    } else if (k === '--fps') {
      a.fps = Number(v());
      if (!Number.isInteger(a.fps) || a.fps < 1 || a.fps > 60) fail(2, '--fps must be a whole number from 1 to 60');
    } else fail(2, `Unknown argument: ${k}`);
  }
  if (a.loudness !== 'off' && !(Number(a.loudness) < 0)) fail(2, '--loudness must be a negative LUFS value (for example -14) or off');
  return a;
}

// ---------- dependencies ----------
function loadPlaywright() {
  const bases = [];
  if (process.env.CMO_PLAYWRIGHT) bases.push(path.resolve(process.env.CMO_PLAYWRIGHT));
  bases.push(process.cwd());
  bases.push(path.join(homedir(), '.cmo', 'render'));
  for (const base of bases) {
    const req = createRequire(path.join(base, 'package.json'));
    for (const name of ['playwright', 'playwright-core']) {
      try {
        return { mod: req(name), from: path.dirname(req.resolve(`${name}/package.json`)) };
      } catch {
        /* try the next location */
      }
    }
  }
  return null;
}

function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env) return existsSync(env) ? env : null;
  const candidates = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
    ],
  }[platform()] || [];
  return candidates.find((p) => existsSync(p)) || null;
}

function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] : null;
}

async function launch(pw) {
  const chrome = findChrome();
  try {
    return await pw.mod.chromium.launch(chrome ? { executablePath: chrome } : {});
  } catch (e) {
    fail(3, `Couldn't start a browser (${e.message.split('\n')[0]}). Install Google Chrome or set CHROME_PATH.`);
  }
}

async function check() {
  const major = Number(process.versions.node.split('.')[0]);
  const pw = loadPlaywright();
  const ff = hasFfmpeg();
  let browser = null;
  if (pw) {
    try {
      const chrome = findChrome();
      const b = await pw.mod.chromium.launch(chrome ? { executablePath: chrome } : {});
      browser = `${chrome || 'Playwright Chromium'} (${b.version()})`;
      await b.close();
    } catch {
      browser = null;
    }
  }
  const rows = [
    ['Node.js 18+', major >= 18, `v${process.versions.node}`, 'Install Node.js 18 or newer from nodejs.org'],
    ['Playwright', !!pw, pw ? pw.from : 'not found', SETUP],
    ['A browser that starts', !!browser, browser || (pw ? 'none could be started' : 'not checked without Playwright'), 'Install Google Chrome, or set CHROME_PATH'],
    ['ffmpeg (video only)', !!ff, ff || 'not found', platform() === 'darwin' ? 'brew install ffmpeg' : 'Install ffmpeg from ffmpeg.org'],
  ];
  for (const [name, ok, detail, fix] of rows) {
    console.log(`${ok ? 'ok     ' : 'missing'}  ${name}: ${detail}${ok ? '' : `\n         fix: ${fix}`}`);
  }
  const images = major >= 18 && !!pw && !!browser;
  console.log(`\nimages: ${images ? 'ready' : 'not ready'}   video: ${images && ff ? 'ready' : 'not ready'}`);
  process.exit(images ? 0 : 3);
}

// ---------- template hash (approval binds to content) ----------
function templateHash(dir) {
  const h = createHash('sha256');
  const walk = (d) => readdirSync(d).sort().flatMap((f) => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  for (const f of walk(dir)) {
    const r = path.relative(dir, f).split(path.sep).join('/');
    if (r === 'example.json' || r.endsWith('.DS_Store')) continue;
    let content = readFileSync(f);
    if (r === 'template.json') {
      const t = JSON.parse(content.toString('utf8'));
      delete t.approved;
      content = Buffer.from(JSON.stringify(t));
    }
    h.update(`${r}\0`).update(content).update('\0');
  }
  return h.digest('hex');
}

// ---------- brand and template ----------
function readJson(p, what) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(2, `Can't read ${what} at ${p}: ${e.message}`);
  }
}

// List items may vary by a discriminator, e.g. { "by": "type", "variants": { "hook": {...} } }.
function itemSlots(items, item) {
  if (items.by && items.variants) {
    const by = { [items.by]: { type: 'enum', required: true, values: Object.keys(items.variants) } };
    const variant = items.variants[item?.[items.by]];
    return variant ? { ...by, ...variant } : by;
  }
  return items;
}

function validate(slots, data, where, notes) {
  const errors = [];
  for (const key of Object.keys(data || {})) {
    if (!(key in (slots || {}))) notes.push(`${where}${key} is not a slot of this template and was ignored`);
  }
  for (const [key, spec] of Object.entries(slots || {})) {
    const v = data?.[key];
    const at = `${where}${key}`;
    if (v === undefined || v === null || v === '') {
      if (spec.required) errors.push(`${at} is required`);
      continue;
    }
    switch (spec.type) {
      case 'text':
        if (typeof v !== 'string') errors.push(`${at} must be text`);
        else if (spec.max_chars && [...v].length > spec.max_chars)
          errors.push(`${at} is ${[...v].length} characters; the limit is ${spec.max_chars}`);
        break;
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`${at} must be a number`);
        else if (spec.min !== undefined && v < spec.min) errors.push(`${at} must be at least ${spec.min}`);
        break;
      case 'enum':
        if (!spec.values?.includes(v)) errors.push(`${at} must be one of ${spec.values?.join(', ')}`);
        break;
      case 'image':
        if (typeof v !== 'string' || !existsSync(path.resolve(v))) errors.push(`${at}: image not found at ${v}`);
        break;
      case 'list':
        if (!Array.isArray(v)) errors.push(`${at} must be a list`);
        else {
          if (spec.min && v.length < spec.min) errors.push(`${at} needs at least ${spec.min} items`);
          if (spec.max && v.length > spec.max) errors.push(`${at} allows at most ${spec.max} items`);
          if (spec.items) {
            v.forEach((item, i) => {
              if (item && typeof item === 'object' && !Array.isArray(item))
                errors.push(...validate(itemSlots(spec.items, item), item, `${at}[${i}].`, notes));
              else if (spec.items.by) errors.push(`${at}[${i}] must be an object`);
            });
          }
        }
        break;
      case 'object':
        if (typeof v !== 'object' || Array.isArray(v)) errors.push(`${at} must be an object`);
        else if (spec.keys) errors.push(...validate(spec.keys, v, `${at}.`, notes));
        break;
      default:
        break;
    }
  }
  return errors;
}

// Every "ground" value anywhere in the fill.
function groundsIn(v, out = new Set()) {
  if (Array.isArray(v)) v.forEach((x) => groundsIn(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === 'ground' && typeof x === 'string') out.add(x);
      else groundsIn(x, out);
    }
  }
  return out;
}

function single(v) {
  return typeof v === 'number' || (typeof v === 'string' && /^-?[\d.]+(em|px)?$/.test(v.trim())) ? v : null;
}

function fontsFor(typo, language) {
  const ar = language === 'ar';
  const pick = (a, b) => (ar && typo?.[a]?.family ? typo[a] : typo?.[b]) || null;
  return { display: pick('arabic_display', 'display'), text: pick('arabic_text', 'text'), mono: typo?.mono || null };
}

// typography.<role>.files: ["assets/fonts/x.woff2"] or [{ "path": "...", "weight": 700, "style": "normal" }].
function fontCss(fonts, brandDir, warnings) {
  const faces = [];
  const google = new Set();
  for (const role of Object.values(fonts)) {
    if (!role?.family) continue;
    if (Array.isArray(role.files) && role.files.length) {
      for (const entry of role.files) {
        const f = typeof entry === 'string' ? { path: entry } : entry || {};
        const abs = f.path ? path.resolve(brandDir, f.path) : null;
        if (!abs || !existsSync(abs)) {
          warnings.push(`font file not found: ${f.path}`);
          continue;
        }
        const weight = f.weight ? `font-weight:${f.weight};` : '';
        const style = f.style ? `font-style:${f.style};` : '';
        faces.push(`@font-face{font-family:"${role.family}";src:url("${pathToFileURL(abs).href}");${weight}${style}font-display:block}`);
      }
    } else google.add(role.family);
  }
  const link = google.size
    ? `https://fonts.googleapis.com/css2?${[...google].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700;800;900`).join('&')}&display=block`
    : null;
  return { faces: faces.join('\n'), link };
}

function rootCss(size, safe, brand, fonts) {
  const short = Math.min(size[0], size[1]);
  const ratio = typeof brand.layout?.margin_ratio === 'number' ? brand.layout.margin_ratio : 0.08;
  const margin = Math.round(short * ratio);
  const logoH = Math.round(short * 0.04);
  const ratios = brand.typography?.ratios || {};
  const h2l = typeof ratios.headline_to_logo === 'number' ? ratios.headline_to_logo : 2.5;
  const s2h = typeof ratios.subhead_to_headline === 'number' ? ratios.subhead_to_headline : 0.5;
  const fam = (r, fallback) => (r?.family ? `"${r.family}", ${fallback}` : fallback);
  const vars = {
    '--w': `${size[0]}px`, '--h': `${size[1]}px`,
    '--safe-top': `${safe.top}px`, '--safe-bottom': `${safe.bottom}px`, '--safe-left': `${safe.left}px`, '--safe-right': `${safe.right}px`,
    '--margin': `${margin}px`, '--logo-h': `${logoH}px`,
    '--headline': `${Math.round(logoH * h2l)}px`, '--subhead': `${Math.round(logoH * h2l * s2h)}px`,
    '--font-display': fam(fonts.display, 'system-ui, sans-serif'),
    '--font-text': fam(fonts.text, 'system-ui, sans-serif'),
    '--font-mono': fam(fonts.mono, 'ui-monospace, monospace'),
  };
  const dw = single(fonts.display?.weight);
  if (dw) vars['--display-weight'] = String(dw);
  const dt = single(fonts.display?.tracking);
  if (dt) vars['--display-tracking'] = String(dt);
  for (const [k, v] of Object.entries(brand.tokens || {})) if (v) vars[`--${k.replace(/_/g, '-')}`] = v;
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}

function logoUrls(brand, brandDir) {
  const out = {};
  for (const [k, r] of Object.entries(brand.logo?.files || {})) {
    const abs = r ? path.resolve(brandDir, r) : null;
    out[k] = abs && existsSync(abs) ? pathToFileURL(abs).href : null;
  }
  return out;
}

// "bottom-right (top-right when needed)" -> "end" for rtl, "start"/"end" relative to the direction.
function logoSide(placement, direction) {
  const text = String((placement && (placement[direction] || placement.ltr)) || '').toLowerCase();
  const right = /right/.test(text);
  const left = /left/.test(text);
  if (!right && !left) return 'start';
  const physical = right && !left ? 'right' : 'left';
  return (direction === 'rtl') === (physical === 'right') ? 'start' : 'end';
}

function rel(p) {
  const r = path.relative(process.cwd(), p);
  return r.startsWith('..') ? p : r;
}

// ---------- audio ----------
function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

function mediaLength(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number((r.stdout || '').trim());
  return d > 0 ? d : null;
}

function measureLoudness(file) {
  const r = spawnSync('ffmpeg', ['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = r.stderr || '';
  const tail = text.slice(text.lastIndexOf('Summary:'));
  const i = /I:\s*(-?[\d.]+) LUFS/.exec(tail);
  const p = /Peak:\s*(-?[\d.]+|-inf) dBFS/.exec(tail);
  return i ? { integrated_lufs: Number(i[1]), true_peak_dbtp: p && p[1] !== '-inf' ? Number(p[1]) : null } : null;
}

// The video's length always wins: short audio is padded with silence, long audio is cut.
function encode(frames, fps, audio, duration, loudness, out) {
  const a = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, '%05d.png')];
  if (audio) a.push('-i', audio);
  a.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p');
  if (audio) {
    const filters = loudness === 'off' ? 'apad' : `loudnorm=I=${loudness}:TP=-1:LRA=11,apad`;
    a.push('-af', filters, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k');
  }
  a.push('-t', String(duration), '-movflags', '+faststart', out);
  return run('ffmpeg', a);
}

// ---------- subtitles ----------
// At most 2 lines of 42 characters per cue. A long caption is split into balanced cues, so no
// cue is a two-word orphan, with the time shared by length. Cues over 17 characters a second are reported.
const LINE = 42;
function wrap(words) {
  const lines = [];
  for (const word of words) {
    const cur = lines[lines.length - 1];
    if (cur !== undefined && `${cur} ${word}`.length <= LINE) lines[lines.length - 1] = `${cur} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function balancedChunks(words) {
  const total = words.join(' ').length;
  for (let k = Math.max(1, Math.ceil(wrap(words).length / 2)); k <= words.length; k++) {
    const target = total / k;
    const groups = [[]];
    let len = 0;
    for (const w of words) {
      const g = groups[groups.length - 1];
      if (g.length && len + w.length / 2 > target * groups.length && groups.length < k) {
        groups.push([w]);
      } else g.push(w);
      len += w.length + 1;
    }
    const wrapped = groups.map(wrap);
    if (wrapped.every((l) => l.length <= 2)) return wrapped;
  }
  return [wrap(words)];
}

function cues(captions, warn) {
  const out = [];
  for (const c of captions) {
    if (!c || typeof c.text !== 'string' || !c.text.trim() || !(c.end > c.start)) continue;
    const chunks = balancedChunks(c.text.trim().split(/\s+/));
    const total = chunks.reduce((n, ch) => n + ch.join(' ').length, 0);
    let t = c.start;
    for (const ch of chunks) {
      const d = ((c.end - c.start) * ch.join(' ').length) / total;
      const cps = ch.join(' ').length / d;
      if (cps > 17) warn(`subtitle "${ch.join(' ').slice(0, 40)}" runs at ${cps.toFixed(0)} characters a second (aim for 17 or fewer)`);
      out.push({ start: t, end: t + d, lines: ch });
      t += d;
    }
  }
  return out;
}

function srtTime(s) {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

function srt(captions, warn) {
  return cues(captions, warn)
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.lines.join('\n')}\n`)
    .join('\n');
}

// ---------- main ----------
const args = parseArgs(process.argv.slice(2));
if (args.check) await check();
if (args.hash) {
  if (!args.template) fail(2, '--hash needs --template');
  console.log(templateHash(path.resolve(args.template)));
  process.exit(0);
}
for (const k of ['brand', 'template', 'data']) if (!args[k]) fail(2, `--${k} is required (or use --check)`);
if (!args.info && !args.out) fail(2, '--out is required (or use --info)');

const brandDir = path.resolve(args.brand);
const tplDir = path.resolve(args.template);
const brand = readJson(path.join(brandDir, 'brand.json'), 'brand.json');
const tpl = readJson(path.join(tplDir, 'template.json'), 'template.json');
const data = readJson(path.resolve(args.data), 'the fill file');
if (tpl.schema !== 'cmo.template/1') fail(2, `${tplDir} is not a cmo.template/1 template`);
if (!existsSync(path.join(tplDir, 'index.html'))) fail(2, `${tplDir}/index.html is missing`);
if (!['image', 'video'].includes(tpl.kind)) fail(2, `Unknown template kind: ${tpl.kind}`);

const warnings = [];
const warn = (w) => { if (!warnings.includes(w)) warnings.push(w); };

// Formats: the ones asked for, or every template format the brand defines.
const brandFormats = Object.keys(brand.formats || {}).filter((f) => brand.formats[f]?.size);
let formats;
if (args.formats) {
  const bad = args.formats.filter((f) => !tpl.formats.includes(f) || !brandFormats.includes(f));
  if (bad.length)
    fail(2, `Format ${bad.join(', ')} is not supported by the template or not defined in brand.json.formats (template: ${tpl.formats.join(', ')}; brand: ${brandFormats.join(', ') || 'none'})`);
  formats = args.formats;
} else {
  formats = tpl.formats.filter((f) => brandFormats.includes(f));
  const skipped = tpl.formats.filter((f) => !brandFormats.includes(f));
  if (!formats.length) fail(2, `brand.json.formats defines none of the template's formats (${tpl.formats.join(', ')})`);
  if (skipped.length) warn(`skipped ${skipped.join(', ')}: not defined in brand.json.formats`);
}

// Tokens: the template's base set, plus the pair for every ground the fill uses.
const needed = new Set(tpl.brand_tokens || []);
for (const g of groundsIn(data)) {
  needed.add(g);
  needed.add(`on_${g}`);
}
const missingTokens = [...needed].filter((t) => !brand.tokens?.[t]);
if (missingTokens.length) fail(2, `brand.json.tokens is missing ${missingTokens.join(', ')}, which this fill needs; fill the tokens or use another ground`);

const notes = [];
const errors = validate(tpl.slots, data, '', notes);
const direction = data.direction || 'ltr';
if (tpl.directions && !tpl.directions.includes(direction)) errors.push(`direction ${direction} is not supported by this template`);
if (errors.length) fail(2, `The fill file doesn't match the template:\n  - ${errors.join('\n  - ')}`);
notes.forEach(warn);
const language = data.language || brand.languages?.[0] || 'en';
if (RTL_LANGUAGES.includes(language) && direction !== 'rtl') warn(`language is ${language} but direction is ${direction}; set "direction": "rtl"`);

// Approval binds to the template's content.
const hash = templateHash(tplDir);
const approvedOk = !!tpl.approved && tpl.approved.sha256 === hash;
if (tpl.approved && !approvedOk) warn('the template changed since it was approved (content hash differs); it counts as unapproved until it is approved again');

// Never overwrite an output unless asked.
const outBase = args.out ? path.resolve(args.out) : null;
if (outBase && !args.force && existsSync(path.dirname(outBase))) {
  const base = path.basename(outBase);
  const clash = readdirSync(path.dirname(outBase)).filter((f) => f === `${base}.render.json` || (f.startsWith(`${base}-`) && /\.(png|mp4|srt)$/.test(f)));
  if (clash.length) fail(2, `Outputs already exist for ${rel(outBase)} (${clash.slice(0, 3).join(', ')}${clash.length > 3 ? ', ...' : ''}). Use a new version name, or --force for previews.`);
}

if (args.audio && !existsSync(path.resolve(args.audio))) fail(2, `Audio file not found: ${args.audio}`);
const pw = loadPlaywright();
if (!pw) fail(3, `Playwright not found. Install it with:\n  ${SETUP}`);
if (tpl.kind === 'video' && !args.info && !hasFfmpeg()) fail(3, 'ffmpeg not found; it is needed for video. Install it (macOS: brew install ffmpeg).');

const fonts = fontsFor(brand.typography, language);
const css = fontCss(fonts, brandDir, warnings);
const logo = logoUrls(brand, brandDir);
const fps = args.fps || tpl.fps || 30;
if (!logo.black && !logo.white) warn('No logo file found in brand.json.logo.files; the logo was left out.');

// The page is a copy of index.html with the brand injected at the top of <head>, so CSS variables
// and window.CMO exist before any template script runs. <base> keeps the template's relative paths.
const pageDir = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'cmo-page-'));
const templateHtml = readFileSync(path.join(tplDir, 'index.html'), 'utf8');
function pageFor(format, page) {
  const size = brand.formats[format].size;
  const s = brand.formats[format].safe || {};
  const safe = { top: s.top || 0, bottom: s.bottom || 0, left: s.left || 0, right: s.right || 0 };
  const cmo = {
    format, size, safe, direction, language, page, data,
    root: `${pathToFileURL(process.cwd()).href}/`,
    brand: {
      name: brand.name, version: brand.version, tokens: brand.tokens, typography: brand.typography,
      ratios: brand.typography?.ratios || {}, logo, logo_side: logoSide(brand.logo?.placement, direction),
      gradients: brand.gradients ?? false, layout: brand.layout || null,
      signature_device: brand.signature_device || null, motion: brand.motion || null,
    },
  };
  const json = JSON.stringify(cmo).replace(/</g, '\\u003c');
  const head = [
    `<base href="${pathToFileURL(tplDir).href}/">`,
    css.link ? `<link rel="stylesheet" href="${css.link}" id="cmo-fonts">` : '',
    `<style id="cmo-brand">${css.faces}\n${rootCss(size, safe, brand, fonts)}</style>`,
    `<script>window.CMO=${json};</script>`,
  ].join('\n');
  let html = templateHtml.replace(/<html([^>]*)>/i, `<html$1 dir="${direction}" lang="${language}">`);
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>\n${head}`) : `${head}\n${html}`;
  const file = path.join(pageDir, `${format}-${page}.html`);
  writeFileSync(file, html);
  return file;
}

const browser = await launch(pw);
const files = [];
let failed = false;

async function openPage(format, page) {
  const size = brand.formats[format].size;
  const p = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  // Templates may load local files and the brand's web fonts, nothing else.
  await p.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.protocol === 'file:' || u.protocol === 'data:' || FONT_HOSTS.includes(u.hostname)) return route.continue();
    warn(`${format}: blocked a request to ${u.hostname || u.protocol} (templates may only load local files and web fonts)`);
    return route.abort();
  });
  p.on('console', (m) => {
    const t = m.text();
    if (!t.startsWith('cmo:')) return;
    const line = `${format}${page ? ` p${page + 1}` : ''}: ${t.slice(4).trim()}`;
    if (m.type() === 'error') {
      failed = true;
      console.error(`template error: ${line}`);
    }
    warn(line);
  });
  p.on('pageerror', (e) => {
    failed = true;
    console.error(`page error (${format}): ${e.message}`);
  });
  p.on('requestfailed', (r) => {
    const u = r.url();
    if (!/^file:|^data:/.test(u) && !FONT_HOSTS.some((h) => u.includes(h))) return; // blocked ones are already reported
    warn(`${format}: could not load ${u.slice(0, 120)}`);
  });
  await p.goto(`${pathToFileURL(pageFor(format, page)).href}?format=${format}`, { waitUntil: 'load' });
  await p.evaluate(async (fams) => {
    // Fonts load lazily; ask for every brand family at the weights templates use before measuring.
    await Promise.all(fams.filter(Boolean).flatMap((f) => [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 32px "${f}"`).catch(() => null))));
    await document.fonts.ready;
    if (window.cmoReady) await window.cmoReady;
  }, [fonts.display?.family, fonts.text?.family, fonts.mono?.family]);
  const missing = await p.evaluate((fams) => fams.filter((f) => f && !document.fonts.check(`16px "${f}"`)), [
    fonts.display?.family, fonts.text?.family,
  ]);
  for (const f of missing) warn(`${format}: font "${f}" did not load; a fallback was used`);
  return p;
}

if (args.info) {
  const info = { template: tpl.id, kind: tpl.kind, formats: {} };
  try {
    for (const format of formats) {
      const p = await openPage(format, 0);
      info.formats[format] = await p.evaluate(() => ({
        duration: window.DURATION ?? null, pages: window.PAGES ?? null,
        sound_logo_at: window.SOUND_LOGO_AT ?? null, poster_at: window.POSTER_AT ?? null,
        scenes: window.SCENES ?? null,
      }));
      await p.close();
    }
  } finally {
    await browser.close();
    await rm(pageDir, { recursive: true, force: true });
  }
  info.warnings = warnings;
  info.failed = failed;
  console.log(JSON.stringify(info, null, 2));
  process.exit(failed ? 1 : 0);
}

mkdirSync(path.dirname(outBase), { recursive: true });
try {
  for (const format of formats) {
    if (tpl.kind === 'image') {
      const first = await openPage(format, 0);
      const pageKey = tpl.pages;
      const count = (await first.evaluate(() => window.PAGES)) || (pageKey && Array.isArray(data[pageKey]) ? data[pageKey].length : 1);
      for (let i = 0; i < count; i++) {
        const p = i === 0 ? first : await openPage(format, i);
        const out = count > 1 ? `${outBase}-${format}-p${String(i + 1).padStart(2, '0')}.png` : `${outBase}-${format}.png`;
        await p.screenshot({ path: out });
        await p.close();
        files.push({ format, page: i + 1, path: rel(out) });
        console.log(`wrote ${out}`);
      }
    } else {
      const p = await openPage(format, 0);
      const duration = await p.evaluate(() => window.DURATION);
      const hasSetTime = await p.evaluate(() => typeof window.setTime === 'function');
      if (!(duration > 0) || !hasSetTime) throw new Error('A video template must define window.DURATION and window.setTime(t).');
      const total = Math.round(duration * fps);
      const frames = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), `cmo-${tpl.id}-${format}-`));
      try {
        for (let i = 0; i < total; i++) {
          await p.evaluate((t) => window.setTime(t), i / fps);
          await p.screenshot({ path: path.join(frames, `${String(i).padStart(5, '0')}.png`) });
          if (i % fps === 0) process.stdout.write(`\r${format}: frame ${i}/${total}`);
        }
        process.stdout.write(`\r${format}: frame ${total}/${total}\n`);
        const posterAt = (await p.evaluate(() => window.POSTER_AT)) ?? Math.max(0, duration - 1);
        await p.evaluate((t) => window.setTime(t), posterAt);
        const poster = `${outBase}-${format}-poster.png`;
        await p.screenshot({ path: poster });
        const captions = (await p.evaluate(() => window.CAPTIONS)) || [];
        const soundLogoAt = await p.evaluate(() => window.SOUND_LOGO_AT ?? null);
        const scenes = await p.evaluate(() => window.SCENES ?? null);
        const mp4 = `${outBase}-${format}.mp4`;
        const audio = args.audio ? path.resolve(args.audio) : null;
        await encode(frames, fps, audio, total / fps, args.loudness, mp4);
        const entry = { format, path: rel(mp4), duration, scenes, sound_logo_at: soundLogoAt, poster: rel(poster) };
        if (audio) {
          const len = mediaLength(audio);
          if (len && Math.abs(len - duration) > 0.1)
            warn(`${format}: the audio is ${len.toFixed(2)} s and the video ${duration.toFixed(2)} s; the audio was ${len < duration ? 'padded with silence' : 'cut'}. Mix the soundtrack to the video length (see --info).`);
          entry.loudness = measureLoudness(mp4);
        }
        const text = srt(captions, (w) => warn(`${format}: ${w}`));
        if (text) {
          const srtPath = `${outBase}-${format}.srt`;
          writeFileSync(srtPath, text);
          entry.subtitles = rel(srtPath);
        } else warn(`${format}: the template gave no captions, so no subtitles were written`);
        files.push(entry);
        console.log(`wrote ${mp4}`);
      } finally {
        if (!args.keepFrames) await rm(frames, { recursive: true, force: true });
        else console.log(`frames kept in ${frames}`);
        await p.close();
      }
    }
  }
} catch (e) {
  failed = true;
  console.error(`error: ${e.message}`);
} finally {
  await browser.close();
  await rm(pageDir, { recursive: true, force: true });
}

const manifest = {
  schema: 'cmo.render/1',
  template: { id: tpl.id, version: tpl.version, sha256: hash, approved: approvedOk },
  brand_version: brand.version || null,
  data: { path: rel(path.resolve(args.data)), sha256: createHash('sha256').update(readFileSync(path.resolve(args.data))).digest('hex') },
  rendered_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  files,
  audio: args.audio ? { path: rel(path.resolve(args.audio)), normalized_to: args.loudness === 'off' ? null : `${args.loudness} LUFS, -1 dBTP` } : null,
  warnings,
  failed,
};
writeFileSync(`${outBase}.render.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${outBase}.render.json${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`);
if (!approvedOk) console.log('note: this template is not approved for this content; use the output as a preview only');
process.exit(failed ? 1 : 0);
