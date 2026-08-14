# NEXUS Design Document

Date: 2026-08-14

## Data Model

Core public schema tables:

- Auth/RBAC: `roles`, `role_permissions`, `users`, `sessions`
- Inventory: `inventory_items`
- Operations: `operational_requests`, `approvals`, `fulfillment_orders`
- Intelligence: `decision_rules`, `decision_outcomes`, `ai_models`,
  `engineering_requests`, `engineering_telemetry_metrics`
- Governance: `policies`, `policy_rules`
- Reporting/Audit: `reports`, `audit_events`
- Copilot/Settings: `copilot_conversations`, `copilot_messages`,
  `system_settings`, `user_settings`

`alembic_version` tracks the migration revision.

## Key Flows

### Login

1. User enters email/password.
2. Frontend calls Supabase Auth.
3. Backend receives the JWT.
4. Backend validates the token and maps the email/auth ID to `public.users`.

### Inventory

- List, create, edit, and stock-adjust operations call FastAPI.
- Stock status is inferred by backend rules from on-hand, reorder threshold,
  and max capacity.
- Stock adjustment records an audit event.

### Requests And Approvals

- New requests are evaluated by deterministic backend decision logic.
- Requests needing human review create approval records.
- Approval actions update request/approval state and can dispatch fulfillment.

### Fulfillment

- Fulfillment orders are DB records.
- Advancing status updates fulfillment state and related inventory/request data
  where applicable.

### Reports

- Reports are DB records.
- Download endpoints generate content at request time from current DB metrics.
- File size/pages are calculated, not hardcoded.

### Copilot

- `GET /api/copilot/state` loads or creates a conversation.
- `POST /api/copilot/chat` persists the user message and assistant response.
- Responses are generated from current PostgreSQL counts and records.

## Error Handling

- Backend routes raise explicit FastAPI `HTTPException` errors for missing rows,
  invalid state, invalid credentials, or unsafe transitions.
- Frontend actions show toast errors and do not fake success.
- Database health exposes configured/ok/degraded status without secrets.

## Security

- Secrets stay in `.env` files and are not documented in plaintext.
- Supabase Auth owns browser login.
- Backend validates JWTs and applies RBAC helper dependencies for write/admin
  endpoints.
- Development fallback auth is disabled by environment.
