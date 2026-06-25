---
name: jb-plan-max
description: Use for MISSION-CRITICAL or LARGE-SCALE multi-step builds that warrant a persistent **agent team** rather than a single orchestrator — work with many independent workstreams, multiple subsystems, long-running gates, or a need for a standing adversarial critic. Produces an implementation plan plus an embedded handoff prompt that lets a fresh **Opus team-lead** stand up a team (TeamCreate + named teammates on a shared dependency-linked task board), drive it to completion, and shut it down. For a single coherent workstream — even a hard, safety-critical one — use jb-plan-pro instead.
---

# Writing Team-Orchestrated Plans (max tier)

## Overview

Produce a **plan document + embedded handoff prompt** that lets a *fresh* **Opus team-lead** build a feature by standing up a **persistent agent team** — a roster of named specialists working a shared task board — without you in the loop. The authoring session plans, writes the doc, delivers the handoff, and **STOPS**. Execution happens later, in the new session.

This is the top rung of the `jb-plan` ladder. The leap from `jb-plan-pro` is **topology, not just rigor**:

- **`jb-plan-pro` is a star with ephemeral spokes** — one Opus orchestrator cold-starts one subagent per task, mediates everything, and the subagent dies when it returns.
- **`jb-plan-max` is a persistent team with a shared board** — the team-lead runs `TeamCreate`, spawns a standing roster (implementers, an adversarial-critic, reviewers, an integration-tester), populates a shared `TaskList` whose `blockedBy` edges encode the execution DAG, and teammates **self-claim unblocked tasks in parallel** (worktree-isolated), coordinating peer-to-peer via `SendMessage`. The critic and reviewers are *standing team members*, not per-task dispatches. Long-running gates are watched with `Monitor`. The board is *dynamic* — teammates may add discovered work mid-build within guardrails.

**Core principle:** the plan is the contract — and at this tier the contract defines a *team and a board*, not just a task list. It must encode the roster, the dependency DAG, the gates, the review loop, the isolation rules, and the team lifecycle explicitly. None of it is assumed.

## When to Use

Use `jb-plan-max` when **at least one** of these holds:

- **Parallelism pays:** many genuinely independent workstreams where concurrent teammates give a real wall-clock win.
- **Multiple subsystems:** work spans areas (e.g. service A, service B, infra, client) that benefit from **persistent specialist context** rather than cold-start-per-task.
- **Long-running gates:** large test suites, builds, or deploys worth `Monitor`-ing while other work proceeds.
- **Mission-critical assurance:** the stakes justify a **standing adversarial critic** and a **pre-critique of the plan itself** before any code is written.

**When NOT to use — step *down* to `jb-plan-pro`:** a **single coherent workstream**, even a hard or safety-critical one. If there's no real parallelism and no standing-team benefit, a team is overhead — the Opus orchestrator in `jb-plan-pro` is the right tool. *The signal you're in `max` is the presence of a persistent multi-agent team doing concurrent work.*

**When NOT to use at all:** medium well-understood builds → `jb-plan`; small tasks you'll just do now; pure research with no build; same-session implementation (`superpowers:subagent-driven-development`).

## Workflow (authoring session)

1. **Discovery first — never plan on assumptions.** Explore the codebase (read-only; use Explore agents for breadth) AND ask the human clarifying questions (AskUserQuestion) to resolve scope, approach, the workstream decomposition, and unknowns. Find existing utilities/patterns to reuse before proposing new code.
2. **Decompose into workstreams and a dependency DAG.** The decomposition *is* the plan: which tasks are independent (parallel), which block which (`blockedBy`), and which roster member owns each.
3. **Write the plan doc** to `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md` (create dirs if missing). Use `plan-template.md` in this skill.
4. **Embed the handoff prompt** as the final section of that same doc.
5. **Echo the handoff prompt** back into the chat so the human can paste it into a new Opus session.
6. **STOP.** Do not create a team. Do not spawn teammates. Do not build. The fresh session does all of that.

## Planning principles — front-load what gets expensive late

The costliest failures are important things nobody front-loaded; they surface last. At team scale, a bad decomposition is the most expensive of all.

