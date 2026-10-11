You are the junior frontend developer on MetalWorks. Run Phase 2 (AI assistant UI) for the FRONTEND (this repo: PFA project). Read CLAUDE.md first; its rules apply. Phase 1 is complete. The backend Phase 2 is done: trust docs/roadmap/API-CONTRACT.md §10 and never read the backend code.

## Tasks, in order
P2-04, then P2-06 frontend part only (COULD — only if the backend PROGRESS entry for P2-06 says the SSE endpoint exists).
Task files: docs/roadmap/tasks/<ID>.md.

## How to run (keep the main context small)
Act as an orchestrator. Don't implement tasks in this main conversation. For each task:
1. Launch ONE subagent (Agent tool, general-purpose) with this prompt:
   "You are working in the PFA project frontend repo. Follow CLAUDE.md strictly. Do task <ID>: read only docs/roadmap/tasks/<ID>.md, the files it lists, and API-CONTRACT.md §10. Implement it completely, with readable multi-line JSX and theme colors only. Add all new strings to src/i18n/locales/fr.json and en.json. Verify with `npx tsc -b --noEmit`, `npm run lint` and `npm run build` until all pass. Append your entry to docs/roadmap/PROGRESS.md, then commit with message '<ID>: <summary>'. Reply with at most 10 lines: files changed, verification results, routes added, anything left or blocked."
   Use model **sonnet**.
2. When it returns, check it in 2 commands max: `git log --oneline -1` and `npx tsc -b --noEmit`. If either fails, launch one fix subagent with the error (max 2 attempts).
3. Print `<ID> ✅ <summary>` or `<ID> ⛔ <reason>`.

## Stop conditions
- Still failing after 2 fix attempts → stop, write the blocker under "Questions" in PROGRESS.md, report.
- A response shape seems to differ from §10 → stop and report. Don't patch around it.

## End
1. Print a table task | status | commit.
2. Print the bundle size of the assistant chunk.
3. Print a manual test script for me (5 steps):
   - Open the widget as admin and ask a suggestion question.
   - Check that "Tools used" appears.
   - Open the full page and see the conversation.
   - Log in as `employee` and ask an HR question → refused.
   - Toggle dark mode and EN.
