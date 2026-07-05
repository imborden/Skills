# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The team-lead moves this file
> to `docs/plans/complete/` when every gate passes, then shuts the team down.
>
> This is a **pro-cotal** plan: a fresh **Opus team-lead** stands up a **Cotal peer team
> running in cmux workspaces** (`cotal_spawn` peers + `cmux rpc workspace.create` worktrees)
> and drives it to completion. If execution is NOT on Cotal+cmux, this belongs in
> `rk-plan-pro` (Agent-tool orchestrator) or `rk-plan-max` (TeamCreate team) instead.

## Context

Why this change is being made — the problem/need, what prompted it, the intended outcome.
State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files — name them
so the build can't stall mid-run.
**Environment (verified in Gate 0):**
- cmux running; socket reachable for external control — `CMUX_SOCKET_PASSWORD` (or `--password`)
  set and `automation.socketControlMode` permits external `cmux rpc` (`cmux capabilities`
  `access_mode` must not block the lead).
- Cotal space with the `spawn` capability and the roster roles (`cotal_orientation`).
- Target git repo: `<path>`, clean tree, base branch `<branch>`.
**Unverified assumptions:** anything the build rests on but hasn't been confirmed (scope, auth,
API/response shapes, the workstream decomposition). The riskiest ones get a **live cmux probe**
in Phase 1's gate; the whole plan gets one adversarial pre-critique in Phase 0.

## Architecture & workstream decomposition (required at this tier)

The shape of the solution, the key decision(s), and **how the work splits into workstreams** —
which are independent (parallel peers) vs. dependent. This drives the roster size and the
`BlockedBy` DAG below.

## Roster

| Name | Tier | Substrate | Responsibility |
|---|---|---|---|
| `team-lead` | Opus | the executing session | Owns gates + lifecycle; writes no feature code; drives cmux CLI; runs the per-task review loop; merge/PR + plan moved to `complete/` + despawn on done |
| `impl-a` | `[sonnet]` | own cmux workspace | Builds pushed tasks in its worktree |
| `impl-b` | `[sonnet]`/`[haiku]` | own cmux workspace | Second implementer for parallel workstreams (scale count to parallelism) |
| `adversarial-critic` | Opus/`[sonnet]` | standing Cotal peer | Pre-critiques the plan; critiques safety-critical task outputs (`adversarial-critic-prompt.md`) |
| `spec-reviewer` | `[sonnet]` | standing Cotal peer | Spec-compliance review per task against `cmux diff` (`spec-reviewer-prompt.md`) |
| `quality-reviewer` | `[sonnet]` | standing Cotal peer | Code-quality review after spec passes (`code-quality-reviewer-prompt.md`) |
| `integration-tester` | `[sonnet]` | standing Cotal peer | Cross-workstream gates; drives `cmux events` for long gates; port/health probes |

<!-- Trim or grow this roster. Always keep team-lead + at least one implementer + the three
     review/critic roles. -->

## How to run this build — Cotal team, cmux workspaces, gated, lead-pushed board

The **Opus team-lead** `cotal_spawn`s the roster (Phase 0), and the **plan-doc checkboxes
below are the board** (lead-owned). For each unblocked task the lead `cmux rpc
workspace.create`s an isolated workspace (worktree + branch) for the owning role, `cotal_anycast`s
/ `cotal_dm`s the peer, and `cmux rpc workspace.prompt_submit`s the task into the workspace.
**Peers do not self-claim — the lead schedules.** The lead **writes no feature code** (only
verbatim-content files whose exact bytes are in this plan), runs the per-task review loop on the
real `cmux diff`, runs each phase `**Gate:**` command itself at the barrier, flips `- [ ]`→`- [x]`
and commits per task, and on all-gates-pass merges/PRs each branch, moves this file to `complete/`
(with `<git mv | mv — resolved at authoring time via 'git check-ignore docs/'>`), then
`cotal_despawn`s every peer and `cmux rpc workspace.close`s every workspace.

**Phases are gate barriers** — no Phase N+1 task starts until the lead has run Phase N's gate and
confirmed its exact output. Within/across phases, the `BlockedBy` DAG governs concurrency. Address
peers by role/name; peers go idle between turns (normal); coordinate via `cotal_dm`/`cotal_send`.

`[haiku]` = mechanical/fully-specified; `[sonnet]` = judgment/multi-file; `[orchestrator]` =
validation + verbatim writes.

