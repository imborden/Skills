---
name: rk-plan-router
description: Routes a build to the right rk-plan tier (rk-plan / rk-plan-pro / rk-plan-max) before planning starts. Use when the user wants to plan a multi-step build or write a handoff plan but hasn't picked a tier, or asks "which plan should I use", "rk-plan or pro or max", "how big a plan does this need". Picks a tier from a 3-question decision tree, declares the choice with reasoning, and invokes that skill only after the user agrees. Not for executing a plan — only for choosing one.
---

# Pick a rk-plan tier

A thin router over the `rk-plan` family. Run the checks **in order** and stop at the first match. Don't gold-plate — most builds are `rk-plan`.

## Gate 0 — is a plan even warranted?

If it's a small task you'd just do now, pure research, or same-session work → **no rk-plan skill.** Just do it, or use `superpowers:subagent-driven-development`. The rk-plan family is for builds worth a written plan + a handoff to a *fresh* session.

## Decision tree (first match wins)

1. **Can you name 3+ workstreams that run concurrently, across multiple subsystems (service + client + infra, or many packages), or are there long-running gates worth monitoring while other work proceeds?**
   → **`rk-plan-max`** (Opus team-lead + standing roster on a shared task board).
   *If the work is serial or one subsystem, it is NOT max — keep going.*

2. **Is the single hardest task Opus-level (novel architecture, subtle cross-cutting logic, a real "which approach?" call) OR safety-critical (auth, payments, data migrations, external API contracts, PII, prod infra)?**
   → **`rk-plan-pro`** (Opus orchestrator, self-review, adversarial critique on the risky tasks).

3. **Otherwise** — medium, well-understood, every gate expressible as an exact command, no task needs more than Sonnet.
   → **`rk-plan`** (Sonnet orchestrator, delegated review).

## How to route

1. If the answer to any gate is unclear, ask the user with **AskUserQuestion** — at most two questions (parallelism? hardest-task difficulty / safety-critical?). Don't interrogate; lean toward `rk-plan` when genuinely ambiguous.
2. **Declare the choice with reasoning in plain text, then ask the user to confirm before invoking.** State the picked tier, the gate it matched, and the one or two facts that drove it — e.g. *"I'd route this to **`rk-plan-pro`**: single workstream (so not `max`), but the migration mutates production data, which wants `pro`'s adversarial pass. Sound right, or do you want a different tier?"* Then **STOP and wait** for the user's answer. Plain text only — do not use AskUserQuestion for this confirmation.
3. **Only after the user agrees, invoke the chosen skill** with the Skill tool and let it run its own discovery. If the user picks a different tier, invoke that one instead. The router's job ends at the handoff.

## The one-line tells

| Tell | Tier |
|---|---|
| "I could almost do this myself; every gate is a command" | `rk-plan` |
| "It's one hard/risky thing and getting it wrong is expensive" | `rk-plan-pro` |
| "I can list 3+ workstreams running at the same time" | `rk-plan-max` |

## Examples

- *"Add CSV export to the reports page"* → `rk-plan` (bounded, command-gated).
- *"Migrate three list endpoints to cursor pagination"* → `rk-plan` (known pattern, shallow).
- *"Rewrite the JWT session/refresh layer"* → `rk-plan-pro` (subtle + abuse cases).
- *"Backfill a column with a transform + rollback path"* → `rk-plan-pro` (single but data-safety-critical).
- *"Ship a feature across backend + client + IaC at once"* → `rk-plan-max` (concurrent subsystems).
- *"React 18→19 across 40 packages with long test suites"* → `rk-plan-max` (parallel + monitored gates).

## Red flags — STOP

- Routing to `rk-plan-max` for a single serial workstream → that's `rk-plan-pro`; a team is overhead you must justify with real concurrency.
- Routing to `rk-plan` for an auth/payments/migration task → safety-critical wants `rk-plan-pro`'s adversarial pass.
- Asking more than two routing questions → pick a default and move on; the chosen skill does the real discovery.
- Trying to *write the plan* here → the router only chooses; invoke the tier skill to plan.
