# Plan — rk2 skill hardening

> Execute **directly** in a fresh session (`claude` in `/Users/jeffborden/Documents/Coding/_Skills`),
> not via `/rk2-exec` — this plan edits rk2-exec itself. Work top to bottom; run every
> `Verify:` and `Gate:` literally; commit per task with the exact message. Do not batch.

## Context

An audit of `rk2-plan` / `rk2-exec` found that nearly every load-bearing rule is prose
only, the executor hardcodes `/Users/jeffborden/.claude/skills/...` prompt paths, gates
can pass on implementer self-report, STOPs leave no durable state, and the canonical
copies live in `~/.claude/skills/` outside the public repo (`Documents/Coding/_Skills`,
github.com/imborden/Skills) while a stale copy sits in `Documents/skills/`.

**Scope (in):** relocate rk2-* into the repo + symlink; a lint script that mechanizes the
plan-format rules; template/skill/card edits listed below; description tuning.
**Scope (out):** per-tier example plans, timeouts/cost ceilings, collapsing mid/pro into
one tier, any change to `rk-plan*` file contents.

**Required inputs (from the human):** none for Phases 0–4. Phase 5 (sibling symlink
removal) needs a yes/no.

**Unverified assumptions:** (a) `~/.claude/skills/` entries may be symlinks — true for
every `rk-*` sibling already, so Claude Code resolves them. (b) Python 3.9 at
`/usr/bin/python3` — confirmed. (c) `docs/` is not gitignored in `_Skills` — confirmed
(`git check-ignore docs/` → exit 1), so promotion is `git mv`.

## Run config

- **Repo:** `/Users/jeffborden/Documents/Coding/_Skills` (branch from `main`; the tree
  has unrelated dirty files — `Writing/humanize/*`, `.gitignore`, untracked
  `Planning/Claude/rk-plan-*-auto/`. **Never `git add -A`.** Stage only the paths each
  task names.)
- **Branch:** `feat/rk2-hardening`
- **Canonical skill dir after Phase 0:** `Planning/Claude/rk2-plan/`, `Planning/Claude/rk2-exec/`
- **Promotion command:** `git mv`
- **Hard rules:** edit the installed/canonical copies only (after Phase 0 those are the
  repo paths). Never touch `Documents/skills/` except in Phase 5. Never rewrite a whole
  file when a targeted edit does — these files are read by a model every trigger, keep
  them short. Quoted "anchor" strings below are exact substrings of the current files;
  if an anchor is not found, STOP and report — do not improvise.

---

## Phase 0 — Bring rk2-* into the repo [sequential]

**Gate:** `for s in rk2-plan rk2-exec; do readlink ~/.claude/skills/$s; done` →
```
/Users/jeffborden/Documents/Coding/_Skills/Planning/Claude/rk2-plan
/Users/jeffborden/Documents/Coding/_Skills/Planning/Claude/rk2-exec
```
AND `git -C /Users/jeffborden/Documents/Coding/_Skills ls-files Planning/Claude/rk2-plan Planning/Claude/rk2-exec | wc -l | tr -d ' '` → `10`

### Task 0 — relocate and symlink `[sonnet]`
**Files:** Create `Planning/Claude/rk2-plan/**`, `Planning/Claude/rk2-exec/SKILL.md`; replace
`~/.claude/skills/rk2-plan`, `~/.claude/skills/rk2-exec` with symlinks.

- [ ] `git checkout -b feat/rk2-hardening` from `main`.
- [ ] `cp -R ~/.claude/skills/rk2-plan Planning/Claude/rk2-plan && cp -R ~/.claude/skills/rk2-exec Planning/Claude/rk2-exec`
- [ ] `find Planning/Claude/rk2-plan Planning/Claude/rk2-exec -name .DS_Store -delete`
- [ ] `diff -r ~/.claude/skills/rk2-plan Planning/Claude/rk2-plan` and same for rk2-exec → only `.DS_Store` differences. If any other diff, STOP.
- [ ] `rm -rf ~/.claude/skills/rk2-plan ~/.claude/skills/rk2-exec`
- [ ] `ln -s /Users/jeffborden/Documents/Coding/_Skills/Planning/Claude/rk2-plan ~/.claude/skills/rk2-plan` and same for rk2-exec.
- [ ] `git add Planning/Claude/rk2-plan Planning/Claude/rk2-exec`

