# MetalWorks — Project roadmap

HR management + machine maintenance platform. React frontend (`PFA project`) + Node/Express/Prisma backend (`MetalHrBackend`).

Four phases, in order:

| Phase | Goal | Output |
|---|---|---|
| 1 | Fix and complete the CRUD, finish the HR and maintenance modules, polish the UI | A complete, stable app |
| 2 | AI assistant (a chatbot that answers from live app data) | Chat widget + chat page + evaluation |
| 3 | 30-page report (template coming later) | Diagrams, screenshots, written chapters |
| 4 | Deploy on a VM on another PC | Docker setup + step-by-step guide |

---

## How to run the tasks with Claude Code (read this once)

1. **Open Claude Code in the right folder.** Each task file says `Repo: backend` (open `MetalHrBackend`) or `Repo: frontend` (open `PFA project`).
2. **Start a clean session per task.** Type `/clear` before every new task.
3. **Pick the model the task says.** Most tasks: `/model sonnet` (cheaper, good for clear tasks). Tasks marked **Opus**: `/model opus` (design-heavy).
4. **Paste one line:** `Do task P1-03.` That's the whole prompt. The `CLAUDE.md` in each repo tells Claude Code where the task file is and how to work.
5. **When it finishes:** check that it committed and updated `PROGRESS.md`. Quickly test in the browser if the task touched the UI.
6. **If it asks a question in PROGRESS.md:** answer it in the chat, or bring it back to the senior (me).

### Token rules for you
- Don't ask Claude Code to "analyze the whole project" again. The analysis is already in `CLAUDE.md` and the task files.
- Don't paste huge logs. Say "the error is in the terminal output of `npm run dev`" or save it to a file and point to the file.
- One task = one session. If a session gets long, use `/compact`, or finish and `/clear`.
- Backend first, then the matching frontend task. They meet through `API-CONTRACT.md`, so neither side reads the other's code.

---

## Priorities (in case time runs short)

- **MUST**: needed for a working, defensible app and demo.
- **SHOULD**: makes it clearly better. Do it if you have the time.
- **COULD**: nice extras. Skip them first.

Minimum path if time is very short: P0 → all MUST tasks in phase 1 → P2-01 to P2-04 → P3 → P4.

---

## Phase 0 — Setup (½ day)

| ID | Repo | Model | Prio | Task |
|---|---|---|---|---|
| P0-01 | both | Sonnet | MUST | Git init + baseline commit in both repos, env file cleanup |

## Phase 1 — Fix and complete the CRUD, polish the UI

### Backend
| ID | Model | Prio | Task |
|---|---|---|---|
| P1-01 | Sonnet | MUST | Error handling: Prisma errors → 404/409, correct error labels, codes, trust proxy |
| P1-02 | Sonnet | MUST | Auth and rate-limit fixes (limiter scope, case-insensitive login, lock handling) |
| P1-03 | Sonnet | MUST | Audit logging wired into every write action |
| P1-04 | Sonnet | MUST | Machines: status rules, image files on disk, decimals, operators, maintenance interval |
| P1-05 | Sonnet | MUST | Users: shared role enum, generated username, temp password fallback, unlock, employee link |
| P1-06 | Sonnet | MUST | HR: employees/departments/positions hardening + filters + options endpoint |
| P1-07 | **Opus** | SHOULD | Work orders module (API + notifications) |
| P1-08 | Sonnet | COULD | Maintenance plans + "generate work order" |
| P1-09 | Sonnet | MUST | Notifications (pagination, unread count, read-all) + role dashboards |
| P1-10 | Sonnet | MUST | Backend tests + seed cleanup + remove dead code |

### Frontend
| ID | Model | Prio | Task |
|---|---|---|---|
| P1-11 | **Opus** | MUST | Foundation: refresh queue, error helper, toasts, shared table/dialog/empty-state components, debounce |
| P1-12 | Sonnet | MUST | Theme and layout pass: dark-mode-safe tokens, nav per role, breadcrumbs, 403/404 pages |
| P1-13 | Sonnet | MUST | Auth pages: login errors, forgot/reset password, password checklist, real profile |
| P1-14 | Sonnet | MUST | Users admin: table, filters, create/edit/disable/reset/unlock/delete |
| P1-15 | Sonnet | MUST | Machines: full CRUD form, image upload, pagination, detail (notes, history, operators) |
| P1-16 | Sonnet | MUST | HR pages: employees list/form/detail, departments and positions |
| P1-17 | Sonnet | SHOULD | Work orders UI (+ maintenance plans if P1-08 was done) |
| P1-18 | Sonnet | MUST | Notifications bell + role-based dashboards |
| P1-19 | Sonnet | MUST | Audit log page (filters, pagination, metadata) + final QA pass |
| P1-20 | Sonnet | COULD | French/English language switch |

