# Demo Script And Presentation Deck

## Five-Minute Demo Script

### 0:00 - 0:45 Problem

Operational inventory teams handle requests, approvals, fulfillment, and
reporting across disconnected tools. That creates slow approvals, unclear stock
availability, and weak auditability.

### 0:45 - 1:30 Approach

NEXUS connects the full workflow into one app:

- Supabase Auth for login.
- FastAPI backend for rules and APIs.
- Supabase PostgreSQL for persistence.
- React frontend for operational workflows.
- Database-backed Copilot for explanations.
- Tests and red/green evidence for correctness.

### 1:30 - 2:00 Solution Summary

The system calculates every metric from backend records. It supports inventory,
requests, approvals, fulfillment, reports, audit, admin, Copilot, and live AI
inference for individual requests.

### 2:00 - 3:00 Live Demo Part 1

1. Login as `zian@nexus.corp`.
2. Open Dashboard.
3. Show the Executive Brief.
4. Click a recent request row.
5. Click `Get AI Inference`.
6. Explain evidence, risk level, confidence, and next action.

### 3:00 - 4:00 Live Demo Part 2

1. Click `More Info in Copilot`.
2. Show Copilot answering with request context.
3. Ask `hi` to show conversational handling.
4. Ask `show low stock SKUs`.
5. Show that answers are operational and data-backed.

### 4:00 - 4:40 Live Demo Part 3

1. Open Requests.
2. Click summary cards to filter.
3. Create a new request.
4. Open Approvals or Fulfillment to show workflow continuity.

### 4:40 - 5:00 Evidence

Show `documents/evidence`:

- Red pytest run caught a deliberate decision-rule regression.
- Green pytest run passed after restoration.
- Frontend build passed.
- Seed dry run and schema table evidence exist.

## Presentation Deck Outline

### Slide 1 - NEXUS

Operational intelligence for inventory, requests, approvals, and fulfillment.

### Slide 2 - Problem

Disconnected operational systems create slow decisions and weak audit trails.

### Slide 3 - Solution

One connected workflow: inventory -> request -> approval -> fulfillment ->
report -> audit -> Copilot.

### Slide 4 - Architecture

React frontend, FastAPI backend, Supabase Auth, Supabase PostgreSQL, SQLAlchemy,
Alembic, pytest, Vite build.

### Slide 5 - AI Orchestration

Codex built and refined features; NEXUS Copilot answers from database records;
request inference explains decisions with evidence.

### Slide 6 - Security

JWT validation, RBAC, no hardcoded secrets, PostgreSQL-only config, audited
operations.

### Slide 7 - Robustness

Red/green test loop, deterministic rules, health checks, seed dry run,
schema evidence, frontend build.

### Slide 8 - Demo

Dashboard Executive Brief, request dossier, AI inference, Copilot handoff,
approval/fulfillment path.

### Slide 9 - Why It Is Better

Real rules, explainable AI-style UX, calculated metrics, authority flow,
auditable operations.

### Slide 10 - Next Steps

Scenario simulator, policy explainer, natural language report builder,
Playwright E2E tests, CI pipeline, optional real LLM provider.
