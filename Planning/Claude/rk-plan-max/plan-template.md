# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The team-lead moves
> this file to `docs/plans/complete/` when every gate passes, then shuts the team down.
>
> This is a **max-tier** plan: a fresh **Opus team-lead** stands up a persistent agent
> team (`TeamCreate` + named teammates on a shared task board) and drives it to completion.
> If this is a single coherent workstream with no real parallelism, it belongs in
> `rk-plan-pro` — a team would be overhead.

## Context

Why this change is being made — the problem/need, what prompted it, the intended
outcome. State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files — name
them so the build can't stall mid-run waiting on them.
**Unverified assumptions:** anything the build rests on but hasn't been confirmed (scope,
auth, API/response shapes, the workstream decomposition). The riskiest ones get a live
probe in Phase 1's gate; the whole plan gets one adversarial pre-critique before Phase 1.

## Architecture & workstream decomposition (required at this tier)

The shape of the solution, the key decision(s), and — critically — **how the work splits
into workstreams** and which are independent vs. dependent. This decomposition drives the
roster size and the `BlockedBy` DAG below.

## Roster

| Name | Tier | Responsibility |
|---|---|---|
| `team-lead` | Opus | Owns gates + lifecycle; writes no feature code; runs the per-task review loop; `git mv` + shutdown on done |
| `impl-a` | `[sonnet]` | Claims and builds tasks in its own worktree |
| `impl-b` | `[sonnet]`/`[haiku]` | Second implementer for parallel workstreams (scale count to parallelism) |
| `adversarial-critic` | Opus/`[sonnet]` | Pre-critiques the plan; critiques safety-critical task outputs (`adversarial-critic-prompt.md`) |
| `spec-reviewer` | `[sonnet]` | Spec-compliance review per task (`spec-reviewer-prompt.md`) |
| `quality-reviewer` | `[sonnet]` | Code-quality review after spec passes (`code-quality-reviewer-prompt.md`) |
| `integration-tester` | `[sonnet]` | Cross-workstream integration gates; drives `Monitor` for long-running suites |

<!-- Trim or grow this roster to fit the build. Always keep team-lead + at least one
     implementer + the three review/critic roles. -->

## How to run this build — team-orchestrated, gated, board-driven

The **Opus team-lead** runs `TeamCreate`, spawns the roster (Phase 0), and populates the
shared `TaskList` from the tasks below — each with its `**Owner role:**` and `**BlockedBy:**`.
Teammates **self-claim unblocked tasks in ID order** (`TaskUpdate owner`) and build them,
each implementer in its own worktree (`isolation:"worktree"`). The lead **writes no feature
code** (only verbatim-content files whose exact bytes are in this plan), runs the per-task
review loop, runs each phase `**Gate:**` command itself at the barrier, flips
`- [ ]`→`- [x]` and commits per task, and on all-gates-pass `git mv`s this file to
`complete/` and sends each teammate a `shutdown_request`.

**Phases are gate barriers** — no task in Phase N+1 starts until the lead has run Phase N's
gate and confirmed its exact output. Within/across phases, the `BlockedBy` DAG governs
concurrency. Refer to teammates by **name**; teammates go idle between turns (normal);
communicate only via `SendMessage`.

`[haiku]` = mechanical/fully-specified; `[sonnet]` = judgment/multi-file; `[orchestrator/opus]` =
validation + verbatim writes.

---

## Phase 0 — Team setup [orchestrator/opus]

**Gate:** team config at `~/.claude/teams/<team>/config.json` lists every roster member AND the board is populated with every Phase 1+ task (TaskList shows them).

- [ ] `TeamCreate` with `team_name: <slug>`.
- [ ] Spawn each roster member via the `Agent` tool with `team_name` + `name` (implementers with `isolation:"worktree"`).
- [ ] `TaskCreate` every task below, setting `BlockedBy` edges via `TaskUpdate`.
- [ ] **Plan pre-critique:** have `adversarial-critic` read this plan + DAG and report failure modes; resolve any blocking finding before unblocking Phase 1.

---

## Phase 1 — <title>

**Gate:** `<command>` → <exact expected output/criteria>
<!-- May reference schema fields: AND testsPassing === true AND filesCreated.length >= 2
     Make this gate exercise the riskiest unverified assumption (one real call/query). -->
<!-- For long-running gates, run under Monitor and emit success AND failure signals:
     Monitor: `npm test 2>&1 | grep -E --line-buffered "PASS|FAIL|Error|Killed"` -->

