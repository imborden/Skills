#!/usr/bin/env node
// llm-proxy.mjs — a tiny local proxy that lets an HTML prototype call an LLM
// without ever putting the API key in the browser.
//
//   • Serves the files in this directory (so open the prototype at the proxy
//     origin — no file:// and no CORS headaches).
//   • Exposes  POST /api/complete  → auto-detects a provider and forwards to
//     it. The browser only ever talks to localhost.
//   • The API key is read from a gitignored .env (or the environment). It is
//     NEVER sent to, or readable by, the page.
//
// Provider auto-detect (checked in this order):
//     1. ANTHROPIC_API_KEY set  → calls the Anthropic Messages API natively.
//     2. LLM_API_KEY (or its alias DEEPSEEK_API_KEY) set → an OpenAI-
//        compatible chat/completions endpoint (DeepSeek by default).
//
// Run (Node 18+; uses built-in fetch, zero dependencies):
//     cp .env.example .env   # then paste your real key into .env
//     node llm-proxy.mjs     # serves http://localhost:8787/
//
// Config via .env or environment:
//     ANTHROPIC_API_KEY  Anthropic key — if set, Anthropic is used
//     LLM_API_KEY        OpenAI-compatible key (alias: DEEPSEEK_API_KEY)
//     LLM_MODEL          default claude-sonnet-5 (Anthropic) / deepseek-chat (OpenAI-compat)
//     LLM_BASE_URL       default https://api.anthropic.com/v1/messages / https://api.deepseek.com/chat/completions
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

// --- provider auto-detect ---------------------------------------------------
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_COMPAT_KEY = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
const PROVIDER = ANTHROPIC_KEY ? 'anthropic' : 'openai';
const PROVIDER_LABEL = PROVIDER === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible';
const API_KEY = ANTHROPIC_KEY || OPENAI_COMPAT_KEY;

const DEFAULT_BASE_URL = PROVIDER === 'anthropic'
  ? 'https://api.anthropic.com/v1/messages'
  : 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = PROVIDER === 'anthropic' ? 'claude-sonnet-5' : 'deepseek-chat';

const BASE_URL = process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
const MODEL = process.env.LLM_MODEL || DEFAULT_MODEL;
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || 1024;
const STATIC_DIR = process.env.STATIC_DIR || HERE;

const NO_KEY_MESSAGE = 'No API key set. Set ANTHROPIC_API_KEY, or LLM_API_KEY/DEEPSEEK_API_KEY, ' +
  'in .env (copy .env.example to .env first).';

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

// Normalize the request into a provider-agnostic { system, messages } shape.
// Accepts {prompt: "..."} OR {messages: [...]}, plus optional {system}.
// A "system" role inside `messages` is pulled out too, since Anthropic
// requires system as a top-level field rather than a message role.
function normalize({ prompt, messages, system }) {
  const input = Array.isArray(messages) ? messages
    : (typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : []);
  let sys = system;
  const rest = [];
  for (const m of input) {
    if (m.role === 'system') { if (!sys) sys = m.content; }
    else rest.push(m);
  }
  return { system: sys, messages: rest };
}

async function callAnthropic({ system, messages, model, max_tokens, temperature }) {
  const upstream = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, system, messages, temperature }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw new Error(data?.error?.message || `Upstream returned ${upstream.status}`);
  }
  const text = Array.isArray(data?.content)
    ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    : '';
  return text;
}

async function callOpenAICompat({ system, messages, model, max_tokens, temperature }) {
  const withSystem = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const upstream = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model, messages: withSystem, max_tokens, temperature: temperature ?? 1.0 }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw new Error(data?.error?.message || `Upstream returned ${upstream.status}`);
  }
  return data?.choices?.[0]?.message?.content ?? '';
}

async function handleComplete(req, res) {
  if (!API_KEY) return sendJSON(res, 500, { error: NO_KEY_MESSAGE });

  let payload;
  try { payload = JSON.parse(await readBody(req) || '{}'); }
  catch { return sendJSON(res, 400, { error: 'Invalid JSON body.' }); }

  const { system, messages } = normalize(payload);
  if (!messages.length) {
    return sendJSON(res, 400, { error: 'Provide a "prompt" string or a non-empty "messages" array.' });
  }

  const call = PROVIDER === 'anthropic' ? callAnthropic : callOpenAICompat;
  try {
    const text = await call({
      system,
      messages,
      model: payload.model || MODEL,
      max_tokens: payload.max_tokens || MAX_TOKENS,
      temperature: payload.temperature,
    });
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
  console.log(`llm-proxy → http://localhost:${PORT}/  (provider: ${PROVIDER_LABEL}, model: ${MODEL})`);
  if (!API_KEY) console.log(`WARNING: ${NO_KEY_MESSAGE} /api/complete will 500 until you add one.`);
});
