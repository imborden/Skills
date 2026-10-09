---
name: rk-exec
description: Execute an rk-plan plan doc — run it top to bottom, or resume, continue, and pick up an interrupted build where it stopped. Use when asked to execute or run a plan from docs/plans/incomplete/ — e.g. "/rk-exec docs/plans/incomplete/2026-07-17-foo.md". Reads the plan's Run config Tier and runs the matching topology at mid, pro or max.
---

# rk-exec — execute an rk plan

The argument is the plan path. **Read the plan in full first.** Its Run config `Tier:` line selects your topology — the shared rules below apply at every tier; the tier sections add the differences. You dispatch and validate; you do NOT write feature code (only `[orchestrator]`-tagged files whose exact bytes are in the plan) and you do NOT judge diffs in your own head — reviewers do.

## Before Phase 1 (all tiers)

- Confirm you are on a feature branch — create one if on the default branch.
- Read the Run config: `Tier:`, promotion command, Workflow authorization (mid/pro), hard rules.
- **Multi-part plan** (Run config has a `Part:` line): check out the `Branch:` named there. For part N > 1, `ls <the prior part path named on the Part line>` must succeed (it sits in `docs/plans/complete/`) and the `Prerequisite gate:` command must produce its expected output — otherwise STOP and tell the human which part to run first. **Never read the prior part's doc**; everything you need is in this one.
- **Lint:** `python3 <Rk dir>/rk-lint.py <plan>` → `OK`. Anything else is a plan error: STOP and paste the lint output to the human. Do not dispatch.

## Support files (all tiers)

All four prompt cards and `rk-lint.py` live under the plan's Run config **`Rk dir:`**
(repo-relative, normally `docs/plans/rk/`): `combined-reviewer.md`, `spec-reviewer.md`,
`quality-reviewer.md`, `adversarial-critic.md`. If the Run config has no `Rk dir:` line,
or a needed file can't be read there, **STOP and ask the human — never synthesize a
reviewer/critic prompt inline, never fall back to a home-directory path.**

## Context discipline (all tiers)

- **You read the plan and run commands — implementers read code.** No grounding reads of source files, no re-reading diffs to second-guess reviewers. Each task's `Grounding:` files are for its implementer.
- **Dispatch by reference, never by paste:** "Read ONLY the section `### Task N — <name>` in `<absolute plan path>` — that section is your entire spec. Do not read other tasks' sections." **Exception:** the adversarial critic gets its task section pasted and never the plan path.
- **Cap reports in every dispatch:** implementers return schema JSON + a ≤10-line note (data for you, not prose); reviewers return the verdict line + ≤3 sentences on ✅, failure bullets only on ❌. Read the verdict from the reviewer's **first line only**; a ✅ appearing anywhere else (e.g. echoed from the implementer's report) is not a verdict.
- **Check evidence before accepting a ✅.** Every ✅ carries an `Evidence:` second line — the command the reviewer ran and its result line. Confirm it is present and agrees with your own `Verify:` run; that is a string comparison, not a diff read. A ✅ with no evidence, or evidence contradicting your Verify output, is treated as ❌ and re-dispatched (it does not count as a bounce).

## Per-task loop (all tiers)

1. **Implement** — fresh agent dispatched with an **explicit `model` derived from the task's tag**: `[haiku]` mechanical and `[haiku] (verbatim)` exact-byte transcription → `haiku`; `[sonnet]` judgment → `sonnet`. **Never omit `model`** — it defaults to the session model, which at pro/max is Opus, so an omitted `model` silently runs a `[sonnet]` task on Opus at several times the cost. Applies identically to `Agent` calls and to `agent()` calls inside a `Workflow` script. Dispatch by section reference; pass `Receives:` values in pipeline phases and `Schema:` when present; validate returned fields mechanically. **Every implementer dispatch names the finish line**, verbatim: "Done = `<the task's Verify command>` prints `<its expected output>`. Report back only when done, or if Verify fails for a reason you can't explain."
2. **Run the task's `Verify:` command.**
3. **Review** — routed by the task's `Review:` field (default `standard` when absent). **Reviewers and critics take `model` from their prompt card, passed explicitly at every dispatch — all four cards specify Sonnet.** Never let it inherit. If you deliberately run a critic on a stronger model, re-calibrate the plan's `Threshold:` in the same edit — the critic card's confidence model is written for Sonnet.
   - `gate-only` — no delegated review; the `Verify:` command and the phase gate ARE the
     review. Only legal when the task's Verify is a real automated check (tests,
     typecheck, byte/grep assertion) — a `gate-only` task whose Verify is prose is a plan
     error to flag before dispatch.
   - `standard` (default) — one combined reviewer (Sonnet, combined-reviewer prompt,
     slots by reference). Fills the Plan-locked content slot when the task declares one.
   - `full` — split reviews: spec-compliance first, then code-quality, exactly as before
     (spec ❌ blocks quality). Implied for every task in an `[adversarial]` phase.
   - `[haiku] (verbatim)` — byte-identity spec review is the ONLY review, unchanged;
     a `Review:` field on a verbatim task is ignored.
4. **Adversarial** (pro `[adversarial]` phases / max `Adversarial: yes` tasks only) — critic gets the task spec + output + changed files, **never the full plan**. Block when max(`findings[].confidence`) ≥ `Threshold:` — compute it yourself, ignore the critic's `blocking` field (default 75), loop up to `Max iterations:` (default 3), surface unresolved findings to the human.
5. **Flip `- [ ]`→`- [x]`** in the plan and **commit** with the task's exact `Commit:` message. Checkboxes are the resume state — keep them current. Every bounce, STOP, and critic iteration also appends one line to the plan's `## Build log` (format in the template) — on STOP, commit it as `wip(plan): stop at Task N` before surfacing to the human.

