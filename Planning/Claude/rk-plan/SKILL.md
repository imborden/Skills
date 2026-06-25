---
name: rk-plan
description: Use for MEDIUM multi-step builds handed to a fresh **Sonnet** orchestrator that dispatches Sonnet/Haiku agents — well-understood work where no single task needs Opus-level reasoning and gates can be expressed as exact commands. Produces an implementation plan plus an embedded handoff prompt for the next session. The orchestrator stays mechanical: it delegates per-task review to Sonnet reviewer subagents rather than judging diffs itself. For HIGH-complexity or safety-critical builds (auth, payments, migrations, anything needing adversarial critique), use rk-plan-pro instead.
---

# Writing Sonnet-Orchestrated Plans (mid tier)

## Overview

Produce a **plan document + embedded handoff prompt** that lets a *fresh* **Sonnet** session build a feature by dispatching subagents — without you in the loop. The authoring session plans, writes the doc, delivers the handoff, and **STOPS**. Execution happens later, in the new session.

This is the lighter sibling of `rk-plan-pro`. The difference is the orchestrator's reasoning budget: a Sonnet orchestrator has less headroom than Opus, so **every design choice moves judgment OFF the orchestrator and onto something mechanical** — exact-command gates, schema-validated returns, and *delegated* review by reviewer subagents. The orchestrator dispatches, runs commands, and acts on verdicts; it does not exercise taste.

**Core principle:** the plan is the contract, and the contract must be executable by a driver that infers as little as possible. If a step needs judgment the Sonnet orchestrator can't reliably supply, either make it mechanical or push it into a dispatched agent.

## When to Use

- A medium build worth handing to a separate session, where the **hardest single task only needs Sonnet-level reasoning**.
- Every phase boundary can be checked by an **exact command** (test run, type-check, grep, exit code) — not by eyeballing.
- You're asked for "a plan + handoff prompt" / "an orchestrated build" and the work isn't safety-critical.

**When NOT to use — escalate to `rk-plan-pro`:**

- Any single task needs **Opus-level reasoning** (novel architecture, subtle cross-cutting logic, multi-valid-approach design calls). The presence of an `[opus]`-worthy task is the signal you're in the wrong skill.
- The build touches **auth, payments, data migrations, external API contracts, PII, or production infra** — these want `[adversarial]` critique, which `rk-plan` deliberately omits.
- A gate can only be stated as prose ("verify it looks right"). If you can't write the gate as a command, the build needs a stronger orchestrator.

**When NOT to use at all:** small tasks you'll just do now; pure research with no build; same-session implementation (use `superpowers:subagent-driven-development`).

## Workflow

1. **Discovery first — never plan on assumptions.** Explore the codebase (read-only; use Explore agents for breadth) AND ask the human clarifying questions (AskUserQuestion) to resolve scope, approach, and unknowns. Find existing utilities/patterns to reuse before proposing new code.
2. **Write the plan doc** to `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md` (create the dirs if missing). Use `plan-template.md` in this skill as the structure.
3. **Embed the handoff prompt** as the final section of that same doc (a template is in `plan-template.md`).
4. **Echo the handoff prompt** back into the chat so the human can paste it into a new session.
5. **STOP.** Do not start building. Do not dispatch agents. The fresh Sonnet session does that.

## Resolve environment-dependent facts at authoring time

A Sonnet orchestrator can only act on what the plan states verbatim. Anything that depends on *where* things live — a bare filename, an implied `cd`, `git mv` vs `mv` — fails silently when the executor has to guess, and it improvises something wrong. **Probe each of these while authoring and bake the resolved answer into the plan + handoff:**

- **Reviewer prompt paths.** The two reviewer prompts ship inside this skill's directory. Resolve their **absolute paths now** and embed those exact paths in the handoff — never refer to them by bare filename. Add the rule explicitly: *if the orchestrator cannot read a prompt file at the given path, it STOPS and asks the human — it must NOT synthesize a reviewer prompt inline.* (If the build will run on a different machine than this one, copy the two prompt files into the plan's repo next to the plan and reference those repo-relative paths instead.)
- **Plan-promotion command.** Run `git check-ignore docs/` while authoring. If `docs/` is git-ignored, the done-signal is plain `mv` — `git mv` errors on ignored paths. Bake the **correct** command (`git mv` or `mv`) into both the per-task loop text in the plan and the handoff. Don't hardcode `git mv` blindly.
- **Gate / Verify commands that depend on cwd.** If the app lives in a subdirectory, write commands that don't assume the orchestrator's working directory — e.g. `npm --prefix <app> test` rather than a bare `npm test` that only works after a `cd`. Resolve `<app>` now and embed it.

