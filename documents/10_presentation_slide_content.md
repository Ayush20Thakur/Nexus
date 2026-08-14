# NEXUS Presentation Slide Content

Use this as the source content for the PPT. Keep each slide visually clean:
title, 3 to 5 bullets, one screenshot or diagram where useful, and the speaker
notes as your talking points.

## Slide 1 - NEXUS

Subtitle:
Operational Intelligence for Inventory, Requests, Approvals, and Fulfillment

On-slide bullets:

- Full-stack web app built for operational decision workflows.
- Connects inventory, requests, approvals, fulfillment, reports, audit, and Copilot.
- Uses real backend calculations from Supabase PostgreSQL.
- Built and verified with an AI-assisted engineering loop.

Visual:
NEXUS dashboard screenshot or logo with a short system tagline.

Speaker notes:
NEXUS is a working operational intelligence app. The goal was to build more than
a static interface: every major number and workflow is backed by the database
and handled through the backend.

## Slide 2 - Problem

Title:
Operational Decisions Are Fragmented

On-slide bullets:

- Inventory, requests, approvals, and fulfillment often live in separate tools.
- Teams lose time checking stock, approval status, and priority manually.
- Critical requests can be delayed without a clear authority path.
- Reporting and audit trails become hard to trust.
- AI-style summaries are not useful unless they are grounded in live data.

Visual:
Simple flow showing disconnected systems: Spreadsheet, Email, Inventory Tracker,
Approval Chat, Reports.

Speaker notes:
The problem is not only tracking items. The real issue is decision quality:
whether the team can approve, reject, fulfill, and audit work with current
operational context.

## Slide 3 - Solution

Title:
One Connected Operational Workflow

On-slide bullets:

- Inventory -> request -> approval -> fulfillment -> report -> audit -> Copilot.
- Requests are evaluated with deterministic backend decision rules.
- Approvals calculate stock, procurement quantity, and safety-stock exposure.
- Dashboard and Insights show calculated KPIs and graphs.
- Copilot explains operational state from the connected database.

Visual:
Horizontal workflow diagram:
Inventory -> Requests -> Approvals -> Fulfillment -> Reports -> Audit -> Copilot

Speaker notes:
NEXUS connects the whole chain. A request is not isolated: it links to stock,
approval, fulfillment, reporting, audit, and the Copilot explanation layer.

## Slide 4 - Architecture

Title:
Full-Stack Architecture

On-slide bullets:

- Frontend: React, Vite, TypeScript, Zustand, Recharts.
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic settings.
- Database: Supabase PostgreSQL.
- Auth: Supabase Auth JWTs validated by the backend.
- Verification: pytest backend tests and Vite production build.

Visual:
Architecture diagram:
Browser -> React App -> FastAPI API -> Services -> SQLAlchemy -> Supabase PostgreSQL
Browser -> Supabase Auth -> JWT -> FastAPI validation

Speaker notes:
The frontend owns the user experience, but business decisions are centralized in
the backend. Supabase provides Auth and PostgreSQL, while FastAPI controls API
contracts, RBAC, rules, and calculated data.

## Slide 5 - AI Orchestration

Title:
AI Used As An Engineering Partner

On-slide bullets:

- Codex was used to implement, inspect, test, diagnose, and document the app.
- The AI loop included code changes, test runs, failure diagnosis, and fixes.
- NEXUS Copilot is a product feature, not just a demo label.
- Copilot stores conversations and answers from database-backed context.
- Request inference explains risk using evidence and next actions.

Visual:
Loop diagram:
Prompt -> Implement -> Test -> Fail -> Diagnose -> Fix -> Verify -> Document

Speaker notes:
AI was used in the way the assessment asks for: not just to generate code, but
to close a real build-test-fix loop. Inside the product, Copilot is grounded in
the database so it can answer operational questions like low stock, pending
approvals, and request details.

## Slide 6 - Security

Title:
Security And Authority Controls

On-slide bullets:

