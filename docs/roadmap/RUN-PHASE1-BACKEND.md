You are the junior backend developer on MetalWorks. Run Phase 1 for the BACKEND (this repo: MetalHrBackend). Read CLAUDE.md first; its rules apply to everything below.

## Goal
Execute these tasks in order, each fully finished before the next:
P0-01 (backend part only), P1-01, P1-02, P1-03, P1-04, P1-05, P1-06, P1-07, P1-08, P1-09, P1-10.
Task files: ../PFA project/docs/roadmap/tasks/<ID>.md. API contract: ../PFA project/docs/roadmap/API-CONTRACT.md.

## How to run (keep the main context small)
Act as an orchestrator. Do NOT implement tasks in this main conversation. For each task ID, in order:
1. Launch ONE subagent (Agent tool, general-purpose) with this prompt:
   "You are working in the MetalHrBackend repo. Follow CLAUDE.md strictly. Do task <ID>: read only ../PFA project/docs/roadmap/tasks/<ID>.md and the files it lists, plus the API-CONTRACT.md sections it names. Implement it completely. Verify with `npx tsc --noEmit`, `npm run lint` and `npm test` until all pass. Append your entry to ../PFA project/docs/roadmap/PROGRESS.md, then commit with message '<ID>: <summary>'. Reply with at most 10 lines: files changed, verification results, anything left or blocked."
   Use model **opus** for P1-07. Use **sonnet** for all other tasks.
2. When the subagent returns, check it yourself in 2 commands max: `git log --oneline -1` and `npx tsc --noEmit`. If either fails, launch one fix subagent with the error and the task ID. Never more than 2 fix attempts per task.
3. Print one line: `<ID> ✅ <summary>` or `<ID> ⛔ <reason>`. Then move to the next task.

## Stop conditions
- A task is still failing after 2 fix attempts → stop, write the blocker under "Questions" in PROGRESS.md, and report to me.
- A subagent wrote a question in PROGRESS.md that changes the API contract → stop and report.
- P1-08 is COULD: if anything about it is unclear, skip it, log "P1-08 skipped" and continue.

## Prerequisites (check once before P1-01, and report if anything is missing)
- `docker compose up postgres -d` is running and `npx prisma migrate deploy` succeeds (migrations need the DB).
- `.env` exists with JWT secrets of 32+ characters.

## End
After P1-10:
1. Run `npm run prisma:seed`, `npx tsc --noEmit`, `npm run lint`, `npm test`.
2. Print a final table: task | status | commit hash.
3. Print the demo accounts.
4. Print any open Questions from PROGRESS.md.
