---
name: jb-design-system
description: Use when creating a reusable design system, brand kit, token library, or UI kit that later design work pulls from — so decks, docs, and prototypes built in separate sessions stay on one brand. Produces a project folder (tokens, fonts, components, brand guide, specimen sheet) the other jb-* skills read as context, optionally wrapped as a /{brand}-design skill. Builds on jb-design. Triggers on "create a design system", "set up our brand tokens", "UI kit", "component library".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-design-system: Reusable Token + Component Libraries

## Overview

Build a **design system**: a project folder that is the single source of truth
for a brand's look — tokens, fonts, components, a brand guide, a specimen sheet —
so every later artifact (deck, doc, prototype) stays on-brand across sessions.
Unlike the other jb-* skills, the deliverable is **not one artifact** — it's the
shared context they all read.

**REQUIRED BACKGROUND:** Use **jb-design** — it owns the design process,
aesthetic lanes, anti-slop bans, and scales. This skill governs the system's
**structure and consumption contract**; jb-design governs the craft inside it.

**Core principle:** A design system is only as good as it is *consumable*. Commit
to ONE predictable structure and ONE entry point, so a future session reads the
tokens + brand guide and stays perfectly aligned — never guessing token names,
never reinventing the folder.

## When to use

- "create a design system / brand kit / token library / UI kit / component library"
- Before a multi-artifact effort that must stay consistent across sessions.
- **NOT** for a single one-off artifact — just use jb-design + the right product
  skill (jb-deck / jb-doc / jb-prototype).

**Greenfield vs. existing brand:** When there's **no brand**, jb-design's lane
rule applies — pick exactly one lane, declare it, and bake it into the tokens.
When a **codebase/brand/Figma is the source**, this skill is about *extracting
and codifying* what exists — not inventing.

## Source of truth — get this right or stop

This is the highest-stakes part when a real brand exists. Discipline:

- **Codebase or Figma > screenshots.** Recreate UIs from the codebase, or Figma's
  design context — **never from screenshots alone** unless you have no other
  option. Never guess at token names; read them from the source.
- **Copy real assets; never draw them.** Copy logos, icons, illustrations into
  `assets/` programmatically. **Never** draw your own SVGs or generate images.
  For icons: first copy the codebase's own icon font/sprite/SVGs; else link a CDN
  set (Lucide, Heroicons); else substitute the closest match and **flag it**.
  Don't read SVG source — if you know an icon's usage, just copy and reference it.
- **Missing fonts → nearest Google Fonts match, and flag the substitution.**
- **STOP if a named resource is inaccessible.** If a codebase or Figma URL was
  attached/mentioned but you can't reach it, **stop and ask the user to
  re-attach** — do not spend effort building a system off partial sources.
- Otherwise **run independently** to completion; only halt for a true blocker.

## What you produce, and the build sequence

A **project folder** (in the user's project, not in `~/.claude/skills/`):
`styles.css` entry · `tokens/` · `components/` · `assets/` · `ui_kits/` (replicate
real screens, or one illustrative greenfield starter) · `specimen.html` ·
`readme.md`.

Read **`references/design-system-structure.md`** for the full layout, the
step-by-step build checklist, and copy-paste templates (styles.css, two-layer
tokens, a component, the readme sections, UI kits, the optional skill wrapper).
The load-bearing contract, inline:

- **One fixed entry point: `styles.css` at the folder root, `@import` lines
  only.** Consumers must never guess where the system lives. (Accept an existing
  `index.css`/`globals.css`/`theme.css`/`tokens.css` if one already exists.)
- **Tokens are two-layer:** primitives (raw palette/scale) → **semantic aliases**
  (role-based — `--color-brand`, `--text-h1`, `--space-3`). Reference the
  semantic layer everywhere; re-theming then touches only the mapping. Define
  color in `oklch`.
- **The brand guide (`readme.md`) MUST contain two named sections** — fill both
  with concrete examples, not adjectives:
  - **CONTENT FUNDAMENTALS** — tone, casing, person (I/you/we), emoji policy,
    in-voice vs off-voice example sentences.
  - **VISUAL FOUNDATIONS** — color roles, type pairing + scale, spacing, motion,
    **hover/press states**, borders/shadows/radii, imagery vibe.
- **Components are plain HTML/CSS partials** referencing semantic tokens — not
  React `.jsx` needing a compiler (the suite ships self-contained HTML). Mirror
  the user's production framework only if codifying an existing React/Vue app.
- **One `specimen.html`** that renders every token group + component for a human
  to eyeball — not many tiny gallery files.

## How the other jb-* skills consume this

Point the consuming session at the folder. It then, before designing:
1. Reads `readme.md` (both named sections) — the voice + visual contract.
2. Reads `tokens/` — the exact token names.
3. **Because the suite ships single self-contained HTML, the primary consumable
   is the `:root` token block — copied into the artifact's `<style>` verbatim.**
   Link `styles.css` only for multi-file artifacts. Either way, reference
   semantic tokens; never hardcode a color/size/font.

## Optional final step — wrap as a `/{brand}-design` skill

If the user wants to invoke the system by name later, add a `SKILL.md` at the
folder root and install the folder as a skill (template + paths in the reference
doc). Then `/{brand}-design` loads the whole system on demand.

## Verify

- `styles.css` exists at the root and is `@import` lines only.
- Tokens have both primitive and semantic layers; `readme.md` has **both**
  CONTENT FUNDAMENTALS and VISUAL FOUNDATIONS sections with concrete examples.
- Components reference semantic tokens (no raw hex); assets are copied, not drawn.
- `specimen.html` opens in a browser and every token/component resolves.
- A fresh reader could build a new on-brand artifact from this folder alone.

## Red flags

- Inventing a system from screenshots when a codebase/Figma was provided → use
  the real source; stop and ask if you can't reach it.
- Drawing logos/icons/illustrations as SVG → copy real assets; CDN-substitute and
  flag if needed.
- An idiosyncratic entry point (`css/app.css`, `main.css` in a subfolder) →
  `styles.css` at the root, predictable for every consumer.
- Tokens with no semantic layer, or a brand guide missing the two named sections.
- Authoring React components + a build step for a plain-HTML suite → HTML/CSS
  partials.
- Inventing a *new* product design in a UI kit when codifying an existing product
  → replicate its real screens. (Greenfield gets one *illustrative* starter
  screen, labeled as such — not a fabricated spec.) Bias to a small real set.
