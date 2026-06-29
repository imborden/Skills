---
name: rk-plan-pro-cotal
description: Use for HIGH-complexity or mission-critical multi-step builds that will be EXECUTED on the Cotal peer mesh + cmux workspaces (real git worktrees/branches, real diffs, real ports/PRs) rather than ephemeral Agent-tool subagents. Produces an implementation plan plus an embedded handoff that lets a fresh Opus team-lead stand up a Cotal peer team in cmux workspaces, drive it gate-by-gate, and shut it down. For the same-complexity build on the plain Agent-tool substrate, use rk-plan-pro (single orchestrator) or rk-plan-max (TeamCreate team) instead.
---

# Writing Cotal+cmux Team Plans (pro-cotal tier)

## Overview

Produce a **plan document + embedded handoff prompt** that lets a *fresh* **Opus team-lead** build a feature by standing up a **Cotal peer team running in real cmux workspaces** — without you in the loop. The authoring session plans, writes the doc, delivers the handoff, and **STOPS**. Execution happens later, in the new session.

This is the **Cotal+cmux substrate variant** of the pro tier. It takes `rk-plan-max`'s team topology and retargets every primitive from the simulated `TeamCreate` substrate onto two real ones the operator has installed:

- **Cotal** — a peer-mesh coordination fabric. Teammates are lateral **peers** you `cotal_spawn`/`cotal_despawn`, assign work to by role (`cotal_anycast`) or directly (`cotal_dm`), and that report on channels (`cotal_send`). Peers can talk to each other directly — handoffs don't have to route through the lead.
- **cmux** (`manaflow-ai/cmux`) — a multi-agent terminal/IDE driven by a Unix-socket CLI (`cmux rpc <method>`). Each task runs in an isolated **workspace** = a real git worktree + branch. cmux gives real programmatic diffs (`cmux diff`), an event stream (`cmux events`), ports/health for live probes, and PR surfacing.

**The leap from `rk-plan-max` is substrate, not rigor.** Same roster, same DAG, same gates, same review loop — but `TeamCreate`→`cotal_spawn`, `isolation:"worktree"`→a real cmux workspace, prose diff review→`cmux diff`, `Monitor`→`cmux events`, `shutdown_request`→`cotal_despawn` + `workspace.close`.

**Core principle:** the plan is the contract — and at this tier the contract defines a *team, a board, and the cmux/Cotal commands that drive them*. The roster, the dependency DAG, the gates, the review loop, the isolation rules, and the team lifecycle are all explicit. None is assumed.

## When to Use

Use `rk-plan-pro-cotal` when **both** hold:

- The build warrants the pro/max machinery — a hard or safety-critical workstream, or several concurrent ones (the same bar as `rk-plan-pro` / `rk-plan-max`), **and**
- It will be **executed on Cotal + cmux** — the operator wants real isolated workspaces, real diffs/ports/PRs, and lateral peer coordination, not ephemeral Agent-tool subagents.

**When NOT to use:**
- Same complexity but **plain Agent-tool substrate** (no Cotal/cmux) → `rk-plan-pro` (single orchestrator) or `rk-plan-max` (TeamCreate team).
- Medium, well-understood builds → `rk-plan`. Small tasks you'd just do now, pure research, or same-session work → no rk-plan skill (`superpowers:subagent-driven-development`).

*The signal you're in `pro-cotal` is: a pro/max-grade build whose execution environment is the Cotal mesh and cmux.*

## Required inputs / environment (front-load these in the plan)

The produced plan MUST name what the *executing* session needs, so the build can't stall mid-run:

