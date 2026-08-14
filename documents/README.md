# NEXUS Assessment Documentation Pack

Date: 2026-08-14

This folder is the assessment-facing documentation set for the NEXUS web app.
It is based on the Tactive assessment PDF, which asks for a runnable web app,
test automation, a red/green evidence loop, an AI change-loop log, architecture
and design docs, a user guide, and demo material.

## What NEXUS Solves

NEXUS is an operational intelligence system for inventory-heavy teams. It
connects requests, approvals, fulfillment, inventory, reports, audit activity,
admin/RBAC, and a database-backed Copilot into one workflow. The app is not a
to-do list: every dashboard number, graph, request decision, and inference view
is calculated from backend or database records.

## Documentation Files

- `01_problem_solution.md` - problem, solution, why it is better, and scope.
- `02_architecture.md` - components, architecture, data flow, and deployment.
- `03_design_data_model.md` - schema, business flows, state transitions, and errors.
- `04_api_auth_reference.md` - API inventory, auth model, roles, and examples.
- `05_user_guide.md` - local run instructions and user workflow guide.
- `06_testing_ai_loop_robustness.md` - test strategy, red run, green run, and robustness.
- `07_agents_used.md` - AI tools/agents used and what each was used for.
- `08_unique_features_and_roadmap.md` - implemented differentiators and suggested next upgrades.
- `09_demo_script_and_deck.md` - 5-minute video script and presentation deck outline.

## Evidence Files

- `evidence/pytest-red-run.txt` - deliberate regression caught by pytest.
- `evidence/pytest-green-run.txt` - restored green backend test run.
- `evidence/frontend-build.txt` - TypeScript and Vite production build.
- `evidence/seed-dry-run.txt` - seed coverage counts.
- `evidence/schema-tables.txt` - registered PostgreSQL schema tables.
- `evidence/executive-brief-runtime.txt` - live Executive Brief calculation check.

## Current Verification Summary

- Backend tests: `16 passed, 1 warning`.
- Frontend build: passed.
- Seed dry run: 4 roles, 6 users, 25 inventory items, 25 operational requests,
  13 approvals, 13 fulfillment orders, 4 decision rules, 4 AI models,
  2 engineering requests, 4 policies, 15 audit events, 10 reports, and
  1 seeded Copilot message.
- Schema model registry: 21 application tables.
- Executive Brief runtime check: status `AT_RISK`, readiness score `60`,
  queue pressure `18`, automation rate `78`, average AI confidence `91`.

## Submission Notes

Do not place real `.env` values, Supabase service keys, JWT secrets, or database
passwords in this folder. The documents describe required variables by name
only.
