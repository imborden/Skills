# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The orchestrator moves
> this file to `docs/plans/complete/` only when **every gate passes**. Halted builds
> stay in `incomplete/`.

## Context

Why this change is being made — the problem/need, what prompted it, the intended
outcome. State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files,
reference images — name them with exact paths so the build can't stall mid-run
waiting on them. A missing input triggers a halt beacon, not a stall or fabrication.

**Unverified assumptions:** anything the build rests on but hasn't been confirmed (scope,
auth, API/response shapes). The riskiest ones get a live probe in Phase 1's gate.

## Architecture (optional, 1 paragraph)

The shape of the solution and the key decision(s). Skip if trivial.

## How to run this build — orchestrated, gated, task-by-task

Execute phases in order. Phase headers carry an execution annotation: `[parallel]` (all tasks at once),
`[pipeline]` (sequential chain with handoff), `[sequential]` (one at a time with manual review —
the default). `[adversarial]` composes with `[parallel]` or `[sequential]` for generator→critic→regenerate loops.

The **V4 Pro orchestrator owns the gates and does not write feature code**: it dispatches one fresh agent
per task at the tagged tier, respecting the phase annotation's dispatch strategy. Tasks with
`**Schema:**` get structured output validation. In `[pipeline]` phases, each task's output feeds the
next via `**Receives:**`. In `[adversarial]` phases, the orchestrator runs the generator→critic→regenerate
loop per task up to `**Max iterations:**`, blocking on findings at or above `**Threshold:**`.

**BLOCKING Progress Protocol:** before dispatching the next task, the orchestrator MUST flip the
current task's checkbox, append its beacon line to RUN-LOG.md, and commit work + checkbox + beacon
together. No-ops, halts, and gates each get their own committed beacon — never skip a commit.
The protocol is auditable from `git log` + `cat RUN-LOG.md` alone.

Between tasks it reviews the diff in two stages (matches plan? actually works?), runs the gate command
itself at each phase boundary, flips `- [ ]`→`- [x]` per task and per gate, commits per task and
per gate, and moves this file to `complete/` when all gates pass. On failure, bounce the task to a
fresh agent with the failure output.

`[flash]` = V4 Flash, mechanical/fully-specified, zero design decisions.
`[pro]` = V4 Pro, judgment/multi-file/non-trivial logic.
`[orchestrator]` = V4 Pro, validation only.

## Progress protocol — BLOCKING, applies to every task and every gate

Every step leaves a repo-visible breadcrumb. You may **NOT** dispatch the next
task until the current step's commit exists. For each task and each gate, in order:

1. **Flip its checkbox** in the Task checklist below: `- [ ]` -> `- [x]`.
2. **Append exactly one BEACON line** to `RUN-LOG.md` at the repo root, using the
   `**Beacon:**` or `**Gate beacon:**` string given on that step (fill in the `<...>`
   fields with real values). One line, appended — never rewrite earlier lines.
3. **Commit the work + the checkbox flip + the RUN-LOG line together**, message
   `<project>: <task name>` for tasks, `<project>: Phase N gate` for gates.

Rules that make this an honest trail:

