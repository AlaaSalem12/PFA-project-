# Metal HR Backend (Node.js)

The backend uses Node.js 20+ with TypeScript, Express, Prisma, PostgreSQL, Zod,
JWT, and bcrypt. Express was selected because
the required routes -> controllers -> services -> repositories architecture is
explicit and does not require NestJS's additional abstraction layer.

## Current API foundation

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- Admin user lifecycle: `/api/v1/admin/users`
- Machine management and status history: `/api/v1/machines`
- `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/audit-logs`
- CRUD `/api/v1/departments`
- CRUD `/api/v1/positions`
- CRUD/search `/api/v1/employees`
- Maintenance plans: `/api/v1/maintenance/plans` (CRUD, `POST /:id/generate-work-order`), `GET /api/v1/maintenance/overdue`
- Work orders: `/api/v1/work-orders` (CRUD, `PATCH /:id/status` with OPEN -> IN_PROGRESS -> DONE)

The design, dependency list, folder structure, and initial Mermaid ER diagram are
in [docs/architecture.md](docs/architecture.md).

## Run locally

1. Copy `.env.example` to `.env` and set secrets of at least 32 characters.
2. Start PostgreSQL, or run `docker compose up postgres -d`.
3. Run `npm install`.
4. Run `npx prisma migrate deploy` (use `npx prisma migrate dev --name <name>` only when creating a migration).
5. Run `npm run prisma:seed`.
6. Run `npm run dev`.

The seeded development account is `admin / Admin@123`; change it immediately in
non-development environments.

Configuration lives in `.env` (see `.env.example`). `CORS_ORIGIN` must list your frontend
origin (Vite/React defaults to `http://localhost:5173`). Set `TRUST_PROXY` to the number
of reverse proxies in front of the API so rate limiting sees real client IPs.
In production, placeholder JWT secrets are rejected at start-up.

Docker: `docker compose up --build` needs `JWT_SECRET` and `JWT_REFRESH_SECRET` in a
`.env` file (or the shell). The API container applies pending migrations on start and
listens on port 8081; run the seed separately for demo data.

User credential delivery is controlled by `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM`, and `FRONTEND_URL`. When SMTP is not configured,
development uses a provider that logs only the recipient and username; it never
logs passwords.

## Verification

```text
npm run build
npm test
npm run lint
```

Admin dashboard and audit endpoints require an authenticated `ADMIN` user. Employees
can read machines, while `ADMIN`, `PRODUCTION_MANAGER`, and `MAINTENANCE_TECH` can
update machine status. A status change to `BREAKDOWN` or `OUT_OF_SERVICE` requires
a comment. Restoring an `OUT_OF_SERVICE` machine is admin-only. A machine's status can
only be changed through `PATCH /machines/:id/status`, never through create/update.

Plans and work orders: `ADMIN` and `MAINTENANCE_TECH` manage plans and progress work orders;
`PRODUCTION_MANAGER` can also open work orders; everyone authenticated can read them.
Generating a work order from a plan advances the plan's `nextDueDate` by `frequencyDays`
and keeps the machine's `nextMaintenanceDueAt` in sync with its earliest plan.

All mutating routes write to the audit log (`GET /api/v1/admin/audit-logs`). Errors from
Prisma (duplicate -> 409, missing record -> 404, FK conflict -> 409) and malformed JSON
(400) are returned as structured 4xx responses.
