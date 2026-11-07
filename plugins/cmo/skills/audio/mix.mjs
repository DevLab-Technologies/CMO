#!/usr/bin/env node
// cmo soundtrack mixer. Builds one soundtrack for a video of a known length from a music bed,
// an optional voice-over and the brand's sound logo, then normalizes it and measures the result.
//
//   node mix.mjs --duration 18 --out soundtrack.wav [--bed music.wav] [--vo voice.wav]
//                [--logo sound-logo.wav] [--logo-at 16.4] [--vo-at 0.5] [--bed-gain -6]
//                [--duck] [--lufs -14] [--force]
//
// - The bed is looped or trimmed to the duration and fades out just before the sound logo.
// - The sound logo plays once, unedited, at --logo-at (default: so that it ends 0.2 s before the end).
// - The voice-over must end before the sound logo starts, and within the duration.
// - With --duck, the bed drops under the voice-over (sidechain compression).
// - Output: 48 kHz stereo WAV normalized to --lufs (default -14 LUFS, -1 dBTP). The summary reports
//   the loudness measured on the result, not the target.
// Needs ffmpeg and ffprobe. Exit codes: 0 ok, 1 ffmpeg failed, 2 bad input, 3 no ffmpeg.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function fail(code, msg) {
  console.error(`error: ${msg}`);
  process.exit(code);
}

const num = (k, s, { min = -Infinity } = {}) => {
  const n = Number(s);
  if (!Number.isFinite(n)) fail(2, `${k} must be a number (got "${s}")`);
  if (n < min) fail(2, `${k} must be at least ${min}`);
  return n;
};

const a = { duck: false, bedGain: -6, lufs: -14, force: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  const v = () => (i + 1 < argv.length ? argv[++i] : fail(2, `${k} needs a value`));
  if (k === '--duration') a.duration = num(k, v(), { min: 0.1 });
  else if (k === '--out') a.out = v();
  else if (k === '--bed') a.bed = v();
  else if (k === '--vo') a.vo = v();
  else if (k === '--logo') a.logo = v();
  else if (k === '--logo-at') a.logoAt = num(k, v(), { min: 0 });
  else if (k === '--vo-at') a.voAt = num(k, v(), { min: 0 });
  else if (k === '--bed-gain') a.bedGain = num(k, v());
  else if (k === '--lufs') {
    a.lufs = num(k, v());
    if (a.lufs >= 0) fail(2, '--lufs must be negative, for example -14');
  } else if (k === '--duck') a.duck = true;
  else if (k === '--force') a.force = true;
  else fail(2, `Unknown argument: ${k}`);
}

if (!a.duration) fail(2, '--duration (seconds) is required');
if (!a.out) fail(2, '--out is required');
if (!a.bed && !a.vo && !a.logo) fail(2, 'Give at least one of --bed, --vo, --logo');
for (const k of ['bed', 'vo', 'logo']) if (a[k] && !existsSync(a[k])) fail(2, `--${k} file not found: ${a[k]}`);
if (a.duck && !(a.bed && a.vo)) fail(2, '--duck needs both --bed and --vo');
if (existsSync(a.out) && !a.force) fail(2, `${a.out} already exists; write a new version, or pass --force`);
if (spawnSync('ffmpeg', ['-version']).status !== 0) fail(3, 'ffmpeg not found (macOS: brew install ffmpeg)');

function length(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number((r.stdout || '').trim());
  if (!(d > 0)) fail(2, `Can't read the length of ${file}`);
  return d;
}

const D = a.duration;
const logoLen = a.logo ? length(a.logo) : 0;
if (a.logo && logoLen > D) fail(2, `The sound logo (${logoLen.toFixed(2)} s) is longer than the video (${D} s)`);
const logoAt = a.logo ? (a.logoAt ?? Math.max(0, D - logoLen - 0.2)) : null;
if (a.logo && logoAt + logoLen > D + 0.01)
  fail(2, `The sound logo would end at ${(logoAt + logoLen).toFixed(2)} s, after the video ends at ${D} s; make the end scene longer or start the logo earlier`);

