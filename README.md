# Metal HR Backend (Node.js)

HR and industrial maintenance API for a metal manufacturing company. Node.js 20+,
TypeScript, Express 5, Prisma + PostgreSQL, Zod, JWT (access 15 min / refresh 7 days) and bcrypt.

The API contract shared with the frontend is
[`../PFA project/docs/roadmap/API-CONTRACT.md`](../PFA%20project/docs/roadmap/API-CONTRACT.md).
It is the source of truth for request/response shapes, roles and error codes.
Design notes and the ER diagram are in [docs/architecture.md](docs/architecture.md).

## Endpoints (base path `/api/v1`)

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` |
| Users (ADMIN) | `/users` CRUD, `PATCH /users/:id/enabled`, `POST /users/:id/reset-password`, `POST /users/:id/unlock` |
| HR (ADMIN, HR_MANAGER) | `/employees` CRUD + `GET /employees/options`, `/departments`, `/positions` |
| Machines | `/machines` CRUD, `PATCH /machines/:id/status`, status history, maintenance notes, `PUT /machines/:id/operators`, `POST /machines/:id/image`, `GET /machines/:id/work-orders`, `GET /maintenance/overdue` |
| Work orders | `/work-orders` (list, create, get, update, `PATCH /:id/status`) |
| Maintenance plans | `/maintenance-plans` CRUD, `GET /maintenance-plans/due`, `POST /maintenance-plans/:id/generate` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` |
| Dashboards | `GET /admin/dashboard` (ADMIN), `GET /dashboard/me` |
| Audit (ADMIN) | `GET /admin/audit-logs` |

Machine images are stored on disk (`UPLOADS_DIR`) and served from `/uploads/...`.
Every mutating route writes an audit log entry; a background check creates
`MAINTENANCE_DUE` notifications at boot and every 6 hours.

## Run locally

1. Copy `.env.example` to `.env` and set secrets of at least 32 characters.
2. Start PostgreSQL: `docker compose up postgres -d`.
3. `npm install`
4. `npx prisma migrate deploy` (use `npx prisma migrate dev --name <name>` only when changing the schema).
5. `npm run prisma:seed` (safe to re-run; it never overwrites an existing admin password).
6. `npm run dev` (port from `.env`, default 8081).

## Demo accounts (after `npm run prisma:seed`)

| Username | Role | Password |
|---|---|---|
| `admin` | ADMIN | `Demo@1234` on a fresh database (an existing admin keeps its password) |
| `hr` | HR_MANAGER | `Demo@1234` |
| `prod` | PRODUCTION_MANAGER | `Demo@1234` |
| `tech` | MAINTENANCE_TECH | `Demo@1234` |
| `employee` | EMPLOYEE | `Demo@1234` |

The seed also creates 30 employees across 5 departments, 16 machines, 6 work orders,
4 maintenance plans and sample notifications. These are development credentials: never
run the seed against a production database.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets (32+ characters; `replace-with…` placeholders are rejected in production) | required |
| `PORT` | HTTP port | `8081` |
| `CORS_ORIGIN` | Comma-separated allowed browser origins | `http://localhost:4200,http://localhost:5173,http://localhost:3000` |
| `FRONTEND_URL` | Base URL used in e-mailed links | `http://localhost:5173` |
| `TRUST_PROXY` | Number of reverse proxies in front of the API | `1` |
| `UPLOADS_DIR` | Folder for uploaded machine images | `uploads` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Outgoing mail; without `SMTP_HOST` e-mails are only logged (never with passwords) | empty |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Optional AI assistant provider (Phase 2) | empty |
| `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` | Admin created by the seed on a fresh database | `admin`, `Demo@1234`, `admin@metal.local` |

When no SMTP server is configured the user endpoints return `temporaryPassword` in the
response (only when the e-mail could not be sent) so an admin can hand it over.

## Docker

`docker compose up --build` needs `JWT_SECRET` and `JWT_REFRESH_SECRET` in a `.env`
file next to `docker-compose.yml` (or in the shell). The API container applies pending
migrations on start and listens on port 8081; run the seed separately for demo data.

## Verification

```text
npx tsc --noEmit
npm run lint
npm test
```

Tests live in `src/__tests__/<module>.test.ts` and share `src/test/helpers.ts`
(mocked Prisma client and token helper), so they run without a database.