- Supabase Auth handles browser login.
- FastAPI validates JWT tokens before protected API access.
- RBAC separates Admin, Manager, Operator, and Viewer permissions.
- Higher-authority account supports critical approval review.
- No credentials are hardcoded or documented in plaintext.
- Audit events track key operational actions.

Visual:
Role table:
Admin - all access
Manager - approvals/reports/audit
Operator - requests/inventory/fulfillment
Viewer - read-only visibility

Speaker notes:
The app avoids fake local-only authentication. Login is handled through
Supabase Auth, and the backend maps authenticated users to NEXUS roles. Critical
flows are protected and auditable.

## Slide 7 - Robustness

Title:
Evidence That The System Actually Runs

On-slide bullets:

- Backend test suite passed: 16 tests.
- Deliberate red run caught a real decision-rule regression.
- Green run passed after restoring the rule.
- Frontend TypeScript and Vite production build passed.
- Seed dry run validates demo data coverage.
- Schema table evidence confirms 21 application tables.

Visual:
Evidence checklist with file names:
pytest-red-run.txt
pytest-green-run.txt
frontend-build.txt
seed-dry-run.txt
schema-tables.txt

Speaker notes:
The red run matters because it proves the tests are meaningful. I deliberately
broke the standard request auto-approval confidence threshold, pytest caught it,
then I restored the rule and reran the suite successfully.

## Slide 8 - Demo

Title:
Live Demo Flow

On-slide bullets:

- Login as the NEXUS admin account.
- Open Dashboard and show the Executive Brief.
- Click a recent request row to open the request dossier.
- Run Get AI Inference for risk, evidence, and next action.
- Open Copilot from the request and continue the explanation.
- Show approval or fulfillment workflow continuity.

Visual:
Numbered demo path with screenshots:
Dashboard -> Request Dossier -> AI Inference -> Copilot -> Approval/Fulfillment

Speaker notes:
This demo shows that the app is connected end to end. The dashboard identifies
risk, the request dossier explains one item, Copilot continues the analysis, and
the approval/fulfillment screens show how the operation moves forward.

## Slide 9 - Why It Is Better

Title:
What Makes NEXUS Stronger Than A CRUD Demo

On-slide bullets:

- Real operational rules and edge cases.
- Calculated dashboard and insight metrics.
- Explainable AI-style inference with evidence.
- Higher-authority approval path for critical work.
- Auditable state changes across request and fulfillment workflows.
- Faster loading through bootstrap caching and route preloading.

Visual:
Before/after comparison:
Disconnected tools vs connected, explainable, auditable workflow.

Speaker notes:
The value is that NEXUS makes decisions explainable. It does not only show a
request list. It answers why the request matters, what stock risk exists, who
should approve it, and what happens next.

## Slide 10 - Next Steps

Title:
Roadmap To Make NEXUS More Unique

On-slide bullets:

- Scenario Simulator: forecast impact of approving critical requests.
- Policy Explainer: map each decision to exact policy/rule triggers.
- Natural Language Report Builder: create reports from user prompts.
- Approval SLA Heatmap: expose slow teams, queues, and priority bottlenecks.
- Playwright E2E tests for login, request, inference, approval, and reports.
- CI pipeline for tests, build, migration check, seed dry run, and secret scan.

Visual:
Roadmap with three phases:
Phase 1 - Explainability
Phase 2 - Simulation
Phase 3 - Automation and CI

Speaker notes:
The next strongest improvement is simulation: showing what happens before a
manager approves a group of requests. After that, policy explainability and
E2E automation would make the app stronger for real operational use.

## Optional Closing Slide - Evidence And Repository

Title:
Submission Evidence

On-slide bullets:

- Source code: `Backend/` and `Fronted/`.
- Documentation: `documents/`.
- Test evidence: `documents/evidence/`.
- Local run guide: `how to run.txtt`.
- API docs: `http://127.0.0.1:8000/docs`.

Speaker notes:
The submission includes source, tests, docs, and evidence files. The app can be
run locally using the included guide, and the API can be inspected through the
FastAPI docs.