const voAt = a.voAt ?? 0;
const voLen = a.vo ? length(a.vo) : 0;
if (a.vo) {
  const voEnd = voAt + voLen;
  if (voEnd > D + 0.01) fail(2, `The voice-over ends at ${voEnd.toFixed(2)} s, after the video ends at ${D} s`);
  if (a.logo && voEnd > logoAt + 0.01)
    fail(2, `The voice-over ends at ${voEnd.toFixed(2)} s, after the sound logo starts at ${logoAt.toFixed(2)} s; nothing may play over the sound logo`);
}

const inputs = [];
const chains = [];
const mixIn = [];
let n = 0;
const fmt = 'aformat=sample_rates=48000:channel_layouts=stereo';

if (a.bed) {
  inputs.push('-stream_loop', '-1', '-i', a.bed);
  // Fade out over up to 0.8 s, finishing as the sound logo starts (or 1.5 s at the end without one).
  const fadeEnd = a.logo ? logoAt : D;
  const fadeLen = Math.max(0.05, Math.min(a.logo ? 0.8 : 1.5, fadeEnd));
  const fadeAt = Math.max(0, fadeEnd - fadeLen);
  chains.push(`[${n}:a]${fmt},atrim=0:${D},asetpts=PTS-STARTPTS,volume=${a.bedGain}dB,afade=t=out:st=${fadeAt}:d=${fadeLen}[bed]`);
  n++;
}
if (a.vo) {
  inputs.push('-i', a.vo);
  const delay = Math.round(voAt * 1000);
  chains.push(`[${n}:a]${fmt},adelay=${delay}|${delay},apad,atrim=0:${D}[vo]`);
  n++;
}
if (a.logo) {
  inputs.push('-i', a.logo);
  const delay = Math.round(logoAt * 1000);
  chains.push(`[${n}:a]${fmt},adelay=${delay}|${delay},apad,atrim=0:${D}[logo]`);
  n++;
}

if (a.duck) {
  chains.push('[vo]asplit=2[vo1][vokey]');
  chains.push('[bed][vokey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bedd]');
  mixIn.push('[bedd]', '[vo1]');
} else {
  if (a.bed) mixIn.push('[bed]');
  if (a.vo) mixIn.push('[vo]');
}
if (a.logo) mixIn.push('[logo]');

chains.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:duration=longest:normalize=0,atrim=0:${D},loudnorm=I=${a.lufs}:TP=-1:LRA=11,aresample=48000[out]`);

mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
const ffArgs = ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', chains.join(';'), '-map', '[out]', '-ac', '2', '-ar', '48000', '-t', String(D), path.resolve(a.out)];
const r = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });
if (r.status !== 0) fail(1, 'ffmpeg failed');

const m = spawnSync('ffmpeg', ['-nostats', '-i', path.resolve(a.out), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const tail = (m.stderr || '').slice((m.stderr || '').lastIndexOf('Summary:'));
const I = /I:\s*(-?[\d.]+) LUFS/.exec(tail);
const P = /Peak:\s*(-?[\d.]+) dBFS/.exec(tail);

console.log(JSON.stringify({
  out: a.out,
  duration: Number(length(path.resolve(a.out)).toFixed(3)),
  bed: a.bed ? { file: a.bed, gain_db: a.bedGain } : null,
  voice_over: a.vo ? { file: a.vo, at: voAt, length: Number(voLen.toFixed(3)) } : null,
  sound_logo: a.logo ? { file: a.logo, at: Number(logoAt.toFixed(3)), length: Number(logoLen.toFixed(3)) } : null,
  ducking: a.duck,
  target: `${a.lufs} LUFS, -1 dBTP`,
  measured: { integrated_lufs: I ? Number(I[1]) : null, true_peak_dbtp: P ? Number(P[1]) : null },
}, null, 2));