### Task 1 — <name> `[haiku|sonnet]`
**Owner role:** implementer
**BlockedBy:** —   <!-- omit / "—" means immediately claimable; runs in parallel -->
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "testsPassing": "boolean" }`
<!-- Schema optional; keep flat (max 2 levels). -->

- [ ] Step 1: <for haiku: exact content/diff + numbered steps>
- [ ] Step 2: <exact command to run> → <exact expected output>

<For [haiku] tasks include: exact file paths, exact code or a precise diff, exact
commands + expected output, and a STOP condition — "if anything differs, stop and
report, do not improvise.">

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

### Task 2 — <name> `[sonnet]`
**Owner role:** implementer
**BlockedBy:** Task 1   <!-- declares the DAG edge; lead injects Task 1's output as context -->
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (same shape; sonnet tasks may state intent + constraints rather than verbatim code)

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

### Task 3 — <name> `[sonnet]` (safety-critical → adversarial)
**Owner role:** implementer
**BlockedBy:** —
**Adversarial:** yes — `adversarial-critic`, threshold 75, max iterations 3
**Files:** Create/Modify `<exact paths>`

...

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

---

## Phase 2 — <title>

**Gate:** `<command>` → <expected>

### Task 4 — ...
**Owner role:** integration-tester
**BlockedBy:** Task 2, Task 3
...

---

## Files

| Action | Path |
|---|---|
| Create/Modify | `<path>` (Task N) |

**Reuse (don't reinvent):** existing utilities/patterns found during discovery, with paths.

---

## Verification (end-to-end)

How to confirm the whole thing works: exact commands to run and their expected output,
tests to pass, cross-workstream integration checks. Keep it runnable — the team-lead
executes this, it doesn't eyeball.

---

## Handoff prompt (paste into a fresh Opus session in this repo)

> You are the **Opus team-lead** for <feature>. The full task-by-task plan is at
> `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` — read it first, in full.
>
> **Why:** <one-paragraph context + confirmed scope>.
>
> **Also read for grounding:** <key files/docs the build depends on>.
>
> **Set up the team (Phase 0):** run `TeamCreate` (team_name `<slug>`), then spawn the
> roster via the `Agent` tool with `team_name` + a stable `name` — implementers with
> `isolation:"worktree"`. `TaskCreate` every task and set `BlockedBy` edges with
> `TaskUpdate`. Then have `adversarial-critic` pre-critique this plan + DAG and resolve
> any blocking finding before Phase 1.
>
> **How to run it:** teammates self-claim unblocked tasks in ID order (`TaskUpdate owner`)
> and build them, each implementer in its own worktree. Phases are **gate barriers** — no
> Phase N+1 task starts until you've run Phase N's `Gate:` command yourself and confirmed
> the exact output. Tasks with `Schema:` expect structured JSON — pass the schema when
> dispatching and validate the fields; gates may reference field names (`testsPassing === true`).
> Inject a `BlockedBy` task's validated output as context for the task that depends on it.
>
> **Per task, run the loop:** the owning teammate builds → you run `Verify` (use `Monitor`
> for long suites; it must emit success AND failure signals) → dispatch `spec-reviewer`
> (`spec-reviewer-prompt.md`) → after ✅, `quality-reviewer` (`code-quality-reviewer-prompt.md`)
> → for safety-critical tasks (`Adversarial: yes`) run the `adversarial-critic` loop, blocking
> on findings ≥ threshold up to max iterations. On any ❌, bounce the **same implementer** with
> the findings and re-run from Verify. **You write no feature code** — only verbatim-content
> files whose exact bytes are in the plan.
>
> **Team etiquette:** refer to teammates by **name**; they go idle between turns (normal —
> don't react to idleness until it blocks you); communicate only via `SendMessage` (plain
> text, no JSON status messages); coordinate through the board.
>
> **Gates are commands, not opinions.** At each phase boundary run the `Gate:` command and
> confirm the exact expected output before unblocking the next phase. Flip `- [ ]`→`- [x]`
> and commit per task with the message in the task. When every gate passes, `git mv` this
> file to `docs/plans/complete/`, then send each teammate `{type:"shutdown_request"}`.
>
> **Hard rules:** <project-specific invariants the agents must not violate>.
>
> **Proof bar:** nothing is "done" without pasted real command output; gate any unverified
> assumption with a live probe rather than trusting it.
>
> **On surprises:** a doc-backed correction to a planned decision → fix, document, continue.
> Anything that adds a dependency, costs money, or changes scope → STOP and ask the human.
>
> Start by reading the plan + grounding docs, then run Phase 0. Report progress at each gate.
