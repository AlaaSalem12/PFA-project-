# API contract (target state after Phase 1–2)

Base URL: `/api/v1`. All endpoints except `/auth/login|refresh|forgot-password|reset-password` need `Authorization: Bearer <token>`.
Backend tasks IMPLEMENT this. Frontend tasks CONSUME this. If you change it, update this file in the same commit.

## §0 Common shapes
- Page: `{ content: T[], totalElements, totalPages, number, size }`. Query: `page` (0-based), `size` (1–100), `sort=field,asc|desc`, `search`.
- Error: `{ timestamp, status, error, message, code?, path, fieldErrors: [{field, message}] }`
  - `error` = HTTP reason phrase (e.g. "Not Found"). `code` values: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`,
    `UNAUTHORIZED`, `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `ACCOUNT_LOCKED`, `RATE_LIMITED`, `CORS_REJECTED`, `INTERNAL`.
- Decimals (`hourlyCost`, `operatingHours`, `cost`) are JSON **numbers**. Dates are ISO strings.
- Roles: `ADMIN | HR_MANAGER | PRODUCTION_MANAGER | MAINTENANCE_TECH | EMPLOYEE`.

## §1 Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | /auth/login | {username, password} | {token, refreshToken, user} — username is case-insensitive. Locked → 401 code ACCOUNT_LOCKED |
| POST | /auth/refresh | {refreshToken} | {token, refreshToken, user} |
| GET | /auth/me | – | User (+ `employee: {id, matricule, firstName, lastName} \| null`) |
| POST | /auth/change-password | {currentPassword, newPassword} | 204 (all tokens revoked → frontend must re-login) |
| POST | /auth/logout | – | 204 |
| POST | /auth/forgot-password | {email} | 202 always |
| POST | /auth/reset-password | {token, newPassword} | 204. Email link: `${FRONTEND_URL}/reset-password?token=...` |

Password policy: ≥8 chars, upper, lower, digit, special character.
Rate limits: login/forgot/reset = 10 per 15 min per IP. `/me` and `/refresh` are NOT in the strict limiter. Global = 1000 per 15 min.

## §2 Users (ADMIN only) — canonical mount `/users` (the `/admin/users` alias is removed)
SafeUser: `{id, username, fullName, email, role, enabled, lastLoginAt, mustChangePassword, lockedUntil, createdAt, employee: {id, matricule, firstName, lastName} | null}`
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | /users | page,size,sort,search,role,enabled | Page<SafeUser> |
| POST | /users | {username?, fullName, email, role, employeeId?} | 201 `{user, emailSent, temporaryPassword?}` — `temporaryPassword` ONLY when emailSent=false. Missing username → generated from email local-part (lowercase, unique suffix) |
| GET | /users/:id | – | SafeUser |
| PUT | /users/:id | {fullName?, email?, role?, employeeId? (number or null)} | SafeUser |
| PATCH | /users/:id/enabled | {enabled} | SafeUser |
| POST | /users/:id/reset-password | – | `{user, emailSent, temporaryPassword?}` |
| POST | /users/:id/unlock | – | SafeUser (clears lockedUntil + failedLoginAttempts) |
| DELETE | /users/:id | – | 204 (soft) |

## §3 HR — employees, departments, positions (ADMIN, HR_MANAGER unless stated)
Employee: `{id, matricule, firstName, lastName, socialSecurityNumber?, birthDate?, phone?, email?, address?, hireDate, photoUrl?, status: ACTIVE|ON_LEAVE|SUSPENDED|TERMINATED, department: {id,name}|null, position: {id,name}|null, user?: {id, username, role}|null}`
| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | /employees | page,size,sort,search,departmentId,positionId,status | Page<Employee> |
| GET | /employees/options | search (roles: ADMIN, HR_MANAGER, PRODUCTION_MANAGER, MAINTENANCE_TECH) | `[{id, matricule, fullName, position?: string}]` max 20 |
| POST | /employees | employee fields + departmentId?, positionId? | 201 Employee. Duplicate matricule/SSN → 409 |
| GET | /employees/:id | – | Employee + `authorizedMachines: [{id, code, name}]` |
| PUT | /employees/:id | partial | Employee |
| DELETE | /employees/:id | – | 204 soft. 409 if the employee has OPEN/IN_PROGRESS work orders |
| GET | /departments | – | `[{id, name, description, employeeCount}]` |
| POST/PUT | /departments[/:id] | {name, description?} | Department. Duplicate name → 409 |
| DELETE | /departments/:id | – | 204. 409 if employeeCount > 0 |
| GET/POST/PUT/DELETE | /positions... | same as departments | same |

