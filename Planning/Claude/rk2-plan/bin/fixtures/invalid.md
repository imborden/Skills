<!-- FIXTURE: trips exactly ten rk2-lint findings. Expected `<line>: CODE` pairs:
     1: RUNCFG     - Run config omits the Rk2-dir line
     28: SCHEMAREF  - Phase 1 gate asserts a boolean schema field
     39: RECEIVES   - Task 2 follows another task in a pipeline phase with no inbound field
     39: COMMIT     - Task 2 declares no commit message
     48: PHASEHDR   - Phase 2 header carries no execution strategy
     48: GATE       - Phase 2 has no gate at all
     50: TAG        - Task 3 heading carries no model tag
     50: GATEONLY   - Task 3 is gate-only but its check runs no real tool
     59: VERIFY     - Task 4 declares no check
     65: BUILDLOG   - the plan has no build-log section
     Keep this comment free of the literal field labels the lint greps for globally,
     or it will satisfy the very checks the fixture is meant to fail. -->

# Plan — add a CSV export endpoint (deliberately malformed)

## Run config

- **Tier:** `mid`
- **Promotion command:** `git mv`
- **Workflow authorization:** `authorized`
- **Hard rules:** none — this fixture exists only to be rejected.

---

## Phase 1 — Serializer, then the route [pipeline]

**Gate:** `npm test` → 0 failures AND testsPassing === true

### Task 1 — CSV serializer `[sonnet]`
**Files:** Create `src/export/csv.ts`
**Schema:** `{ "filesCreated": ["string"], "testsPassing": "boolean" }`

- [ ] Export `toCsv(rows)`.

**Verify:** `npx vitest run src/export/csv.test.ts` → `4 passed`
**Commit:** `feat(export): CSV serializer`

### Task 2 — the route `[haiku]`
**Files:** Create `src/export/route.ts`

- [ ] Register `GET /api/export.csv`.

**Verify:** `npx vitest run src/export/route.test.ts` → `3 passed`

---

## Phase 2 — Documentation

### Task 3 — API docs entry
**Files:** Modify `docs/api.md`
**Review:** gate-only

- [ ] Append the endpoint block.

**Verify:** `cat docs/api.md` → the endpoint block is present
**Commit:** `docs(api): document the endpoint`

### Task 4 — changelog `[haiku]`
**Files:** Modify `CHANGELOG.md`

- [ ] Add a line under Unreleased.

**Commit:** `docs(changelog): note the CSV export`
