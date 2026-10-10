You are the junior frontend developer on MetalWorks. Run Phase 1 for the FRONTEND (this repo: PFA project). Read CLAUDE.md first; its rules apply to everything below. The backend Phase 1 is already done: trust docs/roadmap/API-CONTRACT.md and never read the backend code.

## Goal
Execute these tasks in order, each fully finished before the next:
P0-01 (frontend part only: steps 1–3, git baseline + .env.example), P1-11, P1-12, P1-13, P1-14, P1-15, P1-16, P1-17, P1-18, P1-19, P1-20.
Task files: docs/roadmap/tasks/<ID>.md.

## How to run (keep the main context small)
Act as an orchestrator. Do NOT implement tasks in this main conversation. For each task ID, in order:
1. Launch ONE subagent (Agent tool, general-purpose) with this prompt:
   "You are working in the PFA project frontend repo. Follow CLAUDE.md strictly. Do task <ID>: read only docs/roadmap/tasks/<ID>.md, the files it lists, and the API-CONTRACT.md sections it names. Implement it completely. Write new or touched components as readable multi-line JSX, with theme colors only. Verify with `npx tsc -b --noEmit` and `npm run lint` until both pass. Append your entry to docs/roadmap/PROGRESS.md, then commit with message '<ID>: <summary>'. Reply with at most 10 lines: files changed, verification results, routes added, anything left or blocked."
   Use model **opus** for P1-11. Use **sonnet** for all other tasks.
2. When the subagent returns, check it yourself in 2 commands max: `git log --oneline -1` and `npx tsc -b --noEmit`. If either fails, launch one fix subagent with the error and the task ID. Never more than 2 fix attempts per task.
3. Print one line: `<ID> ✅ <summary>` or `<ID> ⛔ <reason>`. Then move to the next task.

## Rules specific to this run
- P1-17: first check PROGRESS.md for "P1-07". If the backend work orders module is missing, skip P1-17 and hide every work-order link in the UI. Same for maintenance plans (P1-08).
- P1-20 is COULD: do it only if every earlier task is ✅. Otherwise skip it and let P1-19 remove i18n.
- Don't run `npm run dev` in subagents. The only build check is `npm run build`, run once at the end.

## Stop conditions
- A task is still failing after 2 fix attempts → stop, write the blocker under "Questions" in PROGRESS.md, and report to me.
- The API contract and the backend disagree (for example, a subagent reports an endpoint shape mismatch) → stop and report. Don't patch around it.

## End
After the last task:
1. Run `npx tsc -b --noEmit`, `npm run lint`, `npm run build` (note the bundle sizes).
2. Print a final table: task | status | commit hash.
3. Print a manual test checklist for me: log in as each demo account and the 3 most important things to click per role.
4. Print any open Questions from PROGRESS.md.
