# Problem And Solution

## Assessment Context

The assessment brief asks for a small but real working web application, not a
static mockup. It also asks for AI-generated tests, a red/green loop, an
AI-assisted change loop, clear documentation, and a short demo.

NEXUS uses the inventory and operational approval scenario because it has real
rules, edge cases, authority boundaries, and measurable outcomes:

- Inventory cannot be allocated below safety stock without escalation.
- Critical requests must be visible and routed to higher authority.
- Approval, rejection, clarification, and fulfillment have state transitions.
- Reports and dashboards must be calculated from records.
- Auditability matters because operational decisions change stock and risk.

## The Problem

Operational teams often have data split across spreadsheets, request forms,
inventory trackers, approval messages, and manual status updates. This creates:

- Slow approval cycles.
- Unclear stock availability.
- Weak audit trails.
- Manual reporting.
- Decisions made without current risk context.
- AI features that look useful but are not grounded in live data.

## The Solution

NEXUS provides a connected web app where a user can:

- Sign in with Supabase Auth.
- View live operational KPIs.
- Create inventory-backed operational requests.
- Review AI decision reasoning.
- Approve, reject, or clarify requests.
- Move approved work through fulfillment.
- Generate database-backed reports.
- Inspect policies, audit events, users, and system units.
- Ask NEXUS Copilot natural language questions against current database state.
- Open request dossiers and request live AI inference for each request.
- Use the dashboard Executive Brief for a calculated risk posture and next actions.

## Why This Is Better

NEXUS is better than a shallow CRUD demo because it connects the full operational
chain:

- The request flow changes approvals and fulfillment.
- Inventory status influences decision reasoning.
- Dashboard and insight charts are calculated from database records.
- The Copilot stores conversation history and answers using database context.
- The Executive Brief uses real counts and confidence values instead of static text.
- Audit events make system activity explainable.
- Auth and RBAC separate admin, manager, operator, and viewer authority.

## Scope

Implemented scope:

- React + Vite frontend.
- FastAPI backend.
- Supabase PostgreSQL persistence.
- Supabase Auth JWT validation.
- Alembic migrations.
- Seeded demo data.
- Backend pytest suite.
- Frontend TypeScript/Vite build.
- Red/green evidence loop.
- Documentation pack.

Out of scope for this local assessment pass:

- Production hosting.
- Full Playwright end-to-end browser suite.
- Recorded MP4 demo file.
- Paid external AI API inference. Current Copilot behavior is deterministic and
  database-backed to keep the project runnable without paid services.
