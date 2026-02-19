# 090 — Cash Transactions 💡 Idea

## Goal

Track cash income and spending alongside bank transactions so the full picture of finances is visible — including money that never touches a bank account.

## Problem

Cash withdrawals appear in bank statements as a single lump-sum debit (e.g., "ATM withdrawal €200"). What the cash was actually spent on is invisible. Similarly, cash income (freelance work paid in cash, sold items, etc.) has no paper trail.

## Proposed Approach

### Phase 1 — Manual Cash Account

- Introduce a special account type: **Cash** (alongside the existing bank account type)
- Cash transactions are entered manually via a simple form: date, amount, payee, purpose, category
- Cash account has its own balance (opening balance + manual entries)
- Cash transactions appear in all reports (spending trends, annual overview, category breakdown) alongside bank transactions

### Phase 2 — Link Cash Withdrawals to Cash Spending

- When a bank withdrawal is detected (ATM / cash keyword heuristic), offer to link it to a "cash envelope"
- The withdrawal becomes a transfer to the Cash account (already handled by the transfer system)
- Cash spendings logged manually are then drawn down from that envelope
- Net cash balance provides a sanity check: if it drifts, some cash was untracked

### Cash Income

- Same form as cash spending but with a positive amount
- Examples: selling items, freelance cash payments, cash gifts
- Appears in income totals on the dashboard and annual overview

## Design Notes

- No new account model changes needed beyond a `type` enum (`bank` | `cash`)
- Cash account excluded from transfer auto-detection (manual linking only)
- The existing manual transaction creation endpoint (`POST /transactions`) already supports this — UI work is the main effort
- Consider a dedicated "Cash" quick-entry widget on the dashboard for fast logging

## Definition of Done

- User can create a Cash account and log cash income + spending manually
- Cash transactions appear in all existing reports
- ATM withdrawal can be marked as a transfer to the Cash account
- Cash balance is visible on the Net Worth page