---

## Phase 0 — Environment + team setup [orchestrator]

**Gate:** `cmux ping` succeeds AND `cmux capabilities` shows the lead can call `workspace.create`
(socket auth OK) AND `cotal_orientation` shows the `spawn` capability AND every roster peer is
present (`cotal_roster`) AND the plan pre-critique has no unresolved blocking finding.

- [ ] Verify environment: `cmux ping`; `cmux capabilities` (confirm `access_mode`/auth lets the
      lead drive `cmux rpc`); `cotal_orientation` (confirm `spawn`). If the socket is locked, STOP
      and ask the human for `CMUX_SOCKET_PASSWORD` / the `socketControlMode` setting.
- [ ] `cotal_spawn` each roster member with its role/name (implementers, the three reviewers/critic,
      integration-tester).
- [ ] Confirm exact `cmux rpc` params for `workspace.create` / `workspace.prompt_submit` /
      `workspace.close` via `cmux docs api`.
- [ ] **Plan pre-critique:** `cotal_dm` `adversarial-critic` to read this plan + DAG and report
      failure modes; resolve any blocking finding before unblocking Phase 1.

---

## Phase 1 — <title>

**Gate:** `<command>` → <exact expected output/criteria>
<!-- May reference schema fields: AND testsPassing === true AND filesCreated.length >= 2.
     Make this gate exercise the riskiest unverified assumption with a REAL cmux probe —
     `cmux diff --workspace <id>` for change assertions, or `cmux rpc surface.health` /
     `surface.ports_kick` against the workspace's running port. -->
<!-- For long-running gates, watch `cmux events` and key on success AND failure signals:
     cmux events --name <completion-event> ... (must surface PASS and FAIL/Error/Killed). -->

