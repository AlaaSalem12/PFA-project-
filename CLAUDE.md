# MetalWorks — Frontend (PFA project)

You are the junior developer on this project. A senior wrote the plan; you execute ONE task at a time.

## How to work (token budget matters)
- The user will say "Do task PX-YY". Read ONLY `docs/roadmap/tasks/PX-YY.md`, then the files it lists.
- Backend endpoints are described in `docs/roadmap/API-CONTRACT.md`. Read only the section your task names. Do NOT read the backend code to discover the API.
- Do NOT explore with broad `find`/`ls -R`. The map below is accurate. Use `grep -n` and targeted reads.
- Never open `node_modules`, `dist`, `package-lock.json`, `*.tsbuildinfo`.
- Edit with small edits. Existing files use very long one-line JSX: when you touch a component, reformat it into readable multi-line JSX (`npx prettier --write <file>`), then edit.
- Verify with: `npx tsc -b --noEmit` and `npm run lint`. Do not start the dev server unless the task asks.
- When done: append 3–5 lines to `docs/roadmap/PROGRESS.md` (task id, what changed, anything left), then `git add -A && git commit -m "PX-YY: <summary>"`.
- If the task is ambiguous or the API contract seems wrong, STOP and write the question in PROGRESS.md under "Questions".
- Stay inside the task scope. Note extra problems in PROGRESS.md; do not fix them.

## Stack
React 19, TypeScript, Vite 7 (port 4200), MUI 7, TanStack Query 5, Axios, React Router 6, react-hook-form + zod 4, Zustand, Recharts, react-i18next.

## Map
```
src/main.tsx, App.tsx       bootstrap (BrowserRouter > AppProviders > AppRouter)
src/app/providers.tsx       QueryClient + ThemeProvider   | src/app/theme.ts  MUI theme (light/dark)
src/app/router.tsx          routes (lazy pages, ProtectedRoute with roles)
src/api/client.ts           axios instance, auth header, refresh-on-401, PASSWORD_CHANGE_REQUIRED redirect
src/api/*.api.ts            one file per backend module
src/types/api.ts            shared API types
src/store/authStore.ts      token/refresh/user (localStorage)   | src/store/uiStore.ts  theme + sidebar
src/components/             AppLayout (sidebar/topbar), ProtectedRoute, PageHeader, StatusChip
src/features/<area>/        pages: auth, dashboard, administration (users), machines, audit
docs/roadmap/               plan, tasks, API contract, progress
```

## Conventions
- Server state = TanStack Query (`useQuery`/`useMutation`, invalidate on success). No fetching in useEffect.
- Forms = react-hook-form + zodResolver. Show server `fieldErrors` on the matching fields.
- Errors: use `getErrorMessage(error)` from `src/api/errors.ts` (created in P1-11). Toasts via `toast.success/error` from `src/store/toastStore.ts` (P1-11).
- Colors come from the theme only (no hex literals in components) so dark mode works.
- New feature = `src/features/<area>/` (pages + local components) + `src/api/<area>.api.ts` + types in `src/types/api.ts`.
- Role checks use `useAuthStore` user.role; hide actions the backend would reject.

## Run
`npm run dev` → http://localhost:4200 (API from `.env` VITE_API_URL, currently http://localhost:8081/api/v1). Demo login: admin / Admin@123.