## Planning principles — front-load what gets expensive late

- **Keep assumptions visible.** Track confirmed-vs-assumed; an unverified "decision" is an assumption. *Trigger:* writing "we'll use X" → confirmed, or inherited from the brief?
- **Probe the riskiest assumption first, cheaply.** Put a one-shot live probe of the biggest unknown in the **earliest phase that can run it** — gate it (one real call/query) before code depends on it.
- **List required inputs up front.** Name what you need from the human (test data, URLs, credentials, samples) in the plan so the build can't stall mid-run.
- **Match effort to difficulty, but cap it at Sonnet.** If a task genuinely needs more than Sonnet, the whole build belongs in `rk-plan-pro` — don't paper over it with a vague task.
- **Cut at natural joints.** One task = one clear "done"; don't split a diff across tasks or lump independent work together.

## Task authoring — tiering

Tag every task `[haiku]`, `[sonnet]`, or `[orchestrator]`. **There is no `[opus]` tier** — if you reach for one, switch to `rk-plan-pro`.

| Tier | Gets | Examples |
|---|---|---|
| `[haiku]` | Mechanical, fully-specified, zero design decisions | dep adds, config edits, prop-driven components, copy edits, file moves, applying a precise diff |
| `[sonnet]` | Judgment, multi-file coordination, non-trivial logic | core logic, integration, route handlers, hooks, anything requiring bounded choices |
| `[orchestrator]` | Validation + verbatim-content writes only | running gates, writing exact-byte files (scaffolding/config/fixtures), final verification |

**Don't tier verbatim-content files written by the orchestrator.** If the plan already contains a file's exact bytes and *you* (the orchestrator) write it directly, that's `[orchestrator]` — dispatching pure transcription wastes a cold-start subagent.

**Verbatim tasks that ARE dispatched are first-class — tag them `[haiku] (verbatim)`.** A task whose entire job is to write exact bytes the plan already contains (append a precise block, transcribe a fixture, apply an exact diff) is *verbatim*. It is reviewed for **byte-identity only** (spec-compliance) and **skips the code-quality review entirely**. A quality reviewer turned loose on locked bytes flags the plan's *own* decisions — class-name contracts, hex literals, intentional cascade order — as "bugs," which traps the orchestrator between two absolutes it cannot jointly satisfy ("bounce on any ❌" vs "never judge diffs yourself"). The verbatim tag is the mechanical escape valve. Distinguish: `[orchestrator]` = you write the bytes, no dispatch, no review; `[haiku] (verbatim)` = a dispatched agent transcribes them and you run a byte-identity spec check only.

**Haiku tasks MUST be more explicit than sonnet tasks.** Every haiku task includes: the **exact file paths**, the **exact content or a precise diff** (not a prose description), the **exact commands** + **expected output**, **numbered steps** assuming zero inference, and a **STOP condition**: "If anything differs from the above, do not improvise — stop and report back."

## Delegated review — the heart of this skill

A Sonnet orchestrator must NOT be the one deciding whether a diff is good. After each task it dispatches **two fresh Sonnet reviewer subagents in order**, and acts only on their verdicts:

1. **Spec-compliance review** — does the code match the task spec (nothing missing, nothing extra)? Use the spec reviewer prompt (reference it by the **absolute path** resolved at authoring time, not a bare filename).
2. **Code-quality review** (only after spec passes, and **only for non-verbatim tasks**) — is it clean, tested, maintainable? Use the code-quality reviewer prompt (absolute path).

On a ❌ from either reviewer, the orchestrator **bounces the same implementer agent** with the findings and re-reviews; it does not fix the code itself and does not wave issues through. Both reviewers run on **Sonnet** — two focused passes on a small diff catch most issues without an Opus in the loop.

**Scope the verbatim carve-out precisely.** `[haiku] (verbatim)` tasks run **step 1 only** — byte-identity spec-compliance is the whole review; do not run code-quality on them. Every *non-verbatim* task still runs **both** passes, in order — the carve-out must not bleed into skipping quality review on real `[sonnet]`/`[haiku]` work (the code-quality pass is exactly what catches leaking mock state, imprecise selectors, and similar bugs the spec pass misses). When code-quality *does* run and the task carries plan-locked values (fixed names, literals, mandated ordering), pass them into the reviewer's **Plan-locked content** slot so it won't flag the plan's own contract as a defect.

