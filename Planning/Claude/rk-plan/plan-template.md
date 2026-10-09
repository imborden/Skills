# Plan — <feature title>

> Save as `docs/plans/incomplete/YYYY-MM-DD-<kebab-slug>.md`. The executor moves this
> file to `docs/plans/complete/` when every gate passes.
>
> One template for all tiers — delete the blocks marked for tiers you're not using.
> Multi-part plan (see SKILL.md *Divide into parts*)? Save as `…-<kebab-slug>-p<N>.md`, keep the
> MULTI-PART ONLY lines, number phases/tasks continuously across parts.

## Context

<!-- Part ≥ 2: one paragraph — "Part N of M. p(N-1) delivered …; this part delivers …" — plus this
     part's required inputs. The full why/scope/assumptions live in p1. -->
Why this change is being made — the problem/need, what prompted it, the intended
outcome. State the confirmed **scope** (what's in / explicitly out). 2–5 sentences.

**Required inputs (from the human):** test data, URLs, credentials, sample files — name
them so the build can't stall mid-run waiting on them.
**Unverified assumptions:** anything the build rests on but hasn't been confirmed, each with
where you looked. The riskiest ones get a live probe in Phase 1's gate.

## Architecture (optional at mid/pro — 1 paragraph; REQUIRED at max)

The shape of the solution and the key decision(s). At **max**, also the workstream
decomposition: which streams are independent vs. dependent — this drives the roster
and the `BlockedBy` DAG.

<!-- MAX ONLY — delete for mid/pro -->
## Roster

| Name | Tier | Responsibility |
|---|---|---|
| `team-lead` | Opus | Gates + lifecycle; no feature code; promotion + shutdown on done |
| `impl-a` | sonnet | Claims and builds tasks in its own worktree |
| `impl-b` | sonnet/haiku | Scale implementer count to parallel workstreams |
| `adversarial-critic` | Opus/sonnet | Plan pre-critique + safety-critical task critique |
| `spec-reviewer` | sonnet | Spec-compliance review per task |
| `quality-reviewer` | sonnet | Code-quality review after spec passes |
| `integration-tester` | sonnet | Cross-workstream gates; `Monitor` for long suites |
<!-- END MAX ONLY -->

## Run config

> Execute with **`/rk-exec <this file's repo-relative path>`** in a fresh session.
> The `rk-exec` skill carries the whole execution protocol — do NOT restate it here.
> This block holds only the facts rk-exec reads from the plan.

- **Tier:** `<mid | pro | max>`
- **Rk dir:** `docs/plans/rk` — prompt cards + lint, copied from the skill at authoring time
- **Promotion command:** `<git mv | mv — resolved at authoring time via 'git check-ignore docs/'>`
- **Workflow authorization:** `<"authorized" | "not authorized" — the human's answer at planning time; mid/pro only, delete at max>`
- **Hard rules:** `<project-specific invariants agents must not violate>`
<!-- MULTI-PART ONLY — delete for a single-part plan -->
- **Part:** `<N of M>` — requires `docs/plans/complete/YYYY-MM-DD-<slug>-p<N-1>.md` <!-- p1: `1 of M`, no path -->
- **Branch:** `feat/<slug>` <!-- every part; p1 creates it, later parts check it out -->
- **Prerequisite gate:** `<the prior part's closing Gate command, copied verbatim>` → <its expected output> <!-- p≥2 only -->
<!-- END MULTI-PART ONLY -->

Tier legend: `[haiku]` mechanical/fully-specified · `[haiku] (verbatim)` dispatched
exact-byte transcription (byte-identity spec review only) · `[sonnet]` judgment/multi-file
· `[orchestrator]` verbatim writes the executor does itself. Phase annotations:
`[parallel]` / `[pipeline]` (`Receives:` required) / `[sequential]` (default);
`[adversarial]` (pro/max only) composes with `[parallel]`/`[sequential]`, never `[pipeline]`.

---

<!-- MAX ONLY — delete for mid/pro -->
## Phase 0 — Team setup [orchestrator]

**Gate:** `ToolSearch "select:TeamCreate,TaskList,TaskCreate,TaskUpdate,SendMessage"` → all five schemas returned (none missing)
AND for each roster name N: `SendMessage {to: N, message: "ping"}` → a reply containing `pong` within the team's first turn
AND `TaskList` → one row per `### Task` heading below, each non-root row showing its `BlockedBy` ids
AND the pre-critique JSON has `blocking: false`

- [ ] Verify the substrate with the ToolSearch call above. If not, STOP — run this plan at pro tier instead.
- [ ] `TeamCreate` with `team_name: <slug>`; spawn the roster (implementers with `isolation:"worktree"`); reviewers/critic get their prompt card in the spawn prompt, once; each spawn prompt ends with "reply `pong` to any message that is exactly `ping`".
- [ ] `TaskCreate` every task below; set `BlockedBy` edges via `TaskUpdate`.
- [ ] **Plan pre-critique:** `adversarial-critic` reads this plan + DAG, reports failure modes; resolve blocking findings before unblocking Phase 1.
<!-- END MAX ONLY -->

---

## Phase 1 — <title> [parallel|pipeline|sequential]

**Gate:** `<command>` → <exact expected output: string match / count / exit code>
<!-- MUST be runnable with an exact expected result — no prose gates.
     Output must be DETERMINISTIC: normalize away timings, paths and run-varying
     counts inside the command (`| grep -cF 'Build complete!'` → `1`), never assert
     a bare string against a line that carries a variable suffix.
     May reference noun schema fields: AND filesCreated.length >= 2 (never implementer-set booleans)
     Make this gate exercise the riskiest unverified assumption (one real call/query).
     MAX, long-running gates: run under Monitor emitting success AND failure signals:
     Monitor: `npm test 2>&1 | grep -E --line-buffered "PASS|FAIL|Error|Killed"` -->

<!-- Independent of the previous phase? Declare the true dependency so the executor can
     overlap: **After:** Phase K -->

<!-- PRO/MAX adversarial phases add after the Gate:
**Threshold:** 75
**Max iterations:** 3
**Human probe (optional):** <what the human runs live, and when — required when no
automated gate can touch the real system> -->

### Task 1 — <name> `[haiku|haiku (verbatim)|sonnet]`
<!-- MAX ONLY: every task also carries
**Owner role:** implementer
**BlockedBy:** —   (task IDs, or — for immediately claimable)
and safety-critical tasks add: **Adversarial:** yes — threshold 75, max iterations 3 -->
**Files:** Create/Modify `<exact paths>`
**Grounding:** `<files the implementer reads before starting — the executor never reads these>`
**Schema:** `{ "filesCreated": ["string"], "exportedSymbols": ["string"] }`
<!-- Schema optional but valued; keep flat (max 2 levels). -->
**Review:** <gate-only | standard | full — omit for standard; gate-only only when Verify is a real automated check>

<!-- [pipeline] phases: every task except the first MUST include
**Receives:** Task N output — `{ "fieldName": "value" }` -->

<!-- Non-verbatim task hard-coding plan-mandated values (fixed names, hex literals,
     intentional ordering)? List them for the quality reviewer's locked-content slot:
**Plan-locked content:** `<exact names/literals/ordering the reviewer must NOT flag>` -->

- [ ] Step 1: <for haiku: exact content/diff + numbered steps>
- [ ] Step 2: <exact command to run> → <exact expected output>

<Haiku tasks include: exact paths, exact code or a precise diff, exact commands +
expected output, and a STOP condition — "if anything differs, stop and report, do
not improvise.">

**Verify:** `<runnable command>` → <exact expected output: string match / count / exit code>
**Commit:** `<type(scope): message>`

### Task 2 — <name> `[sonnet]`
**Files:** Create/Modify `<exact paths>`
**Schema:** `{ "fieldName": "type" }`

... (sonnet tasks may state intent + constraints rather than verbatim code, but scope
must stay within Sonnet's reach — no open-ended design calls.)

**Verify:** `<runnable command>` → <exact expected output: string match / count / exit code>
**Commit:** `<type(scope): message>`

---

## Phase 2 — <title> [parallel|pipeline|sequential]

**Gate:** `<command>` → <exact expected output>

### Task 3 — ...

---

## Files

| Action | Path |
|---|---|
| Create/Modify | `<path>` (Task N) |

**Reuse (don't reinvent):** existing utilities/patterns found during discovery, with paths.

---

## Verification (end-to-end)

How to confirm the whole thing works: exact commands and expected output. Keep it
runnable — the executor runs this, it doesn't eyeball. In a multi-part plan this covers this
part only; the last part's section is the whole-build check.

---

<!-- MULTI-PART ONLY, every part except the last — delete otherwise -->
## Next part

`/rk-exec docs/plans/incomplete/YYYY-MM-DD-<slug>-p<N+1>.md`
<!-- END MULTI-PART ONLY -->

---

<!-- PRO ONLY — delete for mid/max -->
## Discovered

<!-- Executor-owned. In-scope work found mid-build, recorded not built — one line each:
     - Task N | <what was found> | <why it matters>
     Scope-expanding discoveries are never listed here; the executor STOPs instead. -->
<!-- END PRO ONLY -->

---

## Build log

<!-- Executor-owned. One line per event, append-only, committed with the task (or as a
     WIP commit on STOP). Format:
     - YYYY-MM-DD HH:MM | Task N | bounce k/3 | <step that bounced> | <one-line findings>
     - YYYY-MM-DD HH:MM | Task N | STOP | <reason> | <what the human must decide>
     - YYYY-MM-DD HH:MM | Task N | critic iter k/3 | highest=NN | <finding ≥50 in one line>
     - YYYY-MM-DD HH:MM | Task N | DECISION | <what was chosen> | <alternative + why>   (pro/max)
     - YYYY-MM-DD HH:MM | Task N | AMEND | "<human's mid-run message, quoted>" | <how it was applied>
     - YYYY-MM-DD HH:MM | Task N | DISCOVERED | <item added to ## Discovered>   (pro)
     Resume reads this before dispatching anything. -->
