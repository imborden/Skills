# Design — `rk-plan-pro-cotal`

> A new planning skill: the **pro** slot of the `rk-plan` ladder, retargeted to a
> **Cotal peer-mesh team running in real cmux workspaces** as its execution substrate.

## Context

The `rk-plan` family produces *plan documents + embedded handoff prompts* that a fresh
session executes without the author in the loop. The existing tiers dispatch ephemeral
`Agent`-tool subagents (`rk-plan`, `rk-plan-pro`) or a `TeamCreate` team (`rk-plan-max`).
Both are simulations of a team: cold-start spokes, `isolation:"worktree"` copies, and
results reported as prose.

The operator now has two real substrates installed:

- **cmux** (`manaflow-ai/cmux`, v0.64) — a multi-agent terminal/IDE. A Unix-socket CLI
  (`cmux rpc <method>`) + AppleScript surface creates isolated **workspaces** (each a real
  git worktree + branch), submits prompts to the agent in a workspace, exposes programmatic
  diffs, an event stream, ports/health, PRs, and optional cloud VMs.
- **Cotal** — a peer-mesh coordination fabric. Agents join as lateral peers; you
  `cotal_spawn`/`cotal_despawn` them, assign work by role (`cotal_anycast`) or directly
  (`cotal_dm`), broadcast on channels (`cotal_send`), and see presence via `cotal_roster`.

`rk-plan-pro-cotal` is **rk-plan-max's team topology realized on these real substrates**.
The user chose: a mesh-native team model; a lead-owned board with push assignment; explicit
cmux CLI wired into dispatch and gates; **substrate-free authoring** (planning uses ordinary
discovery — the mesh/cmux are used only at execution time).

**Scope — in:** authoring `SKILL.md`, `plan-template.md`, and three reviewer/critic prompt
cards; cross-reference updates in `rk-plan-router` and the sibling skills' "when NOT to use"
sections. **Out:** changing the other skills' core behavior; building any feature with the
skill; any execution-time spawning during authoring.

**Required inputs (for the *executing* session, named in the produced plan):** cmux running
with its socket reachable for external control (`CMUX_SOCKET_PASSWORD` set and
`automation.socketControlMode` permitting external `cmux rpc` — `access_mode` defaults to
`cmuxOnly`); a Cotal space with the `spawn` capability and the roster roles; the target git
repo.

**Unverified assumptions:** exact JSON params for individual `cmux rpc` methods (e.g.
`workspace.create`, `workspace.prompt_submit`) are resolved by the executing lead at runtime
via `cmux docs api` / `cmux capabilities` — the skill names the primitives and the
discipline, not frozen param schemas.

## The authoring contract (unchanged from the family)

This session **plans, writes the doc + handoff, and STOPS.** It does not spawn Cotal peers,
open cmux workspaces, or build. A fresh Opus **team-lead** session pastes the handoff and
does all of that. Planning itself uses ordinary discovery: Explore agents, reading the repo,
`AskUserQuestion`. No mesh/cmux calls during authoring.

## Topology & roster (lead-owned board, push assignment)

The plan-doc checkboxes are the single source of truth. The lead **pushes** work to peers by
`cotal_anycast` (to a role) or `cotal_dm`; peers report progress on a Cotal channel. No
peer self-claim / race protocol.

| Cotal peer (role) | Substrate | Responsibility |
|---|---|---|
| `team-lead` (Opus) | the executing session | Owns gates + lifecycle. Writes no feature code (only verbatim-content files). Drives cmux CLI to create/teardown workspaces and submit prompts, runs gates against real diffs/ports, runs the review loop, despawns the team. |
| `impl-*` | one cmux workspace each (worktree + branch) | Build assigned tasks; report done via `cotal_dm`/channel. Count scales to parallel workstreams. |
| `adversarial-critic` | standing Cotal peer | Plan pre-critique (at execution start), then per-task critique on safety-critical tasks. |
| `spec-reviewer` | standing Cotal peer | Per-task spec-compliance review. |
| `quality-reviewer` | standing Cotal peer | Per-task code-quality review, after spec passes. |
| `integration-tester` | standing Cotal peer | Cross-workstream gates; port/health live probes; watches `cmux events` for long-running gates. |

## Substrate mapping (the heart of the skill)