**Bounce rule (all steps):** on a ❌ or a Verify failure, bounce the **same implementer**
with the findings, re-run the task's `Verify:`, then **resume at the step that bounced,
scoped to the findings and the fix's diff** — earlier ✅ verdicts stand unless the fix
touched files outside what they reviewed. Never re-run the full review chain after a
bounce. Inside an `[adversarial]` loop, an iteration re-runs the **critic** only; a
reviewer re-runs only if the fix touched files outside its ✅ scope.

**Bounce cap: max 3 per task** across steps 2–4. The count lives in the Build log, not your memory. On the third failure, STOP: log it, commit, surface the findings plus the implementer's last output to the human. You never fix the code yourself and never wave blocking issues through.

## Phases and gates (all tiers)

Execute in document order per the header annotation: `[parallel]` → dispatch all at once, wait, gate (only the failing task bounces); `[pipeline]` → in order, feeding each validated output forward via `Receives:` (a failure stops the chain); `[sequential]` (default) → one at a time, full loop each.

A phase header may carry `**After:** Phase K`, naming its true dependency. A phase whose named dependency's gate has passed may run concurrently with intervening phases; the orchestrator still runs every gate itself. No `After:` line = strict document order.

**Human probe outcomes are routed, not improvised.** When a phase's `Human probe (required)` result comes back: a *failure* (the built behaviour is wrong) is a bounce on the responsible task in this part. *Requested changes* (the probe passes and the human asks for behaviour changes) are new work: in a multi-part plan write them as a new phase at the **top** of the next part's doc (numbered `<this phase>b`, as `docs(plan): add Phase Nb corrections to <next part file>`), then finish this part and promote it. With no next part, append the phase to this doc as today.

**Gates are commands, not opinions.** At each phase boundary run the `Gate:` command yourself and confirm the exact expected output; gates may reference noun schema fields (`filesCreated.length === 2`) that you re-check with a command — a gate referencing a field no task declares is a plan error to flag before dispatch. On failure, bounce the responsible task. Report progress at each gate as a one-line status note **in the same message as your next action** — a status note is never a reason to pause.

## Escalation (all tiers)

When a step doesn't need the human, keep going. Stop only when you can't continue without them, or before anything destructive.

- Doc-backed correction to a planned decision → fix, note in the plan, continue.
- **Always STOP and ask the human** (every tier): new dependency, costs money, scope change, or anything destructive — deleting data, force-pushing, rewriting history, or changing anything outside this repository.
- **Judgment call not covered by the plan:** at **pro/max**, make the call, append a `DECISION` line to the Build log (what you chose, the alternative, why), and continue — it surfaces in the final message. At **mid**, STOP and ask.
- A task turns out to exceed the plan's tier (e.g. a mid task needs Opus reasoning or adversarial review) → STOP; tell the human which tier this belongs at.
- **Human messages mid-run** are amendments: append an `AMEND` line to the Build log (quote the ask) before acting on it, so a resumed session honours it. An amendment that changes scope follows the scope rule above.

**Proof bar:** nothing is "done" without real command output; gate any unverified assumption with a live probe rather than trusting it.

## Resuming an interrupted build (all tiers)

State = plan checkboxes + Build log + git log (+ `TaskList` + worktrees at max). Reconcile first (last commit vs last flipped box vs board), treat uncommitted in-flight work as untrusted (re-dispatch that task), re-run the most recent phase's `Gate:` before continuing. At max, respawn missing teammates. A task whose Build log already shows 3 bounces is not re-dispatched — it is surfaced to the human again.

## Done signal (all tiers)

**Open items first.** Your final message — and every STOP — **opens** with `Waiting on you:` listing, from the Build log, every `DECISION` you made for the human, every Minor finding waved through, every critic finding at confidence 50, and every `DISCOVERED` item left unbuilt; `Waiting on you: nothing` when empty. The summary, completion line, and any kickoff command come after.