**Verify:** `cat ~/.claude/skills/rk2-exec/SKILL.md | head -2 | tail -1` → `name: rk2-exec`
**Commit:** `chore(rk2): move rk2-plan and rk2-exec into repo, symlink from ~/.claude/skills`

---

## Phase 1 — Plan-format contract [sequential]

Everything the lint (Phase 3) will check gets defined here first.

**Gate:** `grep -c 'Build log' Planning/Claude/rk2-plan/plan-template.md` → `2`
AND `grep -c 'testsPassing' Planning/Claude/rk2-plan/SKILL.md Planning/Claude/rk2-plan/plan-template.md Planning/Claude/rk2-exec/SKILL.md | awk -F: '{s+=$2} END {print s}'` → `0`

### Task 1 — Verify gets an expected output `[haiku]`
**Files:** Modify `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-plan/SKILL.md`
**Review:** gate-only

- [ ] In `plan-template.md`, replace both occurrences of the exact line
  `**Verify:** \`<runnable command>\`` with
  `**Verify:** \`<runnable command>\` → <exact expected output: string match / count / exit code>`
- [ ] In `SKILL.md`, find the line `The same rule governs every task \`**Verify:**\` command.` and replace with:
  `The same rule governs every task \`**Verify:**\` line, which has the identical shape: \`command\` → expected. A Verify with no \`→\` expected half is a plan error (the lint rejects it).`

**Verify:** `grep -c 'Verify:\*\* `<runnable command>` →' Planning/Claude/rk2-plan/plan-template.md` → `2`
**Commit:** `feat(rk2-plan): Verify lines carry an exact expected output`

### Task 2 — ban self-reported verdict fields in gates `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/SKILL.md`, `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-exec/SKILL.md`
**Plan-locked content:** the phrase `nouns, not verdicts`

- [ ] `rk2-plan/SKILL.md`, "Gates — exact commands only" section: replace the sentence
  `Gates may reference task schema fields (\`testsPassing === true\`); a gate referencing a field no task declares is a plan error.` with:
  `Gates may reference task schema fields, but only **nouns, not verdicts**: fields the orchestrator can re-derive with \`ls\`, \`grep -c\`, or \`wc -l\` (\`filesCreated\`, \`routeName\`, a count). A pass/fail boolean set by the implementer (\`testsPassing\`) is never a gate input — the gate re-runs the command. A gate referencing a field no task in that phase declares is a plan error.`
- [ ] Same file, gate examples block: delete the line
  `**Gate:** \`npm test\` → 0 failures AND testsPassing === true` and add
  `**Gate:** \`ls src/export/*.ts | wc -l | tr -d ' '\` → \`2\` AND filesCreated.length === 2`
- [ ] Same file, "Schema validation" section: replace `\`boolean\` for pass/fail` with
  `booleans allowed in the return for the executor's own bookkeeping but never referenced by a Gate`.
- [ ] `plan-template.md`: replace `May reference schema fields: AND testsPassing === true AND filesCreated.length >= 2`
  with `May reference noun schema fields: AND filesCreated.length >= 2 (never implementer-set booleans)`.
  Replace the Task 1 `**Schema:** \`{ "filesCreated": ["string"], "testsPassing": "boolean" }\`` with
  `**Schema:** \`{ "filesCreated": ["string"], "exportedSymbols": ["string"] }\``.
- [ ] `rk2-exec/SKILL.md`, "Phases and gates" paragraph: replace `gates may reference schema fields (\`testsPassing === true\`)` with `gates may reference noun schema fields (\`filesCreated.length === 2\`) that you re-check with a command`.

**Verify:** `grep -rn testsPassing Planning/Claude/rk2-plan Planning/Claude/rk2-exec | wc -l | tr -d ' '` → `0`
**Commit:** `feat(rk2): gates may reference noun schema fields only, never implementer verdicts`

### Task 3 — Build log section as durable STOP/bounce state `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-exec/SKILL.md`

- [ ] `plan-template.md`: after the `## Verification (end-to-end)` section (end of file) append:
  ```markdown

  ---

  ## Build log

  <!-- Executor-owned. One line per event, append-only, committed with the task (or as a
       WIP commit on STOP). Format:
       - YYYY-MM-DD HH:MM | Task N | bounce k/3 | <step that bounced> | <one-line findings>
       - YYYY-MM-DD HH:MM | Task N | STOP | <reason> | <what the human must decide>
       - YYYY-MM-DD HH:MM | Task N | critic iter k/3 | highest=NN | <finding ≥50 in one line>
       Resume reads this before dispatching anything. -->
  ```
