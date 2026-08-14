# NEXUS User Guide

Date: 2026-08-14

## Start The App

Follow `how to run.txtt` from the project root.

Backend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Fronted"
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:3000`.

## Demo Logins

- Admin: `zian@nexus.corp` / `password`
- Higher authority: `authority@nexus.corp` / `password`
- Research manager: `dr.vance@nexus.corp` / `password`

## Main Workflows

- Dashboard: view live operational KPIs, request volume, inventory by zone, and
  audit activity.
- Inventory: search/filter inventory, add new SKUs, export CSV, and adjust
  stock.
- Requests: create operational requests and review AI decision reasoning.
- Approvals: approve, reject, or request clarification for pending approvals.
- Fulfillment: advance orders through queued, processing, allocated, shipped,
  and delivered states.
- Insights: inspect calculated request trends and inventory distribution, then
  export the visible data.
- Reports: generate and download backend-created reports.
- Copilot: ask operational questions. Answers come from database records.
- Policy Center: create policies and activate/archive them.
- Admin Console: create RBAC users, cycle roles, and inspect system units.
- AI Engineering: view/deploy model records and inspect engineering pipelines.

## Health Check

Open `http://127.0.0.1:8000/api/health`.

Healthy result means:

- API status is `ok`
- Database status is `ok`
- Database URL is configured
