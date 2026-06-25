---
name: rk-plan-pro
description: Use for HIGH-complexity multi-step builds handed to a fresh **Opus** orchestrator that dispatches subagents — large or safety-critical work (auth, payments, migrations, broad multi-file changes) needing the full machinery (phases, schema, adversarial critique). Produces an implementation plan plus an embedded handoff prompt for the next session. For MEDIUM builds an all-Sonnet orchestrator can drive, use rk-plan instead. For MISSION-CRITICAL or LARGE-SCALE builds that warrant a persistent **agent team** (many independent workstreams, multiple subsystems, long-running gates, a standing adversarial critic), use rk-plan-max instead.
---

# Writing Orchestrated Plans

## Overview

Produce a **plan document + embedded handoff prompt** that lets a *fresh* Opus session build a feature by dispatching subagents — without you in the loop. The authoring session's job is to plan, write the doc, deliver the handoff, and **STOP**. Execution happens later, in the new session.

**Core principle:** the plan is the contract. The fresh orchestrator can only do what the doc says, so the doc must encode the tiers, gates, completion rules, and file lifecycle explicitly — none of it is assumed.

## When to Use

- A build is large enough to hand off to a separate session.
- You're asked for "a plan + handoff prompt," "a plan a fresh session can execute," or "an orchestrated/subagent build."

**When NOT to use:** small tasks you'll just do now; pure research/exploration with no build; when the human wants you to implement in this same session. **For a medium build whose hardest task only needs Sonnet-level reasoning** (no Opus-tier task, no adversarial critique), use **`rk-plan`** — a lighter sibling with an all-Sonnet orchestrator and delegated review. **For a mission-critical or large-scale build that warrants a persistent agent team** — many independent workstreams running in parallel, multiple subsystems with standing specialist context, long-running gates worth monitoring, or a standing adversarial critic — escalate to **`rk-plan-max`**, which trades this skill's single-orchestrator star topology for a team-lead + named teammates on a shared dependency-linked task board. Stay in `rk-plan-pro` for a single coherent workstream, even a hard one.

## Workflow

1. **Discovery first — never plan on assumptions.** Explore the codebase (read-only; use Explore agents for breadth) AND ask the human clarifying questions (AskUserQuestion) to resolve scope, approach, and unknowns. Find existing utilities/patterns to reuse before proposing new code.
2. **Write the plan doc** to `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md` (create the dirs if missing). Use `plan-template.md` in this skill as the structure.
3. **Embed the handoff prompt** as the final section of that same doc.
4. **Echo the handoff prompt** back into the chat so the human can paste it into a new session.
5. **STOP.** Do not start building. Do not dispatch coding agents. The fresh session does that.

## Planning principles — front-load what gets expensive late

The costliest failures are important things nobody front-loaded; they surface last. Front-load assumptions, risk, inputs, and the proof bar — into both the plan and the handoff.

- **Keep assumptions visible.** Track confirmed-vs-assumed; an unverified "decision" is an assumption, not a fact. *Trigger:* writing "we'll use X" → confirmed, or just inherited from the brief?
- **Probe the riskiest assumption first, cheaply.** Order by uncertainty × consequence, not narrative. Put a one-shot live probe of the biggest unknown in the **earliest phase that can run it** — gate it (one real call/query) before code depends on it. *Trigger:* "this whole approach depends on ___" → gate ___ now.
- **List required inputs up front.** Name what you need from the human (test data, URLs, credentials, samples) in the plan, so the build can't stall mid-run waiting on them.
- **Match effort to difficulty.** Don't dispatch trivial transcription or wing the hard parts (see tiering). *Trigger:* "more process than this warrants — or less?"
- **Cut at natural joints.** One task = one clear "done"; don't split a single diff across tasks or lump independent work together.

## Task authoring — tiering

Tag every task `[haiku]`, `[sonnet]`, or `[orchestrator/opus]`.

| Tier | Gets | Examples |
|---|---|---|
| `[haiku]` | Mechanical, fully-specified, zero design decisions | dep adds, config edits, dumb prop-driven components, copy/text edits, file moves, applying a precise diff |
| `[sonnet]` | Judgment, multi-file coordination, non-trivial logic | core algorithms, integration, route handlers, hooks, anything requiring choices |
| `[orchestrator/opus]` | Validation only (see below) | running gates, final verification |

**Don't tier verbatim-content files.** If the plan already contains a file's exact bytes (scaffolding, config, fixtures), the orchestrator writes it directly — dispatching pure transcription wastes a cold-start subagent. Dispatch only work that generates code or makes choices.

**Haiku tasks MUST be more explicit than sonnet tasks** (haiku has less reasoning headroom). Every haiku task includes:
- The **exact file paths** to create/modify.
- The **exact content or a precise diff** — not a prose description of it.
- The **exact commands** to run and the **exact expected output**.
- **Numbered steps**, assuming zero inference.
- A **STOP condition**: "If anything differs from the above, do not improvise — stop and report back."

