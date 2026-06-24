# Design System Structure — Folder, Build Sequence, Templates

Heavy reference for **jb-design-system**. Read this once you've confirmed the
sources (codebase / brand / Figma) and are ready to build. The SKILL.md governs
*what* and *why*; this file is the *how*, with copy-paste skeletons.

---

## Canonical folder layout

A design system is a **project folder** (in the user's project, NOT in
`~/.claude/skills/`). Lay it out like this. Omit a directory only when the brand
genuinely has nothing for it — never invent filler.

```
<brand>-design-system/
├── styles.css            ← FIXED entry point at the root. @import lines ONLY.
├── tokens/               ← CSS custom properties, one file per concern
│   ├── colors.css
│   ├── typography.css    ← also holds @font-face rules
│   └── spacing.css       ← spacing, radius, elevation, motion, layout
├── components/           ← reusable plain-HTML/CSS partials (see below)
│   └── patterns.html     ← one file of copy-paste snippets is fine for small sets
├── ui_kits/<product>/    ← full-screen recreations of REAL product views (only if a product exists)
│   ├── index.html
│   └── Screen1.html …
├── assets/               ← copied logos, icons, illustrations, imagery (NEVER drawn)
├── specimen.html         ← one human-viewable sheet rendering tokens + components
└── readme.md             ← the brand guide + manifest (two required sections, below)
```

**Small-system shortcut:** for a lightweight brand, a single `tokens/tokens.css`
(or even just the `:root` block inside `styles.css`) is acceptable — but keep
`styles.css` as the named entry so consumers always know where to look.

**Why `styles.css` is fixed:** the other jb-* skills (and any future session)
need ONE predictable place to find the system. Pencil had a compiler that
indexed it; here the predictability is for *humans and agents*. Keep `styles.css`
at the root, as a list of `@import` lines only — no rules of its own. Acceptable
alternate names if one already exists: `index.css` / `globals.css` /
`global.css` / `main.css` / `theme.css` / `tokens.css` (first match wins).

```css
/* styles.css — entry point. Import order matters: tokens before components. */
@import url("./tokens/colors.css");
@import url("./tokens/typography.css");
@import url("./tokens/spacing.css");
@import url("./components/components.css"); /* if you ship component CSS */
```

---

## Build sequence (adapted task checklist)

Run independently; only stop for a true blocker (no codebase/Figma access — see
SKILL.md "Source of truth"). Create a todo per step.

1. **Explore the sources.** Read the codebase / brand files / attached decks
   fully. Understand the company, the products, the voice. For attached decks,
   open them and extract key assets + text to disk.
2. **Write `readme.md` (skeleton).** High-level company/product context. List
   the sources you were given (Figma links, repo paths, codebase paths).
3. **Write the tokens.** CSS custom properties on `:root` — **two layers**
   (primitives → semantic aliases, see below). Copy any webfonts into `assets/`
   (or use Google Fonts) and write `@font-face` rules in `tokens/typography.css`.
4. **Write `styles.css`** at the root as `@import` lines only.
5. **Fill `readme.md` → CONTENT FUNDAMENTALS** (voice/tone/casing/emoji — see
   template).
6. **Fill `readme.md` → VISUAL FOUNDATIONS** (color/type/space/motion/etc. — see
   template).
7. **Copy assets & icons** into `assets/`. Add an ICONOGRAPHY note to `readme.md`.
   (Icon rules in SKILL.md — copy, never draw.)
8. **Author components** as plain HTML/CSS partials (see below).
9. **Build UI kits** (only if a real product exists) — replicate real screens.
10. **Write `specimen.html`** — one sheet that renders every token group and
    component so a human can eyeball the system. Link `styles.css`.
11. **Index `readme.md`** — a short pointer to the other files.
12. **(Optional) wrap as a `/{brand}-design` skill** — see template at the end.

---

## Tokens — two layers, base + semantic

Primitives are the raw palette/scale; semantic tokens are role-based aliases that
everything else references. Re-theming later changes only the primitive→semantic
mapping; downstream artifacts don't change. Define colors in `oklch` (a dominant
neutral + one sharp accent beats a timid even spread).

```css
:root {
  /* 1 — PRIMITIVES: raw values, do NOT reference these directly in artifacts */
  --c-ink-900: oklch(0.22 0.014 64);
  --c-paper-50: oklch(0.985 0.006 85);
  --c-accent-500: oklch(0.56 0.10 168);
  --space-base: 8px;

  /* 2 — SEMANTIC: role-based aliases, reference THESE everywhere */
  --color-text: var(--c-ink-900);
  --color-surface: var(--c-paper-50);
  --color-brand: var(--c-accent-500);
  --text-h1: clamp(2rem, 4vw, 3.25rem);
  --text-body: 1rem;
  --space-3: calc(var(--space-base) * 3);
  --radius-card: 12px;
}
```

