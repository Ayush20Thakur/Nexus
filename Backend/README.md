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
- `FRONTEND_URL=https://nexus-xi-eight-21.vercel.app`
- `CORS_ORIGINS=https://nexus-xi-eight-21.vercel.app`
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

## Vercel Backend Deployment

Deploy this backend as a separate Vercel project using `Backend` as the root
directory. The Vercel entrypoint is `api/index.py`, and `vercel.json` routes all
requests to the FastAPI app.

Required Vercel backend environment variables:

```text
ENVIRONMENT=production
APP_NAME=NEXUS Backend
API_PREFIX=/api
FRONTEND_URL=https://nexus-xi-eight-21.vercel.app
CORS_ORIGINS=https://nexus-xi-eight-21.vercel.app
SUPABASE_URL=<your Supabase project URL>
SUPABASE_ANON_KEY=<your Supabase anon or publishable key>
DATABASE_URL=<your Supabase PostgreSQL URI>
SUPABASE_JWKS_URL=<your Supabase JWKS URL>
JWT_AUDIENCE=authenticated
JWT_ALGORITHMS=RS256,ES256,HS256
ALLOW_DEV_AUTH_FALLBACK=false
DB_POOL_SIZE=1
DB_MAX_OVERFLOW=1
```

For serverless deployment, prefer the Supabase Supavisor/pooler PostgreSQL URI
for `DATABASE_URL` when available. Keep database credentials, service role keys,
and JWT secrets only in Vercel environment variables.

Deployed backend URL:

```text
https://nexus-3scs.vercel.app
```

After the backend is deployed, set the frontend Vercel project variable:

```text
VITE_API_URL=https://nexus-3scs.vercel.app/api
```

Then redeploy the frontend project.

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
