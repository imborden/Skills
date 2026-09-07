---
name: rk2-plan
description: Plan a multi-step build and route it to the right tier (mid / pro / max) in one skill — the consolidated successor to rk-plan-router + rk-plan + rk-plan-pro + rk-plan-max. Use when the user wants an implementation plan a fresh session will execute, a "plan + handoff", or an orchestrated/subagent build — e.g. "/rk2-plan add CSV export". Picks a tier from a 3-question tree, declares it with reasoning, reads tiers/<tier>.md for tier-specific rules, writes the plan doc, and prints the /rk2-exec kickoff line. Not for small do-it-now tasks, pure research, or same-session implementation.
---

# rk2-plan — plan a build, any tier

Produce a **plan document** that a *fresh* session executes via **`rk2-exec`** — without you in the loop. The execution protocol lives once in `rk2-exec`; the plan carries only plan-specific facts. This session plans, writes the doc, prints the one-line kickoff, and **STOPS**.

**Core principle:** the plan is the contract. The executor can only do what the doc says — tiers, gates, completion rules, and lifecycle must be explicit, none assumed.

## Step 1 — route (first match wins)

**Gate 0 — is a plan even warranted?** Small task you'd just do now, pure research, or same-session work → no plan skill. Just do it (or use `superpowers:subagent-driven-development`). This family is for builds worth a written plan + a handoff to a fresh session.

1. **3+ workstreams that run concurrently, multiple subsystems (service + client + infra), or long-running gates worth monitoring while other work proceeds?** → **max** (Opus team-lead + persistent roster on a shared task board). Serial work or one subsystem is NOT max — keep going.
2. **Hardest single task Opus-level (novel architecture, subtle cross-cutting logic, a real "which approach?" call) OR safety-critical — the build **changes** auth/session logic, payments, data migrations, external API contracts, PII handling, or prod infra? (Merely sitting behind existing auth middleware does not count.)** → **pro** (Opus orchestrator + adversarial critique on the risky tasks).
3. **Otherwise** — medium, well-understood, every gate expressible as an exact command, no task needs more than Sonnet → **mid** (Sonnet orchestrator).

One-line tells: "I could almost do this myself; every gate is a command" → mid. "One hard/risky thing, getting it wrong is expensive" → pro. "I can list 3+ workstreams running at the same time" → max.

**Declare and proceed.** State the tier and the one or two facts that drove it in one line — e.g. *"Routing: pro — single workstream, but the migration mutates production data."* For **mid** and **pro**, proceed immediately; the user objects if it's wrong (discovery questions follow anyway — a natural veto point). For **max only**, confirm before proceeding — standing a team up is the one expensive commitment. If a gate answer is genuinely unclear, ask at most two questions (AskUserQuestion); lean toward mid when ambiguous.

**Then read `tiers/<tier>.md` in this skill's directory** — it carries the tier-specific rules the rest of this file doesn't repeat.

A spec/design doc is an input, not a ritual: if one exists (path given, or produced earlier this session), read it in full before routing. Don't write one unless the user asks or scope is genuinely undiscoverable from the codebase + questions.

## Step 2 — workflow

