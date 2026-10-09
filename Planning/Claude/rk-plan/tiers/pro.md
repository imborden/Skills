# Pro tier — Opus orchestrator + adversarial critique

High-complexity or safety-critical single-workstream builds. A fresh **Opus** orchestrator executes the plan: same delegated-review loop as mid, plus **`[adversarial]`** phases that wrap risky tasks in a generate → critique → regenerate loop with a fresh critic per task.

## Step down to mid when

No task needs Opus reasoning, nothing is safety-critical, and every gate is a command — pro's extra machinery is cost, not safety.

## Step up to max when

You can name 3+ genuinely concurrent workstreams, multiple subsystems that benefit from persistent specialist context, or long-running gates worth `Monitor`-ing while other work proceeds. A single coherent workstream — even a hard, safety-critical one — stays in pro; a team is overhead you must justify with real concurrency.

## Pro-specific rules

- **`[adversarial]` phases.** Annotate: `## Phase N — <title> [adversarial] [parallel|sequential]` (never `[pipeline]`). Add after the Gate:

  ```markdown
  **Gate:** `<command>` → `<expected>` AND no critic findings ≥ 75
  **Threshold:** 75
  **Max iterations:** 3
  **Human probe (optional):** <exact snippet/steps the human runs in the live environment,
  and when — e.g. "before iteration 2, run this batchPlay call in Photoshop and paste the
  result into the plan doc">
  ```

  The critic's contract (loop, confidence model, return JSON, prompt body) lives in `prompts/adversarial-critic.md` — the executor hands the card to a fresh critic per task, giving it only the task spec, the generator's output, and the changed files — never the full plan (prevents plan-confirmation bias).

  **Use `[adversarial]` on** tasks touching auth, payments, data mutations, migrations, external API contracts, PII, or prod infra. **Skip it** for UI layout, copy, docs, or mechanical `[haiku]` edits — the cost isn't justified there.

  Iterations are delta-scoped: each bounce re-runs the critic against the fix, not the
  full spec/quality chain — reviewers re-run only if the fix escapes their reviewed
  file set. Worst case is therefore ~2 dispatches per iteration (generator + critic),
  not 4.

  When a task's correctness is unverifiable by any automated gate (no test can touch the real system), the adversarial phase SHOULD carry a **Human probe** line — the critic's documentary findings are hypotheses until the probe confirms them.

- **No task cap.** Divide into parts at structural joints per SKILL.md *Divide into parts* — a behaviour probe, an independent workstream, or a fully-green gate. An Opus 5.5 session clears roughly 10+ tasks; use that to choose among joints, never to cut where none exists. A `Human probe (required)` that reviews built behaviour closes its part; rk-exec writes the probe's corrections as the opening phase of the next part.

## Run config values for this tier

- `Tier: pro`
- **Workflow authorization** — ask the human now (same as mid: recorded answer, executor never decides itself).
