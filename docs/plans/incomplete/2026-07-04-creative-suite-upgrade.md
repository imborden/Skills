# Plan — Creative Suite Upgrade (idea → implementation pipeline)

> Save as `docs/plans/incomplete/2026-07-04-creative-suite-upgrade.md`. The orchestrator moves
> this file to `docs/plans/complete/` with `git mv` when every gate passes (commit this plan
> file first — it is untracked until then; `git mv` needs it tracked).

## Context

The `Creative/` suite (10 rk-* skills) covers wireframe → implementation-spec well but the
stated goal is **idea → implementation**. An audit found: no ideation front end, no critique
loop, no post-build design QA, thin accessibility, no responsive story, verification steps
that say "screenshot it" with no shipped mechanism, and a surprising DeepSeek default in the
LLM proxy.

**Scope (confirmed with the human):** 4 new skills (`rk-brief`, `rk-critique`, `rk-design-qa`,
`rk-imagery` — imagery as a **dedicated skill**); edits to `rk-design`, `rk-wireframe`,
`rk-prototype`, `rk-productionize` (spec template), `rk-deck` (imagery dedupe),
`rk-llm-prototypes` (provider auto-detect); 2 new shared assets (`check-contrast.mjs`,
`screenshot.mjs` — **zero-dep headless-Chrome wrapper**); `Creative/README.md` pipeline map;
`~/.claude/skills` symlinks for the 4 new skills. **Out of scope:** changes to `Planning/`,
`Writing/`, `Utilities/`; any change to the shipped custom-element assets other than those
named; a router skill for the creative tier.

**Environment facts (resolved at authoring time, 2026-07-04):**
- **Critic prompt card:** `/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md`
  (verified present). If the orchestrator cannot read it at that path, it **STOPS and asks the
  human — it must NOT synthesize a critic prompt inline.**
- **Plan promotion:** `docs/` is NOT git-ignored (`git check-ignore docs/` → no match), so the
  done-signal is `git mv docs/plans/incomplete/2026-07-04-creative-suite-upgrade.md docs/plans/complete/`.
- **Working directory:** all commands in this plan run from the repo root
  `/Users/jeffborden/Documents/Coding/_Skills` (`~/.claude/skills` paths are absolute).
- **Symlinks:** the 10 existing creative-skill symlinks were repaired by the human during
  authoring (verified: all point at `Documents/Coding/_Skills/Creative/`). Only the 4 new
  skills need links (Task 15).