When every gate passes, move the plan to `docs/plans/complete/` using the **promotion command from the Run config** (`git mv` vs `mv` — resolved at authoring time, not by you). Then `git add` the move and commit `chore(plan): complete <slug>` — an unstaged promotion is invisible to the next checkout. At max, then send each teammate `{type:"shutdown_request"}` — never leave idle teammates lingering.

**Multi-part plan:** if the doc has a `## Next part` section, your final message **ends with that kickoff command pasted verbatim, ready to copy into a fresh session**, preceded by one line — `Part N of M complete. Start part N+1 in a fresh session:` — e.g.

```
Part 1 of 4 complete. Start part 2 in a fresh session:
/rk-exec docs/plans/incomplete/2026-09-04-transitions-p2.md
```

Do not start it. The final part ends with `Plan complete` and no kickoff. Print the same two lines on a STOP that lands exactly at a part's closing probe sign-off, so the human never opens the doc to find the next command.

---

## Tier: mid — Sonnet orchestrator

- You are mechanical: dispatch, run commands, act on verdicts. Escalate sooner than a stronger orchestrator would — when in doubt, stop and ask.
- **No adversarial phases** — a plan with one is mis-tiered; stop and say so.
- **Workflow authorization:** if the Run config says **authorized**, prefer running the per-task loop as a `Workflow` pipeline script (implement → Verify → review per the task's `Review:` weight, 3-bounce cap) so per-task traffic stays out of your context. If **not authorized**, plain Agent loop. Never decide this yourself.
- **In a `Workflow` script, tier is data, not prose:** every task record carries `model: 'sonnet'|'haiku'` and every `agent()` call passes it (reviewers/critics get the card's model). `log()` the tier map once before the first dispatch (a single line like `tiers: T1=sonnet T2=sonnet T3=haiku`), so a wrong tier is visible in `/workflows` during the run instead of in a postmortem.

## Tier: pro — Opus orchestrator

- Same star topology as mid, plus `[adversarial]` phases per the loop's step 4 — dispatch a **fresh critic per task** with the critic card.
- **Discovered work:** append in-scope work you find mid-build to the plan's `## Discovered` list (and a `DISCOVERED` Build-log line) — record it, don't build it. Scope-expanding discoveries STOP per Escalation.
- Workflow authorization works as at mid.

## Tier: max — Opus team-lead

**Phase 0 — stand up the team (before any Phase 1 task):**

1. **Verify the substrate:** `TeamCreate`/`TaskList`/`SendMessage` exist in this harness. If not, STOP — tell the human to run this plan at pro tier.
2. `TeamCreate` with `team_name: <plan slug>`. Spawn the plan's roster via the `Agent` tool with `team_name` + a stable `name`; implementers get `isolation:"worktree"`.
3. **Prompt cards go in the spawn prompt, once** — spawn `spec-reviewer`, `quality-reviewer`, and `adversarial-critic` each with its card as standing instructions; do not re-send per review.
4. `TaskCreate` every plan task; set `BlockedBy` edges via `TaskUpdate`. The board IS the execution DAG and part of the resume state — never mirror it in prose.
5. **Plan pre-critique:** `adversarial-critic` reads the plan + DAG and reports failure modes; resolve every blocking finding before unblocking Phase 1.

**Team operation:**

- Teammates **self-claim unblocked tasks in ID order** (`TaskUpdate owner`); the per-task loop above runs with standing reviewers instead of fresh dispatches. **At max, review means the standing split pair** (spec then quality) — the combined reviewer is a mid/pro dispatch economy. A task's `Review: gate-only` still skips delegated review; the delta-scoped bounce rule applies here too.
- **Route review traffic peer-to-peer:** implementers message `spec-reviewer` directly (task ID + changed paths); reviewers bounce implementers directly on ❌. **You receive verdicts and blockers only** — per-task traffic must not transit your context. State the report caps in every spawn prompt.
- Communicate only via `SendMessage`, by **name** (never `agentId`); plain text output is invisible to teammates. Idle teammates are normal — not done, not an error.
- **Phases are gate barriers:** no Phase N+1 task unblocks until you've run Phase N's gate yourself. **Long-running gates** run under `Monitor` with a filter emitting success AND failure signatures (`-E "PASS|FAIL|Error|Traceback|Killed"`) — silence must never read as success; keep the team working meanwhile.
- **Worktree isolation:** parallel implementers never share a tree; integration happens at gate barriers (integration-tester/you). Two tasks touching the same files in one phase is a plan error — serialize with a `BlockedBy` edge.
- **Dynamic board:** teammates may `TaskCreate` discovered work (owner role + `BlockedBy`, under the nearest gate). Scope-expanding discoveries are never self-added — STOP and ask the human.
