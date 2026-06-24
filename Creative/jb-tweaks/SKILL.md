---
name: jb-tweaks
description: Use when making a finished HTML design tweakable — adding a small in-page controls panel so a viewer can adjust key values (brand color, type scale, spacing, a layout variant, a feature flag, headline copy) live and watch the page update, without editing code. Ships a vanilla <tweak-panel> custom element that drives :root CSS custom properties in real time. Builds on jb-design. Triggers on "make it tweakable", "add controls/knobs", "live theme editor", "let me adjust this".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-tweaks: Make a Design Live-Tweakable

## Overview

Add a small, tasteful **in-page controls panel** to a finished HTML design so a
viewer can nudge a few high-impact values — colors, a type scale, spacing, a
layout variant, a feature flag, headline copy — and watch the page respond in
real time, without touching code.

**REQUIRED BACKGROUND:** Use **jb-design** — it owns the process, aesthetic
lanes, and the design tokens you'll be exposing. The page should already keep its
key values in `:root` CSS custom properties (that's how jb-design builds);
tweaking is wiring controls to those vars. If a brand/design system exists, the
curated options you offer must stay on-brand.

**Core principle:** **Expose a few high-impact values through one shared element
— never re-hand-roll a bespoke panel.** A capable agent *can* hand-build a
working `<aside>` + `<script>` for one page, but it's a throwaway: re-derived from
scratch (and slightly differently) for the next design, with raw native controls
and no style isolation. Ship the reusable `<tweak-panel>` instead.

## When to use

When someone wants to *play with* a finished design — explore palettes, dial in a
scale, A/B a layout — live in the page. For building the design itself use
**jb-design** (and **jb-prototype** / **jb-deck** / **jb-doc** for the artifact
type). For a full reusable token library use **jb-design-system**. Tweaks is the
last, thin layer you add on top so the values are adjustable.

## Don't hand-roll the panel — ship the element

Copy **`assets/tweak-panel.js`** next to your design's `.html` and load it. It's a
vanilla shadow-DOM custom element (plain `<script src>`, no build, no CDN). You
declare controls as children; the panel reads each one's destination, **seeds it
from the page's current value** (single source of truth — don't duplicate your
`:root`), and writes back live. It renders in shadow DOM, so tweaking `--ink` or
`--brand` restyles the **page**, never the panel itself.

```html
<script src="tweak-panel.js"></script>
<tweak-panel title="Tweaks">
  <tweak-section label="Theme"></tweak-section>
  <tweak-control var="--brand" type="color" label="Primary"
                 options="#6d5efc,#2A6FDB,#1F8A5B,#D97757"></tweak-control>
  <tweak-control var="--brand,--paper,--ink" type="color" label="Palette"
                 options="#6d5efc|#faf9ff|#15131f, #1F8A5B|#f3faf6|#0f1f17"></tweak-control>
  <tweak-section label="Layout"></tweak-section>
  <tweak-control var="--headline-size" type="slider" label="Headline" min="40" max="88" unit="px"></tweak-control>
  <tweak-control attr="data-density" type="segmented" label="Density" options="compact,regular,comfy"></tweak-control>
  <tweak-control attr="data-theme" type="toggle" label="Dark mode" on="dark" off="light"></tweak-control>
  <tweak-control type="text" target=".hero h1" content label="Headline copy"></tweak-control>
</tweak-panel>
```

**Each control writes to one destination:**

| Destination | Writes | Use for |
|---|---|---|
| `var="--name"` | a CSS custom property on `:root` | colors, sizes, spacing, radii |
| `var="--a,--b,--c"` | a whole palette at once | swap several theme vars together |
| `attr="data-x"` | an attribute on `:root` | a layout variant / theme via `[data-x]` CSS, a feature flag |
| `content` (+ `target`) | an element's text | headline / label copy |

**Control types** (`type`): `color` (curated swatch chips), `slider`, `number`,
`select`, `segmented` (2–3 short options), `toggle`, `text`. Full attribute
reference is in the asset's header comment.

The panel starts collapsed to a discreet launcher; click to open, ✕ or the
launcher to collapse. JS API: `panel.open() / .close() / .toggle() / .show() /
.hide()`. Add `persist` to save a viewer's tweaks to `localStorage`. It fires a
bubbling `tweak-change` event.

## Choose a few high-impact tweaks — keep it tasteful

The panel is a garnish, not a control room. If the user named what to expose, do
exactly that. Otherwise pick **3–6** values that change the *feel* the most:

- **Key colors** — the brand color, or a whole palette swap. Offer **curated
  swatches (3–4 on-brand options), not a free color picker** — a free picker lets
  a viewer wreck the palette and contrast; curated options keep every state good.
- **One layout variant** — density, columns, a compact/comfortable mode — via a
  `segmented` control on a `data-` attribute.
- **A feature flag** — a `toggle` showing/hiding a section or switching a mode.
- **Headline copy** — let them retitle the hero with a `text` control.
- **One or two scale knobs** — headline size, roundness, spacing — as sliders
  with sane `min`/`max` so every position still looks intentional.

Don't expose twenty sliders. Don't expose values that can break the layout at the
extremes. Group related controls under `<tweak-section>` labels.

## Verify

Serve and open in a browser (to screenshot-test, serve — don't `file://`:
`cd <dir> && python3 -m http.server PORT`). Confirm:
- The `<tweak-panel>` upgrades and opens from its launcher.
- Changing a control **updates the live page** — read it back: a swatch/slider
  change moves the real `:root` var (`getComputedStyle(document.documentElement)
  .getPropertyValue('--brand')`), a segmented/attr control flips the `data-`
  attribute, a `content` control rewrites the target text.
- Tweaking an ink/text color recolors the **page, not the panel** (style
  isolation holds).
- The panel **hides cleanly** — collapses to the launcher, and `hidden` (or
  `.hide()`) removes it entirely for the shipped/"Tweaks off" design.
- No console errors except a benign `/favicon.ico` 404 from the test server.

## Red flags

- Hand-writing a bespoke `<aside>` + `<script>` panel for this one page → use
  `<tweak-panel>`; the one-off is a throwaway and drifts per design.
- A **free** `<input type=color>` for a brand/theme color → curate 3–4 swatches.
- Hardcoding the current values into the controls (`value="64"`,
  `value="#6d5efc"`) → let the panel read them from the page's `:root`.
- The panel restyling itself when you tweak `--ink`/`--brand` → that's a
  not-isolated hand-rolled panel; the shipped element renders in shadow DOM.
- Twenty knobs, or sliders whose extremes break the layout → pick a few
  high-impact values with safe ranges.
- No way to turn it off → it must collapse, and be removable for the final design.
