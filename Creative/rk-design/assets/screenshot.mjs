#!/usr/bin/env node
// screenshot.mjs — capture a PNG screenshot of a local HTML file or URL using
// whatever Chrome/Chromium is already installed. Zero dependencies (Node 18+),
// no Playwright, no Puppeteer — just headless Chrome via child_process.
//
//   node screenshot.mjs <file-or-url> [out.png] [--width N] [--height N] [--wait MS]
//   # default output: "<input-basename>.png" in the cwd
//   # default size: 1280x800, default settle wait: 1500ms
//
// ponytail: fixed-viewport capture only, no full-page/scrolling mode — for a
// tall page, pass a taller --height explicitly. Upgrade path if full-page
// capture is ever needed: switch to CDP (--remote-debugging-port +
// Page.captureScreenshot) instead of the --screenshot CLI flag.
//
// Chrome binary discovery order: $CHROME_BIN, then standard macOS app
// locations (Chrome, Chrome Canary, Chromium, Edge, Brave), then `which`
// lookups for common Linux binary names.

import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAC_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

const LINUX_NAMES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  for (const p of MAC_CANDIDATES) if (existsSync(p)) return p;
  for (const name of LINUX_NAMES) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch { /* not found, keep looking */ }
  }
  return null;
}

function parseArgs(argv) {
  const opts = { width: 1280, height: 800, wait: 1500, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--width') opts.width = Number(argv[++i]);
    else if (a === '--height') opts.height = Number(argv[++i]);
    else if (a === '--wait') opts.wait = Number(argv[++i]);
    else opts._.push(a);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const input = opts._[0];
  if (!input) {
    console.error('usage: node screenshot.mjs <file-or-url> [out.png] [--width N] [--height N] [--wait MS]');
    process.exit(2);
  }

  const url = /^https?:\/\//i.test(input)
    ? input
    : pathToFileURL(path.resolve(process.cwd(), input)).href;

  const out = opts._[1] || `${path.basename(input, path.extname(input))}.png`;

  const chrome = findChrome();
  if (!chrome) {
    console.error(
      'no Chrome/Chromium binary found (checked $CHROME_BIN, standard macOS app paths, and ' +
      'google-chrome/chromium on PATH) — set CHROME_BIN=/path/to/chrome and retry.'
    );
    process.exit(2);
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--screenshot=${out}`,
    `--window-size=${opts.width},${opts.height}`,
    `--virtual-time-budget=${opts.wait}`,
    url,
  ];

  const result = spawnSync(chrome, args, { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error(`chrome exited with status ${result.status ?? result.signal} — screenshot failed`);
    process.exit(1);
  }
  if (!existsSync(out) || statSync(out).size === 0) {
    console.error(`chrome exited cleanly but ${out} was not created — screenshot failed`);
    process.exit(1);
  }

  console.log(out);
}

main();