## Phase execution strategies

Every phase header MUST include ONE execution strategy annotation in the title:

```markdown
## Phase N — <title> [parallel|pipeline|sequential]
```

The annotation tells the orchestrator how to dispatch tasks within the phase. Gate syntax is unchanged: a literal command + expected output.

### [parallel] — Fan-out, barrier at gate

All tasks dispatched simultaneously, each to a fresh agent at its tagged tier. The orchestrator waits for all agents to complete, then runs the phase gate. On failure, only the failing task bounces to a fresh agent — tasks that passed do not re-run.

**Use when:** All tasks are independent. No task consumes output from another task in the same phase. Minimum wall-clock time.

**Constraint:** If two tasks share state, they belong in different phases or a `[pipeline]` phase.

### [pipeline] — Sequential chain, each feeds next

Tasks run one at a time in document order. Each task's validated output is fed as context to the next task via the `**Receives:**` field (see plan-template). The orchestrator runs the gate only after the final task completes. If any task fails, the pipeline stops — downstream tasks are not dispatched.

**Use when:** Tasks form a chain: "Task 1 generates types" → "Task 2 writes migration using those types" → "Task 3 adds queries."

**Constraint:** Each task (except the first) MUST declare a `**Receives:**` field referencing the previous task's schema output.

### [sequential] — One at a time, manual review between

Tasks run one at a time. The orchestrator reviews each diff (two-stage: matches plan? actually works?) before dispatching the next. This is the DEFAULT when no annotation is present — backward compatible with v1.

**Use when:** Each task's output might change what the next task should do. Correctness per-step matters more than speed. Tasks are loosely related but not a strict chain.

### Composing [adversarial]

`[adversarial]` composes with `[parallel]` and `[sequential]`. Example: `## Phase 2 — Auth [adversarial] [parallel]`. See the Adversarial Loop section below.

`[adversarial]` does NOT compose with `[pipeline]` — adversarial rewrites would invalidate downstream task inputs.

### Gate field references

Gate conditions can reference schema fields from task outputs:

```markdown
**Gate:** `npm test -- auth` → 0 failures AND testsPassing === true AND filesCreated.length >= 2
```

The orchestrator resolves field names from each task's validated schema output. If a referenced field is absent from a task's schema, the orchestrator flags a plan error before dispatching.

## Adversarial loop

The `[adversarial]` annotation wraps each task in a generate → critique → regenerate loop: the orchestrator dispatches a fresh critic per task, and any finding at or above the threshold bounces the generator for a targeted retry (up to max iterations; unresolved findings are surfaced to the human in the plan doc). It composes with `[parallel]` and `[sequential]` — e.g. `## Phase 2 — Auth [adversarial] [parallel]` — but **not** `[pipeline]`, where adversarial rewrites would invalidate downstream task inputs.

**The critic's operating contract — the loop, the confidence model, the return-JSON schema, and the prompt body — lives in [`adversarial-critic-prompt.md`](adversarial-critic-prompt.md).** Pass that card to the critic when you dispatch it; it receives only the task spec, the generator's output, and the changed files — never the full plan doc (prevents plan-confirmation bias).

Adversarial phases add three fields after the `**Gate:**`:

```markdown
## Phase N — <title> [adversarial] [parallel]
**Gate:** `<command>` → `<expected>` AND no critic findings ≥ {Threshold}
**Critic:** ce-adversarial-reviewer
**Threshold:** 75
**Max iterations:** 3
```

