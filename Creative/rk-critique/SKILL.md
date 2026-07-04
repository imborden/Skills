---
name: rk-critique
description: Use when reviewing a finished design artifact (deck, doc, prototype, or standalone design) against the rk-design suite's own rules — lane consistency, anti-slop bans, declared scales, contrast, motion, keyboard reachability — and producing a ranked, evidence-backed punch list. Not a rebuild and not live tweaking. Triggers on "critique this", "review this design", "what's wrong with this design", "punch list".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# rk-critique: Structured Design Critique

## Overview

Review a **finished** design artifact against the suite's own standards and
hand back a ranked punch list — you are the critic, not the builder. Every
finding is evidence, not vibes: a computed contrast ratio, a screenshot, a
grep hit against the declared tokens.

**REQUIRED BACKGROUND:** Use **rk-design** — it owns the aesthetic-lane rules,
anti-slop bans, scales, and accessibility bar this skill checks *against*.
Read it before critiquing anything.

**Core principle:** **Cite evidence, rank by severity, change nothing.** A
critique that says "the spacing feels off" is useless; "computed gap is 6px,
declared `--space-1` is 8px, see screenshot slide 4" is a finding. You produce
a document, not a diff.

## When to use

A design artifact exists and needs a structured pass before it ships or moves
to the next stage — a deck before the client sees it, a prototype before
handoff, a doc before print. **Not for:**
- **Building or fixing the artifact** — that's rk-deck / rk-doc / rk-prototype
  / rk-design itself. This skill reviews; it doesn't rebuild.
- **Live-tweaking values to see what looks better** — that's **rk-tweaks**.
- **Comparing a built implementation against the design reference** (does the
  shipped app match the mockup pixel-for-pixel, did engineering drift from
  spec) — that's **rk-design-qa**. This skill reviews the design artifact
  *itself* against the suite's rules; rk-design-qa reviews a *build* against
  a *reference*. Different inputs, different question.
- **Generic web-UI / accessibility audits unrelated to this suite's rules** —
  if the `web-design-guidelines` skill is available, defer general a11y/UX
  best-practice review to it. This skill owns the suite-specific checks
  (lanes, anti-slop bans, declared scales) that a generic audit doesn't know
  about.

## The process

1. **Gather context.** Read the artifact's HTML/CSS in full. If a design-system
   folder (rk-design-system output) or a brief is attached, read those too —
   they're the standard you're checking against. No system attached? Check
   against rk-design's defaults instead and say so in the report.
2. **Capture it.** Run `rk-design/assets/screenshot.mjs` against the artifact
   at its native size — slides at 1920×1080, screens at their device
   dimensions, doc pages at print width. Screenshots are evidence, not
   decoration; reference them by filename in findings.
3. **Check systematically:**
   - **Lane consistency** — is exactly one aesthetic lane declared and
     executed to its extreme, or does it drift/blend (rk-design's cardinal
     sin)?
   - **Anti-slop bans** — check against rk-design's anti-slop list (takeaway
     boxes, gradient soup, banned fonts, decorative slop, SVG-illustration-
     as-imagery); flag any that appear.
   - **Declared scale actually used** — grep the `:root` custom properties
     for the declared type/space scale, then grep the rendered CSS for
     off-scale values that don't reference a token. A value that isn't a
     multiple of the spacing scale, or a font-size not in the type scale, is
     a finding.
   - **Contrast** — run `rk-design/assets/check-contrast.mjs` on the declared
     ink/paper/accent pairs; they must meet rk-design's contrast bar.
   - **Minimum scales** — check against rk-design's minimum-scales table.
   - **Motion discipline** — orchestrated, capped chains (not scattered
     micro-interactions); a `prefers-reduced-motion` path exists and actually
     collapses motion (emulate it, don't assume).
   - **Keyboard reachability** — tab through the artifact; every interactive
     element reachable and shows a visible focus state.
   - **Copy tone** — if a design system with content rules exists, does the
     artifact's copy match its declared voice? Skip this check when no system
     is attached (there's no rule to check against).
4. **Rank and write.** Every finding gets a severity, an exact location, the
   defect, and a concrete fix — see Output below. Don't fix anything yourself;
   flag it for the next build pass.

## Output

Write `<artifact>-critique.md` next to the artifact (e.g. `deck.html` →
`deck-critique.md`). Structure as a ranked table or list, most severe first:

```
## Critique: <artifact name>

Reviewed against: <design-system folder | rk-design defaults>
Screenshots: <paths captured with screenshot.mjs>

### Blocker
- **[slide 3, hero heading]** Font is Inter — banned by rk-design's
  typography rule. Fix: swap to the declared display font
  (`--font-display` in tokens.css, currently unused here).

### Major
- **[ink/paper pair, screenshot deck.png]** Contrast 3.8:1, computed via
  check-contrast.mjs — below the 4.5:1 body-text minimum. Fix: darken ink to
  #1a1912 or lighten paper.

### Minor
- **[card grid, slides 5-8]** Gap is 12px; declared scale has no 12px step
  (`--space-1: 8px`, `--space-2: 16px`). Fix: use --space-2.
```

Severity bands: **Blocker** (ships broken — fails a hard rule: contrast,
banned font, no reduced-motion path, unreachable control), **Major**
(visibly undermines the design — off-scale values, lane drift, slop), **Minor**
(polish). Every line cites its evidence source — a screenshot, a computed
number, a grep result — never an unsupported opinion.

## Verify

- `<artifact>-critique.md` exists next to the artifact.
- Every finding names a concrete evidence source (screenshot filename,
  computed contrast ratio, grep/token reference) — none are bare adjectives.
- Findings are grouped by severity (Blocker/Major/Minor), most severe first.
- The artifact itself is unchanged — this skill only writes the critique
  file.

## Red flags

- Fixing issues instead of listing them → write the punch list, don't rebuild
- "This feels off" with no computed value, screenshot, or token reference →
  not a finding, go get the evidence
- Reviewing a build against a design reference (drift/regression check) →
  that's rk-design-qa, not this
- Nudging values to see what looks better → that's rk-tweaks, not this
- Running a generic accessibility scan unrelated to the suite's own rules →
  defer to `web-design-guidelines` if it's available
- No design system attached and the critique invents one → check against
  rk-design's stated defaults and say so, don't fabricate a standard
