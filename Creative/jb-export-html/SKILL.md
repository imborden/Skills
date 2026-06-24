---
name: jb-export-html
description: Use when a finished HTML artifact must work fully offline as ONE portable file by inlining every external reference (linked CSS, script src, Google Fonts, CDN libs, images) as data-URIs. Ships a zero-dependency Node inliner. Builds on jb-design; bundles the output of jb-deck / jb-doc / jb-prototype. Triggers on "standalone HTML", "make it work offline", "single self-contained file", "inline everything", "bundle into one HTML", "email this design".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-export-html: Bundle an Artifact into One Offline File

## Overview

Turn a finished HTML artifact into a **single self-contained `.html`** that works
with no internet — every linked stylesheet, `<script src>`, font, CDN library, and
image folded in as inline text / data-URIs. Portable enough to email or archive.

**REQUIRED BACKGROUND:** Use **jb-design** for the suite context. This bundles the
*output* of jb-deck / jb-doc / jb-prototype / jb-design-system — it doesn't design
anything.

**Core principle:** **Use the shipped inliner — don't hand-roll a throwaway
bundler.** The suite already emits *mostly* self-contained HTML; the only gaps are
external links (Google Fonts especially), CDN libs, and image files. One durable,
zero-dependency tool closes those gaps the same way every time — far better than a
one-off Python/sed script you write and delete per export.

## When to use

- "save as standalone HTML", "make this work offline", "one self-contained file",
  "inline the fonts/CDN/images", "something I can email."
- **NOT** for an **LLM-powered** prototype — those need the live proxy
  (jb-llm-prototypes) and can't be made fully offline; a bundled file has no
  server to call. Export the static shell only, or keep it as a served prototype.

## Use the inliner

Copy **`assets/inline-html.mjs`** wherever it's convenient (or run it in place) and
point it at your artifact:

```bash
node inline-html.mjs <input.html> [output.html]
# default output:  "<input> (standalone).html"
```

Node 18+; zero dependencies (built-in `fetch`). It needs network access **at build
time** (to pull Google Fonts / CDN libs); the **output needs none**. It inlines:

- `<link rel="stylesheet">` → `<style>` — including **Google Fonts**, fetched and
  rewritten to **`@font-face` with woff2 data-URIs** (the part hand-rolled exports
  usually miss).
- `<script src>` → inline `<script>` — including the suite's own assets
  (`deck-stage.js`, `screen-deck.js`, `device-frames.js`, `image-slot.js`,
  `llm.js`).
- `<img src/srcset>`, CSS `url()` / `@import`, `<style>` blocks, favicons, and
  inline `style="…url()…"` → data-URIs / folded in.
- Resource hints (`preconnect`, `preload`) → dropped (pointless offline).

It prints any reference it **couldn't** resolve and won't silently claim success.

## The one thing it can't see: JS-referenced assets

A static bundler cannot discover a resource that exists **only as a string in
JavaScript** — `img.src = "hero.png"`, a CSS-in-JS background, `new Image().src`.
For each such asset, add a meta tag and read it back through `window.__resources`:

```html
<meta name="ext-resource-dependency" content="hero.png" data-resource-id="hero">
<script>
  img.src = window.__resources["hero"];   // was: img.src = "hero.png"
</script>
```

The inliner fetches each `ext-resource-dependency`, injects
`window.__resources = { … }` (as data-URIs) **before** your scripts, and drops the
metas. Without this, the asset stays a broken relative path offline.

## Verify

- The inliner exits reporting **"no external references remain"** (fix and re-run
  anything it lists).
- Open the output and check DevTools **Network**: on reload, **zero requests** to
  any external domain (fonts.googleapis.com, gstatic, CDNs). This is the real test.
- Fonts render from the inlined `@font-face` (the page doesn't fall back to a system
  font); images and backgrounds all show.
- Grep the file: no `src="http`, `href="http`, or `url(http` remain (data-URIs
  only).
- Any image/font referenced **only in JS** got an `ext-resource-dependency` meta.
- Deliver the file by writing it locally (no Pencil zip / download step) — it is
  the artifact.

## Red flags

- Writing a one-off Python/`sed`/regex inliner per export, then deleting it → use
  the shipped `inline-html.mjs`; it's durable and handles every suite pattern.
- Adding a dependency (`html-inline`, `inline-source`, Puppeteer) → the inliner is
  zero-dep.
- Leaving the Google Fonts `<link>` external "because it usually loads" → not
  offline; inline the `@font-face` + woff2.
- Calling it done without checking the Network tab shows zero external requests.
- A JS-string-referenced image left as a relative path → add the
  `ext-resource-dependency` meta.
- Trying to bundle an LLM-powered prototype into an offline file → it needs the
  proxy; it can't run offline.
