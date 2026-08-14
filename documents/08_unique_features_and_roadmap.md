# Unique Features And Roadmap

## Implemented Differentiators

### Database-Backed Copilot

The Copilot is not a static FAQ. It uses current PostgreSQL counts and records
to answer about approvals, inventory, fulfillment, audit activity, reports, and
request numbers.

### Request Dossier With Live Inference

Users can click any request card or dashboard recent request row to open a
dossier. `Get AI Inference` calculates:

- Risk level.
- Confidence.
- Evidence list.
- Stock and safety-stock context.
- Approval/procurement implications.
- Next action.

### Executive Brief

The dashboard includes a calculated Executive Brief. It combines operational
health, inventory coverage, request flow, approval throughput, fulfillment
completion, automation rate, and average AI confidence.

### Higher Authority Flow

The seed includes a higher authority manager account:

- `authority@nexus.corp`

Critical approval records and audit events include higher-authority context.

### Evidence-Oriented Engineering

The repo includes:

- Green backend test output.
- Deliberate red-run output.
- Frontend build output.
- Seed dry-run output.
- Schema table evidence.

## Why These Make The App Stronger

- They prove the app is not only UI polish.
- They connect AI-style experiences to actual backend state.
- They make decisions explainable through evidence instead of opaque labels.
- They support the assessment's focus on AI-directed engineering judgment.
- They give the demo a clear story: risk enters the system, NEXUS explains it,
  an authority acts, fulfillment moves, and audit/reporting capture the result.

## Future Features To Make NEXUS More Unique

These are the strongest next additions, in priority order:

1. Scenario Simulator

   Let a manager ask "what if we approve all critical requests today?" and show
   projected stock, reorder exposure, and fulfillment backlog.

2. Policy Explainer

   Link every AI decision to the exact decision rule, policy clause, and data
   fields that triggered it.

3. Natural Language Report Builder

   Let users type "make a weekly critical approval report" and generate the
   report with filters, date window, and export format.

4. Approval SLA Heatmap

   Show departments, approvers, and priority levels where approval latency is
   building up.

5. Inventory Anomaly Watch

   Detect suspicious stock drops, high reserve ratios, or repeated emergency
   requests.

6. RLS Policy Hardening

   Add Supabase Row Level Security policies matching the backend RBAC roles.

7. E2E Browser Tests

   Add Playwright tests for login, request creation, inference modal, Copilot
   handoff, approval, fulfillment, and report download.

8. CI Pipeline

   Add GitHub Actions for backend tests, frontend build, lint, migration check,
   seed dry run, and secret scan.

9. Demo Mode Snapshot Export

   Add a single button to export evidence: schema counts, test summary, current
   KPIs, and an audit digest.

10. Real LLM Provider Option

   Keep deterministic fallback behavior, but optionally connect to an LLM for
   richer natural language while still grounding answers in backend data.
