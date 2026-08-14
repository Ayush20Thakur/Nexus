# Design And Data Model

## Data Model

The SQLAlchemy model registry contains 21 application tables:

- `roles`
- `role_permissions`
- `users`
- `sessions`
- `inventory_items`
- `operational_requests`
- `approvals`
- `fulfillment_orders`
- `ai_models`
- `decision_rules`
- `decision_outcomes`
- `engineering_requests`
- `engineering_telemetry_metrics`
- `policies`
- `policy_rules`
- `reports`
- `audit_events`
- `copilot_conversations`
- `copilot_messages`
- `system_settings`
- `user_settings`

The actual migration is managed by Alembic. The schema is PostgreSQL-oriented
and uses UUIDs, enums, JSONB metadata, timestamps, foreign keys, indexes, and
constraints.

## Important Entities

### Inventory Item

Represents stock that can be requested or fulfilled. Important fields include
SKU, category, zone, quantity on hand, quantity reserved, reorder threshold,
maximum capacity, status, supplier, and unit cost.

### Operational Request

Represents a user request for inventory, procurement, transfer, maintenance, or
emergency work. Important fields include request number, requester, department,
priority, status, quantity, linked inventory item, AI decision, confidence, and
reasoning.

### Approval

Represents manager or higher-authority review. It stores requested quantity,
available stock, procure quantity, safety stock, AI recommendation, confidence,
status, and decision note.

### Fulfillment Order

Represents approved execution. It tracks lifecycle stage, approved quantity,
stock context, carrier, tracking number, ETA, approval time, and fulfillment
time.

### Copilot Conversation And Message

Persists a user's conversation history and database-backed assistant responses.

## Key Workflows

### Create Request

1. User submits title, description, type, priority, department, quantity, and
   optional inventory item.
2. Backend calculates total value when an inventory item has unit cost.
3. Deterministic decision rules classify the request.
4. Request and approval records are created.
5. Audit event records the creation.

### Approval

1. Manager or authority opens pending approvals.
2. Backend applies RBAC to write actions.
3. Approve creates or updates fulfillment where applicable.
4. Reject or clarify updates the request and approval state.
5. Audit event records the decision.

### Fulfillment

1. Approved requests appear as fulfillment orders.
2. User advances lifecycle stage.
3. Backend updates fulfillment state and related records.
4. Stock changes remain backend-controlled.

### Reports

1. User creates a report row.
2. Backend stores metadata.
3. Download endpoint generates content from current DB state.
4. File metadata is calculated, not hardcoded.

### Copilot Chat

1. `GET /api/copilot/state` loads or creates a conversation.
2. `POST /api/copilot/chat` stores user and assistant messages.
3. Backend classifies intent: greeting, help, approvals, inventory, fulfillment,
   audit, request detail, or summary.
4. Response is rendered from current database counts and selected rows.

## Error Handling

- Invalid or missing rows return explicit HTTP 404 errors.
- Unsafe or invalid inputs return 422 or 409 errors.
- Unauthorized access returns 401.
- Forbidden role actions return 403.
- Frontend shows toast errors and does not claim success when the API fails.

## Robustness Decisions

- Decision logic is deterministic and tested.
- Database connection uses `pool_pre_ping`.
- Alembic controls schema migration.
- Seed is idempotent and has a dry-run mode.
- Auth seed repairs demo Supabase Auth records without printing secrets.
- Health endpoint reports database status without exposing URLs or passwords.
- Red/green evidence proves tests can fail and recover.
