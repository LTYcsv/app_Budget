# WORKLOG

## Project
- Name: `FinFlow` (personal budget tracker)
- Root: `app/`
- Stack: React + TypeScript + Vite + Tailwind + Framer Motion

## Current State
- Core transaction flow works end-to-end:
  - Create transaction: `app/src/pages/AddTransaction.tsx`
  - Persist transactions: `app/src/context/TransactionsContext.tsx` (localStorage)
  - Show in dashboard/history/analytics:
    - `app/src/pages/Dashboard.tsx`
    - `app/src/pages/Transactions.tsx`
    - `app/src/pages/Analytics.tsx`
- Transactions support:
  - Add
  - Edit
  - Delete (with confirm)
- Categories support:
  - Dynamic categories in context
  - Add category
  - Delete category
  - Category icon selection from local SVG files
- Icons:
  - Category icons folder: `app/src/assets/category-icons/`
  - Universal icon renderer: `app/src/components/CategoryIcon.tsx`
- Analytics currently implemented:
  - User date range selector (default: last 7 days)
  - Income/expense totals in selected range
  - Balance chart in range (SVG line/area)
  - Top income categories
  - Top expense categories
- Dashboard improvements:
  - Recent transactions grouped by date headers (today/yesterday/full date)

## UX Fixes Already Done
- Fixed category icon render bug for `data:image/...` SVG payloads:
  - `app/src/components/CategoryIcon.tsx`
- Modal background scroll lock in category management:
  - `app/src/pages/AddTransaction.tsx`
- Category modal behavior:
  - Auto-close on successful add
  - Does not auto-close on delete

## Build/Run Notes
- Build command: `cd app && npm run build`
- Dev command: `cd app && npm run dev`
- Build currently succeeds.
- Vite warns about large chunk size (>500kB); no functional break.

## Open Work / Next Practical Steps
- Improve analytics differentiation (high product priority):
  - Forecast to payday / cash runway
  - Anomaly detection vs baseline
  - Recurring payments/subscription detector
  - Actionable insights cards
  - What-if simulator