- [ ] `rk2-exec/SKILL.md`, per-task loop step 5: after `Checkboxes are the resume state — keep them current.` add
  `Every bounce, STOP, and critic iteration also appends one line to the plan's \`## Build log\` (format in the template) — on STOP, commit it as \`wip(plan): stop at Task N\` before surfacing to the human.`
- [ ] Same file, "Bounce cap" paragraph: replace `On the third failure, STOP and surface the findings plus the implementer's last output to the human.` with
  `The count lives in the Build log, not your memory. On the third failure, STOP: log it, commit, surface the findings plus the implementer's last output to the human.`
- [ ] Same file, "Resuming an interrupted build": replace `State = plan checkboxes + git log` with `State = plan checkboxes + Build log + git log`, and add after `Reconcile first (...)`: `A task whose Build log already shows 3 bounces is not re-dispatched — it is surfaced to the human again.`
- [ ] `prompts/adversarial-critic.md`, loop block: replace `STOP, surface findings to the human in the plan doc` with `STOP, log to the plan's Build log, surface to the human`.
- [ ] Same file, confidence table: replace `Note in plan doc, don't block` with `Append to Build log, don't block`.

**Verify:** `grep -c 'Build log' Planning/Claude/rk2-exec/SKILL.md` → `3`
**Commit:** `feat(rk2): Build log section makes bounces, STOPs and critic iterations resumable`

### Task 4 — prompt cards and lint ship into the repo; Run config names them `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/SKILL.md`, `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-exec/SKILL.md`

- [ ] `rk2-plan/SKILL.md`, "Resolve environment-dependent facts" section: replace the whole
  `- **Prompt paths** are hardcoded in \`rk2-exec\` ...` bullet (through `Run config.`) with:
  `- **rk2 support files:** copy this skill's \`prompts/*.md\` and \`bin/rk2-lint.py\` into \`docs/plans/rk2/\` in the repo if absent or older (\`cp -n\` is not enough — compare with \`diff -q\`). Write \`**Rk2 dir:** docs/plans/rk2\` in Run config. rk2-exec reads cards and lint from there only, so clones and other machines work.`
- [ ] Same file, Step 2 item 3 ("Fill the Run config block"): add `\`Rk2 dir:\`,` after `\`Tier:\`,`.
- [ ] Same file, Step 2: insert a new item between "Fill the Run config block" and "End by printing":
  `**Lint the plan:** \`python3 docs/plans/rk2/rk2-lint.py <plan path>\` → \`OK\`. Fix every reported line; do not print the kickoff until it passes.` (renumber the list).
- [ ] `plan-template.md`, Run config block: after the `**Tier:**` line add
  `- **Rk2 dir:** \`docs/plans/rk2\` — prompt cards + lint, copied from the skill at authoring time`
- [ ] `rk2-exec/SKILL.md`: replace the entire `## Prompt files (absolute paths — all tiers)` section (heading through the `STOP and ask the human — never synthesize` paragraph) with:
  ```markdown
  ## Support files (all tiers)

  All four prompt cards and `rk2-lint.py` live under the plan's Run config **`Rk2 dir:`**
  (repo-relative, normally `docs/plans/rk2/`): `combined-reviewer.md`, `spec-reviewer.md`,
  `quality-reviewer.md`, `adversarial-critic.md`. If the Run config has no `Rk2 dir:` line,
  or a needed file can't be read there, **STOP and ask the human — never synthesize a
  reviewer/critic prompt inline, never fall back to a home-directory path.**
  ```
- [ ] Same file, "Before Phase 1": add a bullet `- **Lint:** \`python3 <Rk2 dir>/rk2-lint.py <plan>\` → \`OK\`. Anything else is a plan error: STOP and paste the lint output to the human. Do not dispatch.`

**Verify:** `grep -c '/Users/jeffborden' Planning/Claude/rk2-exec/SKILL.md` → `0`
**Commit:** `feat(rk2): support files resolve via Run config Rk2 dir, no absolute home paths`

---

## Phase 2 — Card and protocol fixes [parallel]

Tasks 5–9 touch disjoint files.

**Gate:** `grep -c 'blocking' Planning/Claude/rk2-plan/prompts/adversarial-critic.md` → `3`
AND `grep -c 'git status --porcelain' Planning/Claude/rk2-plan/prompts/*.md | awk -F: '{s+=$2} END {print s}'` → `3`
AND `grep -c 'chore(plan): complete' Planning/Claude/rk2-exec/SKILL.md` → `1`

