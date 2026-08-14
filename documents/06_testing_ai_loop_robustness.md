# Testing, AI Loop, And Robustness

## What The Assessment Requires

The Tactive assessment asks for:

- Test automation.
- Normal path, edge cases, and invalid input coverage.
- At least one red run where a deliberate break is caught.
- A green run after correction.
- Evidence of AI-assisted implementation, failure diagnosis, and fixes.
- Honesty about what worked and what did not.

## Current Test Commands

Backend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Backend"
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Fronted"
npm run build
```

Seed dry run:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Backend"
.\.venv\Scripts\python.exe -m app.database.seed --dry-run
```

## Captured Evidence

Evidence files are in `documents/evidence`.

- `pytest-red-run.txt`
- `pytest-green-run.txt`
- `frontend-build.txt`
- `seed-dry-run.txt`
- `schema-tables.txt`
- `executive-brief-runtime.txt`

## Red Run

The deliberate regression changed the standard request auto-approval confidence
threshold from `>= 90` to `>= 101`. This broke a real decision-rule test.

Captured result:

```text
1 failed, 15 passed, 1 warning
FAILED tests/test_decision_service.py::test_auto_approve_standard_request_rule
```

Why this matters:

- The test did not always pass.
- The failure was related to the actual business rule.
- The suite caught a behavioral regression, not just syntax.

## Green Run

The rule was restored to `>= 90` and the same suite was run again.

Captured result:

```text
16 passed, 1 warning
```

## Frontend Build

Captured result:

```text
tsc -b && vite build
build passed
```

## Runtime Calculation Check

The new Dashboard Executive Brief was checked against the configured database
without printing secrets. A first runtime check found a missing
`pending_approvals` variable in `dashboard_summary`. The service was patched to
calculate that count from the `approvals` table, then the runtime check passed.

Captured safe result:

```text
{'status': 'AT_RISK', 'readinessScore': 60, 'queuePressure': 18, 'automationRate': 78, 'avgAiConfidence': 91, 'nextActions': 3}
```

## Robustness Features

- PostgreSQL-only configuration. SQLite is rejected.
- Alembic controls schema migration.
- Database health endpoint verifies connectivity.
- SQLAlchemy relationships and constraints enforce valid records.
- Service-layer rules centralize decisions.
- RBAC dependencies protect write/admin actions.
- Audit events record important operations.
- Frontend toasts report failures without pretending success.
- Seed dry-run exposes expected data coverage before writes.
- Copilot responses are deterministic and database-backed.
- Request inference provides evidence, risk level, confidence, and next action.

## Known Warning

`pytest` reports a Starlette/httpx deprecation warning from the installed test
client stack. It does not fail the suite. A future dependency refresh should
move to the recommended `httpx2` path when the FastAPI/Starlette stack is ready.
