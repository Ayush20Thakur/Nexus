# Agents And AI Tools Used

The assessment asks to name every AI tool used and explain what it was used for.

## AI Tools

### OpenAI ChatGPT / Codex Coding Agent

Used for:

- Reading and understanding the existing workspace.
- Implementing backend services.
- Connecting Supabase PostgreSQL and Supabase Auth flows.
- Building deterministic decision logic.
- Adding Copilot natural language intent handling.
- Adding request inference and Executive Brief features.
- Improving frontend loading behavior with bootstrap caching and route preloads.
- Writing documentation.
- Running tests/builds and reporting exact outcomes.
- Capturing a red/green test loop.

### NEXUS Copilot In-App Assistant

Used as an implemented product feature, not as an external coding tool.

The in-app Copilot:

- Stores conversations in the database.
- Classifies natural language intent.
- Answers from current database records.
- Explains requests, approvals, fulfillment, audit, inventory, and summaries.
- Accepts follow-up prompts from request dossiers and the Executive Brief.

## Human Inputs

The project owner supplied:

- The assessment PDF.
- Supabase project details.
- Local workspace location.
- Product requirements and constraints.
- The instruction to preserve the general UI while refining functionality.

Secrets are not included in this documentation.

## Agentic Change Loop Summary

The implementation used an AI-assisted loop:

1. Inspect source and requirements.
2. Implement a targeted feature.
3. Run tests/build.
4. Diagnose failures.
5. Patch the source.
6. Re-run verification.
7. Document evidence.

Specific examples:

- Copilot initially answered `hi` as an operations summary. It now routes short
  greetings to a conversational response.
- Copilot initially replaced chat history with only the latest pair. It now
  returns the full conversation.
- Dashboard and Insights initially duplicated data loads. They now reuse the
  bootstrap summary payload.
- Request records initially had details but no live inference action. They now
  support a dossier modal with backend-calculated inference and Copilot handoff.
- A deliberate backend rule regression was introduced and caught by pytest, then
  restored and verified green.