### Task 5 — adversarial critic: pasted spec, `blocking` field, Sonnet `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/prompts/adversarial-critic.md`, `Planning/Claude/rk2-exec/SKILL.md`
**Plan-locked content:** field name `blocking`; title `# Adversarial Critic (Sonnet)`

- [ ] `adversarial-critic.md` line 1: `# Adversarial Critic` → `# Adversarial Critic (Sonnet)`.
- [ ] After `**Defaults:** \`Threshold: 75\`...` paragraph add:
  `**Delivery is by paste, not reference.** This is the one card whose task section is pasted into the prompt — the critic must never receive the plan path.`
- [ ] JSON block: replace `"passedThreshold": false` with `"blocking": false`; after the block add:
  `\`blocking\` = any finding's confidence ≥ Threshold. **The executor recomputes it from \`findings[].confidence\` and ignores the critic's own value.**`
- [ ] Prompt body: `Return ONLY the JSON object (findings, highestConfidence, passedThreshold)` → `Return ONLY the JSON object (findings, highestConfidence, blocking)`.
- [ ] `rk2-exec/SKILL.md`, "Dispatch by reference" bullet: append ` **Exception:** the adversarial critic gets its task section pasted and never the plan path.`
- [ ] Same file, step 4 "Adversarial": replace `Block on findings ≥ \`Threshold:\`` with `Block when max(\`findings[].confidence\`) ≥ \`Threshold:\` — compute it yourself, ignore the critic's \`blocking\` field`.

**Verify:** `grep -c passedThreshold Planning/Claude/rk2-plan/prompts/adversarial-critic.md Planning/Claude/rk2-exec/SKILL.md | awk -F: '{s+=$2} END {print s}'` → `0`
**Commit:** `fix(rk2): critic delivered by paste, blocking computed by executor, card names Sonnet`

### Task 6 — reviewer cards: pre-commit diff slot, verdict on line 1 `[haiku]`
**Files:** Modify `Planning/Claude/rk2-plan/prompts/combined-reviewer.md`, `spec-reviewer.md`, `quality-reviewer.md`
**Review:** gate-only

- [ ] In all three files replace the exact line
  `Changed files / commit range: [paths or BASE_SHA..HEAD_SHA]` with
  `Changed files: [paths from \`git status --porcelain\` — the task is not committed yet; after a bounce, the fix's diff only]`
- [ ] In all three files, in the "Report" section, prepend to the first bullet's paragraph the sentence
  `The verdict line is the FIRST line of your output, nothing before it.` (add it as its own line directly under the `## Report` / `## Report exactly one verdict` heading).
- [ ] STOP condition: if any file lacks the exact `Changed files / commit range:` line, stop and report.

**Verify:** `grep -c 'FIRST line of your output' Planning/Claude/rk2-plan/prompts/*.md | awk -F: '{s+=$2} END {print s}'` → `3`
**Commit:** `fix(rk2): reviewer cards use pre-commit paths and put the verdict on line 1`

### Task 7 — executor reads verdict line only; commits the promotion `[haiku]`
**Files:** Modify `Planning/Claude/rk2-exec/SKILL.md`
**Review:** gate-only

- [ ] "Cap reports in every dispatch" bullet: append ` Read the verdict from the reviewer's **first line only**; a ✅ appearing anywhere else (e.g. echoed from the implementer's report) is not a verdict.`
- [ ] "Done signal" section: after `resolved at authoring time, not by you).` add ` Then \`git add\` the move and commit \`chore(plan): complete <slug>\` — an unstaged promotion is invisible to the next checkout.`

**Verify:** `grep -c 'first line only' Planning/Claude/rk2-exec/SKILL.md` → `1`
**Commit:** `fix(rk2-exec): verdict from line 1 only; commit the plan promotion`

### Task 8 — routing: "changes auth logic", not "touches auth" `[haiku]`
**Files:** Modify `Planning/Claude/rk2-plan/SKILL.md`, `Planning/Claude/rk2-plan/tiers/mid.md`
**Review:** gate-only

- [ ] `SKILL.md` route step 2: replace `OR safety-critical (auth, payments, data migrations, external API contracts, PII, prod infra)?` with
  `OR safety-critical — the build **changes** auth/session logic, payments, data migrations, external API contracts, PII handling, or prod infra? (Merely sitting behind existing auth middleware does not count.)`
