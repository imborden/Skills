#!/usr/bin/env node
// llm-proxy.mjs — a tiny local proxy that lets an HTML prototype call an LLM
// without ever putting the API key in the browser.
//
//   • Serves the files in this directory (so open the prototype at the proxy
//     origin — no file:// and no CORS headaches).
//   • Exposes  POST /api/complete  → forwards to a DeepSeek-style, OpenAI-
//     compatible chat endpoint. The browser only ever talks to localhost.
//   • The API key is read from a gitignored .env (or the environment). It is
//     NEVER sent to, or readable by, the page.
//
// Run (Node 18+; uses built-in fetch, zero dependencies):
//     cp .env.example .env   # then paste your real key into .env
//     node llm-proxy.mjs     # serves http://localhost:8787/
//
// Config via .env or environment:
//     DEEPSEEK_API_KEY   (required)        your key — keep it out of git
//     LLM_BASE_URL       default https://api.deepseek.com/chat/completions
//     LLM_MODEL          default deepseek-chat
//     LLM_MAX_TOKENS     default 1024
//     PORT               default 8787
//     STATIC_DIR         default this script's directory

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// --- load .env (zero-dependency; real env always wins) ---------------------
for (const dir of [process.cwd(), HERE]) {
  const envPath = path.join(dir, '.env');
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
  break;
}

const PORT = Number(process.env.PORT) || 8787;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || 1024;
const STATIC_DIR = process.env.STATIC_DIR || HERE;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > limit) req.destroy(); });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

// Normalize the request into an OpenAI-style messages array.
// Accepts {prompt: "..."} OR {messages: [...]}, plus optional {system}.
function toMessages({ prompt, messages, system }) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  if (Array.isArray(messages)) out.push(...messages);
  else if (typeof prompt === 'string') out.push({ role: 'user', content: prompt });
  return out;
}

async function handleComplete(req, res) {
  if (!API_KEY) {
    return sendJSON(res, 500, { error: 'DEEPSEEK_API_KEY is not set. Copy .env.example to .env and add your key.' });
  }
  let payload;
  try { payload = JSON.parse(await readBody(req) || '{}'); }
  catch { return sendJSON(res, 400, { error: 'Invalid JSON body.' }); }

  const messages = toMessages(payload);
  if (!messages.some((m) => m.role !== 'system')) {
    return sendJSON(res, 400, { error: 'Provide a "prompt" string or a non-empty "messages" array.' });
  }

  try {
    const upstream = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: payload.model || MODEL,
        messages,
        max_tokens: payload.max_tokens || MAX_TOKENS,
        temperature: payload.temperature ?? 1.0,
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return sendJSON(res, 502, { error: data?.error?.message || `Upstream returned ${upstream.status}` });
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    return sendJSON(res, 200, { text });
  } catch (err) {
    return sendJSON(res, 502, { error: `Upstream request failed: ${err.message}` });
  }
}

// `/` → index.html, or the sole *.html if the prototype has another name.
function soleHtml() {
  try {
    const html = readdirSync(STATIC_DIR).filter((f) => f.endsWith('.html'));
    return html.length === 1 ? html[0] : null;
  } catch { return null; }
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let rel = urlPath.replace(/^\/+/, '');
  if (rel === '') rel = existsSync(path.join(STATIC_DIR, 'index.html')) ? 'index.html' : (soleHtml() || 'index.html');
  // Never serve dotfiles over HTTP — this is where .env (the API key!) lives.
  if (rel.split('/').some((seg) => seg.startsWith('.'))) {
    return sendJSON(res, 404, { error: `Not found: ${rel}` });
  }
  const filePath = path.join(STATIC_DIR, rel);
  // Block path traversal outside STATIC_DIR.
  if (!filePath.startsWith(path.resolve(STATIC_DIR))) {
    return sendJSON(res, 403, { error: 'Forbidden' });
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const buf = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', ...CORS });
    res.end(buf);
  } catch {
    sendJSON(res, 404, { error: `Not found: ${rel}` });
  }
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/complete') return handleComplete(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  sendJSON(res, 405, { error: 'Method not allowed' });
}).listen(PORT, () => {
  console.log(`llm-proxy → http://localhost:${PORT}/  (model: ${MODEL})`);
  if (!API_KEY) console.log('WARNING: DEEPSEEK_API_KEY not set — /api/complete will 500 until you add it to .env');
});
