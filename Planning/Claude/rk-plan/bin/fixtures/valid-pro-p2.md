# Plan — CSV export, part 2 of 2: scheduled exports

> Execute with **`/rk-exec docs/plans/incomplete/2026-04-02-csv-export-p2.md`** in a fresh session.

## Context

Part 2 of 2. p1 (`docs/plans/complete/2026-04-02-csv-export-p1.md`) delivered the RFC 4180
serializer and the authenticated `GET /api/export.csv` route, gated on a full green suite. This
part adds a nightly scheduled export written to `exports/` — it mutates the filesystem on a timer,
which is why it is adversarial and its own part.

**Required inputs (from the human):** none.

## Architecture

The route and the scheduler share one `toCsv()` and one `listReports({ limit: null })` query path;
the scheduler is a thin cron wrapper that writes the same bytes the route serves.

## Run config

- **Tier:** `pro`
- **Rk dir:** `docs/plans/rk` — prompt cards + lint, copied from the skill at authoring time
- **Promotion command:** `git mv`
- **Workflow authorization:** `authorized`
- **Hard rules:** the scheduler reuses `toCsv()` and `listReports()` — no second serializer, no
  second query path. No new dependencies.
- **Part:** 2 of 2 — requires `docs/plans/complete/2026-04-02-csv-export-p1.md`
- **Branch:** `feat/csv-export`
- **Prerequisite gate:** `npx vitest run src/export` → `7 passed`, exit 0

---

## Phase 3 — Scheduled export [adversarial] [sequential]

**Gate:** `npx vitest run src/export` → `11 passed`, exit 0 AND no critic findings ≥ 75
**Threshold:** 75
**Max iterations:** 3

### Task 4 — Nightly export job `[sonnet]`
**Files:** Create `src/export/schedule.ts`, `src/export/schedule.test.ts`
**Grounding:** `src/export/csv.ts`, `src/export/route.ts`
**Schema:** `{ "filesCreated": ["string"], "exportedSymbols": ["string"] }`

- [ ] Export `runNightlyExport(now: Date): Promise<string>` — writes `exports/reports-YYYY-MM-DD.csv`
      via `toCsv(listReports({ limit: null }))`, returns the path, never overwrites an existing file.
- [ ] Tests: writes the file, refuses to overwrite, filename uses `now` not the wall clock.

**Verify:** `npx vitest run src/export/schedule.test.ts` → `3 passed`, exit 0
**Commit:** `feat(export): nightly scheduled CSV export`

### Task 5 — Wire the job into the existing cron table `[sonnet]`
**Files:** Modify `src/cron.ts`; Create `src/export/cron.test.ts`
**Grounding:** `src/cron.ts`

- [ ] Register `runNightlyExport` at `0 3 * * *` on the existing `cron` registry — no new scheduler.
- [ ] Test: the registry lists the job with that expression.

**Verify:** `npx vitest run src/export/cron.test.ts` → `1 passed`, exit 0
**Commit:** `feat(export): schedule the nightly export at 03:00`

---

## Files

| Action | Path |
|---|---|
| Create | `src/export/schedule.ts`, `src/export/schedule.test.ts` (T4) |
| Modify | `src/cron.ts` (T5) |

---

## Verification (end-to-end)

```
npx vitest run src/export          # → 11 passed, exit 0 (whole build: p1 + p2)
ls exports/ | wc -l | tr -d ' '    # → 1 after one manual runNightlyExport()
```

---

## Build log

<!-- Executor-owned. One line per event, append-only. -->