- [ ] `tiers/mid.md` "Escalate to pro" second bullet: replace `The build touches auth, payments,` with `The build changes auth logic (not merely uses it), payments,`.

**Verify:** `grep -c 'Merely sitting behind' Planning/Claude/rk2-plan/SKILL.md` → `1`
**Commit:** `fix(rk2-plan): pro routing keys on changing auth logic, not touching auth`

### Task 9 — max Phase 0 gate becomes commands; max marked conditional `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-plan/tiers/max.md`

- [ ] `plan-template.md` Phase 0: replace the prose `**Gate:** every roster member responds to a \`SendMessage\` ping AND ...` line with:
  ```markdown
  **Gate:** `ToolSearch "select:TeamCreate,TaskList,TaskCreate,TaskUpdate,SendMessage"` → all five schemas returned (none missing)
  AND for each roster name N: `SendMessage {to: N, message: "ping"}` → a reply containing `pong` within the team's first turn
  AND `TaskList` → one row per `### Task` heading below, each non-root row showing its `BlockedBy` ids
  AND the pre-critique JSON has `blocking: false`
  ```
  (Keep the four `- [ ]` steps under it; change step 1 to `Verify the substrate with the ToolSearch call above.`)
- [ ] Add to every reviewer/critic spawn instruction in the template Phase 0 step 2: `; each spawn prompt ends with "reply \`pong\` to any message that is exactly \`ping\`"`.
- [ ] `tiers/max.md` line 1 paragraph: append `**Conditional tier:** \`TeamCreate\`/\`TaskList\`/\`TaskCreate\`/\`TaskUpdate\` are plugin-provided, not base Claude Code. At authoring time run \`ToolSearch "select:TeamCreate,TaskList"\`; if either is missing on the machine that will execute, route to pro — do not author a max plan the executor can't run.`

**Verify:** `grep -c 'select:TeamCreate' Planning/Claude/rk2-plan/plan-template.md Planning/Claude/rk2-plan/tiers/max.md | awk -F: '{s+=$2} END {print s}'` → `2`
**Commit:** `fix(rk2): max Phase 0 gate is commands; max tier probes its substrate at authoring time`

---

## Phase 3 — Lint [sequential]

**Gate:** `python3 Planning/Claude/rk2-plan/bin/rk2-lint.py Planning/Claude/rk2-plan/bin/fixtures/valid-mid.md; echo "exit=$?"` → last line `exit=0` AND preceding line `OK`
AND `python3 Planning/Claude/rk2-plan/bin/rk2-lint.py Planning/Claude/rk2-plan/bin/fixtures/invalid.md | wc -l | tr -d ' '` → `10`

### Task 10 — `rk2-lint.py` `[sonnet]`
**Files:** Create `Planning/Claude/rk2-plan/bin/rk2-lint.py`
**Grounding:** `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-plan/SKILL.md` (sections "Gates", "Phase execution strategies", "Schema validation", "Review weight"), `Planning/Claude/rk2-exec/SKILL.md` ("Before Phase 1", "Per-task loop")
**Schema:** `{ "filesCreated": ["string"], "checksImplemented": ["string"] }`
**Plan-locked content:** output format below; exit codes 0/1/2; stdlib only; Python 3.9 compatible (no `match`, no `X | Y` types).

Behaviour: `python3 rk2-lint.py <plan.md>`. Prints `OK` and exits 0 when clean. Otherwise prints one line per finding, `<line>: <CODE> <message>`, sorted by line, and exits 1. Exits 2 with a usage line on bad args or unreadable file. Regex over lines; no markdown parser.

