# Creative

The rk-* design skills, as a pipeline: how an idea becomes a shipped, verified artifact.

## Pipeline

The **design pipeline** is linear — each stage consumes the last one's output. It runs
on top of two layers that are *not* stages: `rk-design` underneath (always loaded), and
the `rk-plan` execution engine off to the side (wrapped around any step that needs it).

```
rk-design ───── base layer: process, aesthetic lanes, anti-slop bans, a11y + scales.
                Every skill below declares "Builds on rk-design" and loads it as background.

DESIGN PIPELINE  (linear — each stage feeds the next)

  idea
    ▼
  rk-brief                                   → one-page concept brief
    ▼
  rk-wireframe                               → lo-fi exploration of the design space
    ▼
  rk-design-system                           → (optional) brand tokens/components, cross-session
    ▼
  rk-prototype / rk-deck / rk-doc            → the real build (pick the one matching the artifact)
    ▼
  rk-tweaks / rk-llm-prototypes / rk-imagery → (optional) live controls, real LLM calls, real photos
    ▼
  rk-critique                                → ranked punch list against the suite's own rules
    ▼
  rk-export-html / rk-productionize          → portable single file, or a dev handoff spec
    ▼
  build (engineering implements the spec)
    ▼
  rk-design-qa                               → fidelity check: does the shipped build match the design

EXECUTION ENGINE  (orthogonal — NOT a pipeline stage)

  rk-plan / rk-plan-pro / rk-plan-max   (in ../Planning/)
    └─ Wrap around ANY loop above that's big enough to need phases + gates:
       planning the design work itself, planning the implementation of a spec,
       or iterating on a fix (build → critique → fix → re-critique). It plugs in
       wherever orchestration is warranted — it does not sit at the end of the chain.
```

Only `rk-design-qa` is genuinely terminal (you can't QA a build that doesn't exist yet).
Everything else is a loop, and `rk-plan` is the engine you drop onto whichever loop is
big enough to warrant it — including the creation of these very skills.

## Skills

| Skill | Use when | Ships |
| --- | --- | --- |
| `rk-design` (base) | Designing or building any visual artifact in HTML — UI, app screens, prototypes, slide decks, documents, wireframes, or design systems — and you want real design craft instead of generic AI output. | `assets/check-contrast.mjs`, `assets/screenshot.mjs`, `references/aesthetic-lanes.md` |
| `rk-brief` | An idea needs to become a one-page concept brief before any design starts — turning a raw pitch or feature ask into a durable artifact the rest of the pipeline consumes. | Interview-driven; writes the brief to disk (no bundled assets) |
| `rk-wireframe` | Exploring design ideas fast and broad — wireframes, lo-fi mockups, storyboards — before committing to one direction. | `assets/wireframe-row.js` |
| `rk-design-system` | Creating a reusable design system, brand kit, token library, or UI kit that later design work pulls from. | A project folder: tokens, fonts, components, brand guide, specimen sheet (`references/design-system-structure.md`) |
| `rk-deck` | Building a slide deck or presentation in HTML — pitch decks, board decks, talks, sales decks — typically at 1920×1080. | `assets/deck-stage.js` (auto-scaling, keyboard/tap nav, speaker notes, print-to-PDF) |
| `rk-doc` | Creating a page-style document that reads as one continuous column and exports to a clean multi-page PDF — resume, one-pager, memo, report, white paper. | `assets/doc-template.html` (print-ready, pagination CSS) |
| `rk-prototype` | Building an interactive, animated app prototype in HTML — multi-screen flows, tappable UI, state, transitions — usually in a device frame. | `assets/device-frames.js`, `assets/screen-deck.js`, `assets/image-slot.js`, `references/prototype-patterns.md` |
| `rk-tweaks` | Making a finished HTML design tweakable — an in-page controls panel so a viewer can adjust key values live, no code editing. | `assets/tweak-panel.js` (`<tweak-panel>` custom element driving CSS custom properties) |
| `rk-llm-prototypes` | An HTML prototype needs real LLM/AI calls and the API key must stay out of the browser. | `assets/llm-proxy.mjs`, `assets/llm.js`, `.env.example` (local proxy + `window.llm.complete`) |
| `rk-imagery` | Sourcing real imagery for a design artifact or deciding how an image should sit on the page. | Sourcing order + treatment rules (no bundled assets) |
| `rk-critique` | Reviewing a finished design artifact against the suite's own rules — lane consistency, anti-slop bans, contrast, motion, keyboard reachability. | A ranked, evidence-backed punch list (no bundled assets) |
| `rk-export-html` | A finished HTML artifact must work fully offline as one portable file — inlining CSS, scripts, fonts, and images as data-URIs. | `assets/inline-html.mjs` |
| `rk-productionize` | You have a finished HTML design and need to hand it to engineers to rebuild it in a real codebase. | `references/spec-template.md` (dev implementation spec) |
| `rk-design-qa` | After a build is done, verifying the shipped product actually matches its design reference — drift, missing states, broken motion, unhonored breakpoints. | A fidelity diff report (no bundled assets) |

`rk-plan` and its tiers (`rk-plan-pro`, `rk-plan-max`, `rk-plan-router`, `rk-plan-pro-cotal`, `rk-plan-pro-DS`) live in `../Planning/` — a separate, substrate-agnostic execution suite that orchestrates *any* multi-step build to completion, not just design work. It's the engine referenced as the orthogonal layer above, not a design stage.
