# Adversarial Critic — standing-teammate role card

In `rk-plan-max` the `adversarial-critic` is a **standing team member** with two jobs:

1. **Plan pre-critique (once, before Phase 1 code):** read the plan doc + the `BlockedBy` DAG and
   surface failure modes in the *decomposition itself* — missing edges, parallel tasks that secretly
   share state, an unprobed risky assumption, a gate that can't actually fail. The team-lead resolves
   blocking findings before unblocking Phase 1. This is the cheapest place to catch a bad plan.
2. **Per-task critique (safety-critical tasks only):** for tasks tagged `Adversarial: yes` (auth,
   payments, data mutations, migrations, external API contracts, PII, production infra), run a
   generate → critique → regenerate loop with the implementer.

Spawn once at Phase 0 with `team_name` + `name: adversarial-critic` (Opus or strong Sonnet).

## Per-task loop (the team-lead drives it)

```
Implementer produces output → team-lead SendMessages the critic (task spec + output + changed files,
NOT the full plan doc) → critic returns findings with confidence → gate check:
  - Any finding ≥ Threshold  → bounce the implementer with the findings as context → regenerate
  - All findings < Threshold → pass
  - Max iterations reached with unresolved findings → STOP, surface to the human in the plan doc
```

**Defaults:** `Threshold: 75`, `Max iterations: 3`. The critic receives the task description, the
implementer's schema output, and the changed file paths — **never the full plan doc** (prevents
plan-confirmation bias).

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

## Confidence model

| Score | Meaning | Action |
|-------|---------|--------|
| 100 | Mechanically constructible — every step verifiable from the diff | Block — bounce implementer |
| 75 | Concrete, reproducible scenario — one step may depend on unconfirmed conditions | Block — bounce implementer |
| 50 | Plausible but one step can't be confirmed from code alone | Note in plan doc, do not block |
| <25 | Speculative — requires conditions with no evidence | Suppress |

## Critic prompt body

```
You are an adversarial reviewer. Your job is to BREAK this implementation, not approve it. Reason
from the code and the task spec only — you do NOT have the full plan, so do not assume intent beyond
the spec given.

## Task spec
[the task section — Files, Steps, Schema, Verify]

## Implementer output
[schema output + changed file paths]

## Find failure modes
Hunt for: assumption-violations (the code trusts something unproven), composition-failures (breaks
when combined with another component), cascades (one failure triggers others), and abuse-cases
(hostile or malformed input, auth bypass, data corruption, replay). For each, give a concrete trace
a reader could reproduce from the diff, and a confidence per the model above.

Return ONLY the JSON object (findings, highestConfidence, passedThreshold). No prose outside it.
Do not invent speculative findings to pad the list — suppress anything below 25.
```

**Token cost:** each iteration is one implementer + one critic turn; at 3 max iterations, worst case
6 turns per safety-critical task. Cheap for a migration; skip entirely for UI/copy/docs/mechanical
`[haiku]` tasks.
