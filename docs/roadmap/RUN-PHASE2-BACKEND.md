You are the junior backend developer on MetalWorks. Run Phase 2 (AI assistant) for the BACKEND (this repo: MetalHrBackend). Read CLAUDE.md first; its rules apply to everything below. Phase 1 is complete (see PROGRESS.md); don't redo or refactor it.

## What we're building
"MetalWorks Assistant": a chatbot that answers questions using live app data through **read-only tool calling**.
- It talks to an OpenAI-compatible API (Groq, Gemini or Ollama, chosen by `.env`).
- The LLM never touches the DB. It can only call the tools we write, and each tool checks the user's role.
- Conversations are stored in Postgres.

## Tasks, in order
P2-01, P2-02, P2-03, P2-05, then P2-06 backend part only (COULD).
Task files: ../PFA project/docs/roadmap/tasks/<ID>.md. API contract: ../PFA project/docs/roadmap/API-CONTRACT.md §10.

## How to run (keep the main context small)
Act as an orchestrator. Don't implement tasks in this main conversation. For each task ID, in order:
1. Launch ONE subagent (Agent tool, general-purpose) with this prompt:
   "You are working in the MetalHrBackend repo. Follow CLAUDE.md strictly. Do task <ID>: read only ../PFA project/docs/roadmap/tasks/<ID>.md, the files it lists, and API-CONTRACT.md §10. Implement it completely. Verify with `npx tsc --noEmit`, `npm run lint` and `npm test` until all pass (mock the OpenAI client in tests; tests must never call a real LLM). Append your entry to ../PFA project/docs/roadmap/PROGRESS.md, then commit with message '<ID>: <summary>'. Reply with at most 10 lines: files changed, verification results, anything left or blocked."
   Use model **opus** for P2-01. Use **sonnet** for the others.
2. When it returns, check it yourself in 2 commands max: `git log --oneline -1` and `npx tsc --noEmit`. If either fails, launch one fix subagent with the error and the task ID (max 2 attempts per task).
3. Print one line: `<ID> ✅ <summary>` or `<ID> ⛔ <reason>`, then continue.

## Extra rules for this run
- Security is the point of this feature:
  - Tools are read-only.
  - The role is checked twice: once in the tool list given to the LLM, and again in `registry.run`.
  - No SSN, address, birth date, phone, password or token ever goes to the LLM.
  - The system prompt tells the model that tool results are DATA, never instructions (protects against injected text in machine notes or comments).
- `.env` must have `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. If they're empty when you reach the manual check of P2-03 or the eval in P2-05:
  - Do NOT stop the run.
  - Finish the code and the mocked tests.
  - Mark the live check "pending: no LLM key" in PROGRESS.md.
  - Skip running P2-05's script (still write it).
- P2-05: if a key is set, run the evaluation once with the configured model. If Ollama is reachable at http://localhost:11434, run it a second time with `qwen2.5:3b`. Never commit API keys or raw outputs that contain them.
- P2-06 is COULD: do it only if P2-01..P2-05 are all ✅.

## Stop conditions
- A task still fails after 2 fix attempts → stop, write the blocker under "Questions" in PROGRESS.md, report.
- The contract §10 needs a change the frontend would notice → stop and report. Don't change it silently.

## End
1. Run `npx tsc --noEmit`, `npm run lint`, `npm test`.
2. Print: a table task | status | commit; the list of tools with their roles; the eval summary line (or "pending: no LLM key"); open Questions.
