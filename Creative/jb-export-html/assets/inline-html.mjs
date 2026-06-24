#!/usr/bin/env node
// inline-html.mjs — bundle an HTML file + everything it references into ONE
// self-contained, fully offline .html file. Zero dependencies (Node 18+).
//
//   node inline-html.mjs <input.html> [output.html]
//   # default output: "<input> (standalone).html"
//
// Inlines: linked CSS (<link rel=stylesheet>, incl. Google Fonts → @font-face
// data-URIs), <script src>, <img src/srcset>, CSS url() and @import, <style>
// blocks, favicon/apple-touch-icon, and inline style="" url()s — local files
// AND remote URLs, all as data-URIs / inline text. JS-referenced assets that a
// static scan can't see are handled via <meta name="ext-resource-dependency">
// tags → injected as window.__resources[id]. Anything it can't resolve is left
// in place and reported loudly at the end.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EXT_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.bmp': 'image/bmp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject', '.css': 'text/css',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const warnings = [];
const cache = new Map();

const isInline = (ref) => !ref || /^(data:|blob:|#|javascript:|mailto:|tel:)/i.test(ref.trim());
const mimeFromExt = (p) => EXT_MIME[path.extname(p.split('?')[0]).toLowerCase()] || 'application/octet-stream';

// Resolve + load a resource relative to its base ({type:'file',dir} | {type:'url',href}).
async function load(ref, base) {
  ref = ref.trim().replace(/^["']|["']$/g, '');
  if (isInline(ref)) return null;
  let key, kind, target;
  if (/^https?:\/\//i.test(ref)) { kind = 'url'; target = ref; }
  else if (/^\/\//.test(ref)) { kind = 'url'; target = 'https:' + ref; }
  else if (base.type === 'url') { kind = 'url'; target = new URL(ref, base.href).href; }
  else { kind = 'file'; target = path.resolve(base.dir, ref.split(/[?#]/)[0]); }
  key = kind + ':' + target;
  if (cache.has(key)) return cache.get(key);

  const result = await (async () => {
    try {
      if (kind === 'url') {
        const res = await fetch(target, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        let mime = (res.headers.get('content-type') || '').split(';')[0].trim() || mimeFromExt(target);
        return { buffer, mime, base: { type: 'url', href: target } };
      }
      const buffer = await readFile(target);
      return { buffer, mime: mimeFromExt(target), base: { type: 'file', dir: path.dirname(target) } };
    } catch (err) {
      warnings.push(`could not inline ${ref} (${err.message}) — left as external reference`);
      return null;
    }
  })();
  cache.set(key, result);
  return result;
}

const dataURI = (r) => `data:${r.mime};base64,${r.buffer.toString('base64')}`;

async function replaceAsync(str, re, fn) {
  const out = [];
  str.replace(re, (m, ...args) => { out.push(fn(m, ...args)); return m; });
  const done = await Promise.all(out);
  let i = 0;
  return str.replace(re, () => done[i++]);
}

// --- CSS: inline @import (recursive) then url() ---
async function processCss(css, base) {
  // @import "x";  /  @import url(x);
  css = await replaceAsync(css, /@import\s+(?:url\(\s*)?["']?([^"')\s]+)["']?\s*\)?\s*;?/gi,
    async (_m, ref) => {
      const r = await load(ref, base);
      if (!r) return _m;
      return '\n' + await processCss(r.buffer.toString('utf8'), r.base) + '\n';
    });
  // url(...) — fonts, images, etc.
  css = await replaceAsync(css, /url\(\s*(["']?)([^"')]+)\1\s*\)/gi, async (_m, _q, ref) => {
    if (isInline(ref)) return _m;
    const r = await load(ref, base);
    return r ? `url("${dataURI(r)}")` : _m;
  });
  return css;
}

async function main() {
  const input = process.argv[2];
  if (!input) { console.error('usage: node inline-html.mjs <input.html> [output.html]'); process.exit(2); }
  const output = process.argv[3] ||
    path.join(path.dirname(input), path.basename(input, path.extname(input)) + ' (standalone).html');
  const htmlBase = { type: 'file', dir: path.dirname(path.resolve(input)) };
  let html = await readFile(input, 'utf8');

  // 1. ext-resource-dependency → window.__resources (JS-referenced assets)
  const resources = {};
  html = await replaceAsync(html, /<meta\b[^>]*name=["']ext-resource-dependency["'][^>]*>/gi, async (tag) => {
    const url = (tag.match(/content=["']([^"']+)["']/i) || [])[1];
    const id = (tag.match(/data-resource-id=["']([^"']+)["']/i) || [])[1];
    if (url && id) {
      const r = await load(url, htmlBase);
      if (r) resources[id] = dataURI(r);
    }
    return ''; // drop the meta
  });

  // 2. drop now-pointless resource hints
  html = html.replace(/<link\b[^>]*\brel=["'](?:preconnect|dns-prefetch|preload|modulepreload|prefetch)["'][^>]*>\s*/gi, '');

  // 3. <link> → stylesheet inline, or favicon → data-URI
  html = await replaceAsync(html, /<link\b[^>]*>/gi, async (tag) => {
    const rel = (tag.match(/\brel=["']([^"']+)["']/i) || [])[1] || '';
    const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
    if (!href) return tag;
    if (/stylesheet/i.test(rel)) {
      const r = await load(href, htmlBase);
      if (!r) return tag;
      const css = await processCss(r.buffer.toString('utf8'), r.base);
      const media = (tag.match(/\bmedia=["']([^"']+)["']/i) || [])[1];
      return `<style${media ? ` media="${media}"` : ''}>\n${css}\n</style>`;
    }
    if (/\b(icon|apple-touch-icon|mask-icon)\b/i.test(rel)) {
      const r = await load(href, htmlBase);
      return r ? tag.replace(href, dataURI(r)) : tag;
    }
    return tag;
  });

  // 4. <style> blocks: inline their url()/@import
  html = await replaceAsync(html, /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    async (_m, open, body, close) => open + (await processCss(body, htmlBase)) + close);

  // 5. <script src> → inline text (preserve other attrs; neutralize </script>)
  html = await replaceAsync(html, /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    async (tag, pre, src, post) => {
      const r = await load(src, htmlBase);
      if (!r) return tag;
      const attrs = (pre + post).replace(/\s+/g, ' ').trim();
      const js = r.buffer.toString('utf8').replace(/<\/script/gi, '<\\/script');
      return `<script${attrs ? ' ' + attrs : ''}>\n${js}\n</script>`;
    });

  // 6. <img src> and srcset
  html = await replaceAsync(html, /\bsrc=["']([^"']+)["']/gi, async (m, ref) => {
    if (isInline(ref)) return m;
    const r = await load(ref, htmlBase);
    return r ? `src="${dataURI(r)}"` : m;
  });
  html = await replaceAsync(html, /\bsrcset=["']([^"']+)["']/gi, async (m, val) => {
    const parts = await Promise.all(val.split(',').map(async (part) => {
      const [ref, ...desc] = part.trim().split(/\s+/);
      if (isInline(ref)) return part.trim();
      const r = await load(ref, htmlBase);
      return (r ? dataURI(r) : ref) + (desc.length ? ' ' + desc.join(' ') : '');
    }));
    return `srcset="${parts.join(', ')}"`;
  });

  // 7. inline style="" url()s (delimiter-aware: the value may contain the other quote)
  html = await replaceAsync(html, /\bstyle=(["'])((?:(?!\1).)*)\1/gis, async (m, q, css) => {
    if (!/url\(/i.test(css)) return m;
    const out = await processCss(css, htmlBase);
    const esc = q === '"' ? out.replace(/"/g, '&quot;') : out.replace(/'/g, '&#39;');
    return `style=${q}${esc}${q}`;
  });

  // 8. inject window.__resources before the first <script> (so scripts can use it)
  if (Object.keys(resources).length) {
    const blob = `<script>window.__resources=${JSON.stringify(resources)};</script>\n`;
    html = html.includes('<script') ? html.replace('<script', blob + '<script') : html.replace('</body>', blob + '</body>');
  }

  await writeFile(output, html);

  // report
  const leftover = (html.match(/(?:src|href)=["']https?:\/\/[^"']+["']/gi) || [])
    .concat(html.match(/url\(\s*["']?https?:\/\/[^"')]+/gi) || []);
  console.log(`✓ wrote ${output}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
  if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.forEach((w) => console.log('  • ' + w)); }
  if (leftover.length) {
    console.log(`\n⚠ ${leftover.length} external reference(s) remain — NOT fully offline:`);
    [...new Set(leftover)].slice(0, 20).forEach((l) => console.log('  • ' + l));
    console.log('  (JS-referenced URLs? add a <meta name="ext-resource-dependency"> tag — see the skill.)');
  } else if (!warnings.length) {
    console.log('✓ no external references remain — fully self-contained.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
