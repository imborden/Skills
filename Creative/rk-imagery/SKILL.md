---
name: rk-imagery
description: Use when sourcing real imagery for a design artifact or deciding how an image should sit on the page — finding a licensed photo, checking what's already in a brand kit, or fixing an image that got dropped in raw. Establishes the sourcing order (user assets → brand assets → licensed stock → opt-in generated → placeholder, in that order) and the canonical treatment rules (fill vs fit, background, text protection, alt text) that rk-deck, rk-doc, and rk-prototype call into mid-build. Builds on rk-design — this is the positive path for the imagery bans rk-design owns (no SVG-drawn illustration, no fabricated photos). Triggers on "find images", "source photos", "what image goes here", "image treatment".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# rk-imagery: Sourcing and Treating Real Imagery

## Overview

Get a real image into a design artifact the right way, and make it sit
correctly once it's there. This is what stops a build from dead-ending at a
gray placeholder box every time it needs a photo.

**REQUIRED BACKGROUND:** Use **rk-design** — it bans SVG-drawn illustration
and fabricated photos as the default failure mode. Those bans stay in
rk-design; this skill is the positive path — what to reach for instead.

**Core principle:** Source real imagery in order, never skip straight to a
placeholder or a generated image, and never drop an image in without
deciding how it sits.

## When to use

Any point mid-build where an image needs to land — sourcing it and deciding
its treatment. Called **by** rk-deck, rk-doc, and rk-prototype whenever they
hit an image slot; it isn't a standalone deliverable.

**Not for:** icon strategy in a design system — **rk-design-system** owns
the copy-don't-draw icon rules, load that instead. **Not for** wireframe-stage
placeholders — rk-wireframe's gray boxes and diagonal-cross markers are
deliberately rough and stay that way until the hi-fi build; don't source real
imagery for a wireframe.

## Sourcing order

Work top to bottom. Only drop to the next rung when the current one is
genuinely unavailable — don't skip ahead because it's easier.

1. **User-provided assets.** Photos, screenshots, logos the user attached or
   can supply. Ask before assuming there are none.
2. **Brand / design-system `assets/`.** If rk-design-system produced a
   project folder, its imagery lives there — check it before searching
   outside the project.
3. **Curated licensed stock.** Search a free-license library — Unsplash,
   Pexels, or an equivalent — and note the source URL and license next to
   the credit. Match the aesthetic lane, don't grab the first generic hit.
4. **Generated imagery, opt-in only.** Only when the user explicitly asks
   for AI-generated imagery. Label it as generated (filename or a visible
   caption/credit) — never present it as a photo.
5. **`<image-slot>` placeholder — last resort, not a first move.** The
   drag-drop placeholder shipped in rk-prototype's `assets/` for the user's
   own material. Reach for it only after 1–4 are ruled out.

## Treatment rules (canonical home)

These rules live here; rk-deck, rk-doc, and rk-prototype apply them, they
don't restate them.

- **Full-bleed photos:** aspect-**fill** — crop to fill the frame.
- **Screenshots and diagrams:** aspect-**fit** — never crop legibility away.
- **Transparent or fit images** sit on a contrasting background, not raw on
  the page background.
- **Text over an image** needs a card, a protection gradient, or a blur —
  pick one deliberately, don't just drop text on a busy photo and hope.
- **View every image and decide its treatment.** Never drop one in raw at
  its native crop and size.
- **Alt text is required on every meaningful image.** Purely decorative
  images get empty alt (`alt=""`), not a skipped attribute.

## Verify

- Every image in the artifact traces to a rung in the sourcing order, or is
  explicitly labeled generated, or is a deliberate last-resort placeholder.
- Each image has a stated treatment: fill vs fit, background decided, and a
  text-protection method if text overlays it.
- Every meaningful image has non-empty alt text; purely decorative images
  have `alt=""`.

## Red flags

- Reaching for a placeholder or generated image before checking user assets,
  brand assets, or licensed stock → work the sourcing order top-down.
- Generated imagery with no explicit user opt-in, or shipped unlabeled →
  ask first, then label it visibly.
- An image dropped in at native crop with no fill/fit decision → pick one
  and apply it.
- Text sitting on an image with no card, gradient, or blur → add protection.
- A meaningful image with missing or placeholder alt text → write real alt
  text.
