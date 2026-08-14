# API And Auth Reference

Base URL:

```text
http://127.0.0.1:8000/api
```

Interactive docs in development:

```text
http://127.0.0.1:8000/docs
```

Most endpoints require:

```http
Authorization: Bearer <Supabase access token>
```

## Public

- `GET /health` - API and database health.

## Auth And Users

- `GET /auth/me` - current mapped NEXUS user.
- `GET /auth/session` - validate current session.
- `POST /auth/logout` - logout response.
- `GET /users/me` - current user profile.
- `GET /users` - admin-only user list.
- `POST /users` - admin-only user creation.
- `GET /users/system-units` - admin-only system unit summary.
- `PATCH /users/{user_id}/role` - admin-only role update.

## Analytics And Bootstrap

- `GET /bootstrap` - initial application payload.
- `GET /dashboard/summary` - calculated dashboard KPIs, charts, activity, and
  Executive Brief.
- `GET /insights/summary` - calculated insight KPIs and charts.

## Inventory

- `GET /inventory`
- `POST /inventory`
- `PATCH /inventory/{item_id}`
- `PATCH /inventory/{item_id}/stock`

## Requests And Approvals

- `GET /requests`
- `GET /requests/{request_id}`
- `POST /requests`
- `GET /approvals`
- `POST /approvals/{approval_id}/approve`
- `POST /approvals/{approval_id}/reject`
- `POST /approvals/{approval_id}/clarify`

## Fulfillment

- `GET /fulfillment`
- `POST /fulfillment`
- `POST /fulfillment/{order_id}/advance`

## Decision Engine

- `GET /decision-engine/rules`
- `GET /decision-engine/metrics`
- `POST /decision-engine/rules`
- `POST /decision-engine/rules/{rule_id}/toggle`
- `POST /decision-engine/simulate`

## Policies

- `GET /policies`
- `POST /policies`
- `PATCH /policies/{policy_id}`
- `POST /policies/{policy_id}/toggle`

## Reports

- `GET /reports`
- `POST /reports`
- `GET /reports/{report_id}/download`

## Copilot

- `GET /copilot/state`
- `POST /copilot/conversations`
- `POST /copilot/chat`
- `POST /copilot/inference`

Example request inference payload:

```json
{
  "entityType": "request",
  "entityId": "req-001"
}
```

Example response shape:

```json
{
  "entityType": "request",
  "entityId": "req-001",
  "title": "Compute Nodes (Type-Z)",
  "headline": "CRITICAL risk request with 92% AI confidence.",
  "decision": "APPROVE",
  "confidence": 92,
  "riskLevel": "CRITICAL",
  "summary": "Inventory levels critically low...",
  "evidence": ["Priority is CRITICAL."],
  "nextAction": "Escalate to the configured approval authority before fulfillment.",
  "generatedAt": "2026-08-14T...",
  "chatPrompt": "Give me more detail about request..."
}
```

## AI Engineering

- `GET /ai-engineering/models`
- `POST /ai-engineering/models`
- `GET /ai-engineering/requests`

## Audit And Settings

- `GET /audit`
- `GET /settings/profile`
- `PATCH /settings/profile`
- `GET /settings/preferences`
- `PATCH /settings/preferences`

## Auth Model

Supabase Auth owns browser login. FastAPI validates the Supabase JWT, then maps
the Supabase user to the `users` table.

Configured roles:

- `ADMIN` - full access.
- `MANAGER` - approvals, reports, policy read, audit read.
- `OPERATOR` - request creation, inventory read, fulfillment operations.
- `VIEWER` - read-only operational visibility.

Demo accounts:

- `zian@nexus.corp` - admin.
- `authority@nexus.corp` - higher authority manager.
- `dr.vance@nexus.corp` - research manager.

The shared demo password is documented in the local run guide, not in this API
reference. Database passwords and Supabase service keys must never be committed.
