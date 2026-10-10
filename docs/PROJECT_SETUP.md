# MetalWorks HR project setup

## Current status

The project is a React + Vite frontend with TypeScript, MUI, protected routes, JWT API integration, and the initial authentication, dashboard, administration, and profile screens.

## Development commands

```powershell
npm install
npm run dev
npm run build
npm run lint
```

## Conventions

- Keep reusable UI in `src/components`.
- Keep API modules and typed requests in `src/api`.
- Keep business areas isolated under `src/features`.
- Keep auth and UI state in `src/store`.
- Lazy-load feature routes from `src/app/router.tsx`.
- Use React Hook Form and Zod for user-input validation.
- Use TanStack Query for server state.
