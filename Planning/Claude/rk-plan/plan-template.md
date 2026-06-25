# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The orchestrator moves
> this file to `docs/plans/complete/` when every gate passes.
>
> This is a **mid-tier** plan: a fresh **Sonnet** orchestrator executes it. Keep every
> gate a runnable command, keep every task within Sonnet's reach, and rely on delegated
> reviewer subagents — not the orchestrator's own taste — for correctness. If any task
> needs Opus-level reasoning or adversarial critique, this plan belongs in `rk-plan-pro`.

## Context

Why this change is being made — the problem/need, what prompted it, the intended
outcome. State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files — name
them so the build can't stall mid-run waiting on them.
**Unverified assumptions:** anything the build rests on but hasn't been confirmed (scope,
auth, API/response shapes). The riskiest ones get a live probe in Phase 1's gate.

## Architecture (optional, 1 paragraph)

The shape of the solution and the key decision(s). Skip if trivial.

## How to run this build — Sonnet-orchestrated, gated, task-by-task

Execute phases in order. Phase headers carry an execution annotation: `[parallel]` (all tasks at once),
`[pipeline]` (sequential chain with handoff via `**Receives:**`), `[sequential]` (one at a time — the default).
There is no `[adversarial]` tier in mid plans.

The **Sonnet orchestrator stays mechanical**: it dispatches one fresh agent per task at the tagged tier
(`[haiku]`/`[sonnet]`), respecting the phase annotation, and writes verbatim-content (`[orchestrator]`) files
itself. It does **not** judge diffs in its own head. After each task it runs the per-task loop below.

**Per-task loop (run for every task):**
1. Dispatch the implementer (task tier), giving it only that task's section (+ `Receives:` in a pipeline). Pass `Schema:` if present.
2. Run the task's `**Verify:**` command. On failure, bounce the implementer with the output.
3. Dispatch the **spec reviewer** (`<ABSOLUTE PATH to spec-reviewer-prompt.md>`, Sonnet). On ❌ → bounce implementer with findings, back to step 2. For `[haiku] (verbatim)` tasks this is a byte-identity check and is the ONLY review — skip to step 5 on ✅.
4. Dispatch the **code-quality reviewer** (`<ABSOLUTE PATH to code-quality-reviewer-prompt.md>`, Sonnet), only after spec ✅, and **skip entirely for `[haiku] (verbatim)` tasks**. When it runs and the task has plan-locked values, fill the reviewer's **Plan-locked content** slot. On ❌ → bounce, back to step 2.
5. Flip `- [ ]`→`- [x]` and commit with the task's exact `**Commit:**` message.

> If either reviewer prompt cannot be read at the path above, **STOP and ask the human** — do NOT synthesize a reviewer prompt inline.

At each **phase boundary**, run the `**Gate:**` command yourself and confirm the exact expected output before
starting the next phase. On gate failure, bounce the responsible task to a fresh agent with the failure output.
On any surprise that isn't a doc-backed correction (new dependency, cost, scope change, unsure judgment call) →
**STOP and ask the human.** When every gate passes, move this file to `docs/plans/complete/` using `<git mv | mv — resolved at authoring time via 'git check-ignore docs/'>`.

`[haiku]` = mechanical/fully-specified; `[haiku] (verbatim)` = dispatched exact-byte transcription (spec-compliance review only); `[sonnet]` = judgment/multi-file; `[orchestrator]` = validation + verbatim writes the orchestrator does itself.

---

## Phase 1 — <title> [parallel|pipeline|sequential]

<!-- Omit the annotation to default to [sequential]. No [adversarial] in mid plans. -->

**Gate:** `<command>` → <exact expected output: string match / count / exit code>
<!-- MUST be a runnable command with an exact expected result. No prose gates.
     May reference schema fields: AND testsPassing === true AND filesCreated.length >= 2
     Make this gate exercise the riskiest unverified assumption (one real call/query)
     where possible, not just a trivial smoke check. -->

### Task 1 — <name> `[haiku|haiku (verbatim)|sonnet]`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "filesCreated": ["string"], "testsPassing": "boolean" }`
<!-- Schema is optional but valued — it lets the orchestrator validate mechanically.
     Keep it flat (max 2 levels). Omit only when output is hard to schematize. -->

<!-- Tag a dispatched exact-byte transcription task `[haiku] (verbatim)`: it gets a
     byte-identity spec-compliance review ONLY and skips code-quality entirely, so the
     quality reviewer can't flag the plan's own locked bytes as bugs. -->

<!-- For [pipeline] phases, every task except the first MUST include:
**Receives:** Task N output — `{ "fieldName": "value", ... }` -->

