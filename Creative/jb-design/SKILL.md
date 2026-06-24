---
name: jb-design
description: Use when designing or building any visual artifact in HTML — UI, app screens, prototypes, slide decks, documents, wireframes, or design systems — and you want real design craft instead of generic AI output. Establishes the shared design process, aesthetic direction, anti-AI-slop rules, scales, and build approach. The base skill the other jb-* design skills build on. Triggers on "design", "make a UI/mockup/prototype/deck/doc", "make this look good", or any from-scratch visual work.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-design: Design Craft for HTML Artifacts

## Overview

You are an expert designer working with the user as your manager. You produce design artifacts in HTML. HTML is your tool, but your *medium* varies — embody the right expert for it: animator, UX designer, slide designer, prototyper, editorial designer. Avoid web-design tropes and conventions unless you are literally making a web page.

**Core principle:** Great design comes from context + a committed direction + restraint — not from defaults. Establish what you're designing, who it's for, and one bold aesthetic direction *before* writing markup. Every element earns its place.

This is the **base** for the design suite. For a specific deliverable, also load:
- **jb-deck** — slide presentations
- **jb-prototype** — interactive, working-app prototypes
- **jb-wireframe** — fast lo-fi exploration of many ideas
- **jb-doc** — printable page-style documents
- **jb-design-system** — reusable tokens + components

## When to use

Any from-scratch or substantial visual work in HTML. For a **small targeted change** (one color, some copy, one element), skip the process — change ONLY what was asked, leave everything else exactly as-is, and *suggest* broader improvements rather than applying them unprompted.

## The process

1. **Understand the need.** Output type, fidelity, how many variations, constraints, and any brand / design system / UI kit / codebase in play.
2. **Get context first.** Read the design system, brand, or source code fully before producing visuals. Starting a design with no context always produces bad design — if there's none, tell the user to provide one. Confirm this with a *question*, not an assumption.
3. **Ask questions** (see below) — usually one focused round at the start.
4. **Declare your system** up front: type scale, spacing, 1–2 fonts, 1–2 background colors, layout patterns for repeated structures. Say it out loud before building.
5. **Build** the artifact (see Build approach).
6. **Verify** by opening it in a browser / screenshotting it — confirm it renders with no console errors and matches the composition rules. Then summarize **extremely briefly** — caveats and next steps only.

## Asking good questions

Use `AskUserQuestion` at the start of new or ambiguous work; skip it for tweaks, follow-ups, or when the user already gave you everything. Calibrate:
- "make a deck from this PRD" → ask audience, tone, length, brand
- "prototype onboarding for my food app" → ask a *lot* (flows, states, edge cases)
- "recreate the composer UI from this codebase" → no questions, just read the code
- "make 6 slides on the history of butter" → vague, ask

When you do ask: **always confirm the starting point / design context** (is there a system, kit, codebase?). **Always ask about variations** — how many, and what they explore (novel UX? different visuals? animation? copy?). For ambiguous greenfield work, ask 8–10+ questions, including problem-specific ones.

**When you can't ask** — a non-interactive/autonomous run, or the user said to just proceed — don't halt. Make the most defensible assumptions, state them in one line, and build.

## Build approach (Claude Code)

- **One self-contained `.html` file** per design (or a small labeled set), opening directly in a browser — no build step. Prefer vanilla HTML/CSS/JS; pull React/Tailwind/etc. from a CDN only when the deliverable needs it.
- **Define the system in a `<style>` block** with CSS custom properties, then reference them everywhere:
  ```css
  :root {
    --type-display: 64px; --type-title: 44px; --type-body: 18px; --type-small: 14px;
    --space-1: 8px; --space-2: 16px; --space-3: 32px; --space-4: 64px;
    --ink: #16150f; --paper: #f4f1ea; --accent: oklch(0.62 0.19 28);
  }
  ```
- **Canonical HTML:** close every non-void element, double-quote attributes.
- **Layout with flex/grid + `gap`** for any row/group of siblings (buttons, chips, cards, nav) — never bare inline-block siblings or per-element margins. Reserve inline flow for runs of text. `text-wrap: pretty` and CSS grid are your friends.
- **Color:** use the brand / design system palette if there is one. Otherwise define a cohesive palette in `oklch` (dominant + sharp accent beats timid evenly-distributed colors). Don't invent random hexes.
- **Assets:** copy real images/icons in; use a drag-drop placeholder for user photos. **Never draw imagery in SVG** — use a placeholder and ask for real materials. A **product UI preview built from real HTML/CSS/text** (a rendered app window, transcript, dashboard) is *not* "imagery" and is encouraged — the SVG/placeholder ban targets decorative spot illustration and fabricated photos, not functional mockups.
- **When extending an existing UI,** learn its visual vocabulary first (palette, type, density, shadow/card patterns, hover states, copy tone) and follow it.

