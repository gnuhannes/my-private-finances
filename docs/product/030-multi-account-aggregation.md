# 030 — Multi-Account Aggregation ✅ Complete

## Goal

Support multiple bank accounts and eliminate double-counting of internal transfers.

## Delivered

- `is_transfer` flag on transactions
- Transfer candidate model (pending / confirmed / dismissed)
- Auto-detection: amount match ± 3 days across accounts
- Transfers review page: confirm or dismiss detected pairs
- All reports exclude confirmed transfer transactions
- `account_id` optional in all report endpoints — omit for cross-account aggregation
- Dashboard defaults to "All Accounts" mode