### Task 1 — <name> `[haiku|sonnet]`
**Owner role:** implementer
**BlockedBy:** —   <!-- omit / "—" means immediately pushable; lead may run it in parallel -->
**Workspace:** `<branch name>` (lead `workspace.create`s it; record the workspace id/ref here at run time)
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "testsPassing": "boolean" }`
<!-- Schema optional; keep flat (max 2 levels). -->

<!-- If the task hard-codes values the plan mandates (fixed names, hex literals, intentional
     ordering), list them for the quality reviewer's Plan-locked content slot:
**Plan-locked content:** `<exact names/literals/ordering the reviewer must NOT flag>` -->

- [ ] Step 1: <for haiku: exact content/diff + numbered steps>
- [ ] Step 2: <exact command to run> → <exact expected output>

<For [haiku] tasks include: exact file paths, exact code or a precise diff, exact commands +
expected output, and a STOP condition — "if anything differs, stop and report, do not improvise.">

**Verify:** `<command>` (run against the workspace; `cmux diff --workspace <id>` to confirm the change)
**Commit:** `<type(scope): message>`

### Task 2 — <name> `[sonnet]`
**Owner role:** implementer
**BlockedBy:** Task 1   <!-- DAG edge; lead injects Task 1's output as context -->
**Receives:** Task 1 output — `{ "fieldName": "value" }`  <!-- may be handed peer-to-peer via cotal_dm -->
**Workspace:** `<branch name>`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (same shape; sonnet tasks may state intent + constraints rather than verbatim code)

**Verify:** `<command>`
**Commit:** `<type(scope): message>`

### Task 3 — <name> `[sonnet]` (safety-critical → adversarial)
**Owner role:** implementer
**BlockedBy:** —
**Adversarial:** yes — `adversarial-critic`, threshold 75, max iterations 3
**Workspace:** `<branch name>`
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

How to confirm the whole thing works: exact commands + expected output, tests to pass,
cross-workstream integration checks, and a final `cmux diff` of the merged result. Keep it
runnable — the team-lead executes this, it doesn't eyeball.

---

## Handoff prompt (paste into a fresh Opus session in this repo)

> You are the **Opus team-lead** for <feature>, executing on the **Cotal mesh + cmux**. The full
> task-by-task plan is at `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` — read it first, in full.
> Read this skill's `SKILL.md` and the three role cards at their absolute paths:
> `<ABSOLUTE PATH to adversarial-critic-prompt.md>`, `<ABSOLUTE PATH to spec-reviewer-prompt.md>`,
> `<ABSOLUTE PATH to code-quality-reviewer-prompt.md>`. If you cannot read a card at its path,
> STOP and ask the human — never synthesize one inline.
>
> **Why:** <one-paragraph context + confirmed scope>.
>
> **Also read for grounding:** <key files/docs the build depends on>.
>
> **Phase 0 — environment + team:** verify the cmux socket (`cmux ping`; `cmux capabilities` —
> if `access_mode` blocks you, STOP and ask the human for `CMUX_SOCKET_PASSWORD` /
> `socketControlMode`) and Cotal `spawn` (`cotal_orientation`). `cotal_spawn` the roster
> (implementers + `adversarial-critic` + `spec-reviewer` + `quality-reviewer` +
> `integration-tester`). Confirm `cmux rpc` params via `cmux docs api`. Then `cotal_dm`
> `adversarial-critic` to pre-critique this plan + DAG and resolve any blocking finding before
> Phase 1.
>
> **How to run it (lead-owned, push):** the plan-doc checkboxes are the board — **you schedule;
> peers do not self-claim.** For each unblocked task: `cmux rpc workspace.create` an isolated
> workspace (worktree + branch) for the owning role, `cotal_anycast`/`cotal_dm` the peer, and
> `cmux rpc workspace.prompt_submit` the task section into that workspace (+ any `BlockedBy`
> output / `Receives:` payload; pass `Schema:` when present). Phases are **gate barriers** — no
> Phase N+1 task starts until you've run Phase N's `Gate:` command yourself and confirmed the
> exact output. Gates run on real state: `cmux diff --workspace <id>` for change assertions,
> `cmux rpc surface.health`/`surface.ports_kick` for live port probes, `cmux events` (keyed on
> success AND failure signals) for long-running gates.
>
> **Per task, run the loop:** the owning peer builds in its workspace → it reports done via
> `cotal_dm` → you run `Verify` against the workspace → `spec-reviewer` reads the real `cmux diff`
> (`spec-reviewer-prompt.md`) → after ✅, `quality-reviewer` (`code-quality-reviewer-prompt.md`) →
> for safety-critical tasks (`Adversarial: yes`) run the `adversarial-critic` loop, blocking on
> findings ≥ threshold up to max iterations. When a task has a `Plan-locked content:` field, pass
> those values in the quality reviewer's Plan-locked slot. On any ❌, bounce the **same implementer**
> (`cotal_dm`) with the findings and re-run from Verify — **max 3 bounces per task**, then STOP and
> surface to the human. **You write no feature code** — only verbatim-content files whose exact
> bytes are in the plan.
>
> **Mesh etiquette:** address peers by role/name; they go idle between turns (normal — don't react
> to idleness until it blocks you); coordinate via `cotal_dm`/`cotal_send` (a `Receives:` handoff
> may go peer-to-peer); keep your own `cotal_status` honest.
>
> **Gates are commands, not opinions.** At each phase boundary run the `Gate:` command and confirm
> the exact expected output before unblocking the next phase. Flip `- [ ]`→`- [x]` and commit per
> task — the checkboxes are the resume state, keep them current. When every gate passes, merge/PR
> each branch, move this file to `docs/plans/complete/` with `<git mv | mv — resolved at authoring
> time via 'git check-ignore docs/'>`, then `cotal_despawn` every peer and
> `cmux rpc workspace.close` every workspace.
>
> **Branch:** integration commits happen on a feature/integration branch off `<base branch>`, not
> the base branch itself — confirm/create it before Phase 1.
>
> **Hard rules:** <project-specific invariants the agents must not violate>.
>
> **Proof bar:** nothing is "done" without pasted real command output (`cmux diff` / `Verify`);
> gate any unverified assumption with a live cmux probe rather than trusting it.
>
> **On surprises:** a doc-backed correction to a planned decision → fix, document, continue.
> Anything that adds a dependency, costs money, or changes scope → STOP and ask the human.
>
> **If resuming an interrupted build:** the plan checkboxes + git log + `cotal_roster` + the open
> cmux workspaces are the state. Reconcile them first (last commit vs last flipped box), respawn
> missing peers, close or re-attach orphaned workspaces, treat uncommitted in-flight work as
> untrusted (re-push that task), and re-run the most recent phase's `Gate:` before continuing.
>
> Start by reading the plan + grounding docs + role cards, then run Phase 0. Report progress at
> each gate.
