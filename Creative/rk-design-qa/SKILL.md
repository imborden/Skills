---
name: rk-design-qa
description: Use after a build is done to verify the shipped product actually matches its design reference — pixel/token drift, missing states, broken motion, unhonored breakpoints. Takes a design_handoff_<feature>/ spec (or the raw artifact) plus the running implementation and produces a fidelity diff report. Builds on rk-design. Triggers on "does the build match the design", "fidelity check", "verify the implementation against the mockup".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# rk-design-qa: Implementation Fidelity Check

## Overview

The last mile: after engineering builds something from a design reference, verify
the **built product** actually matches it. Not "does it look nice" — does it match
*this* spec, at *these* values, in *these* states.

**REQUIRED BACKGROUND:** Use **rk-design** — it owns the tokens/scales/motion
vocabulary you're checking values against, and ships the two tools this skill
runs: `assets/screenshot.mjs` and `assets/check-contrast.mjs`.

**Core principle:** **Compare against the spec, not against vibes.** Every finding
traces to a specific value in the design reference and a specific computed value
in the running build — never "this feels off."

## When to use

After an implementation build is done and there's a design reference to check it
against — a `design_handoff_<feature>/` folder from **rk-productionize**, or the
original hi-fi artifact if no spec was written. Needs two things: the reference
and a way to view the running implementation (a URL, or how to launch it).

**NOT** for reviewing code correctness, security, or logic — that's `/code-review`.
**NOT rk-critique** — rk-critique reviews the design artifact itself, at design
stage, before anything is built; this skill runs *after* a build, against the
*built product*. **NOT** the build itself — this runs after an **rk-plan** (or
equivalent) implementation is complete, it doesn't write application code.

## Process

1. **Read the reference fully first.** If it's a `design_handoff_<feature>/`
   folder, read the whole README — tokens, screens/states, interactions &
   behavior, responsive notes — before looking at the build. If it's a raw
   artifact, read its CSS directly for the same values (don't eyeball).
2. **Get the running implementation up.** A dev URL, or launch it (check for a
   project `run` skill first). Same content, same data where possible — you're
   checking presentation and behavior, not content parity.
3. **Screenshot both at the same widths.** Use `rk-design/assets/screenshot.mjs`
   against the reference file/URL and the implementation URL at each breakpoint
   the spec names (or the reference's declared viewport story). Side-by-side
   comparison beats memory.
4. **Check tokens against computed values, not screenshots.** Pull actual
   computed styles from the implementation (DevTools, or a quick script against
   the page) for color, spacing, radii, type — compare to the spec's exact
   values. A screenshot can hide a 2px spacing miss; computed style can't.
5. **Walk every state the spec lists.** Hover, focus, press, loading, error,
   empty, disabled — for each, confirm it exists in the build and matches the
   spec's description. A state the spec named and the build skipped is a finding
   regardless of how the default state looks.
6. **Check motion.** Durations and easings against the spec's "Interactions &
   behavior" section (rk-design's default is ~400–600ms ease-out — the spec's
   actual declared values win over the default). Confirm a `prefers-reduced-motion`
   path exists and collapses motion, same as the reference did.
7. **Check breakpoints** against the spec's Responsive notes — layout at each
   named width, not just desktop.
8. **Check copy** matches the spec's exact strings, not paraphrases.
9. **Re-run contrast on the implementation**, not the original artifact — run
   `rk-design/assets/check-contrast.mjs` against the build's actual rendered
   colors. Built pages drift from mockups (a real CMS value, a theme default,
   a missed override) — the mockup passing tells you nothing about the build.

## Output — the fidelity diff report

A table, ranked by user-facing impact (broken interaction > wrong token > minor
spacing):

| Area | Spec value | Built value | Verdict |
|---|---|---|---|
| Primary button / default | `--color-brand` `#2b6cb0` | `#3182ce` | Mismatch |
| Card / hover state | spec: lift + 200ms ease-out | none implemented | Missing |
| Modal / close | `Esc` + backdrop click | `Esc` only | Partial |
| Hero / mobile (390px) | spec: stacked, 24px gutter | unchanged desktop grid | Mismatch |

Write each open item so it can go **straight into an issue** — specific enough
that whoever picks it up doesn't need to re-diff themselves (name the component,
the spec section, the exact expected vs. actual value).

## Verify

- A fidelity diff report exists with every row carrying a spec value, a built
  value, and a verdict — no row is a vague description.
- Every state the spec lists was checked in the build, not just the default.
- Contrast was **re-measured on the running implementation**, not assumed from
  the original artifact passing.
- Breakpoints were checked at the spec's actual named widths.
- Each open item is issue-ready: specific enough to act on without re-diffing.

## Red flags

- Judging fidelity from a screenshot alone → pull computed styles for tokens;
  screenshots hide small drift.
- Skipping states the spec named because the default state looks right →
  each state is a separate check.
- Trusting the original artifact's contrast pass instead of re-measuring the
  build → built pages drift.
- Writing "looks off" instead of spec-value vs. built-value → not diff-able,
  not issue-ready.
- Reviewing code quality/security while you're in there → that's `/code-review`,
  stay on visual/behavioral fidelity.
- Doing this before a build exists → that's rk-critique's job, on the artifact.