**If a reviewer prompt file can't be read at its path, STOP and ask the human — never synthesize a reviewer prompt inline.** An improvised reviewer defeats the delegation this skill is built on.

This replaces `rk-plan-pro`'s in-orchestrator self-review. State it explicitly in the plan + handoff so the fresh session knows review is delegated, not optional and not self-performed.

## Mechanical gates only

A phase `**Gate:**` MUST be an **exact command + exact expected result** — a string match, a count, an exit code, or a schema-field assertion. **Prose gates are banned** ("verify it works", "check the UI"). A Sonnet orchestrator must never have to interpret ambiguous output. Examples:

```markdown
**Gate:** `npm test -- upload` → `Tests  7 passed (7)` AND exit 0
**Gate:** `npx tsc --noEmit` → no output (exit 0)
**Gate:** `grep -c "edge_cleanup" web/app/api/route.ts` → `2`
**Gate:** `npm test` → 0 failures AND testsPassing === true   # references a task's schema field
```

If a check can't be reduced to a command, that's the signal the build belongs in `rk-plan-pro`.

## Phase execution strategies

Every phase header MUST carry ONE strategy annotation: `## Phase N — <title> [parallel|pipeline|sequential]`.

- **`[parallel]`** — all tasks dispatched at once (each to a fresh agent at its tier); orchestrator waits, then runs the gate. Only the failing task bounces. Use when tasks are independent and share no state.
- **`[pipeline]`** — tasks run in document order, each validated output fed to the next via `**Receives:**`. Gate runs after the final task. Use for chains ("Task 1 makes types" → "Task 2 uses them"). Every task except the first MUST declare `**Receives:**`.
- **`[sequential]`** (default if omitted) — one at a time; the orchestrator runs the full delegated-review loop on each before dispatching the next. Use when each task's outcome could change the next.

`rk-plan` does **not** support `[adversarial]` — that loop needs confidence-judgment the Sonnet orchestrator shouldn't run. A build that needs it belongs in `rk-plan-pro`.

## Schema validation

Each task MAY declare a flat JSON Schema its agent's output must conform to: `**Schema:** { "filesCreated": ["string"], "testsPassing": "boolean" }`. Structured returns let the orchestrator check fields mechanically instead of judging prose. Keep schemas flat (max 2 levels), use descriptive names, include a count field when relevant, prefer `boolean` for pass/fail. Gate conditions may reference schema fields by name (`testsPassing === true`); if a gate references a field no task declares, that's a plan error to fix before dispatch. Skip schema only when output is genuinely hard to schematize.

## The per-task loop (spell this out in the handoff)

Write the orchestrator's loop as a literal algorithm so the Sonnet driver infers nothing:

1. **Dispatch the implementer** — fresh agent at the task's tier (`[haiku]`/`[sonnet]`), given ONLY that task's section (plus `**Receives:**` context in a pipeline). Pass `**Schema:**` when present.
2. **Run `**Verify:**`** — the task's smoke command. On failure, bounce the implementer with the output.
3. **Dispatch the spec reviewer** (spec reviewer prompt at its absolute path, Sonnet). On ❌ → bounce implementer with findings, return to step 2. For `[haiku] (verbatim)` tasks this is a **byte-identity** check and is the *only* review — go straight to step 5 on ✅.
4. **Dispatch the code-quality reviewer** (code-quality reviewer prompt at its absolute path, Sonnet) — only after spec ✅, and **skip entirely for `[haiku] (verbatim)` tasks**. When it runs and the task has plan-locked values, fill the reviewer's **Plan-locked content** slot. On ❌ → bounce implementer with findings, return to step 2.
5. **At the phase boundary, run the `**Gate:**` command yourself** and confirm the exact expected output. On failure, bounce the responsible task.
6. **Flip `- [ ]`→`- [x]`** for the task and **commit** with the task's exact `**Commit:**` message.
7. **On any surprise:** a doc-backed correction to a planned decision → fix, note it in the plan, continue. **Anything else** — adds a dependency, costs money, changes scope, or needs a judgment call you're unsure of → **STOP and ask the human.** (A Sonnet orchestrator escalates sooner than an Opus one would; when in doubt, stop.)