**Required inputs (from the human):** none mandatory. Optional: an `ANTHROPIC_API_KEY` or
DeepSeek key if a live end-to-end proxy call is wanted (the gates otherwise verify error
paths and request shape only). Chrome/Chromium must be installed (probed in Phase 1's gate).

**Unverified assumptions:**
1. **Chrome/Chromium exists on this machine and `--headless=new --screenshot` works** —
   riskiest environment assumption; Phase 1's gate exercises it with a real capture.
2. Anthropic Messages API request/response shape (`POST /v1/messages`, `x-api-key` +
   `anthropic-version` headers, `content[0].text` reply) — stable and documented; the
   proxy task verifies shape via a mocked check, not a live call, unless a key is provided.
3. No external consumers depend on the proxy's `DEEPSEEK_API_KEY` env name — mitigated by
   keeping it as a backward-compatible alias.

## Architecture

Everything hangs off `rk-design` (the base skill all others declare as REQUIRED BACKGROUND),
so the build order is: **shared assets first** (they're referenced by rk-design's new Verify
steps), **then the rk-design base edit**, **then the four new skills** (they reference
rk-design and each other), **then sibling edits** (they reference the new skills), **then
README + symlinks** (they reference everything). New SKILL.md files must match the suite's
established anatomy: YAML frontmatter (`name`, `description` with triggers, `allowed-tools`),
then Overview (with REQUIRED BACKGROUND + a bolded Core principle), When to use (with NOT-for
boundaries naming sibling skills), the skill body, Verify (behavioral, checkable), Red flags.
Study 2–3 existing SKILL.mds before writing any new one.

## How to run this build — orchestrated, gated, task-by-task

Execute phases in order from the repo root. Phase headers carry an execution annotation:
`[parallel]` (all tasks at once), `[sequential]` (one at a time with manual review — the
default). `[adversarial]` composes with either for generator→critic→regenerate loops: dispatch
a fresh general-purpose agent as critic, giving it the prompt card at
`/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md` plus only the task
spec + generator output + changed files — never this plan doc.

The **Opus orchestrator owns the gates and does not write feature content** (exception:
Task 15's exact symlink commands, which it runs directly): it dispatches one fresh agent per
task at the tagged tier, reviews each diff in two stages (matches plan? actually works?),
runs each task's `**Verify:**`, commits per task, runs the phase gate at each boundary, flips
`- [ ]`→`- [x]`, and finishes with `git mv` of this file to `complete/`. On failure, bounce
the task to a fresh agent with the failure output. **Bounce cap: 3 per task** (including
adversarial regenerations hitting Max iterations) — then STOP and surface the findings plus
the implementer's last output to the human; never ping-pong indefinitely.

Work on a branch: `git checkout main && git pull && git checkout -b creative-suite-upgrade`,
then `git add docs/plans/ && git commit` so this plan file is tracked.

---

## Phase 1 — Shared assets + environment probe [parallel]

**Gate:** all three, run by the orchestrator from the repo root:
1. `node Creative/rk-design/assets/check-contrast.mjs '#16150f' '#f4f1ea'` → prints a ratio ≥ 12 and `PASS`, exit 0; `node Creative/rk-design/assets/check-contrast.mjs '#777777' '#888888'` → prints `FAIL`, exit 1; `node Creative/rk-design/assets/check-contrast.mjs 'oklch(0.62 0.19 28)' '#ffffff'` → prints a plausible ratio (3–5) without error.
2. Write a one-line `<h1>hello</h1>` file to the scratchpad, then `node Creative/rk-design/assets/screenshot.mjs <that file> /tmp/probe.png --width 1280` → exits 0, `/tmp/probe.png` exists and is > 5 KB (**this is the live probe of assumption 1**).
3. `node --check Creative/rk-llm-prototypes/assets/llm-proxy.mjs` → exit 0; boot it with no key set → startup warning names **both** `ANTHROPIC_API_KEY` and the OpenAI-compatible option; `curl -s -X POST localhost:8787/api/complete -d '{"prompt":"hi"}'` → JSON error mentioning how to configure a key (not a hang, not a stack trace).

### Task 1 — `check-contrast.mjs` contrast validator `[sonnet]`
**Files:** Create `Creative/rk-design/assets/check-contrast.mjs`
**Schema:** `{ "filesCreated": ["string"], "selfTestPassed": "boolean" }`

- [x] Zero-dependency Node ≥ 18 CLI, same style/tone as the suite's existing assets (read
      `Creative/rk-export-html/assets/inline-html.mjs` first for conventions: header comment
      with usage, no deps, clear stdout).
- [x] Usage: `node check-contrast.mjs <color1> <color2> [--large]` → computes the WCAG 2.x
      contrast ratio, prints `<ratio>  PASS|FAIL (needs 4.5:1)` (3:1 with `--large`), exit 0
      on pass / 1 on fail. Pairwise only — no HTML scanning mode (YAGNI).
- [x] Color parsing: `#rgb`/`#rrggbb`, `rgb()/rgba()`, and **`oklch()`** (the suite defines
      color in oklch — implement OKLab→linear-sRGB→sRGB conversion; clamp out-of-gamut).
      Reject anything else with a clear error.
- [x] Include a `--self-test` flag asserting ≥ 4 known ratios (black/white = 21, the two gate
      pairs above, one oklch case) — the runnable check for the conversion math.

**Verify:** `node Creative/rk-design/assets/check-contrast.mjs --self-test` → `self-test: ok`, exit 0
**Commit:** `feat(rk-design): add zero-dep WCAG contrast validator asset`

### Task 2 — `screenshot.mjs` headless-Chrome capture `[sonnet]`
**Files:** Create `Creative/rk-design/assets/screenshot.mjs`
**Schema:** `{ "filesCreated": ["string"], "probeScreenshotOk": "boolean" }`

- [x] Zero-dependency Node ≥ 18 CLI wrapping an **installed** Chrome/Chromium — no Playwright,
      no Puppeteer. Usage: `node screenshot.mjs <file-or-url> [out.png] [--width N] [--height N] [--wait MS]`.
- [x] Binary discovery, first hit wins: `$CHROME_BIN`, then the standard macOS app paths
      (Chrome, Chrome Canary, Chromium, Edge, Brave), then `which` lookups for Linux names
      (`google-chrome`, `chromium`, `chromium-browser`). If none found: print a one-line
      actionable message (set `CHROME_BIN=...`) and exit 2 — never a stack trace.
- [x] Invoke `--headless=new --disable-gpu --screenshot=<out> --window-size=<w,h>` plus
      `--hide-scrollbars`; `--virtual-time-budget=<wait>` (default 1500 ms) so fonts/JS
      settle. No full-page mode — document in the header comment that tall captures set
      `--height` explicitly (ponytail: named ceiling, upgrade path is a taller window).
- [x] File inputs are converted to a `file://` absolute URL. Default output:
      `<input-basename>.png` in the cwd. Print the output path on success.

**Verify:** create a scratch `t.html` with visible text; `node Creative/rk-design/assets/screenshot.mjs t.html /tmp/t.png --width 900` → exit 0 and `test -s /tmp/t.png`
**Commit:** `feat(rk-design): add zero-dep headless-Chrome screenshot asset`

### Task 3 — LLM proxy provider auto-detect `[sonnet]`
**Files:** Modify `Creative/rk-llm-prototypes/assets/llm-proxy.mjs`, `Creative/rk-llm-prototypes/assets/.env.example`, `Creative/rk-llm-prototypes/SKILL.md`
**Schema:** `{ "filesModified": ["string"], "bothProvidersDocumented": "boolean" }`

- [x] Auto-detect, in priority order: `ANTHROPIC_API_KEY` set → call the **Anthropic Messages
      API natively** (`POST https://api.anthropic.com/v1/messages`, headers `x-api-key`,
      `anthropic-version: 2023-06-01`, body `{model, max_tokens, system?, messages}`, reply
      text at `content[0].text`; default model `claude-sonnet-5`). Else `LLM_API_KEY` (with
      `DEEPSEEK_API_KEY` kept as a **backward-compatible alias**) → existing OpenAI-compatible
      path (default base URL/model unchanged: DeepSeek). Keep zero-dep; keep the
      `/api/complete` contract and `{text}` response shape **identical** so `llm.js` and all
      existing prototypes work unchanged.
- [x] Startup log names the detected provider + model. No-key warning and the 500 error body
      must name both options (`ANTHROPIC_API_KEY` or `LLM_API_KEY`/`DEEPSEEK_API_KEY`).
- [x] `.env.example`: two clearly-labeled blocks (Anthropic / OpenAI-compatible), one
      commented-out key line each, and the shared overrides (`LLM_MODEL`, `LLM_BASE_URL`,
      `LLM_MAX_TOKENS`, `PORT`).
- [x] `SKILL.md`: update the provider references (Quickstart, key-URL line, defaults
      paragraph, Red flags mentioning `api.deepseek.com`) to describe auto-detect with
      Anthropic first. Keep the skill's length and structure otherwise intact.
- [x] If the human provided a real key, one live `curl` through the proxy → model text back
      (optional; do not block the gate on it).

**Verify:** `node --check` on the proxy; boot with `ANTHROPIC_API_KEY=sk-test-fake` → startup log says Anthropic; boot with no key → warning names both options
**Commit:** `feat(rk-llm-prototypes): auto-detect Anthropic vs OpenAI-compatible provider`

---

## Phase 2 — Base skill edit (rk-design) [adversarial] [sequential]

**Gate:** `grep -c` checks on `Creative/rk-design/SKILL.md`: contains `check-contrast.mjs`,
`screenshot.mjs`, `4.5:1`, a viewport/responsive decision step, and routing mentions of all
13 sibling skills (`rk-brief`, `rk-wireframe`, `rk-design-system`, `rk-deck`, `rk-doc`,
`rk-prototype`, `rk-tweaks`, `rk-llm-prototypes`, `rk-imagery`, `rk-critique`,
`rk-export-html`, `rk-productionize`, `rk-design-qa`) → every grep ≥ 1; the string
`Never converge on the same lane` → 0 hits. AND no critic findings ≥ 75.
**Critic:** `/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md`
**Threshold:** 75
**Max iterations:** 3

### Task 4 — rk-design: a11y, responsive, routing, lane fix `[sonnet]`
**Files:** Modify `Creative/rk-design/SKILL.md`

One file, one coherent edit. The base skill is inherited by every other skill — precision over
volume; keep total growth under ~35 lines. Changes:

- [ ] **Accessibility (Build approach + Verify).** Build: contrast minimums (4.5:1 body,
      3:1 large text/UI on its background), visible focus states on all interactive elements,
      semantic headings/landmarks, keyboard reachability. Verify: run
      `assets/check-contrast.mjs` on the declared ink/paper/accent pairs; one keyboard-tab
      pass. Reference `assets/screenshot.mjs` as the shipped way to execute the existing
      "verify by screenshotting" step in any harness.
- [ ] **Responsive story (The process).** New step alongside "Declare your system": decide
      and state the **viewport story** up front — fixed-frame demo, single target width, or
      responsive (with which breakpoints) — and add a red flag: product UI shipped with no
      viewport decision.
- [ ] **Routing list.** Replace the 5-skill list with a stage-grouped map of all 13 siblings
      (brief → explore → systematize → build → augment → review → ship/handoff → QA), one
      line each. The four Phase-3 skills don't exist yet — write the lines anyway; Phase 3
      makes them true (the gate for dangling names runs at Phase 5).
- [ ] **Lane-convergence fix.** Delete "Never converge on the same lane across unrelated
      projects" (unenforceable — sessions have no memory of past picks). Replace with a
      mechanism, e.g.: "If your first-instinct lane is also the *obvious* pick for this
      content type, deliberately weigh the second-best lane before committing."
- [ ] **Pointers.** One line: charts/dashboards → use the `dataviz` skill if available. One
      line in the assets bullet: imagery sourcing/treatment → `rk-imagery`.

**Verify:** the gate's grep set, run against the edited file
**Commit:** `feat(rk-design): a11y + responsive requirements, full routing map, lane fix`

---

## Phase 3 — Four new skills [adversarial] [parallel]

**Gate:** for each of `rk-brief`, `rk-critique`, `rk-design-qa`, `rk-imagery`:
`test -f Creative/<name>/SKILL.md`; frontmatter has `name:`, `description:` (with trigger
phrases), `allowed-tools:`; body greps ≥ 1 for `REQUIRED BACKGROUND`, `## When to use`,
`## Verify`, `## Red flags`. Trigger-collision check: `rk-critique`'s description must NOT
contain "design QA" and `rk-design-qa`'s must NOT contain "critique" (they must route
distinctly). AND no critic findings ≥ 75.
**Critic:** `/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md`
**Threshold:** 75
**Max iterations:** 3

