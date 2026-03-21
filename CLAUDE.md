# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules 
ALWAYS before making any change. Search on the web for the newest documentation.
And only implent if you are 100% sure it will work.

## Commands

All commands run from the `app/` directory:

```bash
cd app

npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite is configured.

## Architecture

This is a personal finance app ("Чек") — a React 19 SPA with a REST backend.

**Entry point:** `app/src/main.tsx` → `App.tsx`

### Routing & Auth

`App.tsx` wraps everything in `AuthProvider` → `TransactionsProvider` → `BrowserRouter`. Protected routes are gated by `AuthGate`, which redirects unauthenticated users to `/login`.

Auth uses JWT stored in `localStorage` (key: `chek_access_token`) with automatic silent refresh via httpOnly cookie (`/auth/refresh`). The `AuthContext` handles token lifecycle, expiry detection, and auto-refresh scheduling.

### API Layer

All HTTP calls go through `src/lib/api.ts`, which exports a single `api` object. The module uses a `request<T>()` helper that:
- Injects the Bearer token from `AuthContext` via `setAuthHandlers()`
- Has a 10-second timeout
- Calls `onUnauthorized()` on 401 (triggering logout)

Backend base URL defaults to `/api/v1` or `VITE_API_BASE_URL` env var.

### Global State

`TransactionsContext` loads all transactions and categories in a single `/bootstrap` call on mount and provides CRUD methods that optimistically update local state. Pages consume this via `useTransactions()`.

### Page Structure

```
src/
  pages/         # Route components (Dashboard, Analytics, Goals, Transactions, Accounts, Achievements, Profile, Login, Register)
  layouts/       # MainLayout (sidebar/nav shell)
  sections/      # Landing page sections (Hero, Features, etc.) — static marketing content
  components/    # Shared UI: FadeInView, Button, Blob, AnimatedCounter, AchievementBadge, etc.
  components/ui/ # shadcn/ui primitives (Radix-based)
  context/       # AuthContext, TransactionsContext, LangContext
  lib/           # api.ts (types + fetch), utils.ts (cn helper), i18n.ts (RU/EN translations)
  hooks/         # useInView, useCountUp, use-mobile
```

### Styling

- Tailwind CSS with a custom dark theme defined in `index.css` via CSS variables
- Light theme applied via `html.light` class (not `prefers-color-scheme`)
- Custom semantic color tokens: `bg-bg-primary/secondary/tertiary/elevated`, `text-text-primary/secondary/tertiary`
- `cn()` from `src/lib/utils.ts` for conditional class merging (clsx + tailwind-merge)
- `@` alias maps to `src/`

### Key Libraries

- **framer-motion** — animations throughout (`FadeInView` wrapper, section entrance effects)
- **shadcn/ui** — component primitives in `src/components/ui/`
- **recharts** — charts on Analytics page
- **react-hook-form + zod** — form validation
- **sonner** — toast notifications (top-center, rich colors)
- **i18n** — manual translation map in `src/lib/i18n.ts` (ru/en), consumed via `LangContext`
