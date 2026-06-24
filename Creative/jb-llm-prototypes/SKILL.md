---
name: jb-llm-prototypes
description: Use when an HTML prototype needs real LLM/AI calls — an AI-powered button, live text generation, a chatbot mockup — and the API key must stay out of the browser. Ships a local Node proxy + a window.llm.complete browser helper (mirrors the hosted window.claude.complete), key in a gitignored .env. The LLM escape hatch jb-prototype points to. Triggers on "make this prototype call an LLM/AI for real", "wire this to the API", "AI-powered prototype", "add a real AI feature".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-llm-prototypes: Real LLM Calls from a Prototype (Key Stays Server-Side)

## Overview

Give an HTML prototype a **real** model call — an AI rewrite/summarize button,
generated copy, a chat mockup with live replies — without ever putting the API
key in the browser. The deliverable is two drop-in assets plus a `.env`.

**REQUIRED BACKGROUND:** Use **jb-prototype** — this is the LLM escape hatch it
points to; the proxy wraps the same prototype. Also **jb-design** for the craft.

**Core principle:** **The API key never touches the browser.** A tiny local
Node proxy holds the key and calls the provider; the page only ever calls
`window.llm.complete(...)` against `localhost`. A page that talks to the provider
directly leaks the key to anyone who opens DevTools.

## When to use

- A prototype feature genuinely needs a model: AI rewrite/summarize, generated
  text, a chatbot mockup with real responses.
- **NOT for faking it.** If a canned/stubbed response sells the demo, just hard-
  code it — no key, no server. Stand up the proxy **only** when you need live
  model output.

## The contract — don't hand-roll it

Copy these from this skill's **`assets/`** next to your prototype `.html`
(dotfiles included):

| File | Role |
|---|---|
| `llm-proxy.mjs` | Zero-dependency Node proxy: serves your page **and** `POST /api/complete` → DeepSeek (OpenAI-compatible) |
| `llm.js` | Browser helper exposing `window.llm.complete(...)` |
| `.env.example` | Template for the key — copy to `.env` |
| `.gitignore` | Keeps `.env` out of git |

`window.llm.complete` **mirrors the hosted `window.claude.complete`** so prototype
code stays portable — a bare string or a `{ messages }` object, always resolving
to a **string**:

```js
const text = await window.llm.complete("Summarize this: ...");
const text = await window.llm.complete({
  messages: [{ role: 'user', content: '...' }],
  system: 'Be terse.',     // optional
  max_tokens: 512,         // optional
});
```

**Prompt logic lives in the PAGE.** One generic `/api/complete` proxy serves
every feature — do not bake a per-feature endpoint (`/api/rewrite`) with the
prompt hardcoded into the server. That's the one-off pattern this skill replaces.

## Quickstart

```bash
cp llm.js llm-proxy.mjs .env.example .gitignore  <your-prototype-dir>/
cd <your-prototype-dir>
cp .env.example .env          # paste your real DeepSeek key into .env
node llm-proxy.mjs            # serves http://localhost:8787/
```

Add `<script src="llm.js"></script>` to your HTML `<head>`, then **open the
printed URL** — serve *through* the proxy, never `file://`, so `/api/complete`
resolves. Wire any control to the model:

```html
<button id="go">Rewrite</button><div id="out"></div>
<script>
  go.onclick = async () => {
    out.textContent = '…';
    out.textContent = await window.llm.complete({
      system: 'Rewrite the text in a professional tone. Return only the text.',
      messages: [{ role: 'user', content: document.getElementById('src').value }],
    });
  };
</script>
```

Get a key at <https://platform.deepseek.com>. Defaults to `deepseek-chat` with a
1024-token cap; override in `.env` (`LLM_MODEL`, `LLM_BASE_URL`, `LLM_MAX_TOKENS`,
`PORT`). Any OpenAI-compatible chat endpoint works.

## Key security — non-negotiable

- The key lives **only** in `.env` (gitignored) — never in the HTML, never in
  `llm.js`, never inline in a `<script>`, never as a URL query param.
- The browser talks only to `localhost`; the proxy talks to the provider.
  **Never `fetch` the provider API directly from the page** (leaks the key, and
  CORS blocks it anyway).
- Don't commit `.env`, and don't paste a real key into the prototype "just to
  test quickly."

## Verify

- `node llm-proxy.mjs` boots and the printed URL serves your prototype.
- A real call renders model text in the UI; with **no/invalid key** you get a
  clear error message, **not a hang**.
- View source / DevTools: the key appears **nowhere** in the page or `llm.js`.
- `.env` is gitignored; `.env.example` holds no real key.
- `window.llm.complete` works for **both** a string and a `{ messages }` object,
  and returns a string.

## Red flags

- API key in the HTML, in a `<script>`, in `llm.js`, or as a `fetch` header in
  the page → it belongs in `.env`, server-side only.
- The page fetching `api.deepseek.com` / `api.anthropic.com` directly → route it
  through the proxy.
- A bespoke per-feature endpoint (`/api/rewrite`, `/api/summarize`) with the
  prompt baked into the server → keep `/api/complete` generic; prompt logic goes
  in the page.
- Opening via `file://` then puzzling over `/api/complete` 404 / CORS → serve
  through the proxy.
- Committing `.env`, or pasting the key in to "just test."
- Standing up the proxy at all when a stubbed response would sell the demo fine.