Every task in this phase: **first read `Creative/rk-design/SKILL.md` (post-Task-4),
`Creative/rk-prototype/SKILL.md`, and `Creative/rk-wireframe/SKILL.md`** to absorb the suite's
anatomy, voice, and boundary style. Match them. Do not restate rules that live in rk-design —
reference them. Each critic dispatch for this phase should be told to check: suite-anatomy
conformance, boundary clarity (NOT-for lines naming siblings), zero duplication of rk-design
content, and description/trigger quality.

### Task 5 — `rk-brief`: idea → concept brief `[sonnet]`
**Files:** Create `Creative/rk-brief/SKILL.md`

- [ ] **Job:** the front of the funnel — turn a raw product idea into a one-page durable
      brief the rest of the pipeline consumes. Interview-driven (AskUserQuestion), then write
      `product-brief.md` into the **user's project** (never `~/.claude/skills/`).
- [ ] **Brief sections (mandatory, concrete not adjectival):** problem statement; audience +
      jobs-to-be-done; the riskiest assumption (and how to cheaply test it); success criteria;
      scope cuts (explicit not-doing list); constraints (brand/design system? codebase?
      platform? timeline?); open questions.
- [ ] **Boundaries:** NOT `superpowers:brainstorming` (that's a conversation technique; this
      produces a durable artifact); NOT `rk-productionize` (other end of the pipeline); output
      feeds `rk-wireframe`, which should be named as the next step. Triggers: "product brief",
      "concept brief", "flesh out this idea", "before we design".
