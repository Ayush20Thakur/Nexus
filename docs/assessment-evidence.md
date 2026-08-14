# Assessment Evidence

Date: 2026-08-14

This file maps the Tactive assessment requirements to the current NEXUS
implementation and command-backed evidence.

## Deliverable Mapping

- Source code + README/run guide: `Backend/`, `Fronted/`, `README.md`,
  `how to run.txtt`
- Tests: `Backend/tests/`
- Architecture/design/user docs: `docs/architecture.md`, `docs/design.md`,
  `docs/user-guide.md`
- AI change-loop evidence: this implementation pass records the AI-assisted
  changes, failures, fixes, and final command results in this file.
- Presentation/video: still to be produced as external deliverables.

## Verified Commands

Backend syntax:

```powershell
.\.venv\Scripts\python.exe -m compileall -q app tests
```

Seed dry run:

```powershell
.\.venv\Scripts\python.exe -m app.database.seed --dry-run
```

Result: dry run OK, 6 users, 25 inventory items, 25 operational requests,
13 approvals, 13 fulfillment orders, 10 reports.

Migration:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Result: PostgreSQL migration context completed at Alembic revision
`20260814_0001`.

Seed:

```powershell
.\.venv\Scripts\python.exe -m app.database.seed
```

Result: seed completed with 6 users, 25 inventory items, 25 operational
requests, 13 approvals, 13 fulfillment orders, 10 reports, and 1 seed Copilot
message.

Auth seed:

```powershell
$env:NEXUS_DEMO_PASSWORD='password'
.\.venv\Scripts\python.exe -m app.database.auth_seed
Remove-Item Env:\NEXUS_DEMO_PASSWORD
```

Result: 3 Supabase Auth demo accounts provisioned.

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Result: API status `ok`, database status `ok`.

Tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Result: 14 passed, 1 Starlette/httpx deprecation warning.

Frontend:

```powershell
npm run build
```

Result: TypeScript and Vite build passed. Route-level code splitting and manual
chunks are enabled.

Authenticated API smoke test:

- Supabase login succeeded for `zian@nexus.corp`, `authority@nexus.corp`, and
  `dr.vance@nexus.corp`.
- Authenticated admin smoke checks passed for health, bootstrap, dashboard,
  insights, system units, decision metrics, decision simulation, Copilot chat,
  reversible inventory stock adjustment, reversible active-policy toggle,
  reversible active-rule toggle, and report download.
- Report download returned 1,317 bytes for the tested generated report.

## AI Change Loop Notes

Requested change:

- Make Copilot a real chatbot.
- Remove mock/static operational numbers.
- Populate richer Supabase-backed data.
- Ensure inventory, approvals, fulfillment, reports, policies, admin, and
  system units connect to backend/DB.
- Add higher-authority login.
- Improve speed and documentation.

Failures found and fixed:

- Higher-authority Supabase Auth login failed with `Database error querying
  schema`.
- Diagnosis: direct Auth rows had NULL token columns that Supabase expects as
  empty strings.
- Fix: `app.database.auth_seed` now writes/repairs those fields.
- Frontend `.env` had a BOM before `VITE_SUPABASE_URL`; fixed without printing
  values.
- Frontend bundle produced a large-chunk warning; route lazy loading and manual
  chunks reduced the initial chunk.
- Policy smoke test initially selected a non-active policy for reversible toggle;
  corrected test selection to active policy.

## Remaining Assessment Items

- Create a short presentation deck.
- Record a 5-minute demo video.
- Capture a deliberate red test run if the evaluator requires separate evidence
  outside the conversation/tool log.
