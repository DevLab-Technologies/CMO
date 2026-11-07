#!/usr/bin/env node
// Two-proportion test for a cmo experiment readout.
//   node abtest.mjs --a 120/5000 --b 90/5000 [--confidence 0.95] [--comparisons 1]
// a and b are conversions/exposures (clicks/impressions, sign-ups/visits...). With three variants,
// compare each challenger to the control and pass --comparisons 2, which tightens the threshold
// (Bonferroni) so testing more variants doesn't produce more false winners.
//
// The test and the interval use the same (unpooled) standard error, so the verdict and the
// interval never disagree. The verdict follows the measurement skill's sample rules:
//   fewer than 30 conversions in the smaller variant: too small to compare;
//   30 to 99: a hint only, even if the difference looks clear;
//   100 or more: a conclusion at the chosen confidence.
function fail(msg) { console.error(`error: ${msg}`); process.exit(2); }
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  if (!argv[i].startsWith('--') || argv[i + 1] === undefined) fail(`bad argument near ${argv[i]}`);
  args[argv[i].slice(2)] = argv[i + 1];
}
for (const k of Object.keys(args)) if (!['a', 'b', 'confidence', 'comparisons'].includes(k)) fail(`unknown argument --${k}`);
const parse = (s, name) => {
  const m = /^(\d+)\/(\d+)$/.exec(s || '');
  if (!m) fail(`--${name} must look like 120/5000 (conversions/exposures)`);
  const [x, n] = [Number(m[1]), Number(m[2])];
  if (n === 0 || x > n) fail(`--${name}: conversions must be between 0 and exposures, and exposures above 0`);
  return { x, n, p: x / n };
};
const A = parse(args.a, 'a');
const B = parse(args.b, 'b');
const conf = Number(args.confidence ?? 0.95);
if (!(conf > 0.5 && conf < 1)) fail('--confidence must be between 0.5 and 1');
const comparisons = Number(args.comparisons ?? 1);
if (!Number.isInteger(comparisons) || comparisons < 1) fail('--comparisons must be a whole number, 1 or more');

// Standard normal CDF via erf (Abramowitz-Stegun 7.1.26) and its inverse by bisection.
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function zFor(twoSidedAlpha) {
  let lo = 0, hi = 10;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < 1 - twoSidedAlpha / 2) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

const alpha = (1 - conf) / comparisons;
const diff = B.p - A.p;
const se = Math.sqrt((A.p * (1 - A.p)) / A.n + (B.p * (1 - B.p)) / B.n);
const z = se > 0 ? diff / se : 0;
const pValue = se > 0 ? 2 * (1 - cdf(Math.abs(z))) : 1;
const zc = zFor(alpha);
const ci = [diff - zc * se, diff + zc * se];
const clear = ci[0] > 0 || ci[1] < 0;
const smaller = Math.min(A.x, B.x);
const pct = (c) => `${Number((c * 100).toFixed(2))}%`;
const level = `${pct(conf)} confidence${comparisons > 1 ? ` across ${comparisons} comparisons` : ''}`;
const leader = diff > 0 ? 'B' : 'A';

let verdict;
if (smaller < 30) verdict = `too small to compare: ${smaller} conversions in the smaller variant (aim for about 100 per variant)`;
else if (smaller < 100) verdict = clear
  ? `hint only: ${leader} leads at ${level}, but the smaller variant has ${smaller} conversions (fewer than 100); don't treat it as proven`
  : `hint only: no clear difference, and the smaller variant has ${smaller} conversions (fewer than 100)`;
else verdict = clear ? `${leader} is better at ${level}` : `no clear difference at ${level}`;

const r = (v, d = 4) => Number(v.toFixed(d));
console.log(JSON.stringify({
  a: { conversions: A.x, exposures: A.n, rate: r(A.p) },
  b: { conversions: B.x, exposures: B.n, rate: r(B.p) },
  lift_b_over_a: A.p > 0 ? r((B.p - A.p) / A.p, 3) : null,
  difference: r(diff),
  confidence_interval: [r(ci[0]), r(ci[1])],
  p_value: r(pValue),
  confidence: conf,
  comparisons,
  verdict,
}, null, 2));
