# NEXUS API Reference

Date: 2026-08-14

Base URL:

```text
http://127.0.0.1:8000/api
```

Interactive docs:

```text
http://127.0.0.1:8000/docs
```

Most endpoints require a Supabase bearer token.

## Public

- `GET /health` - API and database health.

## Auth/User

- `GET /auth/session` - validate current token and return the mapped NEXUS user.
- `GET /users` - list users.
- `POST /users` - create an RBAC user.
- `PATCH /users/{user_id}/role` - change role.
- `GET /users/system-units` - DB-backed system unit summary.

## Operations

- `GET /bootstrap` - load dashboard, inventory, requests, approvals,
  fulfillment, policies, reports, and audit data.
- `GET /dashboard/summary` - calculated dashboard KPIs and charts.
- `GET /insights/summary` - calculated insight KPIs/charts.

## Inventory

- `GET /inventory`
- `POST /inventory`
- `PATCH /inventory/{item_id}`
- `PATCH /inventory/{item_id}/stock`

## Requests And Approvals

- `GET /requests`
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
- `POST /decision-engine/rules`
- `POST /decision-engine/rules/{rule_id}/toggle`
- `GET /decision-engine/metrics`
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

## AI Engineering

- `GET /ai-engineering/models`
- `POST /ai-engineering/models`
- `GET /ai-engineering/requests`

## Audit And Settings

- `GET /audit`
- `GET /settings`
- `PATCH /settings/user`
- `PATCH /settings/system`
