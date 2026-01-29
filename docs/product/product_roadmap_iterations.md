# My Private Finances — Product Roadmap & Iterations

This document contains the initial product vision and the first planned iterations. You can later split this into separate files under `docs/product/`:

- `000-vision.md`
- `010-mvp-import-and-rules.md`
- `020-insights-and-budgets.md`

---

# 000 — Vision

## Goal
Build a **local-first, privacy-by-design** personal finance application that helps understand, structure and optimize personal finances **without any cloud dependency**. All data stays on the local machine. The system should be automatable, reproducible, and extensible.

## Core Principles
- Local-first (SQLite, local files)
- No cloud, no telemetry, no external APIs required
- Privacy-by-design
- Deterministic imports and idempotent writes
- Reproducible dev setup
- Pragmatic Clean Architecture
- Strong test coverage

## Long-term Vision
- Import data from multiple sources (banks, credit cards, manual CSVs)
- Automatically categorize transactions using:
  - First: rules and heuristics
  - Later: optional local ML/AI
- Provide insights:
  - Monthly overviews
  - Category breakdowns
  - Recurring costs
  - Budget vs actual
- Support review & correction workflows
- Remain fully offline-capable

## Non-Goals
- No SaaS
- No mobile app (for now)
- No multi-user / sync
- No bank API integrations

## Success Criteria
- App is useful even with only CSV imports
- User can answer: "Where does my money go?"
- User trusts the system with sensitive data

---

# 010 — MVP: Import & Rules

## Goal
Get **real data** into the system and reach a state where transactions can be:
- imported
- reviewed
- categorized semi-automatically

This is the first version that should provide **real personal value**.

## Scope

### Import
- CSV import pipeline
- Import profiles (column mapping per bank)
- Idempotent import using `(account_id, import_hash)`
- Import history

### Data Model
- Accounts
- Transactions
- Categories
- (Optional) ImportBatch / ImportRun

### Categorization
- Rule-based categorization engine
  - Rules like:
    - payee contains "REWE" -> Groceries
    - purpose contains "AMAZON" -> Shopping
    - amount < 0 and payee contains "Salary" -> Income
  - Priority-ordered rules
  - First-match-wins

### UI (minimal)
- Import screen
- Transaction list
- "Uncategorized" filter
- Assign category manually

## Non-Goals
- No ML / AI yet
- No budgets
- No forecasting
- No fancy dashboards

## Definition of Done
- Can import at least one real bank CSV
- Can review imported transactions
- Can define rules
- Can re-run import without duplicates
- Can get a categorized transaction list

## Risks
- CSV formats are messy
- Encoding / locale issues
- Decimal parsing

---

# 020 — Insights & Budgets

## Goal
Turn structured data into **useful insights**.

## Scope

### Insights
- Monthly overview
- Category breakdown per month
- Top spendings
- Fixed vs variable costs

### Budgets
- Define monthly budgets per category
- Show budget vs actual
- Highlight overspending

### Recurring Transactions
- Detect recurring transactions (heuristic)
- Mark them

## UI
- Simple dashboard
- Month selector
- Charts (local)

## Non-Goals
- No ML
- No forecasting
- No net-worth tracking (yet)

## Definition of Done
- User can answer:
  - "How much did I spend last month on X?"
  - "Am I over budget?"

---

# Notes

When this document stabilizes, split it into separate files under `docs/product/` and add a small `README.md` that explains the iteration process.

