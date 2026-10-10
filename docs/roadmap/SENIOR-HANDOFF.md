# Senior handoff (paste or attach this when you start a new chat with the senior)

**Project.** MetalWorks: HR management + industrial machine maintenance web app (ESPRIT PFA). Frontend `PFA project` (React 19/Vite/MUI 7/TanStack Query). Backend `MetalHrBackend` (Express 5/Prisma 6/PostgreSQL/Zod/JWT).

**State at planning time (2026-10-10).**
- Auth, users, machines (status state machine, notes, history), notifications, admin dashboard and audit list exist.
- The HR API exists but has no UI. Work orders and maintenance plans exist only as DB models.
- tsc and lint are clean in both repos.
- Main defects found: user creation broken (username/HR_MANAGER contract mismatch), audit never written, refresh race logs users out, rate limits too tight, OUT_OF_SERVICE dead end, 500s on Prisma errors, dark mode hardcoded colors, fake UI elements.

**Decisions made.**
- Single source of truth for the API: `docs/roadmap/API-CONTRACT.md`.
- Canonical users mount is `/users`. Machine routes are unified under `/machines` with role-gated admin actions.
- Images are stored on disk under `/uploads`, served by Express and proxied by nginx.
- AI feature = chatbot with **read-only tool calling** over an OpenAI-compatible API (Groq/Gemini for the demo, Ollama offline fallback). Conversations are stored in Postgres. Evaluation script feeds the report.
- Deployment = Ubuntu 24.04 VM + Docker Compose (web nginx, api, db, optional ollama). `CORS_ORIGIN=same-origin`. Release zip built with `deploy/make-release.ps1`.
- Report ≈30 pages. The outline is in ROADMAP.md, adapted to the template once it arrives. Diagrams (P3-01), screenshots (P3-02) and FACTS.md (P3-03) are generated first.

**Where to look.** `ROADMAP.md` (phases/tasks), `PROGRESS.md` (what the junior did and open questions), `tasks/*.md`, `DEPLOY-VM.md`.

**For the report session, bring:** the template file, `docs/report/FACTS.md`, `docs/report/diagrams/` (PNG + README), `docs/report/screenshots/INDEX.md` + images, the latest `eval/results-*.md`, and PROGRESS.md.
