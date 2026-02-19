# 070 — Transaction Search ✅ Complete

## Goal

Find specific transactions quickly without scrolling through pages.

## Delivered

- `GET /transactions` — `account_id` now optional (all accounts by default)
- `q` param: case-insensitive substring search on payee and purpose
- `amount_min` / `amount_max` params: inclusive amount range filter
- All filters compose: search + date range + amount range + account + uncategorized
- Transactions page defaults to "All Accounts"
- Search bar (payee / purpose), amount range inputs — all reset pagination on change