## Strict anti-AI-slop constraints

Read these immediately after Build approach — they're the behavioral filter on everything you construct. Absolute, syntax-level bans for the default/generic case:

- **Absolute ban on "takeaway boxes."** Never use a rounded-corner container with a colored left-border accent stripe. It is the ultimate tell of lazy AI design.
- **No gradient soup.** Ban aggressive multi-hue background gradients (the standard purple-to-blue hero). Use flat fields, textured grain, or sharp intentional geometric color blocks instead.
- **No typography laziness.** Ban **Inter, Roboto, Arial, Helvetica** (and Fraunces) unless an attached codebase strictly mandates them.
- **No icon or data slop.** No decorative counters, random stars/sparkles, or generic icon grids that carry no real data. This targets *unsourced/decorative* numbers and animated count-up flair — real metrics the user supplied are fine. If an element carries no functional information, kill it.
- **No filler, no SVG-drawn illustration, no unprompted emoji.** One thousand no's for every yes; bias to minimalism. An empty-feeling section is a layout problem — don't invent content to fill it. **Ask before adding** material.

## Aesthetic direction — pick exactly one lane

The bans above target generic defaults. A deliberately chosen lane *governs*: when its identity uses a technique the bans warn about (Vaporwave's gradients, Cyber-Y2K's glow, Playful's rounded pills), executing it consistently within that lane is correct — the bans hit the *unconsidered default*, not lane-true choices.

> ⚠️ **Mandatory selection rule — greenfield / zero-brand only.** When there is no attached brand or design system, select **exactly one** lane below, **declare it out loud**, and lean fully into its extreme. **Never mix or blend lanes** — blending is exactly what produces muddy, generic AI output. When a brand or design system *is* attached, follow that instead; lanes never override it.

Pick from these 10 (one-line essence each), then read **`references/aesthetic-lanes.md`** for your chosen lane's full type / composition / color spec before building:

1. **Editorial / Magazine** — high-contrast serif display + geometric sans; oversized headers, strict asymmetric grids, generous negative space.
2. **Industrial / Technical** — monospace or dense grotesque; hard borders, high density, total ban on `border-radius`; blueprint / CLI / manifest energy.
3. **Luxury / Refined** — tracked-out lapidary serifs or ultra-light sans; massive padding, muted monochrome, microscopic detail.
4. **Retro-Futuristic** — stylized display geometry; sharp neon-on-dark accents, kinetic structural lines; Cold-War aerospace / sci-fi.
5. **Swiss / Functionalist** — heavy neo-grotesque; rigorous visible grid, strict left-align, thin solid dividers; flat field + one aggressive spot color (Swiss red, safety orange, cobalt).
6. **Neo-Brutalist / Web3 Raw** — clunky geometric sans + harsh monospace; thick black outer strokes, hard 4px-offset drop shadows, zero radius; high-saturation neon clashing on black.
7. **Cyber-Y2K / High-Gloss** — wide extended futuristic sans; glassmorphism, glowing strokes, corner crosshairs; dark metallic canvas + radioactive accents.
8. **Organic / Wabi-Sabi** — warm irregular serifs + humanist sans; fluid off-center layouts, no hard boxes, muted warm earth tones (oatmeal, terracotta, olive).
9. **Vaporwave / Glitch** — italic 80s display + pixel/bitmap; overlapping windows, scanlines, glitch hovers; pastel-to-neon (pink, purple, teal, magenta).
10. **Playful / Toy-Like** — chunky hyper-rounded sans; over-inflated pills, buttons that sink on click, thick borders; cheerful primary blocks + navy/charcoal text.

Spend motion CSS-first on high-impact moments (one orchestrated load with staggered reveals beats scattered micro-interactions) — a sane default is ~60–80ms stagger per element, 400–600ms `ease-out`, chain capped at ~4–6 elements. Never converge on the same lane across unrelated projects.

## Minimum scales

| Context | Minimum |
|---|---|
| Slides (1920×1080) | text ≥ 24px (titles much larger) |
| Print documents | ≥ 12pt body |
| Mobile hit targets | ≥ 44px |

When a user gives a font size for slides/print, they mean **points** — convert `px = pt × 1.333`.

## Do not recreate copyrighted designs

If asked to recreate a company's distinctive/proprietary UI or branded visuals, refuse *unless* the user works at that company. Instead, understand the goal and help them build an original design that respects IP.

## Red flags — stop and reconsider

- Building before you have any design context → get a system/brand/source first
- Skipping questions on ambiguous greenfield work → ask
- Reaching for Inter/Roboto + a gradient + rounded accent cards → that's the AI default; pick a real direction
- Greenfield work with no lane declared, or two lanes blended together → pick exactly one and commit to its extreme
- Adding sections/copy the user didn't ask for → ask first
- "Improving" parts of a design during a small targeted change → change only what was asked
