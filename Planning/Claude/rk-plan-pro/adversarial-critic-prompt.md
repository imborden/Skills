# Adversarial Critic — per-task dispatch (rk-plan-pro)

In `rk-plan-pro` the critic is **dispatched fresh per `[adversarial]` task** by the Opus
orchestrator — there is no standing critic and no plan pre-critique (those are the
star→team upgrade in `rk-plan-max`). Default critic agent: `ce-adversarial-reviewer`;
override per task with the task's `**Critic:**` field. Hand this card to the critic when
you dispatch it.

## The loop (orchestrator-driven, per task)

```
Dispatch generator (task tier) → generator returns output → dispatch critic with
(task spec + generator's output + changed file paths — NOT the full plan doc) →
critic returns findings with confidence → gate check:
  - Any finding ≥ Threshold       → bounce generator with findings as context → re-dispatch
  - All findings < Threshold      → pass
  - Max iterations hit, unresolved → STOP, surface findings to the human in the plan doc
```

**Defaults:** `Threshold: 75`, `Max iterations: 3`. The critic receives the task
description, the generator's schema output, and the changed file paths — **never the full
plan doc** (prevents plan-confirmation bias).

## Confidence model

| Score | Meaning | Action |
|-------|---------|--------|
| 100 | Mechanically constructible — every step verifiable from the diff | Block — bounce generator |
| 75 | Concrete, reproducible scenario — one step may depend on unconfirmed conditions | Block — bounce generator |
| 50 | Plausible but one step can't be confirmed from code alone | Note in plan doc, do not block |
| <25 | Speculative — requires conditions with no evidence | Suppress |

## What the critic produces

```json
{
  "findings": [
    {
      "failureScenario": "string",
      "confidence": 75,
      "trace": "string",
      "category": "assumption-violation | composition-failure | cascade | abuse-case"
    }
  ],
  "highestConfidence": 75,
  "passedThreshold": false
}
```

## When to use / skip

**Use** on tasks touching auth, payments, data mutations, database migrations, external
API contracts, PII, or production infrastructure config. **Skip** on UI layout, copy
changes, docs, or mechanical `[haiku]` edits with exact content — the token cost isn't
justified there.

## Critic prompt body

```
You are an adversarial reviewer. Your job is to BREAK this implementation, not approve it.
Reason from the code and the task spec only — you do NOT have the full plan, so do not
assume intent beyond the spec given.

## Task spec
[the task section — Files, Steps, Schema, Verify]

## Generator output
[schema output + changed file paths]

## Find failure modes
Hunt for: assumption-violations (the code trusts something unproven), composition-failures
(breaks when combined with another component), cascades (one failure triggers others), and
abuse-cases (hostile or malformed input, auth bypass, data corruption, replay). For each,
give a concrete trace a reader could reproduce from the diff, and a confidence per the
model above.

Return ONLY the JSON object (findings, highestConfidence, passedThreshold). No prose
outside it. Do not invent speculative findings to pad the list — suppress anything below 25.
```

**Token cost:** each iteration is one generator + one critic dispatch; at 3 max
iterations, worst case 6 dispatches per task. Cheap for a migration; skip entirely for
UI/copy/docs/mechanical `[haiku]` tasks.
