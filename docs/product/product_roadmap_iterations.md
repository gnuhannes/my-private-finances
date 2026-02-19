# My Private Finances — Product Roadmap

> This file is a high-level summary. Full specs live in the numbered files alongside this one.
> See [README.md](README.md) for the index.

---

## Vision

Local-first, privacy-by-design personal finance app. All data stays on the local machine. No cloud, no telemetry, no external APIs. The goal: answer "where does my money go?" with full trust in the system's privacy.

See [000-vision.md](000-vision.md) for full principles.

---

## Completed

### [010 — MVP: Import & Rules](010-mvp-import-and-rules.md) ✅
CSV import pipeline, multi-bank support, idempotent deduplication, rule-based categorisation engine, manual category assignment.

### [020 — Insights & Budgets](020-insights-and-budgets.md) ✅
Monthly dashboard (KPIs, top payees, category breakdown, top spendings), fixed vs variable cost classification, budget definitions, budget vs actual, recurring transaction detection.

### [030 — Multi-Account Aggregation](030-multi-account-aggregation.md) ✅
Transfer detection and confirmation across accounts, all reports exclude transfers, cross-account aggregation mode.

### [040 — Net-Worth Tracking](040-net-worth-tracking.md) ✅
Opening balance per account, cumulative balance series, net worth area chart with month toggle, month-over-month change.

### [050 — Spending Trend Analysis](050-spending-trend-analysis.md) ✅
Rolling average vs current month per category, month-end projection, over/under/on-track indicator, 3M/6M/12M lookback toggle.

### [060 — Annual Overview](060-annual-overview.md) ✅
All 12 months at a glance: income vs expenses grouped bar chart, savings rate per month, year selector, year-level totals.

### [070 — Transaction Search](070-transaction-search.md) ✅
Full-text search on payee/purpose, amount range filter, all-accounts mode — all filters compose.

---

## Planned

### [080 — ML Category Suggestions](080-ml-category-suggestions.md) 💡
Local scikit-learn model (TF-IDF + Naive Bayes) trained on the user's own categorised transactions. Suggests categories for uncategorised transactions with confidence scores; bulk-accept high-confidence predictions.

---

## Ideas (not yet planned)

### [090 — Cash Transactions](090-cash-transactions.md) 💡
Manual cash account for tracking cash income and spending. Phase 2: link ATM withdrawals to a cash envelope and reconcile against manual cash entries.

### [100 — Bill Scanning & Line-Item Split](100-bill-scanning.md) 💡
Upload a receipt photo → local OCR (Tesseract) extracts line items → each item gets a category → single bank transaction is "expanded" into granular sub-transactions. Optionally use a local vision LLM (e.g., via Ollama) for better parsing accuracy on messy receipts. Entirely local, privacy-preserving.
