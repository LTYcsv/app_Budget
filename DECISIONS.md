# DECISIONS

## 1) Local-first data model (no backend yet)
- Decision: Keep transactions and categories in localStorage.
- Why:
  - Fast iteration without backend dependency.
  - Deterministic behavior for UI and analytics development.
- Where:
  - `app/src/context/TransactionsContext.tsx`

## 2) Centralized state through context
- Decision: Store transactions/categories in a shared React context.
- Why:
  - Single source of truth across `Dashboard`, `Transactions`, `AddTransaction`, `Analytics`.
  - Simplifies edit/delete propagation and avoids duplicate local state.

## 3) Categories are user-managed, not hardcoded
- Decision: Replace static category lists with dynamic context categories.
- Why:
  - Product requirement: user can add/remove categories.
  - Keeps analytics and editing aligned with actual user categories.

## 4) Category icon strategy: store icon string + render abstraction
- Decision:
  - Category stores `icon: string`.
  - `CategoryIcon` component decides whether icon is emoji or image URL/data URI.
- Why:
  - Supports both legacy emoji categories and SVG file icons.
  - Avoids breakage when icon source format changes.
- Where:
  - `app/src/components/CategoryIcon.tsx`

## 5) Category icon import via Vite glob
- Decision: Use `import.meta.glob(..., { eager: true, import: 'default' })` in Add Category modal.
- Why:
  - Auto-discovers icons from `app/src/assets/category-icons/`.
  - No manual import list maintenance.

## 6) Modal UX and scroll behavior
- Decision:
  - Lock background page scroll while category modal is open.
  - Close modal automatically after successful category creation.
  - Keep modal open after deletion (user-controlled close).
- Why:
  - Prevent accidental background interaction.
  - Faster add flow, safer delete flow.

## 7) Analytics rebuilt around real transaction data
- Decision: Rework analytics from mock data to computed metrics.
- Includes:
  - Date range selector (default last 7 days)
  - Income/expense totals
  - Balance series chart
  - Top income/expense categories
- Why:
  - Core product value is automated budget analytics.
  - Enables future forecasting/anomaly modules.

## 8) Known technical debt
- Large JS bundle warning in build.