## §4 Machines (read: all roles)
Machine: `{id, code, name, type, brand, model, serialNumber, purchaseDate, workshop, location, hourlyCost, operatingHours, imageUrl, maintenanceStatus, maintenanceIntervalDays, lastMaintenanceAt, nextMaintenanceDueAt, notes, createdAt, updatedAt}`
`imageUrl` is a server path like `/uploads/machines/12-1712345.webp` → frontend builds `${API_ORIGIN}${imageUrl}`.
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | /machines | all | page,size,sort,search,status,type,location |
| GET | /machines/:id | all | Machine + `authorizedOperators: [{id, matricule, firstName, lastName}]` |
| POST | /machines | ADMIN | body = Machine fields without status → 201. Duplicate code/serial → 409 |
| PUT | /machines/:id | ADMIN | partial; `maintenanceStatus` is NOT accepted here (use PATCH status) |
| DELETE | /machines/:id | ADMIN | 409 if open work orders |
| POST | /machines/:id/image | ADMIN | multipart `image` (jpeg/png/webp ≤5MB) → Machine |
| PATCH | /machines/:id/status | ADMIN, PRODUCTION_MANAGER, MAINTENANCE_TECH | {status, comment?}; comment required for BREAKDOWN/OUT_OF_SERVICE |
| GET | /machines/:id/status-history | all | `[{id, fromStatus\|null, toStatus, comment, changedAt, changedBy:{id,username,fullName}}]` |
| GET/POST | /machines/:id/maintenance-notes | read all; write ADMIN, PROD_MGR, TECH | `{note}` → `{id, note, createdAt, createdBy:{fullName}}` |
| PUT | /machines/:id/operators | ADMIN, PRODUCTION_MANAGER | {employeeIds: number[]} → Machine |
| GET | /machines/:id/work-orders | all | WorkOrder[] (latest 50) |
| GET | /maintenance/overdue | all | Machine[] |

Status transitions: OPERATIONAL→{SCHEDULED_MAINTENANCE, UNDER_MAINTENANCE, BREAKDOWN, OUT_OF_SERVICE}; SCHEDULED_MAINTENANCE→{UNDER_MAINTENANCE, OPERATIONAL}; UNDER_MAINTENANCE→{OPERATIONAL, BREAKDOWN}; BREAKDOWN→{UNDER_MAINTENANCE, OPERATIONAL, OUT_OF_SERVICE}; OUT_OF_SERVICE→{UNDER_MAINTENANCE, OPERATIONAL} **ADMIN only**.
UNDER_MAINTENANCE→OPERATIONAL sets `lastMaintenanceAt=now` and, if `maintenanceIntervalDays`, `nextMaintenanceDueAt = now + interval`.

## §5 Work orders
WorkOrder: `{id, machine:{id,code,name}, type: PREVENTIVE|CORRECTIVE, priority: LOW|MEDIUM|HIGH|CRITICAL, status: OPEN|IN_PROGRESS|DONE, description, assignedTo:{id, firstName, lastName}|null, openedAt, closedAt, cost, partsUsed, resolution, createdBy:{id, fullName}|null}`
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | /work-orders | all (EMPLOYEE only sees `mine`) | page,size,sort,status,priority,type,machineId,assignedToId,mine=true |
| POST | /work-orders | ADMIN, PRODUCTION_MANAGER, MAINTENANCE_TECH | {machineId, type, priority, description, assignedToId?} → 201 |
| GET | /work-orders/:id | all | WorkOrder |
| PUT | /work-orders/:id | ADMIN, PRODUCTION_MANAGER | {priority?, description?, assignedToId?} (not when DONE) |
| PATCH | /work-orders/:id/status | ADMIN, PROD_MGR, TECH | {status, cost?, partsUsed?, resolution?}. OPEN→IN_PROGRESS, IN_PROGRESS→{OPEN, DONE}. DONE is final, sets closedAt, requires resolution |
`mine=true` = work orders assigned to the employee linked to the current user. Assigning notifies the assignee's user (WORK_ORDER_ASSIGNED).

