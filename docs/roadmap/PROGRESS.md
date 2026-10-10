# Progress log

Claude Code appends here after each task: `## PX-YY — <title> (date)` + 3–5 lines (what changed, files, leftovers).

## Questions
<!-- Open questions for the senior/user go here. Remove when answered. -->

## Log

## P0-01 — Git baseline + env cleanup, frontend (2026-10-10)
- `git init -b main`; baseline commit made; `.gitignore` now excludes .env, .env.*, *.tsbuildinfo, *.log, uploads/, coverage/ (keeps .env.example).
- Added `.env.example` (VITE_API_URL=http://localhost:8081/api/v1). `.env` is not tracked.
- `npx tsc -b --noEmit` passes. Backend half of P0-01 (git init, env key renames, LLM vars) not done yet.

## P0-01 — Git baseline + env cleanup, backend (2026-10-10)
- `git init -b main`; baseline commit `chore: baseline`; `.gitignore` gained `uploads/` and `*.tsbuildinfo`. `.env` is not tracked.
- Baseline already contains an earlier unplanned hardening pass (Prisma/body-parser error mapping, audit() wired into mutating routes, HR_MANAGER in user schemas, work orders + maintenance plans under src/modules/maintenance, organization router guard scoped to /departments and /positions, Docker/compose fixes). 18 tests pass.
- Env cleanup: removed SMTP_PASS / MAIL_FROM / APP_URL from env.ts and docs; added optional LLM_BASE_URL, LLM_API_KEY, LLM_MODEL to env.ts and .env.example; PORT=8081.
- `npx tsc --noEmit`, lint and jest pass. Left: CORS_ORIGIN in the untracked .env still lacks http://localhost:5173.

## P1-11 — Frontend foundation (2026-10-10)
- `api/client.ts`: single-flight refresh (`refreshPromise`), 401s await it and retry once; logout only when refresh fails. Exports `API_ORIGIN`, `assetUrl()`; baseURL fallback `/api/v1`. New `api/errors.ts` (`getErrorMessage`, `applyFieldErrors`).
- Toasts: `store/toastStore.ts` + `components/ToastHost.tsx` mounted in providers; MutationCache default onError toasts unless `meta.silent`.
- New shared components: DataTable (`@mui/x-data-grid@^8`, server mode), ConfirmDialog, EmptyState, FormDialog, RoleGate. Hooks: `useDebouncedValue`, `useUrlState` (includes DataGrid pagination/sort adapters). `utils/format.ts`.
- `types/api.ts` aligned with contract §0–§7 (ApiErrorResponse w/ fieldErrors, SafeUser, Page, Employee, Department, Position, WorkOrder, Notification, *Query types). DashboardPage touched: null `fromStatus` handled, reformatted, hex colors → theme.
- Left: existing api files (notifications/users/machines) still use old signatures; manual two-tab refresh test not run. LoginPage still has its own 429 handling (could use getErrorMessage).

## P1-12 — Theme and layout pass
- Theme: cssVariables + light/dark colorSchemes (tokens surface.subtle, brand.soft, status.<MachineStatus>), Inter loaded in index.html, color scheme persisted via useColorScheme (`dark` removed from uiStore, storage key `metalworks-theme`).
- Hex literals removed from src/components and src/features; StatusChip uses status tokens.
- New `src/app/navigation.ts` (role-filtered groups, path-to-label breadcrumbs); AppLayout rewritten (no fake Search/Workspace); styled 403/404 in `src/features/errors/ErrorPages.tsx` inside the layout.
- Routes: /dashboard, /machines (+/new, /:id, /:id/edit admin only), /work-orders, /hr/employees, /hr/organization, /admin/users, /admin/audit-logs; `/` redirects to /dashboard. Removed /admin/machines, /admin/people, /admin/dashboard.
- Left: "Maintenance plans" nav item not added (P1-08 route unknown); /machines/:id/edit and the new pages are placeholders; /dashboard calls the admin dashboard API, so non-admins will see an error until P1-14.

## P1-13 — Auth pages
- Login: server `getErrorMessage` (special text for 429 countdown / ACCOUNT_LOCKED), password only required, shows `location.state.message`, "Forgot password?" link, redirects to /dashboard or /change-password.
- New public routes `/forgot-password` (ForgotPasswordPage) and `/reset-password?token=` (ResetPasswordPage); api `forgotPassword`/`resetPassword` in auth.api.ts.
- New `components/PasswordStrength.tsx` + `utils/passwordPolicy.ts` (rules + zod `newPasswordSchema`), used in reset and change-password forms; change-password shows server error.
- Profile uses `GET /auth/me` (useQuery): email, formatted role, last login, linked employee; hardcoded "Active" removed.
- Left: the employee link goes to `/hr/employees/:id` (shown only for ADMIN/HR_MANAGER), which is not a route yet; EmployeeRef has no department so it is not shown. Manual forgot/reset flow not run.

## P1-14 — Users administration
- `api/users.api.ts` rewritten (list with all filters, get, create, update, setUserEnabled, resetUserPassword, unlockUser, removeUser, listEmployeeOptions). New `features/users/` (UsersPage, UserFormDialog, TemporaryPasswordDialog, roles.ts); route `/admin/users` now renders UsersPage; old AdministrationPage deleted.
- Table: server pagination/sort, URL-state search/role/enabled filters, row menu with ConfirmDialog for disable/reset/delete; Disable/Reset/Delete hidden on own row; Unlock only when locked. Temporary password dialog (copy + warning) or "Credentials sent by email" toast.
- Left: manual admin test not run; `ManagedUser` type in types/api.ts is now unused; users sortable columns assume server accepts fullName/username/role/lastLoginAt.

## P1-15 — Machines UI
- `machines.api.ts` typed (MachineDetail, MachineNote, MachineStatusChange) + uploadMachineImage, setMachineOperators, getMachineWorkOrders. Shared enums/transitions in `features/machines/constants.ts`.
- Catalog: URL-state filters (debounced search + location, status, type), DataTable in table view, grid + MUI Pagination in card view, view choice in localStorage, images via assetUrl. New full-page `MachineFormPage` at `/machines/new` and `/machines/:id/edit` (ADMIN) with zod, server fieldErrors, image upload (immediate on edit, after create on new).
- Detail: header with image/overdue badge, Edit/Delete (ConfirmDialog, server 409 message toasted), role-gated status dialog (OUT_OF_SERVICE exits ADMIN only), tabs Overview/History/Notes/Operators/Work orders ("Create work order" hidden: P1-17 missing).
- Left: manual tests not run; last/next maintenance dates are sent as ISO instants from a date input (assumed backend accepts); no `/admin/machines` references were found in src.

## P1-16 — HR pages
- New `api/employees.api.ts`, `api/organization.api.ts` (departments/positions share a kind-parameterised CRUD). New `features/hr/`: EmployeesPage (URL-state search/department/position/status filters, DataTable, row click to detail), EmployeeFormPage (identity/contact/job sections, zod, server fieldErrors), EmployeeDetailPage (info cards, linked user with ADMIN-only link to /admin/users?search=, authorized machines links, Edit/Delete with 409 toast), OrganizationPage (Departments | Positions cards with FormDialog add/edit, delete disabled with tooltip when employeeCount > 0).
- Routes: /hr/employees, /hr/employees/new, /hr/employees/:id, /hr/employees/:id/edit, /hr/organization (ADMIN + HR_MANAGER).
- Left: assigned work orders section omitted (P1-17 not done); zod length/format limits are guesses (contract lists no backend rules); manual hr-role test not run.

## P1-17 — Work orders UI
- New `api/workOrders.api.ts`, `api/maintenancePlans.api.ts`, `MaintenancePlan` type. New `features/work-orders/` (WorkOrdersPage with All/Assigned-to-me tabs, status/priority/type/machine filters, table + board views with "Move to" buttons; WorkOrderDetailPage with Start/Resume/Close actions and ADMIN/PROD_MGR edit; CreateWorkOrderDialog with machine/assignee autocomplete; CloseWorkOrderDialog with required resolution, cost, parts) and `features/maintenance-plans/` (table, add/edit dialog, delete, "Generate work order", "Due in 7 days" switch).
- Routes: /work-orders, /work-orders/:id, /maintenance-plans (ADMIN, PRODUCTION_MANAGER); "Maintenance plans" nav item added. MachineDetailPage "Create work order" button (prefilled machine) and EmployeeDetailPage "Assigned work orders" section (assignedToId filter) added.
- Left: manual flow not run; board "Move to DONE" opens the close dialog; board ignores the status filter; maintenance plans list assumes `/maintenance-plans` returns a page or array and `assignedToId` is the employee id; contract does not say whether TECH may see plans so the page is ADMIN/PROD_MGR only.

## P1-18 — Notifications + dashboards
- `notifications.api.ts` (paged list, unread-count, read, read-all) and `dashboard.api.ts` (+`getMyDashboard`); `getOverdueMachines` added to machines.api; types extended (`DashboardData.workOrders/employees`, `MyDashboardData`).
- New `components/NotificationBell.tsx` (badge polled every 60s + on focus, popover of latest 10, mark all read, click marks read and goes to machine/work order, "See all") and `/notifications` page (paginated, unread-only switch) in `features/notifications/`.
- `/dashboard` now switches by role: `AdminDashboard` (KPI cards, status donut, new users, work orders by priority, employees by department, needs attention, recent status changes; fakes removed, time-of-day greeting) or `MyDashboard` (`/dashboard/me`: open work orders, counters, HR block for HR_MANAGER, role shortcuts).
- Left: manual role/dark-mode checks not run; "Needs attention" shows overdue as a count linking to /machines (the `getOverdueMachines` api is unused); bell and `/notifications` assume the page-shaped list from the contract; chart axis months shown as raw "YYYY-MM".