Checks (CODE — rule):
1. `RUNCFG` — Run config has `**Tier:**` with value in `mid|pro|max`, `**Promotion command:**` containing `git mv` or `mv`, `**Rk2 dir:**`; and `**Workflow authorization:**` present iff tier ≠ max.
2. `PHASEHDR` — every `## Phase N —` header carries exactly one of `[parallel]|[pipeline]|[sequential]` (Phase 0 at max may carry `[orchestrator]` instead); `[adversarial]` may additionally appear but never with `[pipeline]`; at mid, `[adversarial]` is an error.
3. `GATE` — every phase has a `**Gate:**` line containing a backtick command AND `→`.
4. `VERIFY` — every `### Task` has a `**Verify:**` line containing a backtick command AND `→`.
5. `COMMIT` — every task has a `**Commit:**` line.
6. `FILES` — every task has a `**Files:**` line.
7. `GATEONLY` — a task with `**Review:** gate-only` whose Verify command contains none of `test|tsc|grep|diff|cmp|wc|ls|pytest|jest|vitest|cargo|go |swift build` is flagged.
8. `RECEIVES` — in a `[pipeline]` phase, every task after the first has `**Receives:**`.
9. `SCHEMAREF` — every identifier used in a Gate as `<name>.length` or `<name> ===` must appear as a key in some `**Schema:**` in that phase; and no gate may reference an identifier whose Schema type is `"boolean"`.
10. `MIDCAP` — tier mid with more than 6 `### Task` headings.
11. `TAG` — every `### Task` heading ends with one of `` `[haiku]` ``, `` `[haiku] (verbatim)` ``, `` `[sonnet]` ``, `` `[orchestrator]` ``.
12. `MAXFIELDS` — at max, every task has `**Owner role:**` and `**BlockedBy:**`.
13. `BUILDLOG` — a `## Build log` heading exists.

- [ ] Write the script. Top-of-file docstring lists the codes above in one line each.
- [ ] Keep it under ~200 lines. One function per check taking `(lines, tier)` and returning `[(lineno, code, msg)]`.

**Verify:** `python3 Planning/Claude/rk2-plan/bin/rk2-lint.py; echo "exit=$?"` → last line `exit=2`
**Commit:** `feat(rk2-plan): rk2-lint.py mechanizes the plan-format rules`

### Task 11 — lint fixtures `[sonnet]`
**Files:** Create `Planning/Claude/rk2-plan/bin/fixtures/valid-mid.md`, `Planning/Claude/rk2-plan/bin/fixtures/invalid.md`
**Grounding:** `Planning/Claude/rk2-plan/plan-template.md`, `Planning/Claude/rk2-plan/bin/rk2-lint.py`
**Schema:** `{ "filesCreated": ["string"], "invalidFindingCount": "number" }`

- [ ] `valid-mid.md`: a complete, realistic **mid** plan (3 tasks, 2 phases: Phase 1 `[pipeline]` with a real `**Receives:**` bound to a Phase-1 schema field; Phase 2 `[parallel]` with one `[haiku] (verbatim)` task and one `Review: gate-only` task; one task with `**Plan-locked content:**`; a Gate referencing `filesCreated.length`; a `## Build log` section). Subject: "add a CSV export endpoint". It doubles as the family's only worked example — make it read like a real plan, not lorem ipsum.
- [ ] `invalid.md`: a plan that trips **exactly ten** findings, at least one each of `RUNCFG`, `PHASEHDR`, `GATE`, `VERIFY`, `GATEONLY`, `RECEIVES`, `SCHEMAREF` (boolean case), `TAG`, `BUILDLOG`. A comment at the top lists the ten expected `<line>: CODE` pairs.
- [ ] Run the lint on both; adjust fixtures (not the lint) until `valid-mid.md` → `OK` and `invalid.md` → exactly 10 lines whose codes match the header comment. If a check in the lint is wrong, fix the lint and note it in the commit body.

**Verify:** `python3 Planning/Claude/rk2-plan/bin/rk2-lint.py Planning/Claude/rk2-plan/bin/fixtures/valid-mid.md` → `OK`
**Commit:** `test(rk2-plan): lint fixtures — one valid mid plan, one ten-finding invalid plan`

### Task 12 — point the skills at the worked example `[haiku]`
**Files:** Modify `Planning/Claude/rk2-plan/SKILL.md`
**Review:** gate-only

- [ ] In the "Step 2 — workflow" item that says `Use \`plan-template.md\` in this skill; delete the sections marked for other tiers.` append ` \`bin/fixtures/valid-mid.md\` is a complete worked example — read it once before writing your first plan of a session; it shows \`[pipeline]\` + \`Receives:\`, a locked-content task, a noun schema gate, and a verbatim task with a STOP condition.`

**Verify:** `grep -c 'valid-mid.md' Planning/Claude/rk2-plan/SKILL.md` → `1`
**Commit:** `docs(rk2-plan): point authors at the worked example`

---

## Phase 4 — Descriptions [sequential]