1. **Discovery first — never plan on assumptions.** Explore the codebase (read-only; Explore agents for breadth) AND ask the human clarifying questions (AskUserQuestion) to resolve scope, approach, and unknowns. Find existing utilities/patterns to reuse before proposing new code.
2. **Write the plan doc** to `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md` (create dirs if missing). Use `plan-template.md` in this skill; delete the sections marked for other tiers. `bin/fixtures/valid-mid.md` is a complete worked example — read it once before writing your first plan of a session; it shows `[pipeline]` + `Receives:`, a locked-content task, a noun schema gate, and a verbatim task with a STOP condition.
3. **Fill the Run config block** — `Tier:`, `Rk2 dir:`, promotion command (`git mv` vs `mv`), Workflow authorization (ask the human now, **recommending "authorized"** — it keeps per-task dispatch/review traffic out of the orchestrator's context; on a pro/Opus orchestrator, "not authorized" is typically the single most expensive line in the Run config), hard rules. Do NOT embed an execution protocol or handoff prompt — that lives in `rk2-exec`.
4. **Lint the plan:** `python3 docs/plans/rk2/rk2-lint.py <plan path>` → `OK`. Fix every reported line; do not print the kickoff until it passes.
5. **End by printing the one-line kickoff**: `/rk2-exec docs/plans/incomplete/YYYY-MM-DD-<slug>.md` — nothing more.
6. **STOP.** Do not build, dispatch agents, or create teams. The fresh session does that.

## Resolve environment-dependent facts at authoring time

Anything that depends on *where* things live fails silently when the executor guesses. Probe now, bake into Run config:

- **Promotion command:** run `git check-ignore docs/`. If `docs/` is ignored, the done-signal is plain `mv` (`git mv` errors on ignored paths). Bake the correct one in — never hardcode `git mv` blindly.
- **cwd-dependent commands:** if the app lives in a subdirectory, write gates that don't assume the working directory — `npm --prefix <app> test`, not a bare `npm test`. Resolve `<app>` now.
- **rk2 support files:** copy this skill's `prompts/*.md` and `bin/rk2-lint.py` into `docs/plans/rk2/` in the repo if absent or older (`cp -n` is not enough — compare with `diff -q`). Write `**Rk2 dir:** docs/plans/rk2` in Run config. rk2-exec reads cards and lint from there only, so clones and other machines work.

## Planning principles — front-load what gets expensive late

- **Keep assumptions visible.** Track confirmed-vs-assumed; an unverified "decision" is an assumption. Writing "we'll use X" → confirmed, or inherited from the brief?
- **Probe the riskiest assumption first, cheaply.** Order by uncertainty × consequence. Put a one-shot live probe of the biggest unknown in the earliest phase that can run it — gate it (one real call/query) before code depends on it. If the riskiest assumption can only be verified in a live environment or by a human (a real device, a licensed app, prod data), put that checkpoint **inside** the earliest phase that generates against it — not after the build. Documentary research is a substitute for an experiment only when the experiment is unavailable.
- **UI tasks get a browser gate.** Any task changing rendered UI needs a Verify/Gate that drives the real page (playwright/chrome-devtools): assert the selector/state that defines "done", save a screenshot to the plan's artifacts dir. Human sign-off is the *last* check, never the *first*.
- **List required inputs up front.** Name what you need from the human (test data, URLs, credentials, samples) so the build can't stall mid-run.
- **Cut at natural joints.** One task = one clear "done"; don't split a diff across tasks or lump independent work together.
- **Match effort to difficulty.** Don't dispatch trivial transcription or wing the hard parts.

## Task authoring — tiering (all tiers)

Tag every task `[haiku]`, `[haiku] (verbatim)`, `[sonnet]`, or `[orchestrator]`:

| Tag | Gets | Examples |
|---|---|---|
| `[haiku]` | Mechanical, fully-specified, zero design decisions | dep adds, config edits, prop-driven components, copy edits, applying a precise diff |
| `[haiku] (verbatim)` | Dispatched exact-byte transcription — **byte-identity spec review ONLY, no quality review** | append a precise block, transcribe a fixture from the plan |
| `[sonnet]` | Judgment, multi-file coordination, non-trivial logic | core logic, integration, route handlers, hooks |
| `[orchestrator]` | Validation + verbatim writes the executor does itself, no dispatch, no review | running gates, writing exact-byte files already in the plan |

There is no `[opus]` task tag — a task that needs Opus reasoning means the *build* is pro-tier (the pro orchestrator is Opus); if a single task still can't be decomposed to Sonnet reach, decompose further or flag it to the human.

**Verbatim vs orchestrator:** plan contains exact bytes + executor writes them = `[orchestrator]`. A dispatched agent transcribes them = `[haiku] (verbatim)` — quality review is skipped because a quality reviewer turned loose on locked bytes flags the plan's own contract as bugs.

**Haiku tasks MUST be more explicit than sonnet tasks:** exact file paths, exact content or a precise diff (not prose), exact commands + expected output, numbered steps assuming zero inference, and a STOP condition — "if anything differs, stop and report, do not improvise."

**Plan-locked values:** if a non-verbatim task hard-codes values the plan mandates (fixed class names, hex literals, intentional ordering), list them in a `**Plan-locked content:**` field so the reviewer (combined or quality) treats them as contract, not defects.

**Review weight:** every task MAY declare `**Review:** gate-only | standard | full`
(default `standard`). Use `gate-only` for tasks whose `Verify:` is a real automated
check — tests, typecheck, exact grep — where a delegated reviewer re-confirms what the
gate already proves; typical for `[haiku]` tasks and well-gated code tasks. Use `full`
(split spec + quality reviewers) only where the two lenses genuinely differ — it is
implied inside `[adversarial]` phases. Everything else takes the default single
combined reviewer. Run data behind this knob: review bounces cluster on copy/docs
tasks, not on code tasks with hard gates.

## Gates — exact commands only

A phase `**Gate:**` is an **exact command + exact expected result** (string match, count, exit code, or schema-field assertion). Prose gates are banned ("verify it works"). Gates may reference task schema fields, but only **nouns, not verdicts**: fields the orchestrator can re-derive with `ls`, `grep -c`, or `wc -l` (`filesCreated`, `routeName`, a count). A pass/fail boolean set by the implementer is never a gate input — the gate re-runs the command. A gate referencing a field no task in that phase declares is a plan error.

**The command must emit a deterministic value.** Exact-match assertions are checked
literally by the gate agent, so a command whose output carries a timing, duration,
path, or run-varying count can never satisfy one — the gate fails every run and
burns a bounce. Normalize inside the command (`grep -c`, `grep -q; echo $?`, `cut`,
`wc -l`) rather than asserting against a line with a variable suffix. Before writing
a gate, ask what the command actually prints; if you can't state it byte-for-byte,
normalize it.

```markdown
✅ **Gate:** `swift build 2>&1 | grep -cF 'Build complete!'` → `1`
❌ **Gate:** `swift build 2>&1 | tail -1` → `Build complete!`
   (real output is `Build complete! (3.64s)` — never matches)

**Gate:** `npm test -- upload` → `Tests  7 passed (7)` AND exit 0
**Gate:** `npx tsc --noEmit` → no output (exit 0)
**Gate:** `ls src/export/*.ts | wc -l | tr -d ' '` → `2` AND filesCreated.length === 2
```

The same rule governs every task `**Verify:**` line, which has the identical shape: `command` → expected. A Verify with no `→` expected half is a plan error (the lint rejects it).

## Phase execution strategies

Every phase header carries ONE strategy annotation: `## Phase N — <title> [parallel|pipeline|sequential]`.

- **`[parallel]`** — all tasks dispatched at once; barrier at the gate; only a failing task bounces. Tasks must be independent — shared state means different phases or a pipeline.
- **`[pipeline]`** — tasks run in document order; each validated output feeds the next via `**Receives:**` (required on every task after the first); gate after the last task; a failure stops the chain.
- **`[sequential]`** (default) — one at a time, full review loop between.
- **`[adversarial]`** (pro/max only — see the tier files) composes with `[parallel]` or `[sequential]`, never `[pipeline]` (rewrites would invalidate downstream inputs).
- **`After:` (optional)** — a phase depending on an earlier (non-adjacent) phase declares `**After:** Phase K` under its header; the executor may overlap it with intervening phases. Don't serialize independent phases by accident.

## Schema validation

Each task MAY declare a flat JSON Schema for its agent's output: `**Schema:** { "filesCreated": ["string"], "exportedSymbols": ["string"] }`. Structured returns let the executor check fields mechanically instead of judging prose. Flat (max 2 levels), descriptive names, booleans allowed in the return for the executor's own bookkeeping but never referenced by a Gate, a count field when useful. Skip only when output is genuinely hard to schematize.

## Review model (all tiers — details in `rk2-exec`)

Review is **delegated at every tier**: after Verify passes, one **combined**
spec+quality reviewer by default — a fresh Sonnet agent at mid/pro, standing (split)
reviewers at max. A task's `Review:` field can drop this to `gate-only` (the Verify
command is the review) or raise it to `full` (split spec then quality reviewers, as in
`[adversarial]` phases). The executor acts on verdicts; it never judges diffs in its
own head. Pro/max add an adversarial critic for safety-critical tasks. Bounces are capped at **3 per task**, then STOP and surface to the human. Author tasks (Verify, Schema, Commit, Grounding) to slot into that loop — do not restate it in the plan.

## Common mistakes

- **Prose gates** → rewrite as command + expected output.
- **Terse haiku tasks** → haiku needs *more* detail than sonnet, not less.
- **Parallel tasks sharing state** → pipeline or separate phases.
- **Restating the execution protocol in the plan** → it lives in `rk2-exec` and would drift. Plan carries Run config + tasks only.
- **Plan saved flat** → `docs/plans/incomplete/<dated-slug>.md`, always.
- **Planning on assumptions** → explore + ask first; gate the riskiest unknown with a live probe.
- **Starting the build** → the authoring session STOPS after printing the kickoff line.
