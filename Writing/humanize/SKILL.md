---
name: humanize
description: Strips AI-sounding patterns from text — overused connector words, dash structures,
  uniform sentences, filler preambles, adjective stacking, balanced paragraphs, missing
  contractions. Use when text reads like a machine wrote it and you want it to sound human.
  Triggers on /humanize, "humanize this", "de-AI this", "make this sound less like AI".
argument-hint: "[file-path] [--level light|medium|deep|compare] [--voice <path>] [--dry-run]"
allowed-tools: Bash, Read, Write, Edit
---

# Humanize: De-AI Your Writing

## Overview

You take text that reads like AI wrote it and rewrite it so it reads like a human wrote it. You target specific, mechanical tells — not vague "make it sound better" instructions.

**Core principle:** AI writing has a fingerprint. The diagnostic script measures the countable tells exactly; you do the rewriting and prove you checked every rule via a mandatory self-audit. Never skip the audit. Never change the meaning — only how it sounds.

**Two jobs, cleanly split:**
- `scripts/diagnose.py` MEASURES (parses args, counts tells, measures distributions, names the output file). It never rewrites.
- You REWRITE and JUDGE. The script's counts become the **Found** column of your audit; your work is the **Fix**.

The 11 rules live in [rules.md](rules.md). The voice system lives in [voice-profile.md](voice-profile.md). Read each only when the pipeline says to.

---

## Pipeline

**1. DIAGNOSE.** Run the script with the user's raw input and flags:
```
python3 scripts/diagnose.py <input> [--level ...] [--voice <path>] [--dry-run] [--compare]
```
If the input is empty, the script prints help — relay it and STOP. Otherwise it
prints the resolved config (input kind, level, voice path + whether found, output
filename) and a per-rule diagnostic report. Use that report as ground truth.

**2. LOAD VOICE** (deep only). If the report says a voice profile was found, Read it. If none was found, note it for the offer in step 7.

**3. READ RULES.** Read [rules.md](rules.md) and apply only the rules active for the level (Light 1-3, Medium 1-6, Deep all 11).

**4. REWRITE** at the requested level, fixing every instance the diagnostic flagged. For rules 4, 7, 11 the script gives candidates — confirm by eye. For rule 8 (thesis restatement) the script can't help; read each paragraph's last sentence yourself. For `--level compare`, produce light, medium, and deep as three separate passes.

**5. VOICE OVERLAY** (deep only). If a profile was loaded, apply its patterns on top of the rule fixes per [voice-profile.md](voice-profile.md).

**6. SELF-AUDIT.** Output the audit table (below) BEFORE the text. **Found** comes from the diagnostic; **Fixed** is your count of what you changed.

**7. OUTPUT.** Write to the filename the diagnostic named (`{name}-humanized{ext}`, or `{name}-humanized-compare.md`). For inline input or `--dry-run`, echo in chat and write nothing. Then, if this was a deep run with no voice profile, make the offer from [voice-profile.md](voice-profile.md).

---

## The Self-Audit Gate

You MUST output this table BEFORE the humanized text. Every rule appears. Every cell is filled. This proves you checked each rule. Pull **Found** straight from the diagnostic report.

```
## Audit

| Rule | Found | Fixed | Notes |
|------|-------|-------|-------|
| Connector-word overuse | N | N | [which words, what you did] |
| Dash structures | N | N | [per dash: aside→sentence / comma / cut] |
| Overly formal words | N | N | [per word: what you replaced it with] |
| Filler preamble | N | N | [which pattern, stripped or kept] |
| Missing contractions | N | N | [how many contracted, any kept and why] |
| Sentence-length uniformity | — | — | Before: X% in 15-25 word band. After: [describe range] |
| Adjective stacking | N | N | [per stack: what you cut to] |
| Thesis restatement | N | N | [which paragraphs, what you cut] |
| Uniform paragraph length | — | — | [what you changed: which para became single-sentence, which combined] |
| First-person avoidance | N | N | [per instance: what you rewrote to] |
| Overly balanced structure | N | N | [which paragraph, how you broke the symmetry] |
```

Rules with structural measures (6, 9) use `—` for Found/Fixed since they're distribution-based.

**Level-dependent formatting:**
- `--level light`: rules 4-11 show as `— (skipped)`.
- `--level medium`: rules 7-11 show as `— (skipped)`.
- `--level deep`: all rules show real data.
- `--level compare`: three audit tables, one per level, each labeled.

---

## Output Format

**File input (deep, the default):**
```
## Audit
[audit table]

## Humanized

[the rewritten text]
```

**File input (`--level compare`)** — written to `{name}-humanized-compare.md`, three labeled sections (`## Light`, `## Medium`, `## Deep`), each with its own `### Audit` and `### Output`.

**Paste input:** same structure, echoed in chat, no file written.

**`--dry-run`:** same as above but echo in chat with the note "Dry run — no file written."

---

## Constraints (non-negotiable)

- Never change the meaning of the text. Change how it sounds.
- Quoted material passes through unchanged (except dash replacement with annotation) — see [rules.md](rules.md).
- Formal contexts (legal/academic/technical) get a lighter touch — see [rules.md](rules.md).
- The audit table is always present, always complete.
- For compare mode, all three outputs go in one file with labeled sections.
- The script measures; it never rewrites. The rewrite is always yours.
