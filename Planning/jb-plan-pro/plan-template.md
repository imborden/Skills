# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The orchestrator moves
> this file to `docs/plans/complete/` when every gate passes.

## Context

Why this change is being made — the problem/need, what prompted it, the intended
outcome. State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files — name
them so the build can't stall mid-run waiting on them.
**Unverified assumptions:** anything the build rests on but hasn't been confirmed (scope,
auth, API/response shapes). The riskiest ones get a live probe in Phase 1's gate.

## Architecture (optional, 1 paragraph)

The shape of the solution and the key decision(s). Skip if trivial.

## How to run this build — orchestrated, gated, task-by-task

Execute phases in order. Phase headers carry an execution annotation: `[parallel]` (all tasks at once),
`[pipeline]` (sequential chain with handoff), `[sequential]` (one at a time with manual review —
the default). `[adversarial]` composes with `[parallel]` or `[sequential]` for generator→critic→regenerate loops.

The **Opus orchestrator owns the gates and does not write feature code**: it dispatches one fresh agent
per task at the tagged tier, respecting the phase annotation's dispatch strategy. Tasks with
`**Schema:**` get structured output validation. In `[pipeline]` phases, each task's output feeds the
next via `**Receives:**`. In `[adversarial]` phases, the orchestrator runs the generator→critic→regenerate
loop per task up to `**Max iterations:**`, blocking on findings at or above `**Threshold:**`.

Between tasks it reviews the diff in two stages (matches plan? actually works?), runs the gate command
itself at each phase boundary, flips `- [ ]`→`- [x]` per task, commits per task, and moves this file
to `complete/` when all gates pass. On failure, bounce the task to a fresh agent with the failure output.
`[haiku]` = mechanical/fully-specified; `[sonnet]` = judgment/multi-file; `[orchestrator/opus]` =
validation only.

---

## Phase 1 — <title> [parallel|pipeline|sequential]

<!-- Omit the annotation to default to [sequential]. Valid compositions:
     [parallel], [pipeline], [sequential], [adversarial] [parallel], [adversarial] [sequential] -->

**Gate:** `<command>` → <exact expected output/criteria>
<!-- Gate may reference schema fields: AND testsPassing === true AND filesCreated.length >= 2 -->
<!-- Make this gate exercise the riskiest unverified assumption (one real call/query),
     not just a trivial smoke check — surface bad assumptions before later phases build on them. -->

<!-- For [adversarial] phases, add these three fields after the Gate:
**Critic:** ce-adversarial-reviewer
**Threshold:** 75
**Max iterations:** 3 -->

### Task 1 — <name> `[haiku|sonnet]`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "testsPassing": "boolean" }`
<!-- Schema is optional. Omit for tasks where output is hard to schematize.
     When present, the orchestrator validates agent output against it.
     Keep it flat — max 2 levels of nesting. -->

<!-- For [pipeline] phases, every task except the first MUST include:
**Receives:** Task N output — `{ "fieldName": "value", ... }` -->

- [ ] Step 1: <for haiku: exact content/diff + numbered steps>
- [ ] Step 2: <exact command to run> → <exact expected output>

<For [haiku] tasks include: exact file paths, exact code or a precise diff, exact
commands + expected output, and a STOP condition — "if anything differs, stop and
report, do not improvise.">

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

### Task 2 — <name> `[sonnet]`

<!-- In [pipeline] phases, Task 2 and later must include Receives: -->
**Receives:** Task 1 output — `{ "fieldName": "value" }`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (same shape; sonnet tasks may state intent + constraints rather than verbatim code)

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

---

## Phase 2 — <title> [parallel|pipeline|sequential]

<!-- Same annotation options as Phase 1. For adversarial phases:
## Phase 2 — <title> [adversarial] [parallel]
**Gate:** `<command>` → `<expected>` AND no critic findings ≥ **Threshold:** value
**Critic:** ce-adversarial-reviewer
**Threshold:** 75
**Max iterations:** 3
-->

**Gate:** `<command>` → <expected>

### Task 3 — ...
...

---

## Files

| Action | Path |
|---|---|
| Create/Modify | `<path>` (Task N) |

**Reuse (don't reinvent):** existing utilities/patterns found during discovery, with paths.

---

## Verification (end-to-end)

How to confirm the whole thing works: commands to run, what to observe, tests to pass.

---

## Handoff prompt (paste into a fresh Opus session in this repo)

> You are the **Opus orchestrator** for <feature>. The full task-by-task plan is at
> `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` — read it first, in full.
>
> **Why:** <one-paragraph context + confirmed scope>.
>
> **Also read for grounding:** <key files/docs the build depends on>.
>
> **How to run it:** execute phases in order. Phase headers carry execution annotations —
> `[parallel]` dispatch all tasks at once, `[pipeline]` dispatch sequentially with
> output feeding the next task, `[sequential]` (default) one at a time with manual
> review between. `[adversarial]` composes with `[parallel]` or `[sequential]` for
> generator→critic→regenerate loops — run up to `**Max iterations:**`, block on
> findings at or above `**Threshold:**`.
>
> Tasks with `**Schema:**` expect structured JSON output — pass the schema when
> dispatching the agent and validate against it. Gate conditions may reference
> schema fields by name (`testsPassing === true`). In `[pipeline]` phases, inject
> each task's validated output as context for the next task via `**Receives:**`.
>
> You own the gates and do **not** write feature code yourself: dispatch one fresh
> agent per task at its tagged tier (`[haiku]` mechanical, `[sonnet]` judgment),
> giving each agent only its task's section. Between tasks, review the diff (matches
> plan? actually works?). At each phase boundary, run the gate command yourself and
> inspect real output; mark the phase done only when it passes. Flip
> `- [ ]`→`- [x]` per task and commit per task with the message in the task. When
> every gate passes, `git mv` this file to `docs/plans/complete/`. On failure,
> bounce that task to a fresh agent with the failure output.
>
> **Hard rules:** <project-specific invariants the agents must not violate>.
>
> **Proof bar:** nothing is "done" without pasted real output; gate any unverified
> assumption with a live probe rather than trusting it.
>
> **On surprises:** doc-backed corrections to a planned decision → fix, document, continue;
> anything that adds a dependency, costs money, or changes scope → STOP and ask.
>
> Start by reading the plan + grounding docs, then begin Phase 1, Task 1. Report
> progress at each gate.
