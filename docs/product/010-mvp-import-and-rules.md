# 010 — MVP: Import & Rules ✅ Complete

## Goal

Get **real data** into the system and reach a state where transactions can be imported, reviewed, and categorised semi-automatically. First version that provides real personal value.

## Delivered

### Import
- CSV import pipeline with multi-bank support (column mapping per bank)
- Idempotent import using `(account_id, import_hash)` deduplication
- Auto-categorise on import (rules applied at import time)

### Data Model
- Accounts, Transactions, Categories (hierarchical)

### Categorisation
- Rule-based engine: field / operator / value matching (payee contains, purpose equals, etc.)
- Priority-ordered rules, first-match-wins
- Bulk apply rules to existing transactions
- Manual category assignment inline in the transaction table

### UI
- Import screen (CSV upload)
- Transaction list with pagination and date filters
- Uncategorized filter
- Inline category dropdown per transaction