- **Keep assumptions visible.** Track confirmed-vs-assumed; an unverified "decision" is an assumption. *Trigger:* writing "we'll use X" → confirmed, or inherited from the brief?
- **Probe the riskiest assumption first, cheaply.** Put a one-shot live probe of the biggest unknown in **Phase 1's gate** — before any teammate builds on it.
- **Pre-critique the plan.** Before execution, the plan doc itself gets one adversarial pass (the standing critic, or `plan_approval_request`). A flawed DAG caught here is far cheaper than mid-build.
- **List required inputs up front.** Name what you need from the human (test data, URLs, credentials, samples) so the build can't stall mid-run.
- **Decompose at natural joints, with explicit edges.** One task = one clear "done." Independent tasks → no edge (they run in parallel). Dependent tasks → a `**BlockedBy:**` edge. Never leave a real dependency implicit.
- **Match effort to difficulty.** Tier every task (below); don't wing the hard parts or dispatch trivial transcription.

## Task authoring — tiering and ownership

Tag every task with a **tier** and an **owner role**.

**Tier** (reasoning budget): `[haiku]`, `[sonnet]`, or `[orchestrator/opus]` — same meanings as `jb-plan-pro`:

| Tier | Gets | Examples |
|---|---|---|
| `[haiku]` | Mechanical, fully-specified, zero design decisions | dep adds, config edits, prop-driven components, copy edits, file moves, applying a precise diff |
| `[sonnet]` | Judgment, multi-file coordination, non-trivial logic | core algorithms, integration, route handlers, hooks, anything requiring choices |
| `[orchestrator/opus]` | Validation + verbatim writes only | running gates, writing exact-byte files, final verification |

**Owner role** (which roster member): `**Owner role:** implementer | adversarial-critic | spec-reviewer | quality-reviewer | integration-tester`. The team-lead assigns the task to a teammate of that role via `TaskUpdate owner`, or the teammate self-claims it.

**Haiku tasks MUST be more explicit than sonnet tasks** (less reasoning headroom). Every haiku task includes: exact file paths, exact content or a precise diff (not prose), exact commands + expected output, numbered steps assuming zero inference, and a STOP condition — "if anything differs, stop and report, do not improvise."

**Don't tier verbatim-content files.** If the plan contains a file's exact bytes (scaffolding, config, fixtures), the **team-lead writes it directly** — dispatching pure transcription wastes a teammate turn.

## Team topology & roster

The team-lead runs `TeamCreate` (Team ↔ TaskList are 1:1), then spawns teammates via the `Agent` tool with `team_name` and a stable `name`. Define the roster in the plan. A typical roster:

| Role (name) | Tier | Responsibility |
|---|---|---|
| `team-lead` | Opus | Owns gates and lifecycle. **Writes no feature code** (only verbatim-content files). Populates the board, runs gate commands, runs the per-task review loop, flips checkboxes, commits, `git mv` on done, shuts the team down. |
| `impl-a`, `impl-b`, … | `[sonnet]`/`[haiku]` | Claim unblocked tasks off the board and build them, each in its own worktree. Scale the count to the number of parallel workstreams. |
| `adversarial-critic` | Opus/`[sonnet]` | Standing critic. Pre-critiques the plan, then critiques safety-critical task outputs (generate→critique→regenerate). Uses `adversarial-critic-prompt.md`. |
| `spec-reviewer` | `[sonnet]` | Standing spec-compliance review per task. Uses `spec-reviewer-prompt.md`. |
| `quality-reviewer` | `[sonnet]` | Standing code-quality review, after spec passes. Uses `code-quality-reviewer-prompt.md`. |
| `integration-tester` | `[sonnet]` | Runs cross-workstream integration gates; may drive `Monitor` for long-running suites/deploys. |

Real team semantics the handoff must state (these are how the tools actually behave):

- **Refer to teammates by NAME** for `SendMessage` `to` and for task ownership — never by `agentId` (except to resume a *completed* background agent).
- **Teammates go idle between turns** — idle is normal, not done and not an error. Messages to idle teammates wake them. Don't comment on idleness until it actually blocks work.
- **Messages auto-deliver** — the lead does not poll an inbox; teammate messages arrive as new turns. Plain text output is invisible to teammates; you MUST `SendMessage` to communicate.
- **Coordinate via the board + messages**, not terminal snooping. Use `TaskUpdate` to mark progress; use plain-text `SendMessage` for hand-offs (no structured JSON status messages).
- **Shut down gracefully** — when all gates pass and the file is moved to `complete/`, the lead sends each teammate `{type: "shutdown_request"}`.