**Gate:** `python3 - <<'EOF'
import re,pathlib
for s in ("rk2-plan","rk2-exec"):
    t=pathlib.Path(f"Planning/Claude/{s}/SKILL.md").read_text()
    d=re.search(r"^description: (.*)$",t,re.M).group(1)
    assert "consolidated successor" not in d, s
    assert len(d) < 700, (s,len(d))
print("OK")
EOF` → `OK`

### Task 13 — rewrite both `description:` fields `[sonnet]`
**Files:** Modify `Planning/Claude/rk2-plan/SKILL.md`, `Planning/Claude/rk2-exec/SKILL.md`
**Plan-locked content:** the phrases listed as must-include below.

- [ ] `rk2-plan` description: one line, ≤700 chars. Must include the literal phrases: `implementation plan`, `handoff`, `task breakdown`, `fresh session`, `subagent`, `scope this out`, `build order`, `/rk2-plan`. Must state: it picks the tier itself (mid/pro/max), and the not-for list (small do-it-now tasks, pure research, same-session implementation). Drop the "consolidated successor" clause and the "reads tiers/<tier>.md" mechanics.
- [ ] `rk2-exec` description: one line, ≤500 chars. Must include: `execute`, `run`, `resume`, `continue`, `pick up`, `plan doc`, `docs/plans/incomplete/`, `/rk2-exec`. Drop the successor clause and the protocol summary (bounce cap, commit per task, promotion).

**Verify:** `grep -c 'task breakdown' Planning/Claude/rk2-plan/SKILL.md` → `1`
**Commit:** `feat(rk2): descriptions lead with trigger vocabulary, including resume`

---

## Phase 5 — Sibling cleanup [sequential] — REQUIRES HUMAN YES

**Gate:** `ls ~/.claude/skills | grep -c '^rk-plan'` → `0` (only if the human said yes; if no, skip this phase and note it in the Build log)

### Task 14 — remove competing `rk-plan*` symlinks and the stale `Documents/skills` copy `[orchestrator]`
**Files:** Delete symlinks `~/.claude/skills/rk-plan`, `rk-plan-auto`, `rk-plan-max`, `rk-plan-max-auto`, `rk-plan-pro`, `rk-plan-pro-auto`, `rk-plan-pro-cotal`, `rk-plan-pro-DS`, `rk-plan-router`; delete dirs `/Users/jeffborden/Documents/skills/rk2-plan`, `/Users/jeffborden/Documents/skills/rk2-exec`.

- [ ] Ask the human (AskUserQuestion): "Remove the nine rk-plan* symlinks from ~/.claude/skills so they stop competing with rk2-plan at trigger time? The repo dirs under Planning/Claude/ are untouched. Also delete the stale rk2-* copies in Documents/skills/?" Options: both / symlinks only / neither.
- [ ] For each approved item: confirm with `test -L` (symlinks) or `diff -rq` against the repo copy (stale dirs — must show only the three known-older files) before `rm`. Anything unexpected → STOP.
- [ ] No commit (nothing in the repo changes).

**Verify:** `ls -la ~/.claude/skills | grep -c 'rk2-'` → `2`
**Commit:** — (none)

---

## Files

| Action | Path |
|---|---|
| Create | `Planning/Claude/rk2-plan/**` (T0) |
| Create | `Planning/Claude/rk2-exec/SKILL.md` (T0) |
| Modify | `Planning/Claude/rk2-plan/SKILL.md` (T1, T2, T4, T8, T12, T13) |
| Modify | `Planning/Claude/rk2-plan/plan-template.md` (T1, T2, T3, T4, T9) |
| Modify | `Planning/Claude/rk2-exec/SKILL.md` (T2, T3, T4, T5, T7, T13) |
| Modify | `Planning/Claude/rk2-plan/prompts/adversarial-critic.md` (T3, T5) |
| Modify | `Planning/Claude/rk2-plan/prompts/{combined,spec,quality}-reviewer.md` (T6) |
| Modify | `Planning/Claude/rk2-plan/tiers/mid.md` (T8), `tiers/max.md` (T9) |
| Create | `Planning/Claude/rk2-plan/bin/rk2-lint.py` (T10) |
| Create | `Planning/Claude/rk2-plan/bin/fixtures/{valid-mid,invalid}.md` (T11) |

**Reuse:** `Planning/Claude/CONVENTIONS.md` lists the rk-plan family invariants; the lint codes map onto invariants 1, 2, 5, 7, 8, 10. Don't duplicate that file — link to it from the lint docstring.

---

## Verification (end-to-end)