## Phase 2 — AI assistant ("MetalWorks Assistant")

**What it is.** A chatbot that answers questions using live data through **tool calling**. The LLM never sees the database directly. It can only call read-only functions that we write (for example `get_machines_in_breakdown`). Each function checks the user's role, so the bot can never show a user data they couldn't already see in the app.

Example questions it answers:
- "Which machines are broken down?"
- "What's overdue for maintenance?"
- "Summarize the history of CNC-001."
- "How many employees are on leave in Welding?"
- "How do I change a machine's status?"

**LLM provider.** The code uses the OpenAI-compatible API, so one setting (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`) works with:
- **Groq** or **Google Gemini** (free tiers, fast). Recommended for development and the demo. Needs internet.
- **Ollama** (local, offline, free). Runs inside the VM. Slow without a GPU, and needs 8 GB RAM for a 3B model. Use it as the offline fallback.

| ID | Repo | Model | Prio | Task |
|---|---|---|---|---|
| P2-01 | backend | **Opus** | MUST | LLM client + config + conversation tables + assistant service loop |
| P2-02 | backend | Sonnet | MUST | Tool catalogue (read-only, role-filtered) + unit tests |
| P2-03 | backend | Sonnet | MUST | Assistant endpoints, rate limit, audit, suggestions |
| P2-04 | frontend | Sonnet | MUST | Chat widget + /assistant page |
| P2-05 | backend | Sonnet | SHOULD | Evaluation script (20 questions → accuracy and latency table for the report) |
| P2-06 | both | Sonnet | COULD | Streaming answers (SSE) |

## Phase 3 — Report (about 30 pages)

| ID | Who | Task |
|---|---|---|
| P3-01 | Claude Code (Sonnet) | Generate all diagrams as Mermaid + PNG (use case, class/ER, sequence ×3, architecture, deployment) |
| P3-02 | Claude Code (Sonnet) | Playwright screenshot script: every page × every role, light theme, seeded data |
| P3-03 | Claude Code (Sonnet) | Facts sheet: stack versions, endpoint count, test results, LOC, evaluation table |
| P3-04 | **You + senior (me)** | When the template arrives, send it to me in this chat with P3-01..03 outputs; I write the report in the template's format |

Proposed outline (we'll adapt it to the template):

| Chapter | Pages |
|---|---|
| General introduction | 1 |
| Ch.1 Project context: organisation, problem statement, study of existing solutions, proposed solution, methodology (Scrum, sprints = our phases) | 5 |
| Ch.2 Analysis and requirements: actors, functional and non-functional requirements, use case diagrams, product backlog | 6 |
| Ch.3 Design: 3-tier architecture, class/ER diagram, sequence diagrams (login, status change, assistant), security design | 6 |
| Ch.4 Implementation: environment and tech choices, screenshots per module with short explanations | 7 |
| Ch.5 AI assistant: architecture, tool calling, security, evaluation results | 3 |
| Ch.6 Testing and deployment: tests, Docker, VM deployment | 2 |
| General conclusion and future work | 1 |

## Phase 4 — Deployment on a VM (another PC)

See `DEPLOY-VM.md` for the full guide. Claude Code prepares the files on this PC; you do the VM steps by hand.

| ID | Repo | Model | Prio | Task |
|---|---|---|---|---|
| P4-01 | backend | Sonnet | MUST | Production Dockerfile (migrations on start, uploads volume, healthcheck) |
| P4-02 | frontend | Sonnet | MUST | Frontend Dockerfile + nginx (SPA + /api and /uploads proxy) + `deploy/` compose bundle + release script |
| P4-03 | you | – | MUST | Follow DEPLOY-VM.md on the other PC |

---

## Rough effort (with Claude Code doing the coding)
Phase 0: ½ day · Phase 1: 5–7 days (MUST only: about 4) · Phase 2: 3 days · Phase 3: 3–4 days once the template arrives · Phase 4: 1 day.
