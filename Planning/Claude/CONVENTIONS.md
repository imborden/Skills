# rk-plan family — shared invariants

Any edit to one tier gets checked against this list for the other tiers
(`rk-plan`, `rk-plan-pro`, `rk-plan-max`, `rk-plan-pro-cotal`). The reviewer prompts are
deliberately duplicated per tier with substrate-specific wording — a fix to one copy almost
always belongs in the others. This list exists because that backporting has been missed before.

## Invariants every tier must hold

1. **Exact-command gates only.** A `**Gate:**` is a runnable command + exact expected result
   (string match, count, exit code, schema-field assertion). Prose gates are banned.
2. **Env facts resolved at authoring time.** `git check-ignore docs/` → `mv` vs `git mv` for
   plan promotion; cwd-safe commands (`npm --prefix <app>`); prompt cards referenced by
   **absolute paths**, never bare filenames, with the STOP-don't-improvise rule ("if a card
   can't be read at its path, STOP and ask — never synthesize one inline").
3. **Bounce caps.** Every review/Verify loop caps at **3 bounces per task**, then STOP and
   surface findings + the implementer's position to the human. Adversarial loops additionally
   honor `**Max iterations:**`. No unbounded loops anywhere.
4. **Plan-locked content.** Tasks may carry a `**Plan-locked content:**` field; the
   code-quality reviewer prompt has a matching slot and must not flag locked values as
   defects. (In `rk-plan`, `[haiku] (verbatim)` tasks skip quality review entirely.)
5. **Checkboxes are the resume state.** Flip `- [ ]`→`- [x]` and commit **per task** — never
   batch bookkeeping per phase. Every handoff carries a "**If resuming an interrupted
   build**" block: reconcile checkboxes vs git log (plus board/worktrees/workspaces at team
   tiers), treat uncommitted in-flight work as untrusted, re-run the last phase's gate.
6. **Branch-first.** The handoff tells the executor to confirm/create a feature branch before
   Phase 1.
7. **Tier tags:** `[haiku]` / `[sonnet]` / `[orchestrator]` (plus `[haiku] (verbatim)` in
   `rk-plan` only). There is no `[orchestrator/opus]` and no `[opus]`.
8. **Critic isolation.** The adversarial critic gets the task spec + output + changed files
   (or real `cmux diff`) — never the full plan doc. Confidence model: 100/75 block, 50 note,
   <25 suppress. Defaults: threshold 75, max iterations 3.
9. **No phantom tools/agents.** Reference only primitives that exist in the executing harness,
   or tell the lead to verify them at runtime (`TeamCreate` check in max Phase 0, `cmux docs
   api` in cotal). Never name an agent type as a default (`ce-*` was one).
10. **Plan lifecycle:** `docs/plans/incomplete/YYYY-MM-DD-<slug>.md` → `complete/` on
    all-gates-pass, using the promotion command resolved per invariant 2.
11. **Authoring session STOPS** after writing the plan + echoing the handoff. It never builds,
    spawns, or dispatches.
12. **Monitor/watch commands match success AND failure signatures** — silence must never read
    as success.
13. **Parts.** A plan may be divided into part docs (`…-p<N>.md`) at structural joints only — a
    behaviour-review human probe, an independent workstream, a fully-green gate — never by task
    count at pro/max. Each part is self-contained (the executor reads one doc), numbering is
    continuous, part N≥2 declares the prior part + a `Prerequisite gate:`, non-final parts end
    with `## Next part`, and the executor's last message pastes the next part's kickoff.

## Install

Installed skills in `~/.claude/skills/` are **symlinks** into this repo — edit here, never in
`~/.claude/skills/`. If a symlink breaks (repo moved), re-link; don't re-copy.
