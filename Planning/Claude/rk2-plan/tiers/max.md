# Max tier — Opus team-lead + persistent team

Mission-critical or large-scale builds with real concurrency. The leap from pro is **topology, not just rigor**: pro is a star with ephemeral spokes; max is a persistent team — the lead runs `TeamCreate`, spawns a named roster, populates a shared `TaskList` whose `blockedBy` edges encode the execution DAG, and teammates **self-claim unblocked tasks in parallel** (worktree-isolated), coordinating peer-to-peer via `SendMessage`. The critic and reviewers are *standing team members*. **Confirm with the user before planning at this tier** — a team is the one expensive commitment in the family.

## Step down to pro when

Single coherent workstream, no real parallelism, no standing-team benefit — even hard, safety-critical work. The signal you're in max is a persistent multi-agent team doing genuinely concurrent work.

## Max-specific authoring

**Decompose into workstreams and a dependency DAG — the decomposition IS the plan.** Which tasks are independent (no edge → immediately claimable, run in parallel), which block which (`**BlockedBy:**`), and which roster role owns each. Never leave a real dependency implicit — a teammate will claim the task too early.

**Every task carries, in addition to its tier tag:**
- `**Owner role:** implementer | adversarial-critic | spec-reviewer | quality-reviewer | integration-tester`
- `**BlockedBy:** <task IDs>` (or `—` for independent)
- `**Adversarial:** yes` on safety-critical tasks (auth, payments, data mutations, migrations, external API contracts, PII, prod infra), with threshold + max iterations.

**Define the roster in the plan.** Typical shape — trim/grow to fit, always keep lead + ≥1 implementer + the three review/critic roles:

| Name | Tier | Responsibility |
|---|---|---|
| `team-lead` | Opus | Gates + lifecycle; writes no feature code (only verbatim files); board, commits, promotion, shutdown |
| `impl-a`, `impl-b`, … | sonnet/haiku | Self-claim unblocked tasks, each in its own worktree — scale count to parallel workstreams |
| `adversarial-critic` | Opus/sonnet | Pre-critiques the plan, then critiques `Adversarial: yes` task outputs |
| `spec-reviewer` | sonnet | Standing spec-compliance review per task |
| `quality-reviewer` | sonnet | Standing code-quality review after spec passes |
| `integration-tester` | sonnet | Cross-workstream integration gates; drives `Monitor` for long suites/deploys |

**Plan pre-critique:** the plan doc itself gets one adversarial pass (the standing critic) before Phase 1 code — a flawed DAG caught at Phase 0 is enormously cheaper than at Phase 3. The template's Phase 0 includes this; keep it.

**Worktree isolation:** parallel implementers never share a working tree (`isolation:"worktree"`); integration happens at gate barriers, not continuously. Two tasks touching the same files in one phase is a plan error — serialize with a `BlockedBy` edge or move phases.

**Long-running gates** run under `Monitor` with a filter that emits on **success AND failure signatures** (e.g. `-E "PASS|FAIL|Error|Traceback|Killed"`) — silence must never read as success.

**Dynamic board:** teammates may `TaskCreate` discovered work mid-build (with owner role + `BlockedBy`, under the nearest gate). Scope-expanding discoveries (new dependency, cost, changed scope) are never self-added — STOP and ask the human.

## Common max mistakes

- Max on a single serial workstream → that's pro.
- Implicit dependencies (no `BlockedBy` edge) → premature claims.
- `Monitor` that only greps success → a crashloop looks like "still running".
- Critic given the full plan doc → confirmation bias; it gets task spec + output + changed files only.
- No plan pre-critique → the cheapest bug-catch of the build, skipped.

## Run config values for this tier

- `Tier: max`
- No Workflow-authorization line — the team topology replaces it.
