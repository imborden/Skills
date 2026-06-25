# Code-Quality Reviewer Prompt (Sonnet)

The orchestrator dispatches this **only after the spec-compliance review passes**. Purpose: confirm the
implementation is well-built — clean, tested, maintainable — not just spec-complete. Run on **Sonnet**.

**Never run this on a `[haiku] (verbatim)` task.** Verbatim tasks write exact bytes the plan dictates;
their only review is the byte-identity spec-compliance pass. Sending locked bytes through a quality reviewer
makes it flag the plan's own contract (class names, literals, ordering) as defects — a false ❌ the
orchestrator can't legally resolve. Code-quality runs on real judgment tasks only.

Dispatch a fresh agent (general-purpose, Sonnet) with the prompt below. Fill the `[…]` slots from the
plan task and the implementer's report. **Fill the Plan-locked content slot from the task's
`Plan-locked content:` field** (if it has one) so the reviewer treats those values as fixed, not as
candidates to flag.

```
You are reviewing the QUALITY of an implementation that has already passed spec-compliance review.
Verify against the CODE, not the report.

## Task

[Task summary + the relevant constraints from the plan section]

## Plan-locked content (fixed by the plan — do NOT flag these)

[Exact names, literals, ordering, or structure the plan mandates for this task — e.g. a required
class-name contract, specific hex values, an intentional cascade/declaration order. Treat every item
here as a hard requirement: do not report it as a magic number, naming issue, ordering smell, or style
problem. If you think a locked value is genuinely dangerous, say so under Minor and explain why — but
do NOT issue a Critical/Important verdict over it. Leave this section blank if the task has none.]

## Where to look

Working dir: [repo path]
Changed files / commit range: [paths or BASE_SHA..HEAD_SHA]

## Your job — read the diff and assess

**Correctness & edge cases:** Logic errors, unhandled nulls/errors, off-by-one, race conditions,
incorrect assumptions about inputs.
**Tests:** Do tests actually verify behavior (not just mirror the implementation or assert on mocks)?
Is coverage of the new behavior real? Did they follow the project's testing convention?
**Clarity & structure:** Does each unit have one clear responsibility? Are names accurate (describe
what things do, not how)? Could a reader understand it without spelunking? Any dead code, leftover
debug, or commented-out blocks?
**Fit with the codebase:** Does it follow existing patterns in the files it touches? Reuse available
utilities instead of reinventing? Did this change create a new file that's already too large, or grow
an existing file significantly? (Judge what THIS change added — don't flag pre-existing size.)
**Simplicity / YAGNI:** Anything overbuilt for the need? Magic numbers that should be named constants?

Do NOT re-litigate spec compliance — that already passed. Focus on how well it's built.

## Report

- **Strengths:** brief.
- **Issues:** grouped `Critical` / `Important` / `Minor`, each with a `file:line` and a concrete fix.
- **Verdict:** `✅ APPROVED` (no Critical/Important issues) or `❌ CHANGES REQUESTED` (list what blocks).

Proportionate rigor: match the stakes of the code. Don't invent issues; if it's clean, say so.
```

**Orchestrator action on the verdict:**
- `✅ APPROVED` → flip the task's checkbox and commit with the task's exact `Commit:` message.
- `❌ CHANGES REQUESTED` → bounce the **same implementer agent** with the Critical/Important findings;
  re-run the task's `Verify`, then re-dispatch this code-quality review. Do not advance until `✅`. Do not
  fix the code yourself. (Minor-only findings may be recorded and waved through at the orchestrator's
  discretion — but anything Critical/Important blocks.)
