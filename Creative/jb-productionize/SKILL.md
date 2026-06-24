---
name: jb-productionize
description: Use when you have a finished HTML design, mockup, or prototype and need to hand it to engineers to rebuild it in a real codebase — a developer implementation spec, not production code and not a build plan. Builds on jb-design; its spec can feed jb-plan. Triggers on "dev handoff", "hand this off to developers", "spec this for engineering", "implement this design in our app", "productionize this mockup".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# jb-productionize: Design → Implementation Spec

## Overview

Take a finished HTML design artifact and produce an **implementation spec** a
developer (or a coding agent) uses to rebuild it in a real codebase — in that
codebase's own framework, design system, and patterns. The deliverable is a
**spec folder**, not code and not a build plan.

**REQUIRED BACKGROUND:** Use **jb-design** — it owns the design vocabulary
(tokens, type/space scales, motion, lanes) you read *out* of the artifact and
name in the spec. If the artifact was built from a **jb-design-system** folder,
load that too and reference its exact token names.

**Core principle:** **The HTML is a design reference, not production code.** Your
job is to describe *what to build and how faithfully* — measurements, tokens,
states, behavior — so engineers recreate it in their stack. Never tell them to
copy the prototype HTML, and don't pre-write the production components yourself.

## When to use

- A finished mockup / prototype / deck → "hand off to engineering", "dev
  handoff", "spec this for the build", "implement this in our real app".
- **NOT** for producing the design itself (that's jb-design + a product skill),
  and **NOT** for sequencing the build into tasks/tiers/gates — that's **jb-plan**
  (see the boundary below).

## jb-productionize vs jb-plan — draw this line

This is the easiest thing to get wrong. They **chain**; they are not the same job.

- **jb-productionize = design → spec.** *What* the thing is: screens, exact
  tokens, component anatomy, state model, fidelity. Answers "what does the
  developer build to match this design?" The output is **descriptive**.
- **jb-plan / jb-plan-pro-DS = spec → execution plan.** The *order* of the build:
  tasks, tiers, gates, and the handoff prompt a fresh orchestrator dispatches to
  coding subagents.
- Your spec is an **input** to jb-plan. **Stop at the spec.** If the user wants
  the build sequenced or orchestrated, hand your spec to jb-plan — don't author
  tasks, tiers, or gates here.

## Determine fidelity first — it changes everything downstream

Classify the artifact up front and state it at the top of the spec:

- **High-fidelity (hifi):** a polished, pixel-considered mockup → the developer
  recreates the UI faithfully; every measurement/color/type value is load-bearing.
  (jb-design / jb-prototype / jb-deck output is usually hifi.)
- **Low-fidelity (lofi):** a wireframe/sketch → a guide for layout and
  functionality only; the developer applies their own design system for styling.
  (jb-wireframe output is lofi.)

If you can't tell, **ask**. Skip this call and the developer can't tell whether
to match your pixels or just your structure.

## What you produce

A spec folder `design_handoff_<feature>/` in the **user's project** (never in
`~/.claude/skills/`). Read **`references/spec-template.md`** for the folder layout
and the section-by-section `README.md` template. The load-bearing requirements:

- **Copy the design file(s) INTO the folder** (`cp` the `.html` + any `assets/`)
  so the reference travels with the spec. Never reference the artifact by an
  absolute path that breaks when the folder is moved, zipped, or shared.
- **Extract exact values** — colors as hex/oklch, the spacing scale, type scale
  (family/size/weight/tracking), radii, shadows. **Read them from the artifact's
  CSS; never eyeball.**
- If a **jb-design-system** backs the artifact, name its **semantic tokens**
  (`--color-brand`, `--space-3`) and tell the developer to map onto the
  codebase's tokens — don't re-derive parallel names the codebase won't know.
- **Decompose into components** (anatomy, variants, states) — *describe* them;
  don't write the production component code.
- Capture the **state/interaction model**, and **separate real behavior from demo
  stubs** (a prototype's inline `<script>` is usually throwaway — say so, and name
  the real wiring/data the developer must supply).
- **Classify fidelity** (hifi/lofi) at the top, and **list open questions** —
  responsive context, error/loading/empty states, permissions — rather than
  inventing answers the artifact can't give.

## Scope discipline — one complete spec beats an unfinished plan

- Produce a **right-sized, COMPLETE** spec. A README that indexes five files but
  ships only two — with dangling links to docs you never wrote — is worse than one
  self-contained spec. Default to a single `README.md`; split only when it truly
  won't fit, and then **write everything you link.**
- **Stay a spec, not a reimplementation.** Don't write `Billing.tsx`. Describing
  the component *is* the deliverable; writing the production component is the
  developer's (or jb-plan's) job.

## Verify

- Fidelity is classified (hifi/lofi) at the top of the README.
- Every token/measurement traces to the artifact's CSS — hex/oklch, type, space,
  radii, shadows all present; nothing eyeballed.
- The design file(s) are **copied into** the folder; no link points outside it or
  to a file you didn't write.
- Real behavior is separated from demo stubs; open questions are captured.
- Boundary respected: it's a spec — not tasks/tiers/gates (jb-plan), not
  production code.
- You asked whether to include screenshots — didn't embed them by default.

## Red flags

- "Just copy the HTML into the repo" → it's a reference; recreate in the target
  stack.
- Writing production components (`.tsx`/`.vue`/`.svelte`) instead of specifying
  them → stop at the spec; that's the developer's job.
- Authoring tasks/tiers/gates + a handoff prompt → that's **jb-plan**; hand it
  your spec.
- Referencing the mockup by an absolute path instead of copying it in → breaks
  when shared.
- Skipping the hifi/lofi call → the developer can't tell whether to match pixels.
- Eyeballing colors/spacing instead of reading the CSS.
- Re-deriving token names when a jb-design-system already names them.
- A README that links files you didn't write → finish the spec or don't link it.
- Inventing answers for responsive/error/permission gaps → list them as open
  questions.
