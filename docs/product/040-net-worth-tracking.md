# 040 — Net-Worth Tracking ✅ Complete

## Goal

Track total net worth over time across all accounts.

## Delivered

- `opening_balance` + `opening_balance_date` on Account model
- Inline opening balance editor per account on the Net Worth page
- `GET /reports/net-worth?months=N` — monthly balance series per account
- Balance computed as: opening balance + cumulative non-transfer transactions since that date
- Net Worth page: area chart, KPI cards (total, month-over-month change), per-account table
- Month toggle: 6 / 12 / 24 months