- [ ] Verify section: brief exists in the project, every mandatory section filled with
      specifics, riskiest assumption is testable as written.

**Commit:** `feat(rk-brief): new skill — idea to concept brief`

### Task 6 — `rk-critique`: structured design review `[sonnet]`
**Files:** Create `Creative/rk-critique/SKILL.md`

- [ ] **Job:** review a **finished design artifact** (deck/doc/prototype/design) against the
      suite's own rules and produce a ranked punch list — NOT a rebuild, NOT live tweaking.
- [ ] **Process:** load the artifact + any design-system folder + the brief if present;
      capture it with `rk-design/assets/screenshot.mjs` (slides/screens at their native
      size); check — lane consistency (one lane, executed to its extreme), anti-slop bans,
      declared type/space scale actually used (read the CSS custom properties), contrast via
      `rk-design/assets/check-contrast.mjs`, minimum scales, hit targets, motion discipline +
      reduced-motion path, keyboard reachability, copy tone vs CONTENT FUNDAMENTALS when a
      system exists.
- [ ] **Output:** a ranked punch list — severity · location · defect · concrete fix — written
      to `<artifact>-critique.md` next to the artifact. Findings must cite evidence (a
      computed value, a screenshot, a grep), not vibes.
- [ ] **Boundaries:** generic web-UI/a11y checks defer to the `web-design-guidelines` skill
      if available (name it) — this skill owns the suite-specific rules; NOT `rk-tweaks`
      (playing with values); NOT `rk-design-qa` (that compares a **built implementation** to
      the reference — this reviews the design itself). Triggers: "critique this",
      "review this design", "what's wrong with this design", "punch list".

