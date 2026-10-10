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
