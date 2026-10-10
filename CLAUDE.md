# MetalWorks — Backend (MetalHrBackend)

You are the junior developer on this project. A senior wrote the plan; you execute ONE task at a time.

## How to work (token budget matters)
- The user will say "Do task PX-YY". Read ONLY `../PFA project/docs/roadmap/tasks/PX-YY.md`, then the files it lists.
- The API contract shared with the frontend is `../PFA project/docs/roadmap/API-CONTRACT.md`. Read only the section your task names.
- Do NOT explore the repo with broad `find`/`ls -R`/reading whole folders. The map below is accurate. Use `grep -n` and targeted reads.
- Never open `node_modules`, `dist`, `package-lock.json`, or migration SQL you did not create.
- Edit files with small edits; do not rewrite whole files unless the task says so.
- Verify with: `npx tsc --noEmit` , `npm run lint` , `npm test`. Do not start the dev server unless the task asks.
- When done: append 3–5 lines to `../PFA project/docs/roadmap/PROGRESS.md` (task id, what changed, anything left), then `git add -A && git commit -m "PX-YY: <summary>"`.
- If the task is ambiguous or contradicts the code, STOP and write the question in PROGRESS.md under "Questions" instead of guessing.
- Stay inside the task scope. Note extra problems in PROGRESS.md; do not fix them.

## Stack
Node 20+, TypeScript (strict, CommonJS), Express 5, Prisma 6 + PostgreSQL 16, Zod 4, JWT (access 15m / refresh 7d), bcrypt, Nodemailer, Jest + Supertest.

## Map
```
src/app.ts                 express setup, CORS, rate limit, router mounting
src/server.ts              listen + graceful shutdown
src/config/env.ts          zod-validated env  | src/config/prisma.ts  PrismaClient
src/common/                api-error, async-handler, audit(), pagination, password-policy, safe-user
src/middlewares/           auth (authenticate, authorize, requirePasswordChange), validate, error-handler
src/modules/auth/          routes/controller/schemas/service (login, refresh, me, change/forgot/reset password, logout)
src/modules/users/         admin user CRUD (routes, schemas, service). email.provider.ts is DEAD code
src/modules/mail/          mail.service.ts (SMTP or dev console logger) — the real mailer
src/modules/machine/       machine CRUD, status state machine, notes, history, image upload
src/modules/employee/      employee CRUD (single routes file)
src/modules/organization/  departments + positions CRUD (single routes file)
src/modules/notifications/ list + mark read
src/modules/dashboard/     admin KPIs
src/modules/audit/         audit log list
prisma/schema.prisma       models: User(app_users), Employee, Department, Position, Machine, MachineStatusLog,
                           MaintenanceNote, Notification, AuditLog, PasswordResetToken, MaintenancePlan, WorkOrder
prisma/seed.ts             demo data (admin / Admin@123)
```

## Conventions
- Pattern: `routes` (validate + authorize) → `service` class (business logic, Prisma) → throw `ApiError(status, message, fieldErrors?, code?)`.
- Wrap async handlers with `asyncHandler`. Validate body/query/params with zod via `validate({...})`.
- Every protected router: `authenticate, requirePasswordChange, authorize(...roles)`.
- Lists return `pageResponse(content, total, page, size)` → `{content,totalElements,totalPages,number,size}`.
- Soft delete with `deletedAt`; always filter `deletedAt: null`.
- Schema changes: edit `schema.prisma`, then `npx prisma migrate dev --name <snake_name>`; update `seed.ts` if needed.
- Roles: ADMIN, HR_MANAGER, PRODUCTION_MANAGER, MAINTENANCE_TECH, EMPLOYEE. Import the shared zod enum (created in P1-05) instead of re-listing roles.
- Never return passwordHash, tokens, or reset tokens in responses. Never log passwords.

## Run
`docker compose up postgres -d` → `npx prisma migrate deploy` → `npm run prisma:seed` → `npm run dev` (port from .env, currently 8081).