- **cmux running with its socket reachable for external control.** `cmux capabilities` reports `access_mode` — default `cmuxOnly` blocks external callers. The plan must require `CMUX_SOCKET_PASSWORD` (or `--password`) and `automation.socketControlMode` set to permit external `cmux rpc`. Gate 0 verifies it with a live `cmux ping` / `cmux capabilities`.
- **A Cotal space with the `spawn` capability** and the roster roles available (check `cotal_orientation` → capabilities; `cotal_roster` for who's present).
- **The target git repo** (path), clean working tree, and the base branch.
- **Exact `cmux rpc` params are resolved at runtime** — the plan names the primitives (`workspace.create`, `workspace.prompt_submit`, `surface.read_text`, `workspace.close`); the executing lead confirms each method's params via `cmux docs api` / `cmux capabilities` before first use rather than trusting a frozen schema here.

## Workflow (authoring session — substrate-free)

Planning uses **ordinary discovery only**. Do NOT spawn Cotal peers, open cmux workspaces, or run `cmux rpc` while authoring — the mesh and cmux are the *execution* substrate, not the *planning* substrate.

1. **Discovery first — never plan on assumptions.** Explore the codebase (read-only; Explore agents for breadth) AND ask the human (AskUserQuestion) to resolve scope, approach, the workstream decomposition, and unknowns. Find existing utilities/patterns to reuse.
2. **Decompose into workstreams and a dependency DAG.** Which tasks are independent (parallel peers), which block which (`BlockedBy`), which roster role owns each.
3. **Write the plan doc** to `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md` (create dirs if missing). Use `plan-template.md` in this skill.
4. **Embed the handoff prompt** as the final section of that same doc.
5. **Echo the handoff prompt** back into chat so the human can paste it into a fresh Opus session.
6. **STOP.** Do not stand up the team. Do not build. The fresh session does all of that.

## Planning principles — front-load what gets expensive late

- **Keep assumptions visible.** Track confirmed-vs-assumed; an unverified "decision" is an assumption. *Trigger:* writing "we'll use X" → confirmed, or inherited from the brief?
- **Probe the riskiest assumption first, cheaply.** Put a one-shot live probe of the biggest unknown in **Phase 1's gate** — and prefer a *real cmux probe* (a `cmux diff` assertion, or a `surface.health`/port check against a running workspace) over a trivial smoke check.
- **Pre-critique the plan.** Before execution, the plan + DAG gets one adversarial pass (the standing `adversarial-critic` peer, at execution start). A flawed DAG caught here is far cheaper than mid-build.
- **List required inputs + environment up front** (see the section above) — socket auth, Cotal capabilities, repo path.
- **Decompose at natural joints, with explicit edges.** One task = one clear "done." Independent → no edge (parallel). Dependent → a `**BlockedBy:**` edge. Never leave a real dependency implicit.
- **Match effort to difficulty.** Tier every task; don't wing the hard parts or dispatch trivial transcription.

## Task authoring — tiering and ownership

Tag every task with a **tier** and an **owner role**.

**Tier** (reasoning budget) — same meanings as the rest of the family:

| Tier | Gets | Examples |
|---|---|---|
| `[haiku]` | Mechanical, fully-specified, zero design decisions | dep adds, config edits, prop-driven components, copy edits, file moves, applying a precise diff |
| `[sonnet]` | Judgment, multi-file coordination, non-trivial logic | core algorithms, integration, route handlers, hooks, anything requiring choices |
| `[orchestrator/opus]` | Validation + verbatim writes only | running gates, writing exact-byte files, final verification |

**Owner role** (which roster peer): `**Owner role:** implementer | adversarial-critic | spec-reviewer | quality-reviewer | integration-tester`. The team-lead **pushes** the task to a peer of that role (lead-owned board — see below).

**Haiku tasks MUST be more explicit than sonnet tasks**: exact file paths, exact content or a precise diff (not prose), exact commands + expected output, numbered steps assuming zero inference, and a STOP condition — "if anything differs, stop and report, do not improvise."

**Don't tier verbatim-content files.** If the plan contains a file's exact bytes (scaffolding, config, fixtures), the **team-lead writes it directly** in the integration branch — spinning up a workspace + peer for pure transcription wastes a turn.

## Team topology & roster

The team-lead is a fresh **Opus** session that owns gates and lifecycle. It `cotal_spawn`s the roster (each a Cotal peer with a stable role/name) and, for each implementer, `cmux rpc workspace.create`s an isolated workspace (worktree + branch). Define the roster in the plan. A typical roster:

| Role (name) | Tier | Substrate | Responsibility |
|---|---|---|---|
| `team-lead` | Opus | the executing session | Owns gates + lifecycle. **Writes no feature code** (only verbatim-content files). Drives the cmux CLI, pushes prompts, runs gates on real diffs/ports, runs the review loop, despawns the team. |
| `impl-a`, `impl-b`, … | `[sonnet]`/`[haiku]` | one cmux workspace each | Build pushed tasks in their own worktree; report done via `cotal_dm`/channel. Scale count to parallel workstreams. |
| `adversarial-critic` | Opus/`[sonnet]` | standing Cotal peer | Pre-critiques the plan, then critiques safety-critical task outputs. `adversarial-critic-prompt.md`. |
| `spec-reviewer` | `[sonnet]` | standing Cotal peer | Per-task spec-compliance review against the real `cmux diff`. `spec-reviewer-prompt.md`. |
| `quality-reviewer` | `[sonnet]` | standing Cotal peer | Per-task code-quality review after spec passes. `code-quality-reviewer-prompt.md`. |
| `integration-tester` | `[sonnet]` | standing Cotal peer | Cross-workstream gates; drives `cmux events` for long-running gates; port/health live probes. |

Real Cotal semantics the handoff must state (how the tools actually behave):

- **Address peers by role/name** for `cotal_dm` and `cotal_anycast` — anycast routes to *any* peer of a role; dm targets one.
- **Peers may be idle between turns** — idle is normal, not done and not an error. A `cotal_dm` wakes them. Don't react to idleness until it actually blocks work.
- **Coordinate via the board (push) + messages**, not by snooping terminals. Use `cotal_send` to a channel for team-wide status; `cotal_dm` for a specific handoff.
- **Use `cotal_status`** to keep your own presence honest (`working`/`waiting`) and, if channel chatter is noisy, set attention (`focus`/`dnd`) and pull held messages with `cotal_inbox`.
- **Shut down gracefully** — when all gates pass and the file is moved to `complete/`, `cotal_despawn` each peer and `cmux rpc workspace.close` each workspace.

## Task board — lead-owned, push assignment

Cotal has **no built-in TaskList** primitive. The **plan-doc checkboxes are the single source of truth**, and the team-lead **pushes** work:

- For each unblocked task, the lead `cmux rpc workspace.create`s a workspace for the owning role, then `cotal_anycast`s (to the role) or `cotal_dm`s (to a specific peer) with the task pointer and `cmux rpc workspace.prompt_submit`s the task into that workspace.
- Peers do **not** self-claim — there is no claim/race protocol. The lead is the scheduler. This keeps the board race-free and matches the "lead owns gates + lifecycle" spine.
- **Phases are gate barriers:** no task in Phase N+1 starts until the lead has run Phase N's gate command itself and confirmed its exact output. Within a phase, the `BlockedBy` DAG governs which tasks the lead may push concurrently.
- **Dynamic work:** if a peer discovers necessary work mid-build, it reports it to the lead (`cotal_dm`); the lead adds a task to the board with an owner role + `BlockedBy` + gate. Scope-expanding discoveries (new dependency, cost, changed scope) are **not** self-added — the peer STOPS and the lead asks the human.

## Workspace isolation

Each implementer works in its **own cmux workspace** (`workspace.create` → real git worktree + branch). Parallel implementers never share a tree. **Integration happens at gate barriers**, run by the `integration-tester`/team-lead (merge each branch / open a PR), not continuously. Two tasks that must touch the same files in the same phase either get a `**BlockedBy:**` edge (serialize) or move to different phases — never run concurrently in separate workspaces expecting a clean merge.

## Mechanical gates + cmux events for long-running ones

A phase `**Gate:**` is an **exact command + exact expected result** (string match, count, exit code, or schema-field assertion) — the team-lead runs it itself at the barrier. Gates run against **real workspace state**:

- **Change assertions:** `cmux diff --workspace <id> [--source branch]` → assert files/hunks present.
- **Live probes:** `cmux rpc surface.health` / `surface.ports_kick` against the workspace's real port (a running service, a real request) — prefer this over a stubbed smoke check for the riskiest assumption.
- **Long-running gates** (full suites, builds, deploys): stream **`cmux events`** and keep the team working instead of blocking. The watch MUST key on **both** terminal states — success *and* failure signatures — so silence can't be mistaken for success. The gate passes only on the explicit success signal.

Gates may reference task schema fields (`testsPassing === true`); a gate naming a field no task declares is a plan error to fix before dispatch.

## Adversarial — standing critic + plan pre-critique

The `adversarial-critic` is a **standing Cotal peer** (spawned at Phase 0), not a per-task dispatch.

- **Plan pre-critique (before Phase 1 code):** the critic reads the plan doc + DAG and reports failure modes; the lead resolves blocking findings before any peer builds. Cheapest place to catch a bad decomposition.
- **Mandatory per-task critique** on tasks touching **auth, payments, data mutations, migrations, external API contracts, PII, or production infra**: generate → critique → regenerate, bouncing the implementer on findings at or above the threshold, up to max iterations. Confidence model in `adversarial-critic-prompt.md` (100 = mechanically constructible → block; 75 = concrete reproducible → block; 50 = note; <25 = suppress).
- **Skip per-task critique** on UI layout, copy, docs, or mechanical `[haiku]` edits with exact content.

The critic receives the task spec, the implementer's output, and the **real `cmux diff`** — **not** the full plan doc (prevents plan-confirmation bias).

## Schema validation

Each task MAY declare a flat JSON Schema its output must conform to (`**Schema:** { "filesCreated": ["string"], "testsPassing": "boolean" }`). Structured returns let the lead and reviewers check fields mechanically. Keep schemas flat (max 2 levels), descriptive names, a count field when relevant, `boolean` for pass/fail. Skip only when output is genuinely hard to schematize. Because peers run in cmux, the lead can corroborate a reported field against the workspace (`cmux diff`, `surface.read_text`) instead of trusting prose.

## The per-task loop (spell this out in the handoff)

For each unblocked task the lead pushes:

1. **Provision** — `cmux rpc workspace.create` → isolated worktree + branch for the owning role.
2. **Dispatch** — `cotal_anycast`/`cotal_dm` the owning peer + `cmux rpc workspace.prompt_submit` the task section (+ any `BlockedBy` outputs / `Receives:` payload) into that workspace. Pass `**Schema:**` when present.
3. **Signal done** — the peer reports completion via `cotal_dm`/channel.
4. **Verify** — the lead runs the task's `**Verify:**` command against the workspace (use `cmux events` if long). On failure, bounce the implementer with the output.
5. **Spec review** — `spec-reviewer` reads the real `cmux diff`. On ❌ → bounce implementer, back to step 4.
6. **Quality review** — `quality-reviewer`, only after spec ✅. On ❌ → bounce implementer, back to step 4.
7. **Adversarial** (safety-critical only) — `adversarial-critic` loop; block on findings ≥ threshold; bounce up to max iterations; surface unresolved findings to the human.
8. **Integrate + mark** — merge the branch / open a PR, flip `- [ ]`→`- [x]`, commit with the task's exact `**Commit:**` message, `cmux rpc workspace.close`. Batch checkbox bookkeeping per phase.
9. **On surprise** — doc-backed correction → fix, note, continue. **Adds a dependency, costs money, or changes scope → STOP and ask the human.**

**Pipeline `Receives:` handoffs may go peer-to-peer via `cotal_dm`** — a genuine affordance the Agent-tool tiers lack; a producer peer can hand its validated output straight to the consumer peer. Phases remain hard gate barriers regardless.

At each **phase boundary**, the lead runs the `**Gate:**` command itself and confirms the exact output before unblocking the next phase. When all gates pass: merge/PR each branch, `git mv` the plan `incomplete/`→`complete/`, then `cotal_despawn` every peer and `cmux rpc workspace.close` every workspace.

## Quick Reference

| Element | Rule |
|---|---|
| Team-lead | **Opus** — owns gates + lifecycle, **never writes feature code** (only verbatim files), runs the review loop, despawns the team |
| Substrate | Cotal peers (`cotal_spawn`) running in cmux workspaces (`workspace.create` = worktree + branch) |
| Board | **lead-owned, push** — plan-doc checkboxes are truth; lead `cotal_anycast`/`cotal_dm` + `workspace.prompt_submit`; no peer self-claim |
| Plan location | `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` → `complete/` when done |
| Discovery | Explore + AskUserQuestion + workstream decomposition **before** writing the plan (substrate-free) |
| Task tags | tier `[haiku]`/`[sonnet]`/`[orchestrator/opus]` **and** `**Owner role:**` |
| DAG | `**BlockedBy:**` edges; phases are gate barriers; board may grow mid-build via the lead |
| Isolation | each implementer in its own cmux workspace; integrate (merge/PR) at gate barriers |
| Review | `spec-reviewer` then `quality-reviewer` per task, reading the real `cmux diff`; bounce implementer on ❌ |
| Adversarial | standing critic peer; pre-critique the plan; mandatory on auth/payments/data/migrations/PII |
| Gates | exact command + expected result; `cmux diff`/ports for assertions; `cmux events` for long gates (success *and* failure signals) |
| Handoff payload | `cmux rpc workspace.prompt_submit` (dispatch), `cotal_dm`/`cotal_anycast` (coordinate), `Receives:` may go peer-to-peer |
| Lifecycle | merge/PR + `git mv` on all-gates-pass, then `cotal_despawn` + `workspace.close` per peer |
| Environment | socket auth (`CMUX_SOCKET_PASSWORD` / `socketControlMode`), Cotal `spawn` capability, repo path — front-loaded; Gate 0 verifies |
| This session | Author + deliver, then **STOP** — no spawning, no cmux calls, no build |

## Common Mistakes

- **Using cmux/Cotal while authoring.** Planning is substrate-free — discovery only. Spawning peers or opening workspaces is the *executing* session's job.
- **Reaching for `pro-cotal` when the substrate isn't Cotal+cmux.** Plain Agent-tool execution → `rk-plan-pro` / `rk-plan-max`. The -cotal variant is justified by the real substrate, not extra rigor.
- **Peer self-claim.** This skill is **lead-owned push** — the lead schedules. Don't write a claim/race protocol.
- **The team-lead writing feature code.** The lead dispatches, validates, and writes only verbatim-content files. Feature code is peers' work in their workspaces.
- **Implicit dependencies.** A task needing another's output but no `**BlockedBy:**` → the lead pushes it too early. Add the edge.
- **Parallel implementers sharing a tree.** Each gets its own `workspace.create`; serialize shared-file tasks with an edge.
- **`cmux events` watch that only greps success.** A crashloop then looks identical to "still running." Key on success *and* failure signatures.
- **Frozen `cmux rpc` param schemas.** Don't hardcode method params in the plan as gospel — tell the lead to confirm via `cmux docs api` / `cmux capabilities` at runtime.
- **Forgetting socket auth.** `access_mode: cmuxOnly` blocks external `cmux rpc`. Require `CMUX_SOCKET_PASSWORD` / `socketControlMode` in Required inputs; verify in Gate 0.
- **No plan pre-critique.** A bad DAG caught at Phase 3 is far more expensive than at Phase 0. Run the critic peer on the plan first.
- **Critic gets the full plan doc.** Biases it toward confirming the plan. Give it the task spec, output, and the real `cmux diff`.
- **Team never shut down.** Idle peers and open workspaces linger. After `git mv`, `cotal_despawn` + `workspace.close` each.
- **Prose gates / planning on assumptions / terse haiku tasks / plan saved flat.** Same family rules — exact-command gates, explore-and-ask first, haiku needs *more* detail, save under `docs/plans/incomplete/`.
- **Starting the build.** The author session STOPS after delivering.

## Red Flags — STOP

- About to `cotal_spawn` / `cmux rpc` / write code from the **authoring** session → STOP, you only plan (substrate-free).
- The execution substrate isn't actually Cotal+cmux → this is `rk-plan-pro` / `rk-plan-max`, not `pro-cotal`.
- A task with a real dependency but no `**BlockedBy:**` → add the edge or the lead pushes it too early.
- Two independent tasks touching the same files concurrently → serialize with an edge or separate phases.
- A `cmux events` watch that can't emit if the job crashed → widen the filter to cover failure signatures.
- The plan was never adversarially pre-critiqued → run the critic peer on it before Phase 1.
- A phase with no runnable gate command → add one.
- Required inputs omit socket auth / Cotal capability → add them; Gate 0 must verify the socket live.
- Plan saved outside `docs/plans/incomplete/` → move it.