- **A conditional no-op still gets its own commit.** If a task does no code work
  (e.g. a Flash task's precondition is false), you STILL flip its checkbox, STILL append
  its BEACON line recording what happened, and STILL commit (a commit with no code
  change is correct here). Skipping the commit because "there was nothing to do"
  is a protocol failure.
- **Do not bundle two tasks into one commit.** Each task = one commit, even within
  a `[pipeline]` phase.
- **A halt still gets a beacon.** If you STOP to ask the human, append the halt
  BEACON line and commit it before stopping, so the stopping point is visible in
  the repo.
- **Every gate is a commit.** After a task completes and its beacon is committed,
  run the gate command, append its gate beacon to RUN-LOG.md, flip the gate
  checkbox, and commit — even if the gate passes and no code changes. The gate
  beacon proves the gate was executed and not skipped. **Exception:** the Phase 1
  pipeline gate, whose template explicitly says to bundle with the last pipeline
  task — because in a pipeline there is no gap between the last task and its gate.
  Every other gate is a separate commit.

Create `RUN-LOG.md` as part of the Phase 1 scaffold with this first line:
```
BEACON P0 START | <project> eval run
```

---

## Phase 1 — <title> [parallel|pipeline|sequential]

<!-- Omit the annotation to default to [sequential]. Valid compositions:
     [parallel], [pipeline], [sequential], [adversarial] [parallel], [adversarial] [sequential] -->

**Gate:** `<command>` → <exact expected output/criteria>
<!-- Gate may reference schema fields: AND testsPassing === true AND filesCreated.length >= 2 -->
<!-- Make this gate exercise the riskiest unverified assumption (one real call/query),
     not just a trivial smoke check — surface bad assumptions before later phases build on them. -->
**Gate beacon:** `BEACON P1 GATE <pass|fail> | <result>`
<!-- For pipeline phases, add: (append + commit as part of last task's commit) -->
<!-- For non-pipeline phases, add: (separate commit — append beacon, flip Phase 1 gate checkbox, commit) -->

<!-- For [adversarial] phases, add these three fields after the Gate beacon:
**Critic:** ce-adversarial-reviewer
**Threshold:** 75
**Max iterations:** 3 -->

### Phase 1 scaffold (orchestrator writes directly)

**Verbatim-content files — the orchestrator writes these directly (do NOT dispatch):**

`conftest.py` (or equivalent test/config scaffolding):
```python
```

`<package>/__init__.py`:
```python
```

`tests/<test_file>.py`:
```python
```

`RUN-LOG.md` (created with P0 beacon):
```
BEACON P0 START | <project> eval run
```

**Scaffold step:** write the files above, then commit.
**Beacon:** `BEACON P1 SCAFFOLD done | <files written>`
**Commit message:** `<project>: Phase 1 scaffold`

### Task 1 — <name> `[flash|pro]`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "functionImplemented": "string" }`
<!-- Schema is optional. Omit for tasks where output is hard to schematize.
     When present, the orchestrator validates agent output against it.
     Keep it flat — max 2 levels of nesting. -->

<!-- For [pipeline] phases, every task except the first MUST include:
**Receives:** Task N output — `{ "fieldName": "value", ... }` -->

<!-- For [flash] tasks include: exact file paths, exact code or a precise diff, exact
commands + expected output, numbered steps, and a STOP condition. -->

**Verify:** `<command>` → `<expected output>`
**Beacon:** `BEACON P1 T1 done | <functionality>`

### Task 2 — <name> `[pro]`

<!-- In [pipeline] phases, Task 2 and later must include Receives: -->
**Receives:** Task 1 output — `{ "fieldName": "value" }`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (same shape; Pro tasks may state intent + constraints rather than verbatim code)

**Verify:** `<command>` → `<expected output>`
**Beacon:** `BEACON P1 T2 done | <functionality>`

---

## Phase 2 — <title> [parallel|pipeline|sequential]

<!-- Same annotation options as Phase 1. For adversarial phases:
## Phase 2 — <title> [adversarial] [parallel]
**Gate:** `<command>` → `<expected>` AND no critic findings ≥ **Threshold:** value
**Gate beacon:** `BEACON P2 GATE <pass|fail> | <result>` (separate commit)
**Critic:** ce-adversarial-reviewer
**Threshold:** 75
**Max iterations:** 3
-->

**Gate:** `<command>` → <expected>
**Gate beacon:** `BEACON P2 GATE <pass|fail> | <result>` (separate commit — append beacon, flip Phase 2 gate checkbox, commit)

### Task 3 — <name> `[pro]`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "exitCodesHandled": "boolean" }`

**Verify:** `<command>` → `<expected output>`
**Beacon:** `BEACON P2 T3 done | <description>`

---

## Phase 3 — <title> [sequential]

<!-- For conditional / no-op tasks, include the precondition, STOP condition,
and a no-op beacon template: -->

**Gate:** `<command>` → <expected>
**Gate beacon:** `BEACON P3 GATE <pass|fail> | <result>` (separate commit)

### Task 4 — <name> `[flash]`
**Files:** Modify `<exact paths>`
**Precondition:** `<condition that must be true for this task to apply>`
**Steps:**
1. Inspect `<file>` and determine whether `<condition>` is true.
2. If `<condition>` is NOT true, make NO edits. Stop and report:
   `precondition not met: <reason>`.
3. Only if `<condition>` IS true, perform the edit: `<exact change>`.
**STOP condition:** If anything differs from the above, do not improvise — stop
and report back.
**Schema:** `{ "preconditionMet": "boolean", "edited": "boolean", "functionsObserved": ["string"] }`
**Verify:** `<command>` → `<expected output>`
**Beacon:** `BEACON P3 T4 <noop|edited> | preconditionMet=<bool> edited=<bool> | functionsObserved=<list>`
(Per the progress protocol, this task is committed even if it is a no-op:
checkbox flip + beacon line + empty-of-code commit.)

---

## Phase 4 — <title> [sequential]

<!-- When a task depends on a human-provided input, include BOTH beacon templates:
one for proceeding, one for halting. The halt template is structural — it tells
the orchestrator exactly what to write when the input is missing. -->

**Gate:** `<command>` → <expected>
**Gate beacon:** `BEACON P4 GATE <pass|fail> | <result>` (separate commit)

### Task 5 — <name> `[pro]`
**Files:** Modify `<exact paths>`
**Spec:** <description of the change, including what to do with the human-provided input>
**Schema:** `{ "filesModified": ["string"], "matchesReference": "boolean" }`
**Verify:** `<command>` → `<expected output>`

<!-- Two beacon templates — the orchestrator picks one: -->
**Beacon (reached + proceeding):** `BEACON P4 T5 done | <description>`
**Beacon (reached + halting):** `BEACON P4 T5 halt | required input <path> not provided | asking human`
(If the required input is absent, append the halt beacon, commit, and STOP.)

---

## Task checklist

- [ ] Phase 1 scaffold (scaffold files + RUN-LOG.md with P0 beacon)
- [ ] Task 1 — <name>
- [ ] Task 2 — <name>
- [ ] Phase 1 gate: `<command>` → `<expected>`
- [ ] Task 3 — <name>
- [ ] Phase 2 gate: `<command>` → `<expected>`
- [ ] Task 4 — <name>
- [ ] Phase 3 gate: `<command>` → `<expected>`
- [ ] Task 5 — <name>
- [ ] Phase 4 gate: `<command>` → `<expected>`

<!-- Every task AND every gate gets its own checkbox. The P1 pipeline gate
checkbox is flipped as part of the last pipeline task's commit. All other
gate checkboxes get their own commit. -->

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

## Handoff prompt (paste into a fresh V4 Pro session in this repo)

> You are the orchestrator for <project>. The full task-by-task plan is at
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
> **BLOCKING Progress Protocol:** for every task, before dispatching the next one:
> flip its checkbox, append its exact BEACON line (from the `**Beacon:**` or
> `**Gate beacon:**` field) to RUN-LOG.md, and commit work + checkbox + beacon
> together with message `<project>: <task name>`. No-ops (e.g. a task whose
> precondition is false) and halts get their own committed beacon too — never skip
> a commit. Every gate gets a beacon and a separate commit (the P1 pipeline gate
> is the only bundled exception — its template will say so). The protocol is
> blocking: you may NOT dispatch the next task until the current commit exists.
>
> Tasks with `**Schema:**` expect structured JSON output — pass the schema when
> dispatching the agent and validate against it. Gate conditions may reference
> schema fields by name (`testsPassing === true`). In `[pipeline]` phases, inject
> each task's validated output as context for the next task via `**Receives:**`.
>
> Tier tags: `[flash]` = V4 Flash (mechanical, fully-specified, zero decisions);
> `[pro]` = V4 Pro (judgment, multi-file, non-trivial logic); `[orchestrator]` =
> validation only. Verbatim-content files with exact content in the plan are
> written by you directly — do not dispatch them.
>
> You own the gates and do **not** write feature code yourself: dispatch one fresh
> agent per task at its tagged tier, giving each agent only its task's section.
> Between tasks, review the diff (matches plan? actually works?). At each phase
> boundary, run the gate command yourself and inspect real output; append the gate
> beacon, flip the gate checkbox, and commit. Flip `- [ ]`→`- [x]` per task and
> per gate. When every gate passes, `git mv` this file to `docs/plans/complete/`.
> On failure, bounce that task to a fresh agent with the failure output.
>
> **Hard rules:** <project-specific invariants the agents must not violate>.
>
> **Proof bar:** nothing is "done" without pasted real output; gate any unverified
> assumption with a live probe rather than trusting it.
>
> **On surprises:** doc-backed corrections to a planned decision → fix, document, continue;
> anything that adds a dependency, costs money, or changes scope → STOP and ask.
> If a task depends on an input you don't have (listed in Required inputs), append
> the halt beacon, commit, and STOP — do not fabricate or improvise past it.
>
> Start by reading the plan + grounding docs, then begin Phase 1 scaffold. Report
> progress at each gate.
