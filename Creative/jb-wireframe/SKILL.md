---
name: jb-wireframe
description: Use when exploring design ideas fast and broad — wireframes, lo-fi mockups, storyboards, mapping the design space before committing to a direction — when you want several rough, distinct approaches rather than one polished screen. Lo-fi by design: simple shapes, placeholder text, a sketchy hand-drawn vibe, minimal color. Builds on jb-design (process only; hi-fi aesthetics deliberately suspended). Triggers on "wireframe", "lo-fi", "rough mockup", "sketch the flow", "explore ideas", "storyboard".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-wireframe: Lo-Fi Exploration

## Overview

Help the user explore the design space **quickly and broadly** before anyone commits to a direction. The goal is breadth, not polish: map several genuinely different ways to solve the problem so the user can react to structure and flow.

**REQUIRED BACKGROUND:** Use **jb-design** for the *process* (interview, no filler, structure, verification). But wireframe mode **deliberately suspends jb-design's hi-fi aesthetic rules** — here, placeholder boxes, minimal color, and a sketchy hand-drawn font are the *point*, not slop. Don't pick an aesthetic lane; don't reach for real assets or distinctive display type.

**Core principle:** Breadth over polish. Show **3–5 distinctly different approaches** per idea, not one refined screen.

## When to use

Early-stage ideation, flow mapping, "what are our options" moments. **Not** for final visuals, client-ready mockups, or anything that needs to look real.

**Next — once a direction is chosen:** if the work is more than a one-off screen, set up **jb-design-system** first to lock tokens, type, and brand so the hi-fi build stays consistent across sessions; *then* build the real thing with **jb-prototype** (interactive) or a hi-fi **jb-design** artifact. For a true one-off, skip the system and go straight to the hi-fi build.

## The approach

1. **Interview** (jb-design questions): what's the screen/flow, who uses it, what must it accomplish, what's unresolved.
2. **Generate 3–5 rough directions** that differ *structurally* — not the same layout recolored. E.g. sidebar-nav vs. top-tab vs. command-palette; wizard vs. single-form; feed vs. dashboard.
3. **Keep them rough.** Resist polishing. A wireframe that looks finished invites bikeshedding on pixels instead of structure.

## Lo-fi visual language

- **Sketchy, readable hand font** from Google Fonts — `Shantell Sans`, `Patrick Hand`, or `Kalam`. Readable first, sketchy second.
- **Placeholder text as gray bars**, not real copy: `background:#d8d6d0; height:12px; border-radius:2px` (vary widths). Use real words only for labels that carry meaning (nav items, button verbs).
- **Image/media placeholders:** a bordered box with a diagonal-cross or a small "image" label — not a real photo, not an SVG illustration.
- **Minimal color:** black/grays on white, plus **one** accent to mark the primary action or the thing being explored. No gradients, no shadows beyond a faint card lift.
- **Simple shapes:** thin borders, blocky regions, obvious hit areas. Structure should read at a glance.

## Show the options side-by-side

Lay every direction out as **labeled frames in plain HTML** so they compare directly and each stays editable. Let the page body scroll; never `overflow:auto` an inner wrapper, and never center the row (`justify-content:center` / `margin:auto` pushes frames off the left edge where scroll can't reach).

```html
<div style="min-width:100%; min-height:100vh; width:max-content;
            box-sizing:border-box; padding:48px; background:#e7e5df">
  <div style="display:flex; gap:48px; align-items:flex-start">

    <div style="flex:none; width:360px">
      <div style="font:600 13px/1.4 system-ui; margin-bottom:12px">A — Sidebar nav</div>
      <div style="background:#fff; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,.08);
                  min-height:640px; padding:20px">…wireframe…</div>
    </div>

    <!-- B, C, D … each flex:none with a fixed pixel width -->

  </div>
</div>
```

The outer wrapper carries the gray background **and** `width:max-content` (so the gray extends with the scroll). Each frame is `flex:none` at a fixed width: a small label above a white card.

For many or large options, a tab control beats an endless horizontal row. Offer a few **simple tweaks** (toggle density, swap a nav pattern) so the user can poke at a direction.

## Red flags

- Producing **one** option → the job is breadth; show 3–5
- Variants that differ only in color/spacing → make them structurally different
- Polishing toward hi-fi (real assets, distinctive type, a chosen lane) → that's jb-prototype's job, not this
- Centering the frame row or scrolling an inner wrapper → frames get cut off; let the body scroll
- Lorem-ipsum everywhere → bars for body, real words only for meaningful labels
