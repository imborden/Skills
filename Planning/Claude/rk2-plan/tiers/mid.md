# Mid tier — Sonnet orchestrator

Medium, well-understood builds. A fresh **Sonnet** orchestrator executes the plan; it dispatches Sonnet/Haiku agents and acts on reviewer verdicts. Sonnet has less reasoning headroom than Opus, so **every design choice moves judgment OFF the orchestrator onto something mechanical** — exact-command gates, schema-validated returns, delegated review.

## Escalate to pro instead when

- Any single task needs Opus-level reasoning (novel architecture, subtle cross-cutting logic, real "which approach?" calls). A `[sonnet]` task with hand-wavy "design the…" scope is the tell.
- The build changes auth logic (not merely uses it), payments, data migrations, external API contracts, PII, or prod infra — those want the `[adversarial]` critique mid deliberately omits.
- A gate can only be stated as prose. If you can't write it as a command, the build needs a stronger orchestrator.

## Mid-specific rules

- **No `[adversarial]` phases.** That loop needs confidence-judgment a Sonnet orchestrator shouldn't run.
- **Context budget is the binding constraint: cap each plan at ~6 tasks / 2–3 phases.** A Sonnet orchestrator running the full loop clears roughly 4–6 tasks per session. Bigger build → split into multiple plan docs at a hard gate where the halves share no implementer context (e.g. server fully green before any client file is touched). Each part kicks off separately via `/rk2-exec`; part N+1's Context section states "part N is complete" and points at its plan in `docs/plans/complete/`.
- **The orchestrator reads the plan and nothing else.** No grounding reads of source, no re-reading diffs to second-guess reviewers. Each task's `Grounding:` files are for *its implementer*.
- **Escalation bar is low.** The executor stops and asks on any non-doc-backed surprise; a mid task that turns out to need Opus reasoning stops the build with "this belongs in pro." Author tasks specific enough that this never fires.

## Run config values for this tier

- `Tier: mid`
- **Workflow authorization** — ask the human now whether the executor may run the per-task loop as a `Workflow` pipeline script (keeps per-task traffic out of orchestrator context). Record the answer; without it the executor uses the plain Agent loop.
