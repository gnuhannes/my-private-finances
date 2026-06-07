# ADR 0004: Trade Republic CSV Import

## Status
Accepted (cash-only MVP implemented; trading/investment rows deferred)

***

## Context

Trade Republic exports a single CSV file that mixes two fundamentally different
kinds of rows:

- **`category=CASH`** — real cash flows: card payments, bank transfers, interest
  payments, cashback, fees
- **`category=TRADING`** — securities transactions: fund purchases, stock buys/sells
- **`category=CASH, type=PRIVATE_MARKET_BUY`** — private-market investment cash
  outflows (technically cash category but semantically investment)

The existing CSV import service already handles column mapping, ISO dates, and
deduplication via SHA-256 import hashes. The only structural gap was the ability
to **filter rows** before parsing, so that non-cash rows could be skipped without
being counted as parse errors.

***

## Decision

### Phase 1 — Cash only (implemented)

Add generic row-filtering to the `CsvProfile` model and import service:

- **`row_filters`** `{column: [allowed_values]}` — include-only filter (AND logic
  across columns)
- **`row_exclude_filters`** `{column: [excluded_values]}` — exclusion filter (skip
  if any column matches)

Filtered rows increment a new `skipped` counter in `ImportResult` /
`ImportResultResponse` and do not appear as failures.

**Trade Republic profile settings:**
```json
{
  "name": "Trade Republic",
  "delimiter": ",",
  "date_format": "iso",
  "decimal_comma": false,
  "column_map": {
    "booking_date": ["date"],
    "amount":       ["amount"],
    "currency":     ["currency"],
    "payee":        ["name", "counterparty_name"],
    "purpose":      ["type"],
    "external_id":  ["transaction_id"]
  },
  "row_filters":         {"category": ["CASH"]},
  "row_exclude_filters": {"type": ["PRIVATE_MARKET_BUY"]}
}
```

`payee` prefers `name` (merchant for card transactions) and falls back to
`counterparty_name` (sender/recipient for bank transfers). `purpose` captures the
TR transaction type string (`CARD_TRANSACTION`, `INTEREST_PAYMENT`, etc.).

`fee` and `tax` columns are intentionally not mapped in this phase — see below.

***

## Deferred: fee and tax columns

TR separates the gross amount, fee, and withholding tax into three columns.
For `INTEREST_PAYMENT` rows the discrepancy is significant:
`amount=9548, tax=-8774` → only `774` actually lands in the account.

**Planned approach:** Add `adjustment_columns` to `ColumnMap` — a list of column
names whose non-empty values are summed into the parsed `amount` at import time.
No new model fields needed; it is a purely parse-time computation. Example:
```json
"adjustment_columns": ["fee", "tax"]
```

***

## Deferred: TRADING rows and PRIVATE_MARKET_BUY rows

These rows are currently skipped. However the cash that funds investments is real
money movement that matters for net-worth tracking.

### Recommended approach — Portfolio Account pattern

1. Create a dedicated account (e.g. `Trade Republic — Portfolio`).
2. Import each investment row as a **transfer** between the TR cash account and the
   portfolio account:
   - Cash account: debit leg (`amount` negative, `is_transfer=True`)
   - Portfolio account: credit leg (`amount` positive, `is_transfer=True`)
   - Both legs share the same `transaction_id` as `external_id`
3. The portfolio account balance then represents total invested capital over time
   without requiring live price feeds or position tracking.

### On `is_transfer` and amount mismatches

The `is_transfer` flag excludes transactions from income/expense reports to prevent
double-counting in net-worth calculations. The two legs **do not need equal
amounts** — if a fee makes the cash debit slightly larger than the portfolio
credit, both legs still get `is_transfer=True` and the difference simply
represents the transaction cost. No changes to the data model are needed to
support this.

### Implementation path

Extend the import service to detect `category=TRADING` and
`type=PRIVATE_MARKET_BUY` rows and emit two `Transaction` objects per row instead
of one. A new optional `portfolio_account_id` parameter on the TR profile (or on
the import endpoint) would identify the destination account.
