# Plan — add a CSV export endpoint

> Execute with **`/rk2-exec docs/plans/incomplete/2026-04-02-csv-export.md`** in a fresh session.

## Context

Support wants the reports table downloadable. The table is already paginated server-side by
`listReports()`, so the export can reuse that query with the page limit lifted — no new SQL.

**Scope (in):** a CSV serializer, a `GET /api/export.csv` route behind the existing session
middleware, and one line of API docs.
**Scope (out):** XLSX, streaming for >50k rows, per-column selection, scheduled exports.

**Required inputs (from the human):** none.

**Unverified assumptions:** (a) `listReports()` accepts `limit: null` — read from
`src/reports/query.ts:41`, confirmed. (b) No customer field contains a raw newline; Task 1's
Verify covers the quoting path either way.

## Run config

- **Tier:** `mid`
- **Rk2 dir:** `docs/plans/rk2` — prompt cards + lint, copied from the skill at authoring time
- **Promotion command:** `git mv`
- **Workflow authorization:** `authorized`
- **Hard rules:** the route reuses `listReports()` — no second query path. No new dependencies;
  `Papa.unparse` is not installed and a 30-line serializer does not justify adding it.

---

## Phase 1 — Serializer, then the route that calls it [pipeline]

**Gate:** `ls src/export/*.ts | wc -l | tr -d ' '` → `2` AND filesCreated.length === 2

### Task 1 — CSV serializer with RFC 4180 quoting `[sonnet]`
**Files:** Create `src/export/csv.ts`
**Grounding:** `src/reports/query.ts` (the row shape `listReports()` returns)
**Schema:** `{ "filesCreated": ["string"], "exportedSymbols": ["string"] }`

- [ ] Export `toCsv(rows: ReportRow[]): string`. Header row from `Object.keys(rows[0])`.
- [ ] Quote a field iff it contains a comma, a double quote, `\r` or `\n`; escape an inner
      quote by doubling it. Empty input returns `""`, not a bare header.
- [ ] Add `src/export/csv.test.ts` covering: a field with a comma, a field with an embedded
      quote, a field with a newline, and the empty-rows case.

**Verify:** `npx vitest run src/export/csv.test.ts` → `4 passed`, exit 0
**Commit:** `feat(export): RFC 4180 CSV serializer`

### Task 2 — `GET /api/export.csv` route `[sonnet]`
**Files:** Create `src/export/route.ts`; modify `src/router.ts`
**Receives:** Task 1's `exportedSymbols` — import the serializer by the exact symbol it
exported (`toCsv`), do not re-derive the name.
**Schema:** `{ "filesCreated": ["string"], "routeName": ["string"] }`

- [ ] Register `GET /api/export.csv` on the existing authenticated router — reuse the session
      middleware already applied in `src/router.ts`, do not add a new guard.
- [ ] Call `listReports({ limit: null })`, pass the rows to `toCsv`, respond with
      `Content-Type: text/csv` and `Content-Disposition: attachment; filename="reports.csv"`.
- [ ] Return 401 (not 302) for an unauthenticated request — this is an API path.

**Verify:** `npx vitest run src/export/route.test.ts` → `3 passed`, exit 0
**Commit:** `feat(export): GET /api/export.csv route`

---

## Phase 2 — Document the endpoint [parallel]

**Gate:** `grep -c 'GET /api/export.csv' docs/api.md` → `1`

### Task 3 — API docs entry `[haiku] (verbatim)`
**Files:** Modify `docs/api.md`
**Review:** gate-only
**Plan-locked content:** the response-header block below — copy it byte for byte; the header
casing and the quoting in `filename="reports.csv"` are both load-bearing.

- [ ] Under the `## Reports` heading append exactly:
  ```
  ### GET /api/export.csv

  Every report row the caller can see, as CSV. Requires a session cookie; 401 otherwise.

  Content-Type: text/csv
  Content-Disposition: attachment; filename="reports.csv"
  ```
- [ ] STOP condition: if `docs/api.md` has no `## Reports` heading, stop and report — do not
  invent a location for the block.

**Verify:** `grep -c 'attachment; filename="reports.csv"' docs/api.md` → `1`
**Commit:** `docs(api): document the CSV export endpoint`

---

## Files

| Action | Path |
|---|---|
| Create | `src/export/csv.ts`, `src/export/csv.test.ts` (T1) |
| Create | `src/export/route.ts` (T2) |
| Modify | `src/router.ts` (T2) |
| Modify | `docs/api.md` (T3) |

**Reuse:** `listReports()` in `src/reports/query.ts` and the session middleware already wired
in `src/router.ts`. No new dependency — see Hard rules.

---

## Verification (end-to-end)

```
npx vitest run src/export                                  # → 7 passed, exit 0
curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/export.csv   # → 401
curl -s -b "$SESSION" localhost:3000/api/export.csv | head -1          # → the header row
grep -c 'attachment; filename="reports.csv"' docs/api.md   # → 1
```

---

## Build log

<!-- Executor-owned. One line per event, append-only, committed with the task (or as a
     WIP commit on STOP). Format:
     - YYYY-MM-DD HH:MM | Task N | bounce k/3 | <step that bounced> | <one-line findings>
     - YYYY-MM-DD HH:MM | Task N | STOP | <reason> | <what the human must decide>
     Resume reads this before dispatching anything. -->