When all gates pass, move the plan from `docs/plans/incomplete/` to `docs/plans/complete/` as the done signal — using the command resolved at authoring time (`git mv` normally, plain `mv` if `docs/` is git-ignored).

## Quick Reference

| Element | Rule |
|---|---|
| Orchestrator | **Sonnet** — mechanical: dispatches, runs commands, acts on verdicts; never judges diffs itself |
| Plan location | `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` → `complete/` when done |
| Discovery | Explore + AskUserQuestion **before** writing the plan |
| Task tags | `[haiku]` / `[haiku] (verbatim)` / `[sonnet]` / `[orchestrator]` — **no `[opus]`** (that → `rk-plan-pro`) |
| Haiku tasks | Exact paths, exact code/diff, exact commands + expected output, STOP condition |
| Review | **Delegated** to two Sonnet reviewers per task: spec-compliance, then code-quality. Bounce implementer on ❌. **`[haiku] (verbatim)` = spec-compliance only** |
| Reviewer prompts | Reference by **absolute path** resolved at authoring time. Can't read it → STOP, never improvise inline |
| Env facts | Probe at authoring time: reviewer-prompt paths, `git check-ignore docs/` (→ `mv` vs `git mv`), cwd-safe gate commands (`npm --prefix <app>`) |
| Gates | **Exact command + exact result only.** Prose gates banned. May reference schema fields. cwd-independent |
| Phase types | `[parallel]` / `[pipeline]` (+`Receives:`) / `[sequential]` (default). **No `[adversarial]`** |
| Schema | Flat JSON, max 2 levels; lets the orchestrator validate mechanically |
| Verify / Commit | Per-task smoke command + exact commit message |
| Escalation | Lower bar than high tier — STOP and ask on any non-doc-backed surprise |
| This session | Author + deliver, then **STOP** — do not build |

## Common Mistakes

- **Prose gates.** "Verify it works" → rewrite as a command + expected output, or move the build to `rk-plan-pro`.
- **A task that secretly needs Opus.** A `[sonnet]` task with hand-wavy "design the…" scope → either decompose it into mechanical pieces or switch skills.
- **Orchestrator self-review.** This skill delegates review to subagents — don't let the handoff imply the orchestrator judges diffs itself.
- **Running code-quality on a verbatim task.** A `[haiku] (verbatim)` task gets byte-identity spec review only; a quality pass will flag the plan's own locked bytes as bugs. Skip it.
- **Skipping the code-quality pass on a *non-verbatim* task.** For real `[sonnet]`/`[haiku]` work both reviews are required, in order — the verbatim carve-out doesn't apply.
- **Bare reviewer-prompt filenames.** Reference the reviewer prompts by absolute path resolved at authoring time, with a STOP-don't-improvise rule. A bare filename forces the orchestrator to synthesize one.
- **Hardcoding `git mv` for promotion.** Probe `git check-ignore docs/` while authoring; use plain `mv` if `docs/` is ignored and bake the right command in.
- **Reaching for `[adversarial]` or `[opus]`.** Neither exists here. Their need = use `rk-plan-pro`.
- **Terse haiku tasks.** Haiku needs *more* detail than sonnet, not less.
- **Saving the plan flat** instead of `docs/plans/incomplete/<dated-slug>.md`.
- **Planning on assumptions.** Explore + ask first; gate the riskiest unknown with a live probe.
- **Parallel tasks that share state.** `[parallel]` tasks must be independent — use `[pipeline]` or separate phases.
- **Pipeline task missing `**Receives:**`.** Every pipeline task after the first must declare it.
- **Starting the build.** The author session STOPS after delivering.

## Red Flags — STOP

- About to write code / dispatch an agent from the authoring session → STOP, you only plan.
- A gate you can't express as a command → the build needs `rk-plan-pro`.
- A task you can't fully specify for Sonnet → decompose it or escalate to `rk-plan-pro`.
- A handoff that lets the orchestrator skip the two delegated reviews on non-verbatim work → add them back.
- A haiku task that says "implement X" without exact files/commands → rewrite explicitly or make it `[sonnet]`.
- Plan saved outside `docs/plans/incomplete/` → move it.
- Reviewer prompts referenced by bare filename, or no STOP-don't-improvise rule → embed absolute paths and the rule.
- A verbatim task routed through code-quality review → tag it `[haiku] (verbatim)` and run spec-compliance only.
- `git mv` baked in without probing `git check-ignore docs/` → resolve `mv` vs `git mv` now.
