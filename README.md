# MetalWorks HR

React frontend for a human resources and industrial management platform for a metal manufacturing enterprise.

## Stack

- React, TypeScript, and Vite
- React Router v6
- MUI
- TanStack Query
- Axios
- React Hook Form and Zod
- Zustand
- Recharts
- react-i18next

## Development

Install dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Open `http://localhost:4200`.

## Validation

```powershell
npm run build
npm run lint
```

## Environment

Create or update `.env`:

```env
VITE_API_URL=http://localhost:8081/api/v1
```

## Application structure

```text
src/
├── api/
├── app/
├── components/
├── features/
├── hooks/
├── i18n/
├── store/
├── types/
└── utils/
```
