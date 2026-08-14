# NEXUS Backend

FastAPI backend for the NEXUS operational intelligence app.

The frontend lives in `../Fronted`. The system uses Supabase PostgreSQL and
Supabase Auth. SQLite is intentionally rejected by configuration validation.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Populate `.env` with Supabase PostgreSQL and Auth settings before running
migrations or seed data. Do not commit real credentials.

Required database/auth variables:

- `DATABASE_URL` or `SUPABASE_DB_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET` or `SUPABASE_JWKS_URL`
- `ALLOW_DEV_AUTH_FALLBACK=false`

## Commands

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.database.seed
$env:NEXUS_DEMO_PASSWORD='password'
.\.venv\Scripts\python.exe -m app.database.auth_seed
Remove-Item Env:\NEXUS_DEMO_PASSWORD
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

## Demo Logins

- `zian@nexus.corp` / `password`
- `authority@nexus.corp` / `password`
- `dr.vance@nexus.corp` / `password`

## Documentation

Project-level documentation is in `../docs/`:

- `architecture.md`
- `design.md`
- `user-guide.md`
- `api-reference.md`
- `assessment-evidence.md`
