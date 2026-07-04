---
name: rk-wireframe
description: Use when exploring design ideas fast and broad — wireframes, lo-fi mockups, storyboards, mapping the design space before committing to a direction — when you want several rough, distinct approaches rather than one polished screen. Lo-fi by design: simple shapes, placeholder text, a sketchy hand-drawn vibe, minimal color. Builds on rk-design (process only; hi-fi aesthetics deliberately suspended). Triggers on "wireframe", "lo-fi", "rough mockup", "sketch the flow", "explore ideas", "storyboard".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# rk-wireframe: Lo-Fi Exploration

## Overview

Help the user explore the design space **quickly and broadly** before anyone commits to a direction. The goal is breadth, not polish: map several genuinely different ways to solve the problem so the user can react to structure and flow.

**REQUIRED BACKGROUND:** Use **rk-design** for the *process* (interview, no filler, structure, verification). But wireframe mode **deliberately suspends rk-design's hi-fi aesthetic rules** — here, placeholder boxes, minimal color, and a sketchy hand-drawn font are the *point*, not slop. Don't pick an aesthetic lane; don't reach for real assets or distinctive display type.

**Core principle:** Breadth over polish. Show **3–5 distinctly different approaches** per idea, not one refined screen.

## When to use

Early-stage ideation, flow mapping, "what are our options" moments. **Not** for final visuals, client-ready mockups, or anything that needs to look real.

**Next — once a direction is chosen:** if the work is more than a one-off screen, set up **rk-design-system** first to lock tokens, type, and brand so the hi-fi build stays consistent across sessions; *then* build the real thing with **rk-prototype** (interactive) or a hi-fi **rk-design** artifact. For a true one-off, skip the system and go straight to the hi-fi build.

**Decision log:** when the user picks a direction, append two lines to `design-decisions.md` in the project (create it if missing) — the winner and why, plus the date — so the rationale survives the session:
```
2026-07-04 — Picked B (Top tabs): sidebar ate too much width on the data-heavy table view.
```

## The approach

1. **Interview** (rk-design questions): what's the screen/flow, who uses it, what must it accomplish, what's unresolved.
2. **Generate 3–5 rough directions** that differ *structurally* — not the same layout recolored. E.g. sidebar-nav vs. top-tab vs. command-palette; wizard vs. single-form; feed vs. dashboard.
3. **Keep them rough.** Resist polishing. A wireframe that looks finished invites bikeshedding on pixels instead of structure.

## Lo-fi visual language

- **Sketchy, readable hand font** from Google Fonts — `Shantell Sans`, `Patrick Hand`, or `Kalam`. Readable first, sketchy second.
- **Placeholder text as gray bars**, not real copy: `background:#d8d6d0; height:12px; border-radius:2px` (vary widths). Use real words only for labels that carry meaning (nav items, button verbs).
- **Image/media placeholders:** a bordered box with a diagonal-cross or a small "image" label — not a real photo, not an SVG illustration.
- **Minimal color:** black/grays on white, plus **one** accent to mark the primary action or the thing being explored. No gradients, no shadows beyond a faint card lift.
- **Simple shapes:** thin borders, blocky regions, obvious hit areas. Structure should read at a glance.

## Show the options side-by-side

Lay every direction out as **labeled frames**, loaded via the shared asset — don't hand-roll the wrapper:

```html
<script src="wireframe-row.js"></script>

<wireframe-row>
  <wireframe-frame label="A — Sidebar nav" width="360">…wireframe…</wireframe-frame>
  <wireframe-frame label="B — Top tabs" width="480">…wireframe…</wireframe-frame>
  <!-- C, D … as many as needed -->
</wireframe-row>
```

It works because the page BODY scrolls, the gray canvas is `width:max-content` so it extends with that scroll, and frames lay out left-aligned with no centering — see `Creative/rk-wireframe/assets/wireframe-row.js`.

For many or large options, a tab control beats an endless horizontal row. Offer a few **simple tweaks** (toggle density, swap a nav pattern) so the user can poke at a direction.

## Red flags

- Producing **one** option → the job is breadth; show 3–5
- Variants that differ only in color/spacing → make them structurally different
- Polishing toward hi-fi (real assets, distinctive type, a chosen lane) → that's rk-prototype's job, not this
- Centering the frame row or scrolling an inner wrapper → frames get cut off; let the body scroll
- Dropping `width:max-content` from the gray canvas → the fill clips at the viewport edge instead of extending with the scroll
- Lorem-ipsum everywhere → bars for body, real words only for meaningful labels
