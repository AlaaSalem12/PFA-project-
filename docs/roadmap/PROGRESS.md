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