| Field | Purpose | Default |
|-------|---------|---------|
| `**Critic:**` | Agent (or prompt card) for adversarial review | `ce-adversarial-reviewer` |
| `**Threshold:**` | Min confidence for a finding to block the gate (100 = mechanically constructible → block; 75 = concrete/reproducible → block; 50 = note, don't block; <25 = suppress) | `75` |
| `**Max iterations:**` | Max generate→critique→regenerate cycles per task | `3` |

**Use `[adversarial]` when** the task touches auth, payments, data mutations, migrations, external API contracts, PII, or production infra. **Skip it** for UI layout, copy, docs, or mechanical `[haiku]` edits with exact content — the token cost (worst case 6 dispatches/task) isn't justified.

## Schema validation

Each task MAY declare a flat JSON Schema its output must conform to (`**Schema:** { "filesCreated": ["string"], "testsPassing": "boolean" }`) — structured returns let the orchestrator check fields mechanically instead of judging prose. Keep schemas flat (max 2 levels), names descriptive (`filesCreated` not `fc`), include a count field when it helps (`endpointsSecured: "integer"`), and use `boolean` for pass/fail signals; `"string"`, `"boolean"`, `"integer"`, and string arrays cover ~90% of tasks. Skip schema when the output is genuinely hard to schematize (narrative or quality-only work) or manual diff review suffices.

Gate conditions may reference schema fields by name (see "Gate field references" above); a gate referencing a field no task declares is a plan error to fix before dispatch. Enforcement is automatic with the `Workflow` tool's `agent(prompt, {schema})`; via the `Agent` tool directly the schema is a manual-validation contract — same plan format either way.

**Receives (pipeline tasks):** in `[pipeline]` phases every task except the first MUST declare what it receives from the previous task via a `**Receives:**` field; the orchestrator injects that output as context for the next agent automatically.

```markdown
### Task 4 — Write migration [sonnet]
**Receives:** Task 3 output — `{ "typesFile": "src/types/db.ts", "entities": ["User"] }`
**Schema:** `{ "migrationFile": "string", "rollbackFile": "string", "dryRunPassed": "boolean" }`
```

## Quick Reference

| Element | Rule |
|---|---|
| Plan location | `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` → `complete/` when done |
| Discovery | Explore + AskUserQuestion **before** writing the plan |
| Risk | Gate the riskiest unknown with a live probe in the earliest phase that can run it |
| Inputs | List human-provided assets (data/URLs/creds) up front in the plan |
| Task tags | `[haiku]` / `[sonnet]` / `[orchestrator/opus]`; verbatim-content files → orchestrator writes directly |
| Haiku tasks | Exact paths, exact code/diff, exact commands, expected output, STOP condition |
| Phase types | `[parallel]` dispatch all at once / `[pipeline]` chain with handoff / `[sequential]` one at a time with review (default) |
| Adversarial | `[adversarial]` + `[parallel|sequential]`: generator→critic→regenerate loop per task. `**Critic:**`, `**Threshold:**`, `**Max iterations:**` fields |
| Schema | `{ "field": "type" }` — flat JSON, max 2 levels. Skip when output is hard to schematize |
| Gate | `command` + expected output; may reference schema fields (`testsPassing === true`); orchestrator runs it; barrier between phases |
| Verify | Per-task smoke test the orchestrator runs post-review, pre-commit; distinct from the phase gate |
| Receives | In `[pipeline]` phases, names the previous task's schema fields fed as context |
| Completion | Orchestrator flips `[ ]`→`[x]`, commits per task, moves file on all-gates-pass |
| Handoff | Embedded as final plan section **and** echoed to chat |
| This session | Author + deliver, then **STOP** — do not build |

## Common Mistakes

- **Saving the plan flat** (e.g. `docs/foo-plan.md`) instead of `docs/plans/incomplete/<dated-slug>.md`. → Use the lifecycle dirs.
- **Vague tiers** ("strong/cheap"). → Name `[haiku]`/`[sonnet]` and apply the explicitness rule.
- **Terse haiku tasks.** → Haiku needs *more* detail than sonnet, not less.
- **Gates as prose** ("verify it works"). → A literal command + expected output.
- **Letting the orchestrator code.** → Orchestrator validates and dispatches only.
- **No completion mechanics.** → Checkboxes flipped, commit-per-task, file moved on done.
- **Handoff only in chat.** → Embed it in the plan too (the fresh session reads the doc).
- **Planning on assumptions.** → Explore + ask first; mark what's still unverified and gate it.
- **A "locked" decision never exercised by a gate** (scope, auth, API shape). → Probe the riskiest unknown in the earliest phase that can run it.
- **Dispatching verbatim-content files.** → Orchestrator writes exact-byte files itself; dispatch only code needing generation/judgment.
- **Inputs discovered mid-build.** → List human-provided assets up front in the plan.
- **Mixing [adversarial] with [pipeline].** → Adversarial rewrites invalidate downstream inputs. Use `[adversarial] [parallel]` or `[adversarial] [sequential]` instead.
- **Parallel tasks that share state.** → `[parallel]` tasks must be independent. If Task 2 needs Task 1's output, use `[pipeline]` or separate phases.
- **Pipeline task missing `**Receives:**`.** → Every task in a `[pipeline]` phase (except the first) must declare which fields it receives from the previous task.
- **Deeply nested schemas.** → Keep schemas flat (max 2 levels). Deep nesting breaks StructuredOutput reliability.
- **Adversarial on trivial tasks.** → Don't add `[adversarial]` to haiku tasks with exact content, UI layout, or copy changes. The token cost isn't justified.
- **Gate referencing a missing schema field.** → If the gate says `testsPassing === true` but no task has a `testsPassing` schema field, that's a plan error. The orchestrator catches this before dispatch.
- **Starting the build.** → Author session STOPS after delivering.

## Red Flags — STOP

- About to write code / dispatch a coding agent from the authoring session → STOP, you only plan.
- The riskiest assumption sits unprobed until a late phase → pull a cheap live probe of it into the earliest phase that can run it.
- A phase with no runnable gate command → add one.

The pipeline/parallel/schema/adversarial tripwires live in **Common Mistakes** above — these three are the stop-now subset.