**Commit:** `feat(rk-critique): new skill — structured review of design artifacts`

### Task 7 — `rk-design-qa`: implementation-fidelity check `[sonnet]`
**Files:** Create `Creative/rk-design-qa/SKILL.md`

- [ ] **Job:** the last mile — verify the **built product** matches the design reference.
      Inputs: the `design_handoff_<feature>/` spec folder (or the raw artifact) + the running
      implementation (URL or how to launch it).
- [ ] **Process:** read the spec's tokens/states/behavior sections; screenshot reference and
      implementation at the same widths (`screenshot.mjs`); check — semantic tokens actually
      applied (computed styles vs spec values), every specified state present
      (hover/focus/press/loading/error/empty), motion durations/easings preserved,
      reduced-motion path, breakpoints honored per the spec's Responsive section, copy
      matches. Contrast re-check on the implementation with `check-contrast.mjs` (built
      pages drift).
- [ ] **Output:** a fidelity diff report — spec value · built value · verdict — ranked by
      user impact; open items phrased so they can go straight into issues.
- [ ] **Boundaries:** NOT code review (correctness/security is `/code-review`'s job); NOT
      `rk-critique` (design-stage review of the artifact itself); runs **after** an rk-plan
      build completes. Triggers: "does the build match the design", "fidelity check",
      "verify the implementation against the mockup".

**Commit:** `feat(rk-design-qa): new skill — built-implementation fidelity check`

### Task 8 — `rk-imagery`: sourcing + treatment `[sonnet]`
**Files:** Create `Creative/rk-imagery/SKILL.md`

- [ ] **Job:** the positive path for real imagery, so the pipeline stops dead-ending at
      placeholders. rk-design's bans (no SVG-drawn illustration, no fabricated photos)
      **stay in rk-design** — this skill is what to do instead.
- [ ] **Sourcing order (the spine of the skill):** user-provided assets → brand/design-system
      `assets/` → curated stock with license notes (name concrete sources: Unsplash/Pexels
      class) → generated imagery **only on explicit user opt-in, labeled as generated** →
      `<image-slot>` placeholder as the *last* resort, not the first.
- [ ] **Treatment rules (moved here from rk-deck; this becomes the canonical home):**
      full-bleed photos aspect-**fill**; screenshots/diagrams aspect-**fit**;
      transparent/fit images on a contrasting background; text over an image needs a card,
      protection gradient, or blur; **view every image and decide its treatment** — never
      drop one in raw. Add: alt text required on every meaningful image.
- [ ] **Boundaries:** NOT icon strategy for design systems (rk-design-system owns
      copy-don't-draw icon rules); used *by* rk-deck/rk-doc/rk-prototype mid-build.
      Triggers: "find images", "source photos", "what image goes here", "image treatment".

**Commit:** `feat(rk-imagery): new skill — imagery sourcing and treatment`

---

## Phase 4 — Sibling skill edits [parallel]

**Gate:** `test -f Creative/rk-wireframe/assets/wireframe-row.js`; a scratch HTML using
`<wireframe-row>` + two `<wireframe-frame>`s screenshots without console errors (capture via
`screenshot.mjs`, eyeball the PNG); greps ≥ 1: `rk-wireframe/SKILL.md` for `wireframe-row.js`
and for a decision-log instruction; `rk-prototype/SKILL.md` for `rk-critique`;
`rk-productionize/references/spec-template.md` for `Responsive behavior` and
`Accessibility notes` headings; `rk-deck/SKILL.md` for `rk-imagery`.

### Task 9 — rk-wireframe: scaffold asset + decision log `[sonnet]`
**Files:** Create `Creative/rk-wireframe/assets/wireframe-row.js`; Modify `Creative/rk-wireframe/SKILL.md`

- [ ] The only skill violating the suite's own "don't hand-roll the plumbing" rule — it
      prescribes a fiddly wrapper with three documented footguns but ships no asset. Build a
      small vanilla custom-element pair (read `Creative/rk-prototype/assets/screen-deck.js`
      first for code conventions): `<wireframe-row>` (the scrolling gray canvas — encodes
      body-scroll, `width:max-content`, no-centering) and `<wireframe-frame label="A — Sidebar nav" width="360">`
      (label + white card, default `min-height` 640). Light-DOM content, ~60–90 lines,
      header-comment usage docs like the sibling assets.
- [ ] SKILL.md: replace the hand-written scaffold block with copy-the-asset usage (keep one
      sentence on *why* the layout works that way); keep the footguns as red flags.
- [ ] SKILL.md: add a **decision log** convention to the "Next" section: when the user picks
      a direction, append two lines (winner + why, date) to a `design-decisions.md` in the
      project so the rationale survives the session.

**Verify:** the gate's scratch-HTML screenshot renders two labeled frames
**Commit:** `feat(rk-wireframe): ship wireframe-row element, add decision log`

### Task 10 — rk-prototype: verify hooks + critique handoff `[sonnet]`
**Files:** Modify `Creative/rk-prototype/SKILL.md`

- [ ] Verify section additions: one **keyboard-only pass** through the flow (every
      interactive control reachable and operable); if rk-design's declared viewport story is
      "responsive", screenshot at two widths and confirm layout holds.
- [ ] "Next" section: insert `rk-critique` before `rk-productionize` — review the approved
      prototype, fix the punch list, *then* spec for handoff.
- [ ] Keep total growth under ~10 lines.

**Verify:** grep for `rk-critique` and `keyboard` in the file
**Commit:** `feat(rk-prototype): keyboard/responsive verify hooks, critique before handoff`

### Task 11 — rk-productionize: spec-template required sections `[sonnet]`
**Files:** Modify `Creative/rk-productionize/references/spec-template.md`, `Creative/rk-productionize/SKILL.md`

- [ ] spec-template: add two **required** numbered sections before "Open questions":
      **Responsive behavior** (the viewport story the design declared; breakpoints; what
      reflows/collapses/hides at each; touch targets) and **Accessibility notes** (focus
      order, labels/roles, contrast-critical pairs with their measured ratios, reduced-motion
      expectations). Renumber the following sections. In "Open questions", delete
      "responsive context" from the example list (it's now a required section, not an open
      question).
- [ ] SKILL.md: add the two sections to the "What you produce" load-bearing list and the
      Verify checklist (one line each).

**Verify:** grep the template for `Responsive behavior` and `Accessibility notes` as headings
**Commit:** `feat(rk-productionize): require responsive + accessibility spec sections`

### Task 12 — rk-deck: imagery dedupe `[sonnet]`
**Files:** Modify `Creative/rk-deck/SKILL.md`

- [ ] The Imagery bullet in "Slide construction" shrinks to a one-line summary (fill vs fit +
      text-protection in ~one clause) plus a pointer: sourcing and full treatment rules live
      in **rk-imagery**. Net-negative diff. Nothing else in the file changes.

**Verify:** grep for `rk-imagery`; the detailed gradient/fit/fill sentences appear once in the suite (in rk-imagery), not twice
**Commit:** `refactor(rk-deck): point imagery treatment at rk-imagery`

---

## Phase 5 — README, cross-reference sweep, symlinks [sequential]

**Gate:**
1. `test -f Creative/README.md` and it greps ≥ 1 for each of the 14 skill names.
2. Dangling-reference sweep: every `rk-*` name mentioned in any `Creative/*/SKILL.md` matches
   an existing directory in `Creative/` or `Planning/` (one grep loop; `rk-plan`* names
   resolve against `Planning/`).
3. `for s in rk-brief rk-critique rk-deck rk-design rk-design-qa rk-design-system rk-doc rk-export-html rk-imagery rk-llm-prototypes rk-productionize rk-prototype rk-tweaks rk-wireframe; do test -f ~/.claude/skills/$s/SKILL.md || echo "BROKEN: $s"; done` → no output.

### Task 13 — `Creative/README.md` pipeline map `[sonnet]`
**Files:** Create `Creative/README.md`

- [ ] One page: the pipeline diagram
      (`idea → rk-brief → rk-wireframe → rk-design-system → rk-prototype/rk-deck/rk-doc →
      rk-tweaks/rk-llm-prototypes/rk-imagery → rk-critique → rk-export-html/rk-productionize →
      rk-plan (Planning/) → build → rk-design-qa`), then a table: skill · one-line "use when" ·
      what it ships (assets). Pull each one-liner from the skill's actual description — don't
      re-invent. Note rk-design as the base layer everything declares.

**Verify:** the gate's grep-all-14 check
**Commit:** `docs(creative): add pipeline map README`

### Task 14 — Cross-reference consistency sweep `[sonnet]`
**Files:** Modify any `Creative/*/SKILL.md` found inconsistent (expected: zero to three one-line fixes)

- [ ] Read every SKILL.md in `Creative/` end to end (they're short). Check: each skill's
      NOT-for/Next pointers name skills that exist and point the right way (e.g. wireframe's
      "Next" should now be able to mention rk-brief upstream and critique downstream if
      natural); no stale claims contradicted by this build (e.g. rk-design's old 5-skill
      routing list is gone; rk-deck no longer carries the full imagery rules). Fix only real
      inconsistencies — no editorializing.

**Verify:** the gate's dangling-reference sweep passes
**Commit:** `fix(creative): cross-reference sweep after suite upgrade`

### Task 15 — Add `~/.claude/skills` symlinks for the new skills `[orchestrator]`

Exact commands — the orchestrator runs these directly (no dispatch; outside-repo change, not
committed). The 10 pre-existing links were already repaired by the human (verified at
authoring); only the 4 new skills need links:

- [ ] `for s in rk-brief rk-critique rk-design-qa rk-imagery; do ln -sfn /Users/jeffborden/Documents/Coding/_Skills/Creative/$s ~/.claude/skills/$s; done`
- [ ] STOP condition: if any `~/.claude/skills/<name>` already exists as a **real directory**
      (not a symlink), do not delete it — stop and report.

**Verify:** the gate's 14-skill loop prints nothing; `readlink ~/.claude/skills/rk-brief` → the `Documents/Coding` path

---

## Files

| Action | Path |
|---|---|
| Create | `Creative/rk-design/assets/check-contrast.mjs` (Task 1) |
| Create | `Creative/rk-design/assets/screenshot.mjs` (Task 2) |
| Modify | `Creative/rk-llm-prototypes/assets/llm-proxy.mjs`, `.env.example`, `SKILL.md` (Task 3) |
| Modify | `Creative/rk-design/SKILL.md` (Task 4) |
| Create | `Creative/rk-brief/SKILL.md` (Task 5) |
| Create | `Creative/rk-critique/SKILL.md` (Task 6) |
| Create | `Creative/rk-design-qa/SKILL.md` (Task 7) |
| Create | `Creative/rk-imagery/SKILL.md` (Task 8) |
| Create/Modify | `Creative/rk-wireframe/assets/wireframe-row.js`, `SKILL.md` (Task 9) |
| Modify | `Creative/rk-prototype/SKILL.md` (Task 10) |
| Modify | `Creative/rk-productionize/references/spec-template.md`, `SKILL.md` (Task 11) |
| Modify | `Creative/rk-deck/SKILL.md` (Task 12) |
| Create | `Creative/README.md` (Task 13) |
| Modify | (sweep fixes, if any) (Task 14) |
| Symlinks | `~/.claude/skills/rk-{brief,critique,design-qa,imagery}` (Task 15, uncommitted) |

**Reuse (don't reinvent):** `Creative/rk-export-html/assets/inline-html.mjs` (zero-dep CLI
conventions); `Creative/rk-prototype/assets/screen-deck.js` + `image-slot.js` (custom-element
conventions; image-slot is referenced by rk-imagery, unchanged); existing SKILL.md anatomy as
the style contract for all new/edited skills;
`/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md` for Phase 2/3
critics.

---

## Verification (end-to-end)

1. `node Creative/rk-design/assets/check-contrast.mjs --self-test` → ok.
2. `node Creative/rk-design/assets/screenshot.mjs` on a suite artifact (e.g. a scratch page
   using `wireframe-row.js`) → PNG renders correctly.
3. Proxy boots in both provider modes (fake keys), errors clearly with none.
4. All Phase 2–5 greps pass; dangling-reference sweep clean.
5. All 14 `~/.claude/skills/rk-*/SKILL.md` paths resolve.
6. Read `Creative/README.md` top to bottom — the pipeline it describes matches the skills as
   they now exist.
7. `git log --oneline` shows one commit per task on `creative-suite-upgrade`; working tree clean.

---

## Handoff prompt (paste into a fresh Opus session in this repo)

> You are the **Opus orchestrator** for the Creative Suite Upgrade. Work from the repo root
> `/Users/jeffborden/Documents/Coding/_Skills`. The full task-by-task plan is at
> `docs/plans/incomplete/2026-07-04-creative-suite-upgrade.md` — read it first, in full.
>
> **Why:** the Creative/ rk-* skill suite covers wireframe → spec but the goal is idea →
> implementation. This build adds 4 new skills (rk-brief, rk-critique, rk-design-qa,
> rk-imagery), pushes a11y/responsive requirements into the rk-design base, ships two zero-dep
> verification assets (contrast checker, headless-Chrome screenshotter), makes the LLM proxy
> auto-detect Anthropic vs OpenAI-compatible providers, adds a pipeline README, and symlinks
> the 4 new skills into ~/.claude/skills. Scope is confirmed in the plan's Context section;
> nothing outside `Creative/` changes except the symlinks and this plan file.
>
> **Also read for grounding:** `Creative/rk-design/SKILL.md` (the base skill — its anatomy and
> voice are the style contract), `Creative/rk-prototype/SKILL.md` and
> `Creative/rk-wireframe/SKILL.md` (sibling anatomy), `Creative/rk-export-html/assets/inline-html.mjs`
> (zero-dep CLI conventions), `Creative/rk-prototype/assets/screen-deck.js` (custom-element
> conventions).
>
> **How to run it:** branch `creative-suite-upgrade` off `main`, then commit the plan file
> (`git add docs/plans/ && git commit`) so the final `git mv` promotion works. Execute phases
> in order. Phase headers carry execution annotations — `[parallel]` dispatch all tasks at
> once, `[sequential]` one at a time with manual review. `[adversarial]` (Phases 2–3) wraps
> each task in a generate→critique→regenerate loop: dispatch a fresh general-purpose agent as
> critic with the prompt card at
> `/Users/jeffborden/.claude/skills/rk-plan-pro/adversarial-critic-prompt.md` — if you cannot
> read the card at that path, STOP and ask the human; do NOT synthesize a critic prompt
> inline. Give the critic only the task spec + generator output + changed files (never the
> full plan); run up to **Max iterations: 3**, block on findings ≥ **75**. For Phase 3
> critics, add the plan's phase-level critic focus: suite-anatomy conformance, boundary
> clarity, zero duplication of rk-design content, trigger/description quality.
>
> You own the gates and do **not** write feature content yourself (single exception: Task 15's
> exact symlink commands — run those directly, and honor its STOP condition). Dispatch one
> fresh agent per task at its tagged tier, giving each agent only its task section plus the
> grounding files named in it. Between tasks, review the diff (matches plan? actually works?),
> run the task's `**Verify:**`, then commit with the task's message. **Bounce cap: a task gets
> at most 3 re-dispatches** (failed review, failed Verify, or adversarial regenerations) —
> then STOP and surface the findings plus the last output to the human; never loop
> indefinitely. At each phase boundary run the gate commands yourself and inspect real output;
> Phase 1's gate is also the live probe of the riskiest assumption (headless Chrome works on
> this machine) — if Chrome is genuinely absent, STOP and ask the human rather than
> substituting a dependency. Flip `- [ ]`→`- [x]` per task (batch checkbox commits per phase).
> When every gate passes, `git mv docs/plans/incomplete/2026-07-04-creative-suite-upgrade.md
> docs/plans/complete/` and commit (docs/ is tracked — verified at authoring).
>
> **Hard rules:** all new/edited assets stay **zero-dependency Node ≥ 18** — adding npm
> packages (Playwright, Puppeteer, anything) is out of scope, STOP and ask. New SKILL.mds
> follow the suite anatomy exactly (frontmatter with name/description/allowed-tools;
> REQUIRED BACKGROUND; When to use with NOT-for boundaries; Verify; Red flags) and must not
> duplicate rules that live in rk-design — reference them. The proxy's `/api/complete`
> request/response contract must not change. Task 15 must never delete a real (non-symlink)
> directory under `~/.claude/skills`.
>
> **Proof bar:** nothing is "done" without pasted real command output — gate greps, self-test
> output, the probe PNG's existence, the symlink loop printing nothing.
>
> **On surprises:** doc-backed corrections to a planned detail → fix, note it in the plan
> file, continue; anything adding a dependency, touching files outside the stated scope, or
> changing what a skill is for → STOP and ask.
>
> Start by reading the plan + grounding docs, then begin Phase 1 (all three tasks in
> parallel). Report progress at each gate.
