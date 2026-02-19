# 050 — Spending Trend Analysis ✅ Complete

## Goal

Answer: "Am I spending more or less than usual on each category?"

## Delivered

- `GET /reports/spending-trend?lookback_months=3&month=YYYY-MM` — rolling average per category
- Per-category: avg monthly spend (lookback), actual this month, projected month-end
- Projection formula: `current × (days_in_month / days_elapsed)`
- Spending Trends page: KPI cards, horizontal grouped bar chart (avg vs actual), detail table
- Trend indicator per category: over budget / under budget / on track (vs rolling avg)
- Lookback toggle: 3M / 6M / 12M
