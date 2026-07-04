---
name: rk-brief
description: Use when an idea needs to become a one-page concept brief before any design starts — turning a raw pitch, feature ask, or vague "we should build X" into a durable, specific artifact the rest of the design pipeline consumes. Interview-driven: surfaces the problem, audience, riskiest assumption, success criteria, and scope cuts, then writes the brief to disk. Triggers on "product brief", "concept brief", "flesh out this idea", "before we design", "write a brief for this".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, AskUserQuestion
---

# rk-brief: Idea to Concept Brief

## Overview

Turn a raw idea into a **one-page, durable brief** before anyone opens a design tool. This is the front of the pipeline: the brief is what rk-wireframe, rk-prototype, and everything downstream read to know what they're building and why.

**REQUIRED BACKGROUND:** Use **rk-design** for interview discipline (ask questions before assuming, calibrate depth to ambiguity) and the no-filler rule. This skill applies that discipline to a written document, not a visual one — there's no aesthetic lane, no HTML build here.

**Core principle:** A brief is a decision-forcing document, not a summary. Every section must be **concrete and falsifiable** — a sentence someone could be wrong about — not adjectives like "intuitive" or "delightful" that can't be tested or contradicted.

## When to use

Any raw idea, pitch, or feature ask that's about to go into design or build, and hasn't been written down anywhere concrete yet. Signs you need this: the idea exists only as a conversation, "we should build X" with no problem statement, or a stakeholder handing over a vague ask.

**Not for:**
- **superpowers:brainstorming** — that's a conversation technique for exploring an idea's shape live. This skill is for after that conversation, when it's time to commit the idea to a durable, specific artifact.
- **rk-productionize** — the *other* end of the pipeline. That skill hands a finished design to engineers; this one hands a raw idea to designers. Don't confuse "brief" (before design) with "spec" (after design).
- Ideas already fully specified in a PRD or ticket with problem/audience/success criteria filled in — read that directly, don't re-derive it.

**Next step:** once the brief exists, hand it to **rk-wireframe** to explore the design space broadly, or straight to **rk-prototype** / **rk-deck** / **rk-doc** if the direction is already obvious and only needs building.

## The interview

Use `AskUserQuestion`. Don't accept vague answers — if the user says "make it easy to use," ask what "easy" means for *this* task, for *this* user, measured how. Push until answers are specific enough to be wrong.

Cover, in order:
1. **The problem** — what's broken or missing today, for whom, and how do you know? (A support ticket count, a churn number, a direct complaint — not "it'd be nice.")
2. **Audience and jobs-to-be-done** — who specifically, and what job are they hiring this to do? Not a persona name — the actual task they're stuck on.
3. **The riskiest assumption** — the belief that, if wrong, sinks the whole idea. Ask "what would have to be true for this to fail," then find the cheapest possible test for that belief (a 5-user interview, a fake-door landing page, a paper prototype) before committing real design time.
4. **Success criteria** — the specific, measurable bar that says this worked. Not "users love it" — a number, a rate, a behavior change, and a timeframe.
5. **Scope cuts** — what this explicitly does NOT do in v1. Say it as a list, not a vibe. Cutting scope now is what makes the brief useful later, when someone asks "should we also add..."
6. **Constraints** — existing brand or design system, a codebase to fit into, a platform (iOS/web/etc.), a timeline or launch date. These decide what rk-design's downstream steps can and can't do.
7. **Open questions** — anything still genuinely unresolved. Naming these is honest; hiding them behind confident prose is not.

## Write the brief

Write `product-brief.md` into the **user's project directory** — never into `~/.claude/skills/` or any skill folder. If the user hasn't said where their project lives, ask.

Template (fill every section with specifics; delete nothing):

```markdown
# [Product/Feature Name] — Concept Brief

## Problem
[What's broken, for whom, evidence it's real]

## Audience & jobs-to-be-done
[Who specifically, what job they're hiring this to do]

## Riskiest assumption
[The belief that sinks this if wrong]
**Cheapest test:** [how to check it cheaply before full build]

## Success criteria
[Specific, measurable bar — number, rate, or behavior change, with timeframe]

## Scope cuts (not doing in v1)
- [explicit cut]
- [explicit cut]

## Constraints
- Brand/design system: [name it, or "none — greenfield"]
- Codebase/platform: [name it]
- Timeline: [date or "none set"]

## Open questions
- [unresolved thing]
```

Keep it to one page. If a section runs long, the idea isn't focused enough yet — that's a finding, tell the user.

## Verify

- `product-brief.md` exists in the user's project (not in a skills directory).
- Every mandatory section is filled with a specific claim, not an adjective — read each section back and ask "could this be wrong?" If a sentence can't be wrong, it's filler; replace it.
- The riskiest assumption has a named, cheap test attached — not just "we'll find out during development."
- Scope cuts are an explicit list, not implied by omission.

## Red flags

- Writing the brief from your own assumptions instead of interviewing → ask first, especially the riskiest-assumption and success-criteria questions
- Success criteria like "users find it valuable" → not falsifiable, push for a number or observable behavior
- No scope cuts section, or "TBD" in it → scope cuts are the point; force the call now
- Saving the brief inside a skills folder instead of the user's project → it's a project artifact, not skill config
- Skipping straight to wireframes or a prototype because "the idea is obvious" → if it's genuinely obvious and low-risk, say so and move fast through the interview, but still write the brief — it's the shared reference the rest of the pipeline reads