## §6 Maintenance plans (COULD — only if P1-08 is done)
`{id, machine:{id,code,name}, task, frequencyDays, nextDueDate}` — CRUD `/maintenance-plans` (write: ADMIN, PROD_MGR; read: every role except EMPLOYEE), `GET /maintenance-plans/due?days=7`, `POST /maintenance-plans/:id/generate` → creates a PREVENTIVE MEDIUM work order and moves nextDueDate forward.
- `GET /maintenance-plans` → Page (`page,size,machineId`, sorted by nextDueDate). `GET /maintenance-plans/due` → plain array (due within `days`, overdue included). `DELETE` → 204.
- `POST /:id/generate` → 201 **WorkOrder** (§5). 409 if the machine is OUT_OF_SERVICE. The plan's new `nextDueDate` = max(old nextDueDate, today) + frequencyDays.
- The machine's `nextMaintenanceDueAt` always follows its earliest plan. A background check (boot + every 6 h) creates MAINTENANCE_DUE notifications (ADMIN, PROD_MGR; max one per user and machine per day) for plans due within 1 day and machines past `nextMaintenanceDueAt`.

## §7 Notifications (all roles, own only)
Notification: `{id, type, title, message, machineId|null, workOrderId|null, readAt|null, createdAt}`. Types: MACHINE_BREAKDOWN, MACHINE_OUT_OF_SERVICE, WORK_ORDER_ASSIGNED, MAINTENANCE_DUE, PASSWORD_RESET.
`GET /notifications?page&size&unreadOnly=true` → Page · `GET /notifications/unread-count` → `{count}` · `PATCH /notifications/:id/read` → 204 · `PATCH /notifications/read-all` → 204

## §8 Dashboards
- `GET /admin/dashboard` (ADMIN): current shape + `users.newUsersPerMonth: [{month:"2026-05", count}]` (last 6 months), `workOrders: {open, inProgress, doneThisMonth, byPriority:[{priority,count}]}`, `employees: {total, byDepartment:[{department, count}]}`.
- Details: `newUsersPerMonth` has exactly 6 entries (oldest first, current month last, zero-filled, UTC). `workOrders.byPriority` always lists LOW, MEDIUM, HIGH, CRITICAL and counts OPEN + IN_PROGRESS orders only; `doneThisMonth` = DONE with `closedAt` in the current month. `employees.byDepartment` lists every department (zero-filled, sorted by count desc) plus `"Unassigned"` when employees have no department.
- `GET /dashboard/me` (all roles): `{ myOpenWorkOrders: WorkOrder[] (≤5), machinesInBreakdown: number, overdueMaintenance: number, unreadNotifications: number, hr?: {employees, onLeave} (HR_MANAGER/ADMIN only) }`.

## §9 Audit (ADMIN)
`GET /admin/audit-logs?page&size&entity&action&userId&from&to` → Page<`{id, action, entity, entityId, metadata, ip, createdAt, user:{id,username,fullName}|null}`>
Action names: AUTH_LOGIN, AUTH_LOGIN_FAILED, AUTH_LOGOUT, AUTH_PASSWORD_CHANGED, AUTH_PASSWORD_RESET, USER_CREATED, USER_UPDATED, USER_ENABLED, USER_DISABLED, USER_PASSWORD_RESET, USER_UNLOCKED, USER_DELETED, EMPLOYEE_CREATED/UPDATED/DELETED, DEPARTMENT_*, POSITION_*, MACHINE_CREATED/UPDATED/DELETED, MACHINE_STATUS_CHANGED, MACHINE_IMAGE_UPDATED, MACHINE_NOTE_ADDED, MACHINE_OPERATORS_UPDATED, WORK_ORDER_CREATED/UPDATED/STATUS_CHANGED, MAINTENANCE_PLAN_CREATED/UPDATED/DELETED, ASSISTANT_MESSAGE.

## §10 AI assistant (Phase 2, all roles)
| Method | Path | Notes |
|---|---|---|
| GET | /assistant/status | `{enabled, model}` (enabled=false when no LLM configured) |
| GET | /assistant/conversations | `[{id, title, updatedAt}]` own only, newest first |
| POST | /assistant/conversations | → `{id, title}` |
| GET | /assistant/conversations/:id/messages | `[{id, role: "user"\|"assistant", content, toolsUsed: string[], createdAt}]` |
| POST | /assistant/conversations/:id/messages | {content ≤ 2000 chars} → `{userMessage, assistantMessage}`. Rate limit 30/hour/user. 503 code `ASSISTANT_UNAVAILABLE` if LLM down |
| POST | /assistant/conversations/:id/messages/stream | (P2-06, optional) same body, rate limit and pre-checks as above (400/404/429/503 come back as JSON). Then `text/event-stream`: `event: tool` `{name}`, `event: delta` `{text}`, finally `event: done` `{userMessage, assistantMessage}` or `event: error` `{message, code}`. Clients send the Authorization header, so use `fetch` + ReadableStream (not EventSource); replace the streamed text with `assistantMessage.content` on `done`. |
| DELETE | /assistant/conversations/:id | 204 |
| GET | /assistant/suggestions | `string[]` example questions for the current role |