<!-- If a NON-verbatim task hard-codes values the plan mandates (fixed class names, hex
     literals, intentional ordering), list them so the orchestrator can hand them to the
     code-quality reviewer's Plan-locked content slot:
**Plan-locked content:** `<the exact names/literals/ordering the reviewer must NOT flag>` -->

- [ ] Step 1: <for haiku: exact content/diff + numbered steps>
- [ ] Step 2: <exact command to run> → <exact expected output>

<For [haiku] tasks include: exact file paths, exact code or a precise diff, exact
commands + expected output, and a STOP condition — "if anything differs, stop and
report, do not improvise.">

**Verify:** `<runnable command>`
**Commit:** `<type(scope): message>`

### Task 2 — <name> `[sonnet]`

<!-- In [pipeline] phases, Task 2 and later must include Receives: -->
**Receives:** Task 1 output — `{ "fieldName": "value" }`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (same shape; sonnet tasks may state intent + constraints rather than verbatim code,
but the scope must stay within Sonnet's reach — no open-ended design calls.)

**Verify:** `<runnable command>`
**Commit:** `<type(scope): message>`

---

## Phase 2 — <title> [parallel|pipeline|sequential]

**Gate:** `<command>` → <exact expected output>

### Task 3 — ...
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
tests to pass. Keep it runnable — the orchestrator executes this, it doesn't eyeball.

---

## Handoff prompt (paste into a fresh Sonnet session in this repo)

> You are the **Sonnet orchestrator** for <feature>. The full task-by-task plan is at
> `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` — read it first, in full.
>
> **Why:** <one-paragraph context + confirmed scope>.
>
> **Also read for grounding:** <key files/docs the build depends on>.
>
> **Your job is to dispatch and validate — you do NOT write feature code and you do NOT
> judge diffs in your own head.** For each task: dispatch one fresh agent at its tier
> (`[haiku]` mechanical, `[haiku] (verbatim)` exact-byte transcription, `[sonnet]`
> judgment), giving it only that task's section. Then run the task's `Verify` command, then
> dispatch the **spec reviewer** (`<ABSOLUTE PATH to spec-reviewer-prompt.md>`), then — only
> after it passes, and only for **non-verbatim** tasks — the **code-quality reviewer**
> (`<ABSOLUTE PATH to code-quality-reviewer-prompt.md>`). Both reviewers run on Sonnet. On
> any ❌, bounce the same implementer with the findings and re-run from Verify. You only
> write verbatim-content files yourself when their exact bytes are in the plan and tagged
> `[orchestrator]`.
>
> **Verbatim review carve-out:** a `[haiku] (verbatim)` task gets the spec reviewer ONLY
> (a byte-identity check) and skips code-quality — that reviewer would otherwise flag the
> plan's own locked bytes (class-name contracts, literals, intentional ordering) as bugs.
> This carve-out is scoped to verbatim tasks; every non-verbatim task still gets BOTH
> reviews in order. When the code-quality reviewer runs on a task with mandated values, pass
> them in its **Plan-locked content** slot so it won't flag them.
>
> **If you cannot read a reviewer prompt at the path given, STOP and ask the human — never
> synthesize a reviewer prompt inline.**
>
> **How to run it:** execute phases in order. `[parallel]` → dispatch all tasks at once,
> wait, then gate. `[pipeline]` → dispatch in order, injecting each task's validated output
> into the next via `Receives:`. `[sequential]` (default) → one at a time. There is no
> adversarial tier. Tasks with `Schema:` expect structured JSON output — pass the schema
> when dispatching and validate the returned fields. Gate conditions may reference schema
> fields by name (`testsPassing === true`).
>
> **Gates are commands, not opinions.** At each phase boundary run the `Gate:` command
> yourself and confirm the exact expected output before proceeding. Flip `- [ ]`→`- [x]`
> per task and commit per task with the message in the task. When every gate passes, move
> this file to `docs/plans/complete/` with `<git mv | mv — the command resolved when this
> plan was authored>`. On gate failure, bounce that task to a fresh agent with the failure
> output.
>
> **Hard rules:** <project-specific invariants the agents must not violate>.
>
> **Proof bar:** nothing is "done" without pasted real command output; gate any unverified
> assumption with a live probe rather than trusting it.
>
> **On surprises — escalate readily (you're a Sonnet driver, so when in doubt, stop):**
> doc-backed corrections to a planned decision → fix, document, continue; anything that adds
> a dependency, costs money, changes scope, or needs a judgment call you're unsure of →
> STOP and ask. If a task turns out to need Opus-level reasoning or adversarial review,
> STOP and tell the human this build should move to `rk-plan-pro`.
>
> Start by reading the plan + grounding docs, then begin Phase 1, Task 1. Report progress
> at each gate.