```
cd /Users/jeffborden/Documents/Coding/_Skills
git log --oneline main..HEAD | wc -l | tr -d ' '          # → 14 (13 if Phase 5 skipped; 15 with a promotion commit)
python3 Planning/Claude/rk2-plan/bin/rk2-lint.py Planning/Claude/rk2-plan/bin/fixtures/valid-mid.md   # → OK
grep -rn '/Users/jeffborden' Planning/Claude/rk2-plan Planning/Claude/rk2-exec | wc -l | tr -d ' '     # → 0
readlink ~/.claude/skills/rk2-exec                        # → /Users/jeffborden/Documents/Coding/_Skills/Planning/Claude/rk2-exec
git status --short Planning/Claude/rk2-plan Planning/Claude/rk2-exec | wc -l | tr -d ' '               # → 0
```
Then `git mv docs/plans/incomplete/2026-09-06-rk2-hardening.md docs/plans/complete/` and commit `chore(plan): complete rk2-hardening`. Leave the branch unmerged; the human merges.

---

## Build log

<!-- Executor-owned, append-only. See Task 3 for the format this section will carry once rk2 itself adopts it:
     - YYYY-MM-DD HH:MM | Task N | bounce k/3 | <step> | <findings>
     - YYYY-MM-DD HH:MM | Task N | STOP | <reason> | <decision needed> -->

- 2026-09-06 | Task 2 | note | Verify `grep -rn testsPassing` → 0 conflicted with the task's own
  replacement text, which cites (`testsPassing`) as the banned-field example. Only the phrase
  `nouns, not verdicts` is declared plan-locked, so the unlocked parenthetical was dropped.
  Locked phrase retained; Verify → 0.
- 2026-09-06 | Task 3 | STOP | Phase 1 Gate part 1 unsatisfiable: `grep -c 'Build log'
  plan-template.md` → 1, gate expects 2. The Task 3 block contributes exactly one matching line
  (`## Build log`); Tasks 1/2/4 add none. Part 2 (testsPassing → 0) passes. | Human must choose:
  correct the gate to 1, or name where a second reference belongs in the template.
- 2026-09-06 | Task 3 | resolved | Human ruled the Phase 1 Gate off by one: expected 2, correct
  value is 1 (one `## Build log` heading). Gate part 1 passes at 1, part 2 at 0. Template left
  exactly as Task 3 specified. Phase 1 GREEN; proceeding to Phase 2.
- 2026-09-06 | Task 9 | note | Phase 2 Gate part 1 off by one, same class as Phase 1: `grep -c
  'blocking' adversarial-critic.md` → 4, gate says 3. Line 5 ("the lead resolves blocking
  findings") is pre-existing prose present at 13ea8c5, untouched by Task 5; the gate counted only
  Task 5's three additions. Parts 2 (3) and 3 (1) pass exactly. Applied the human's Phase 1
  ruling by extension: correct value 4. Phase 2 GREEN.
- 2026-09-06 | Task 14 | STOP | Phase 5 not answered. Human asked first for a copy of the
  original rk2 family so in-flight plans written against the old format still run. Created
  ~/.claude/skills/rk2-plan-v1 and rk2-exec-v1 from ede57d7 (byte-identical), renamed, marked
  FROZEN in the description, and repointed rk2-exec-v1's four card paths at rk2-plan-v1/prompts
  so the frozen executor reads the frozen cards, not the hardened ones. Not committed - personal
  working copies outside the repo. | Human must still choose both / symlinks only / neither.
  Nothing deleted. Promotion held until Phase 5 resolves.
- 2026-09-06 | Task 14 | done | Human answered "both". Pre-flight confirmed all nine targets
  with `test -L` and both stale dirs with `diff -rq` against ede57d7 (exactly the 3 predicted
  older files, prompts/ and tiers/ byte-identical). Removed nine rk-plan* symlinks and the two
  stale Documents/skills/ dirs. Phase 5 Gate → 0. Task 14 Verify → 4, not the stated 2: the
  count now includes rk2-plan-v1 and rk2-exec-v1, which the plan predates. Composition is
  2 symlinks + 2 frozen copies, which is correct. Repo Planning/Claude/rk-plan* untouched.
- 2026-09-06 | plan | complete | All gates green. Two gate expectations corrected in flight
  (Phase 1 part 1: 2→1, human-ruled; Phase 2 part 1: 3→4, same off-by-one class, applied by
  extension). 14 task commits, all inside Planning/Claude/rk2-*. Branch left unmerged.