| rk-plan-max primitive | rk-plan-pro-cotal equivalent |
|---|---|
| `TeamCreate` + shared `TaskList` | Cotal channel + plan-doc board (lead-owned) |
| spawn teammate (`name`, `team_name`) | `cotal_spawn` peer (role) → `cmux rpc workspace.create` for its worktree |
| `SendMessage` by name | `cotal_dm` peer / `cotal_anycast` role / `cotal_send` channel |
| `isolation:"worktree"` | native cmux workspace = git worktree + branch |
| dispatch task to teammate | `cmux rpc workspace.prompt_submit` into that peer's workspace |
| review the diff | `cmux diff --workspace <id>` (real diff, not prose) |
| `Monitor` a long-running gate | `cmux events` stream — must emit on success **and** failure signatures |
| live probe of a running service | `cmux rpc surface.health` / `surface.ports_kick` against the workspace's real port |
| `shutdown_request` + `git mv` | `cotal_despawn` peers + `cmux rpc workspace.close` + merge/PR, then `git mv` plan to `complete/` |

## Per-task loop (the executing lead runs)

1. **Provision** — `cmux rpc workspace.create` → isolated worktree + branch for the owning peer.
2. **Dispatch** — `cmux rpc workspace.prompt_submit` hands the agent only its task section
   (+ any `BlockedBy` outputs, and any `Receives:` payload).
3. **Signal done** — peer reports completion via `cotal_dm`/channel.
4. **Review the real diff** — `cmux diff --workspace <id>`; then `spec-reviewer`, then
   `quality-reviewer` (Cotal-peer dispatch). Bounce the implementer on ❌.
5. **Adversarial** (safety-critical tasks only) — `adversarial-critic` loop; block on
   findings ≥ threshold; bounce up to max iterations; surface unresolved findings to the human.
6. **Integrate + record** — commit/merge the branch (or open a PR), flip `[ ]`→`[x]`,
   `cmux rpc workspace.close`.
7. **On surprise** — doc-backed correction → fix, note, continue. Adds a dependency / costs
   money / changes scope → STOP and ask the human.

**Pipeline `Receives:` handoffs may go peer-to-peer via `cotal_dm`** — a genuine new
affordance the `Agent`-tool tiers lack; they don't have to route through the lead. Phases
remain hard gate barriers regardless.

## Gates & live probes

Phase `**Gate:**` stays **exact command + exact expected output**, but runs against real
workspace state: `cmux diff` for change assertions, real ports via `surface.health` /
`surface.ports_kick` for live probes, `cmux events` for completion barriers. The riskiest
unverified assumption still gets a live probe in the earliest phase that can run it. Gates
may reference task schema fields by name (a gate naming a field no task declares is a plan
error to fix before dispatch).

## Lifecycle

Stand up the roster (`cotal_spawn` per role; `workspace.create` per implementer) → plan
pre-critique by `adversarial-critic` → run phases gate-by-gate via the per-task loop → on
all-gates-pass: merge/PR each branch, `git mv` the plan `incomplete/`→`complete/`,
`cmux rpc workspace.close` every workspace, `cotal_despawn` every peer.

## Deliverables

Under `/Users/jeffborden/Documents/Claude/_Skills/Planning/Claude/rk-plan-pro-cotal/`:

1. **`SKILL.md`** — mirrors `rk-plan-max/SKILL.md`'s structure (Overview, When to Use,
   Workflow, Planning principles, Tiering + Owner role, Topology & roster, Board model,
   Worktree/workspace isolation, Gates + cmux events, Adversarial, Schema, Per-task loop,
   Quick Reference, Common Mistakes, Red Flags), retargeted to Cotal+cmux. Adds a
   **"Required inputs / environment"** section for the socket-auth + roster prerequisites.
2. **`plan-template.md`** — based on `rk-plan-max/plan-template.md`, adding per-task
   **`**Owner role:**`** (Cotal role) and **`**Workspace:**`** (cmux workspace handle /
   branch) fields, and a handoff prompt written for a fresh Opus **Cotal team-lead**.
3. **`adversarial-critic-prompt.md`**, **`spec-reviewer-prompt.md`**,
   **`code-quality-reviewer-prompt.md`** — the rk-plan-max cards, adapted for Cotal-peer
   dispatch (anycast to the standing reviewer role; the reviewer reads the real `cmux diff`,
   not a prose report).
4. **Cross-references** — add `rk-plan-pro-cotal` to `rk-plan-router`'s decision tree, and a
   one-line "substrate variant" pointer in the `rk-plan-pro` / `rk-plan-max` "when NOT to
   use" sections.

## Non-goals / YAGNI

- No peer self-claim / distributed-claim protocol (lead pushes).
- No mesh use during authoring.
- No cloud-VM (`vm.create`) path in v1 — note it as an optional extension only.
- No frozen `cmux rpc` param schemas — the executing lead resolves them live.
