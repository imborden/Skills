# Adversarial Critic

**Delivery by tier:**
- **pro** — dispatched **fresh per `[adversarial]` task** by the Opus orchestrator; hand this card to the critic at dispatch. No standing critic, no plan pre-critique at pro.
- **max** — a **standing teammate** spawned once at Phase 0 with this card, with two jobs: (1) **plan pre-critique**, once, before Phase 1 code — read the plan doc + `BlockedBy` DAG and surface failure modes in the decomposition itself (missing edges, parallel tasks that secretly share state, an unprobed risky assumption, a gate that can't actually fail); the lead resolves blocking findings before unblocking Phase 1. (2) **Per-task critique** on tasks marked `Adversarial: yes`.

If the card can't be read at its path, STOP and ask the human — never synthesize one inline.

## The loop (executor/lead-driven, per task)

```
Implementer produces output → critic gets (task spec + output + changed file paths —
NOT the full plan doc) → critic returns findings with confidence → gate check:
  - Any finding ≥ Threshold        → bounce the implementer with findings → regenerate
  - All findings < Threshold       → pass
  - Max iterations hit, unresolved → STOP, log to the plan's Build log, surface to the human
```

**Defaults:** `Threshold: 75`, `Max iterations: 3`. The critic never sees the full plan doc (prevents plan-confirmation bias).

## Confidence model

| Score | Meaning | Action |
|-------|---------|--------|
| 100 | Mechanically constructible — every step verifiable from the diff | Block — bounce |
| 75 | Concrete, reproducible scenario — one step may depend on unconfirmed conditions | Block — bounce |
| 50 | Plausible but one step can't be confirmed from code alone | Append to Build log, don't block |
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

**Use** on tasks touching auth, payments, data mutations, database migrations, external API contracts, PII, or production infra. **Skip** on UI layout, copy, docs, or mechanical `[haiku]` edits with exact content — worst case is 6 dispatches per task (3 iterations × generator + critic); the cost isn't justified there.

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
