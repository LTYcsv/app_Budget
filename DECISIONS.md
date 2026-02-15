# DECISIONS

## 1) Architecture Direction
- Decision: Keep analytics logic on backend, UI logic on frontend.
- Why:
  - Single source of truth for formulas.
  - Easier evolution of recommendations without frontend-only drift.
  - Better control and testability of business rules.

## 2) Time Window For Recommendations
- Decision: Monthly expenses are the primary analytical sample.
- Why:
  - Most representative budgeting horizon for users.
- Extension:
  - Use longer historical baseline for stability and noise reduction.

## 3) Essential Category Policy
- Decision: Essential categories must not imply total elimination; only conservative optimization.
- Essential set (target):
  - `Продукты`, `Транспорт`, `Здоровье`, `Жилье`.
- Why:
  - Realistic and safer recommendations.

## 4) Categorization Strategy (Planned To Re-Apply)
- Decision: Move from broad categories to strict `category + subcategory` granularity.
- Why:
  - Analytical accuracy requires detail (example: `Такси` and `Метро` must not collapse into one bucket).
- Status:
  - Concept and implementation approach are defined.
  - Changes were rolled back during Docker troubleshooting; should be repeated after infra stabilization.

## 5) UX Principle For Category Precision
- Decision: Non-intrusive precision.
- Rules:
  - Fast entry first.
  - Contextual suggestions second.
  - Soft nudges for `Другое`.
  - No hard blocking in add-flow.
- Why:
  - Preserve speed while steadily improving data quality.

## 6) Infrastructure Operating Mode
- Decision: One-command startup via Docker Compose is required target.
- Why:
  - Predictable team onboarding and validation cycles.
  - Lower friction in testing full product path.

## 7) Known Debt / Risks
- Docker and migration lifecycle still needs final stabilization.
- Vite chunk warning (`>500kB`) persists.
- Need a compact smoke-test checklist for critical flows.