## Task board as a dependency DAG

The shared `TaskList` *is* the execution graph. Each task carries:

- `**Owner role:**` — which roster role builds it.
- `**BlockedBy:**` — the task IDs that must complete first (the DAG edges). Omit only for truly independent tasks (they become immediately claimable and run in parallel).

Teammates **self-claim unblocked tasks in ID order** (lowest first — earlier tasks often set up context) via `TaskUpdate owner`. **Phases remain gate barriers:** a phase gate is a hard sync point — no task in the next phase starts until the team-lead has run the gate command and confirmed its exact output.

**Dynamic workflow:** teammates MAY `TaskCreate` newly-discovered work mid-build (that's the point of a live board), but every new task still needs an owner role, a `BlockedBy` if it depends on anything, and it falls under the nearest gate. Scope-expanding discoveries (new dependency, cost, changed scope) are NOT self-added — they STOP and ask the human.

## Worktree isolation

Parallel implementers MUST NOT share a working tree. Spawn each implementer with `isolation: "worktree"` so it edits an isolated copy. **Integration happens at gate barriers**, run by the `integration-tester`/team-lead, not continuously. Two tasks that must touch the same files in the same phase either get a `**BlockedBy:**` edge (serialize them) or move to different phases — never run them concurrently in separate worktrees expecting a clean merge.

## Mechanical gates + Monitor for long-running ones

A phase `**Gate:**` is an **exact command + exact expected result** (string match, count, exit code, or schema-field assertion) — the team-lead runs it itself at the barrier. Gates may reference task schema fields (`testsPassing === true`).

For gates that take a long time (full suites, builds, deploys), use **`Monitor`**: stream the job's events and keep the team working instead of blocking. The monitor command MUST emit on **every terminal state — success *and* failure signatures** (e.g. `-E "PASS|FAIL|Error|Traceback|Killed"`), so silence can't be mistaken for success. The gate still passes only on the explicit success signal.

## Adversarial — standing critic + plan pre-critique

`jb-plan-max` keeps the standing **adversarial-critic** continuously available (unlike `jb-plan-pro`, which dispatches a critic per `[adversarial]` task).

- **Plan pre-critique (before Phase 1 code):** the critic reads the plan doc and DAG and reports failure modes; the lead resolves blocking findings before any teammate builds. This is the cheapest place to catch a bad decomposition.
- **Mandatory per-task critique** on tasks touching **auth, payments, data mutations, migrations, external API contracts, PII, or production infra**: generate → critique → regenerate, bouncing the implementer on findings at or above the threshold, up to max iterations. Use the confidence model in `adversarial-critic-prompt.md` (100 = mechanically constructible → block; 75 = concrete reproducible → block; 50 = plausible-unconfirmable → note; <25 = speculative → suppress).
- **Skip per-task critique** on UI layout, copy, docs, or mechanical `[haiku]` edits with exact content.

The critic receives the task spec, the implementer's output, and the changed file paths — **not** the full plan doc (prevents plan-confirmation bias).

## Schema validation

Each task MAY declare a flat JSON Schema its output must conform to (`**Schema:** { "filesCreated": ["string"], "testsPassing": "boolean" }`). Structured returns let the lead and reviewers check fields mechanically instead of judging prose. Keep schemas flat (max 2 levels), descriptive names, a count field when relevant, `boolean` for pass/fail. Gate conditions may reference schema fields by name; a gate referencing a field no task declares is a plan error to fix before dispatch. Skip schema only when output is genuinely hard to schematize.

## The per-task loop (spell this out in the handoff)

For each task a teammate claims, the team-lead runs:

1. **Build** — the owning teammate (its tier) builds the task in its worktree, given only that task's section (+ any `BlockedBy` outputs as context). Pass `**Schema:**` when present.
2. **Verify** — the lead runs the task's `**Verify:**` command (or has the integration-tester do it; `Monitor` if long). On failure, bounce the implementer with the output.
3. **Spec review** — `spec-reviewer` checks compliance against the code. On ❌ → bounce implementer, back to step 2.
4. **Quality review** — `quality-reviewer`, only after spec ✅. On ❌ → bounce implementer, back to step 2.
5. **Adversarial** (safety-critical tasks only) — `adversarial-critic` loop; block on findings ≥ threshold; bounce up to max iterations; surface unresolved findings to the human.
6. **Commit + mark** — flip `- [ ]`→`- [x]`, commit with the task's exact `**Commit:**` message. Batch checkbox bookkeeping per phase.
7. **On surprise** — doc-backed correction → fix, note in plan, continue. **Anything that adds a dependency, costs money, or changes scope → STOP and ask the human.**

At each **phase boundary**, the lead runs the `**Gate:**` command itself and confirms the exact output before unblocking the next phase. When all gates pass: `git mv` the plan `incomplete/`→`complete/`, then `SendMessage` each teammate `{type:"shutdown_request"}`.

## Quick Reference

| Element | Rule |
|---|---|
| Team-lead | **Opus** — owns gates + lifecycle, **never writes feature code** (only verbatim files), runs the review loop, shuts the team down |
| Topology | `TeamCreate` + persistent named teammates on a shared task board; parallel self-claiming |
| Plan location | `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` → `complete/` when done |
| Discovery | Explore + AskUserQuestion + workstream decomposition **before** writing the plan |
| Task tags | tier `[haiku]`/`[sonnet]`/`[orchestrator/opus]` **and** `**Owner role:**` |
| DAG | `**BlockedBy:**` edges encode dependencies; phases are gate barriers; board may grow mid-build |
| Isolation | parallel implementers get `isolation:"worktree"`; integrate at gate barriers |
| Review | standing `spec-reviewer` then `quality-reviewer` per task; bounce implementer on ❌ |
| Adversarial | standing critic; pre-critique the plan; mandatory on auth/payments/data/migrations/PII |
| Gates | exact command + expected result; `Monitor` long-running ones (emit success *and* failure signals) |
| Schema | flat JSON, max 2 levels; gates may reference fields |
| Lifecycle | `git mv` on all-gates-pass, then `shutdown_request` to every teammate |
| Handoff | embedded as final plan section **and** echoed to chat |
| This session | Author + deliver, then **STOP** — do not create a team or build |

## Common Mistakes

- **Reaching for `max` on a single workstream.** No real parallelism / no standing-team benefit → use `jb-plan-pro`. A team is overhead you must justify.
- **The team-lead writing feature code.** The lead dispatches, validates, and writes only verbatim-content files. Feature code is teammates' work.
- **Implicit dependencies.** A task that needs another's output but has no `**BlockedBy:**` → a teammate will claim it too early. Add the edge.
- **Parallel teammates sharing a worktree.** Two concurrent implementers in the same tree collide. Use `isolation:"worktree"`; serialize shared-file tasks with an edge.
- **Monitor that only greps success.** A crashloop then looks identical to "still running." Emit on success *and* failure signatures.
- **No plan pre-critique.** A bad DAG caught at Phase 3 is enormously more expensive than at Phase 0. Run the critic on the plan first.
- **Critic gets the full plan doc.** That biases it toward confirming the plan. Give it only the task spec, output, and changed files.
- **Team never shut down.** Idle teammates linger. After `git mv`, send `shutdown_request` to each.
- **Referring to teammates by `agentId`.** Use names for messaging and ownership.
- **Prose gates / planning on assumptions / terse haiku tasks / plan saved flat.** Same rules as the rest of the family — exact-command gates, explore-and-ask first, haiku needs *more* detail, save under `docs/plans/incomplete/`.
- **Starting the build.** The author session STOPS after delivering.

## Red Flags — STOP

- About to `TeamCreate` / spawn teammates / write code from the **authoring** session → STOP, you only plan.
- A single coherent workstream with no parallelism → this is `jb-plan-pro`, not `max`.
- A task with a real dependency but no `**BlockedBy:**` → add the edge or a teammate claims it too early.
- Two `[parallel]`/independent tasks touching the same files concurrently → serialize with an edge or separate phases.
- A `Monitor` command that can't emit anything if the job crashed → widen the filter to cover failure signatures.
- The plan was never adversarially pre-critiqued → run the critic on it before Phase 1.
- A phase with no runnable gate command → add one.
- Plan saved outside `docs/plans/incomplete/` → move it.
