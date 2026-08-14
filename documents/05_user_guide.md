# User Guide

## Start Locally

Backend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Backend"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.database.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd "C:\Users\zians\Downloads\New Tactive\Fronted"
npm install
npm run dev -- --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:3000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## Login

Use one of the seeded Supabase Auth accounts from `how to run.txtt`.

Recommended demo account:

- `zian@nexus.corp`

Higher authority account:

- `authority@nexus.corp`

## Main Screens

### Dashboard

Use the dashboard to see:

- Available inventory.
- Pending and critical requests.
- Operational health.
- Request volume.
- Inventory by zone.
- Live activity.
- Executive Brief.
- Recent request rows.

Click a recent request row to open its dossier.

### Executive Brief

The Executive Brief is a database-calculated snapshot. It shows readiness score,
risk posture, queue pressure, automation rate, AI confidence, and next actions.

Click `Brief` to open Copilot with an executive summary prompt.

### Inventory

Use Inventory to search SKUs, add items, and adjust stock. Stock changes go
through backend APIs and audit logging.

### Requests

Use Requests to:

- Create operational requests.
- Filter by status or priority.
- Click summary boxes to apply filters.
- Click any request card to open details.
- Click `AI Inference` to calculate live inference from backend records.
- Click `More Info in Copilot` to continue the investigation as a chat.

### Approvals

Use Approvals to approve, reject, or ask for clarification. Critical requests
are visible to the higher authority account.

### Fulfillment

Use Fulfillment to advance approved work through:

- Queued.
- Processing.
- Allocated.
- Shipped.
- Delivered.

### Insights

Use Insights to review request trends, inventory distribution, and calculated
KPIs. Tooltips are styled for readable dark overlays.

### Reports

Create and download backend-generated reports. Report content and file metadata
are derived from current records.

### Copilot

Ask natural language questions such as:

- `hi`
- `what approvals are pending?`
- `show low stock SKUs`
- `summarize fulfillment`
- `explain REQ-2094-A`
- `create an executive risk brief with next actions`

Copilot answers are persisted and generated from the connected database.

### Admin Console

Admins can create users, cycle roles, and inspect system units.
