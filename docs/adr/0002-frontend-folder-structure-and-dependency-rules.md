# ADR 0002: Frontend Folder Structure & Dependency Rules

Date: 2026-02-09  
Status: Accepted

## Context

The frontend (Vite + React + TypeScript) needs a simple, predictable structure that:
- keeps onboarding easy
- avoids over-engineering
- enforces a few “dependency direction” rules to prevent spaghetti imports
- remains flexible for future feature growth

## Decision

We use a small set of conventional folders:

- `src/pages/`
    - Route-level screens/pages.
    - Orchestrate hooks and compose components.
- `src/components/`
    - Reusable UI components (presentation + small UI logic).
- `src/hooks/`
    - Reusable React hooks (React Query, state, derived state).
- `src/lib/`
    - Integration / infrastructure layer (API client, adapters).
    - No React imports here (ideally).
- `src/utils/`
    - Pure helper functions (formatting, mapping, calculation).
    - No IO, no React.
- `src/assets/`
    - Static files (svg/png/fonts).

### Dependency direction rules (soft)

We follow these dependency directions:

- `pages` may import from anywhere: `components`, `hooks`, `lib`, `utils`, `assets`.
- `components` may import: `components`, `hooks`, `utils`, `assets`.
- `hooks` may import: `hooks`, `lib`, `utils`.
- `lib` may import: `lib`, `utils` (and third-party libs).
    - **Rule**: `lib` should not import React or anything from `pages/components/hooks`.
- `utils` should be pure and may only import other `utils` (and standard library).
- `assets` contains only static files.

### Practical placement rules

Use this decision tree:

1. Renders JSX?
    - Route-level screen => `pages`
    - Reusable UI => `components`
2. `useX()` hook?
    - => `hooks`
3. IO / integration (fetch/storage/3rd party adapters)?
    - => `lib`
4. Pure helper / formatting / calculation?
    - => `utils`

### Examples

- `pages/Dashboard.tsx` uses `hooks/useMonthlyReport.ts` + `components/KpiCard.tsx`.
- `hooks/useMonthlyReport.ts` calls `lib/api/reports.ts`.
- `lib/api/reports.ts` uses `fetch` / base URL config and returns DTOs.
- `utils/money.ts` formats currency values.

## Consequences

### Positive
- Fast navigation: predictable “where to put what”
- Clear layering prevents accidental cycles
- Low ceremony, easy for contributors

### Negative / Tradeoffs
- Some code might not fit perfectly (e.g. DTO-to-VM mapping).
    - Guideline: if mapping is API-coupled => `lib`, if fully pure & reusable => `utils`.
- Rules are “soft” unless enforced by linting.
