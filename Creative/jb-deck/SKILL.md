---
name: jb-deck
description: Use when building a slide deck or presentation in HTML — pitch decks, board decks, talks, lecture slides, sales decks — typically at 1920×1080. Ships a deck-stage web component (auto-scaling, keyboard/tap nav, speaker notes, slide-count overlay, print-to-PDF) and covers outlining, slide-title discipline, type scales, imagery, and slide composition. Builds on jb-design. Triggers on "make a deck", "slides", "presentation", "pitch deck", "board deck".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-deck: HTML Slide Decks

## Overview

You are a **presentation designer** building a deck for a speaker to present. HTML is your output medium, but your thinking is a consultant/analyst/executive preparing for a boardroom: clarity, narrative flow, back-of-the-room readability. **You are not building a website.** Every slide is both a layout-design problem and a copywriting problem.

**REQUIRED BACKGROUND:** Use **jb-design** first — it owns the design process, questions, aesthetic lanes, anti-slop rules, and scales that this skill assumes.

**Core principle:** The outline is the deck. Write the narrative first; if a reader skims only the slide titles, they should follow the whole story.

## When to use

Any slide presentation. For decks, **two extra questions are mandatory up front** if not already answered (use `AskUserQuestion`): **how long** is the talk (in minutes), and **what aesthetic / design system** (don't ship a generic look). If there's a brand or design system, follow it instead of picking a lane.

## Set up the stage (don't hand-roll scaling/nav)

Copy the bundled **`assets/deck-stage.js`** (in this skill's folder) into your project next to the deck `.html`, then:

```html
<script src="deck-stage.js"></script>
<deck-stage width="1920" height="1080">
  <section data-label="Title" data-speaker-notes="Introduce the team">…</section>
  <section data-label="Agenda" data-speaker-notes="Two minutes max">…</section>
</deck-stage>
```

The component handles letterboxed auto-scaling, keyboard (←/→, PgUp/Dn, Space, Home/End, number keys) + tap nav, a fading slide-count overlay, speaker notes, and **print-to-PDF (one page per slide** — the user prints with Cmd/Ctrl-P). It is vanilla JS — load it with a plain `<script src>`.

**It absolutely-positions and scales every slotted `<section>` for you — never set `position`/`inset`/`width`/`height` on the slide `<section>` elements.**

## Plan first

1. **Ask** if you don't know audience, brand, and duration.
2. **Write the full title sequence** into a `scratchpad.md`. Choose **ONE** grammatical style and hold it:
   - **Textbook style** — short, capitalized nouns: *Market Research · Team Structure · Engagement Overview*
   - **Action titles** — short phrases that carry a claim: *"Asia is our largest market…" · "…but Eastern Europe has the most upside"*
   - Read the titles back alone: can someone follow the story from titles only? (ToC test.)
3. **Define the type scale + spacing as CSS custom properties** before writing any slide, and reference them everywhere:
   ```css
   :root {
     --type-title: 64px; --type-subtitle: 44px; --type-body: 34px; --type-small: 28px;
     --pad-top: 100px; --pad-bottom: 80px; --pad-x: 100px;
     --gap-title: 52px; --gap-item: 28px;
   }
   ```
   Every `font-size` uses a `--type-*`; every padding/gap uses a `--pad-*`/`--gap-*`. At 1280×720, scale by ~0.67. Web defaults (14–16px body, 48px padding) are far too small for slides.
4. **Build the slides,** giving each real attention to layout, copy, and tone.

## Title discipline — avoid AI-isms

Titles should **introduce** a slide, not deliver the speaker's punchline. Avoid:
- "Verdict" titles that overdramatize or manufacture tension — the classic *"It's not X. It's Y."*
- Strong imperatives, suspenseful teases, *"The magic moment"*-style phrasing.

## Slide construction

- **Write slides as static HTML** — not React, not a `<script>` that generates the DOM, not a `.map()` over a JS array. Static markup keeps slides simple, robust, and hand-editable, and is what `deck-stage` expects as slotted children. Reach for scripting only when a slide genuinely needs behavior static markup can't deliver.
- Each piece of text in its **own leaf element**; write **repeated structure out** (three `<li>`s, not one rendered three times).
- **Large type:** titles ≥ 48px. A user's font size means **points** → `px = pt × 1.333` (so "36pt titles" ≈ 48px).
- **Imagery:** full-bleed photos aspect-**fill**; screenshots and diagrams aspect-**fit**; transparent/fit images go on a contrasting background. Text over an image needs a card, protection gradient, or blur. View every image and decide its treatment — don't drop it in raw.
- **No emoji or self-drawn/SVG assets** unless asked; use brand/design-system icons or user-provided images.

## Variety & parallelism

- Mix slide types: full-image, different background colors, a large number/figure, a quote, a table, the occasional text slide. **Avoid too much text** — in your plan, decide which beats are better as a table, diagram, quote, or image. Use 1–2 background colors for the whole deck, max.
- **Parallelism:** section-header slides look identical to each other; repeated elements sit in the same position slide to slide.

## Verification

Open the deck in a browser / screenshot it and check against **slide-composition** rules, not web-layout instincts:
- `align-items: flex-start` with open space in the bottom third is **correct** slide composition, not a defect — the negative space is intentional.
- Confirm: font sizes match the `--type-*` scale, frame padding matches `--pad-*`, titles are parallel across slides, and there are **no accent-border cards or takeaway boxes**.

## Red flags

- Setting `position`/`width`/`height` on slide `<section>`s → let `deck-stage` place them
- Generating slides from a JS array or React → write static markup
- A generic look with no aesthetic chosen / duration unknown → ask first
- Titles that sound like punchlines → rewrite as introductions
- Walls of text → move the content into a table, quote, figure, or image