Group tokens by: color (surface, text, border, brand, status — plus any
domain-specific semantics the product needs), type (families, scale, weights,
leading, tracking), space, radius, elevation, motion, layout. Document
domain-specific tokens in the readme so consumers know they exist.

---

## The brand guide — two REQUIRED sections in `readme.md`

These named sections are the heart of the guide. Without them, voice and
interaction detail get lost and only colors survive. Fill both with **specific
examples**, not adjectives.

```markdown
## CONTENT FUNDAMENTALS
- **Tone:** <e.g. reassuring, plain-spoken, a little warm>
- **Casing:** <Title Case vs sentence case for headings, buttons, labels>
- **Person:** <"you" vs "we" vs "I"> — with a rewritten before/after example
- **Emoji:** <yes/no, and where> (default: no, unless the brand uses them)
- **Vibe & examples:** 2–3 real sentences in-voice, and 2–3 off-voice ones to avoid

## VISUAL FOUNDATIONS
- **Color:** roles, when to use brand vs neutral, what NOT to colorize
- **Type:** the pairing, where each face is used, the scale
- **Spacing & layout:** base unit, container widths, grid rules
- **Backgrounds:** flat fields / tints — never multi-hue hero gradients
- **Motion:** duration, easing, stagger; respect prefers-reduced-motion
- **Hover / press states:** the exact treatment (e.g. tint shift + 1px lift)
- **Borders, shadows, radii:** hairline color, shadow tint, corner radius
- **Imagery:** the photographic/illustrative vibe; treatment rules
```

---

## Components — plain HTML/CSS partials (NOT React + a compiler)

The whole jb-* suite ships **self-contained HTML**, so components are plain
HTML/CSS the consumer copies, not React `.jsx` requiring a build. (If the user's
*production* codebase is React/Vue/etc., mirror that framework instead — but the
suite's default consumable is HTML/CSS.)

Each component = a CSS class (referencing semantic tokens only) + a usage snippet:

```html
<!-- Button — primary action. Variants: .btn--ghost, .btn--danger. -->
<style>
  .btn {
    font: 500 var(--text-body)/1 var(--font-sans);
    padding: var(--space-2) var(--space-3);
    background: var(--color-brand); color: var(--color-on-brand);
    border: 0; border-radius: var(--radius-card); cursor: pointer;
    transition: filter 160ms ease-out;
  }
  .btn:hover { filter: brightness(1.05); }
  .btn--ghost { background: transparent; color: var(--color-brand);
                box-shadow: inset 0 0 0 1px var(--color-border); }
</style>
<button class="btn">Continue</button>
```

Keep a one-line "what & when" plus notable variants near each component (inline
comment or a short note in `readme.md`). Bias to a small set of real, used
components over a big speculative library.

---

## UI kits — replicate, don't invent

A UI kit is a **high-fidelity recreation of a real product screen** — `index.html`
should look like a typical view of the actual product. Cut corners on
functionality (static is fine); do not cut corners on visual fidelity.

- **Existing product:** *replicate* the real design from the codebase/Figma —
  never invent a new one. Strict fidelity.
- **Greenfield (no product yet):** one *illustrative* starting screen that shows
  the tokens in context is welcome — label it as illustrative, not a replication,
  so no one mistakes it for an existing product spec.

---

## Optional final step — wrap as a `/{brand}-design` skill

If the user wants to invoke the system by name later, install the folder as a
skill. Add this `SKILL.md` at the folder root and place the folder at
`~/.claude/skills/<brand>-design/` (personal) or `<project>/.claude/skills/`
(team, checked into the repo):

```markdown
---
name: <brand>-design
description: Use when designing or building any visual artifact for <Brand> — decks, docs, prototypes, UI, assets — in production or as throwaway mocks. Bundles <Brand>'s tokens, fonts, colors, components, and brand guide. Builds on jb-design.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

**REQUIRED BACKGROUND:** Use jb-design for process and craft.

Read `readme.md` in this skill folder, then explore `tokens/`, `components/`, and
`specimen.html`. For throwaway artifacts (decks, mocks, prototypes), copy assets
out and paste the `:root` token block into self-contained HTML. For production
code, read the rules here and design as a <Brand> expert.

If invoked with no further guidance, ask what they want to build, ask a few
questions, then act as <Brand>'s expert designer — outputting HTML artifacts or
production code as the need dictates.
```

Tell the user where you installed it and that team members get it by checking the
folder into `<project>/.claude/skills/`.
