---
name: jb-prototype
description: Use when building an interactive, animated app prototype in HTML — multi-screen flows, tappable UI, state, form validation, animated screen transitions, micro-interactions — usually inside a phone or browser device frame. Ships vanilla device-frame + screen-deck custom elements and an image placeholder, all self-contained (no build, no CDN). Builds on jb-design. Triggers on "prototype", "interactive mockup", "clickable prototype", "make it feel real", "onboarding flow", "app demo".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-prototype: Interactive, Animated App Prototypes

## Overview

Build a prototype that **feels like a real working app** — multi-screen
navigation, state, form validation, animated transitions, and micro-interactions
— not a static mockup. Usually it lives inside a phone or browser device frame.

**REQUIRED BACKGROUND:** Use **jb-design** — it owns the process, aesthetic
lanes, anti-slop bans, and scales. If a brand/design system exists, also load it
(or **jb-design-system** to build one first); pull its tokens in.

**Core principle:** **Native-first.** A self-contained HTML file with CSS, the
Web Animations API, and plain-JS state delivers full interactivity AND animation
— and for motion, native is *better* than React, which adds nothing here and can
fight 60fps. Don't reach for a framework to make something feel alive.

## When to use

Interactive, working-app prototypes: onboarding flows, app demos, clickable
mockups, multi-step forms. For static slides use **jb-deck**; for a printable
document use **jb-doc**; for fast lo-fi exploration use **jb-wireframe**.

## Don't hand-roll the plumbing — three shipped primitives

Copy what you need from this skill's **`assets/`** next to your prototype `.html`.
All are vanilla custom elements (plain `<script src>`, no build, no CDN), so they
compose with each other and with any content.

| Asset | Element(s) | Job |
|---|---|---|
| `screen-deck.js` | `<screen-deck>` / `<screen-panel>` | Multi-screen nav + animated transitions, done right |
| `device-frames.js` | `<ios-frame>` `<android-frame>` `<macos-window>` `<browser-window>` | Real-spec device chrome around your screens |
| `image-slot.js` | `<image-slot>` | Drag-drop placeholder for the user's own photo/logo |

```html
<script src="device-frames.js"></script>
<script src="screen-deck.js"></script>
<ios-frame dark>
  <screen-deck transition="push">
    <screen-panel name="welcome">…<button data-go="connect">Get started</button></screen-panel>
    <screen-panel name="connect">…<button data-go="done">Continue</button></screen-panel>
    <screen-panel name="done">…</screen-panel>
  </screen-deck>
</ios-frame>
```

- **`<screen-deck>`** stacks panels, shows one at a time, and animates between
  them (`transition="push|fade|none"`). It handles the traps you'd otherwise hit
  by hand: only the active panel receives clicks, focus moves to the new screen,
  and it collapses to instant under `prefers-reduced-motion`. Navigate
  declaratively with `data-go="<panel-name>"` on any control, or in JS:
  `document.querySelector('screen-deck').go('connect')`. It emits `screen-change`.
- **`<ios-frame>` / device frames** provide the bezel, status bar, and home
  indicator / window chrome — **so you never redraw device chrome.** Your screens
  go in the slot. See `references/prototype-patterns.md` for each frame's
  attributes.
- **`<image-slot>`** for any user-supplied image — never fabricate a photo.

## Interactivity & animation — native recipes

Build behavior with plain JS + CSS; reach for the patterns in
**`references/prototype-patterns.md`** (state, validation, the screen-router
internals, the View Transitions alternative, gesture/scroll motion). Defaults:

- **State:** plain JS — `classList`/`dataset` toggles, a small state object,
  `<dialog>` for modals. No framework for moderate complexity.
- **Animation:** CSS `transition`/`@keyframes` for hover/press/reveal; the **Web
  Animations API** (`el.animate(...)`) for one-off orchestrated moments; **View
  Transitions** (`document.startViewTransition`) for animated DOM swaps. Follow
  jb-design's motion default (~60–80ms stagger, 400–600ms ease-out, capped
  chains). **Always include a `prefers-reduced-motion` path.**
- **Micro-interactions earn their place** — button press/ripple, a check that
  draws in, a staggered list reveal. Tasteful, not a fireworks show.

## When React IS worth it (the escape hatch)

Only for **genuinely complex shared state** (many interdependent components, a
real data layer). Then load React + ReactDOM + Babel from CDN as a deliberate,
documented choice — and know you've traded away offline/self-contained. The
device frames still wrap it: put your React root inside the frame's slot. For
**LLM-powered** prototype behavior, use the **jb-llm-prototypes** helper (keeps
the API key in a local proxy, never in the HTML) — don't inline a key.

## Verify

Serve and open in a browser (file:// is fine for the user; to screenshot-test,
serve: `cd <dir> && python3 -m http.server PORT`). Confirm:
- Each screen transition animates (no instant cut), and **only the visible
  screen is clickable**.
- State works (toggles, disabled-until-valid, dynamic content) and a full pass
  through the flow returns to a sane state.
- Device chrome comes from the frame element (you didn't redraw a status bar).
- `prefers-reduced-motion` collapses motion (emulate it in DevTools).
- No console errors except a benign `/favicon.ico` 404 from the test server.

## Next — hand off to engineering

Once the prototype is approved and the flow holds together, hand it to
**jb-productionize** to turn it into a developer implementation spec (screens,
states, tokens, exact behavior). That spec is the **input** engineers — or
**jb-plan** — build from; don't start writing production code straight from the
prototype.

## Red flags

- Reaching for React/CDN to make something *interactive or animated* → native
  does both, self-contained; React is only for complex shared state.
- Hand-building a phone bezel / status bar, or **drawing SVG device chrome** →
  use the frame element.
- Hand-rolling screen switching and hitting click-through/focus/motion bugs →
  use `<screen-deck>`.
- Animations with no `prefers-reduced-motion` fallback.
- Inlining an API key for LLM features → use jb-llm-prototypes' proxy.
- Fabricating a user photo/logo → use `<image-slot>`.
