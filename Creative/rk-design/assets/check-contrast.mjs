#!/usr/bin/env node
// check-contrast.mjs — check the WCAG 2.x contrast ratio between two colors.
// Zero dependencies (Node 18+).
//
//   node check-contrast.mjs <color1> <color2> [--large]
//   node check-contrast.mjs --self-test
//
// Colors: #rgb, #rrggbb, rgb()/rgba(), or oklch() (the suite's own color
// space — converted via OKLab → linear-sRGB → sRGB, clamping out-of-gamut
// values). Pairwise only — this does not scan HTML for color declarations.
//
// Prints "<ratio>:1  PASS|FAIL (needs 4.5:1)" — 3:1 threshold with --large
// (WCAG's "large text" allowance). Exit 0 on pass, 1 on fail, 2 on bad usage.

// ponytail: rgb()/rgba() only parses plain 0-255 numbers, not percentages —
// add if the suite starts writing rgb(50% 20% 10%).
function parseColor(input) {
  const s = input.trim();
  let m;

  if ((m = /^#([0-9a-fA-F]{3})$/.exec(s))) {
    return m[1].split('').map((c) => parseInt(c + c, 16));
  }
  if ((m = /^#([0-9a-fA-F]{6})$/.exec(s))) {
    const hex = m[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  if ((m = /^rgba?\(([^)]+)\)$/i.exec(s))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) {
      throw new Error(`could not parse rgb() color: "${input}"`);
    }
    return parts.slice(0, 3);
  }
  if ((m = /^oklch\(([^)]+)\)$/i.exec(s))) {
    const [Lraw, Craw, Hraw] = m[1].split(/[\s,/]+/).filter(Boolean);
    const L = Lraw?.endsWith('%') ? parseFloat(Lraw) / 100 : parseFloat(Lraw);
    const C = parseFloat(Craw);
    const H = parseFloat(Hraw);
    if ([L, C, H].some(Number.isNaN)) {
      throw new Error(`could not parse oklch() color: "${input}"`);
    }
    return oklchToRgb255(L, C, H);
  }

  throw new Error(
    `unrecognized color: "${input}" — use #rgb, #rrggbb, rgb()/rgba(), or oklch()`
  );
}

// OKLab → linear sRGB (Björn Ottosson's published matrices), then gamma-encode.
function oklchToRgb255(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [rLin, gLin, bLin].map(linearToSrgb255);
}

function linearToSrgb255(c) {
  const clamped = Math.min(1, Math.max(0, c)); // out-of-gamut clamp
  const encoded =
    clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

// WCAG relative luminance (0.03928 is the spec's own threshold, not the
// display-gamma one used above — that mismatch is intentional, per spec).
function relLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(rgb1, rgb2) {
  const L1 = relLuminance(rgb1);
  const L2 = relLuminance(rgb2);
  const [light, dark] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
}

function selfTest() {
  const approx = (a, b, eps = 0.1) => Math.abs(a - b) <= eps;
  const checks = [];

  const bw = contrastRatio(parseColor('#000000'), parseColor('#ffffff'));
  checks.push(['black/white ≈ 21', approx(bw, 21, 0.1), bw]);

  const suite = contrastRatio(parseColor('#16150f'), parseColor('#f4f1ea'));
  checks.push(['#16150f/#f4f1ea >= 12', suite >= 12, suite]);

  const grays = contrastRatio(parseColor('#777777'), parseColor('#888888'));
  checks.push(['#777777/#888888 < 4.5', grays < 4.5, grays]);

  const oklchCase = contrastRatio(parseColor('oklch(0.62 0.19 28)'), parseColor('#ffffff'));
  checks.push(['oklch(0.62 0.19 28)/white in [3,5]', oklchCase >= 3 && oklchCase <= 5, oklchCase]);

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    console.error('self-test: FAILED');
    for (const [name, , val] of failed) console.error(`  ✗ ${name} — got ${val.toFixed(3)}`);
    process.exit(1);
  }
  console.log('self-test: ok');
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();

  const large = args.includes('--large');
  const colors = args.filter((a) => a !== '--large');
  if (colors.length !== 2) {
    console.error('usage: node check-contrast.mjs <color1> <color2> [--large]');
    console.error('       node check-contrast.mjs --self-test');
    process.exit(2);
  }

  let rgb1, rgb2;
  try {
    [rgb1, rgb2] = colors.map(parseColor);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  const ratio = contrastRatio(rgb1, rgb2);
  const threshold = large ? 3 : 4.5;
  const pass = ratio >= threshold;
  console.log(`${ratio.toFixed(2)}:1  ${pass ? 'PASS' : 'FAIL'} (needs ${threshold}:1)`);
  process.exit(pass ? 0 : 1);
}

main();
