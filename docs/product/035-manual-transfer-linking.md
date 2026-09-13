# 035 — Manual Transfer Linking 🔜 Planned

## Goal

Let the user manually mark two transactions in different accounts as a transfer pair — and
undo that — for the cases [030](030-multi-account-aggregation.md)'s automatic detection
cannot or should not catch.

## Problem

`detect_transfer_candidates` (`services/transfer_detection.py`) only creates a candidate when
`abs(amount_A) == abs(amount_B)` **and** the two booking dates are within a 3-day window. Real
transfers regularly violate both:

- A funding leg through an intermediary (e.g. a PayPal top-up) that carries a small fee or FX
  spread — the two legs never match exactly.
- Cross-currency transfers, where the amounts are in different currencies entirely and can
  never satisfy an equality check.
- Slow SEPA / international transfers that clear more than 3 days apart.
- A leg imported long after the other, missed by every `/detect` run before both existed.

Today there is no way around this: `routes/transfers.py` exposes only `/detect`, `/candidates`
(GET), `/confirm`, and `/dismiss` — all operating on auto-generated candidates. There is also
no way to **undo** a confirmed pair (`is_transfer` is only ever set to `True`, never reset —
verified across the codebase). A wrong match today, or a transfer the user wants to unlink
later, requires editing the SQLite file directly.

## Approach

### Data model

Reuse `TransferCandidate` (`models/transfer_candidate.py`); add one column via migration:

```
transfer_candidate
  source   String(16)  not null, server_default 'auto'   -- "auto" | "manual"
```

No new table. Manual pairs are asserted with full user context — both legs are shown side by
side in the picker before submit — so the amount/date checks that keep the *automatic*
suggestion list from being noisy are **not** applied to manual pairs. The model's real
invariants still apply: different accounts, unique `(from_transaction_id, to_transaction_id)`
pair (existing `uq_transfer_candidate_pair`), neither leg already `is_transfer=True`.

### Backend

- `POST /transfers/manual` — body `{from_transaction_id, to_transaction_id}`. Validates both
  transactions exist, belong to different accounts, neither is already a transfer, and the
  pair isn't already tracked. No amount/date check. Creates the candidate with
  `source="manual"`, `confidence=1.00`, and calls the existing `confirm_transfer()` in the same
  request — one user action, since the review already happened in the picker, not a separate
  pending → confirm step.
- `POST /transfers/candidates/{id}/unlink` — new `unlink_transfer()` in
  `transfer_detection.py`: sets `is_transfer=False` on both legs and the candidate to a new
  terminal status `"unlinked"` (distinct from `"dismissed"`, which means "never became a
  transfer" — semantically different from "was one, no longer is"). Works on **any** confirmed
  candidate, auto or manual, incidentally closing the same gap for a mis-clicked auto-confirm.
- `TransferCandidateRead` gains `source: str`.

### Frontend

- `Transfers` page: "Link transactions manually" button → `ManualTransferDialog` with two
  pickers (From / To), each searching via the existing `GET /transactions?q=&account_id=&
  amount_min=&amount_max=` ([070](070-transaction-search.md)) — no new search endpoint needed.
  Selecting a row renders it as a `TransferLeg` card (reusing the existing leg rendering from
  `TransferCandidatesTable`) so the user visually confirms both sides before submitting.
  Client-side guards (same account picked twice, an already-`is_transfer` row) mirror the
  server checks; the server is the source of truth either way.
- Confirmed rows get an "Unlink" action behind a confirmation prompt →
  `POST /transfers/candidates/{id}/unlink`.
- `source` badge ("Auto" / "Manual") on candidate rows for auditability.
- i18n `transfers.manual.*` keys (en + de).

### Tests

- Backend `test_transfer_manual.py`: rejects same-account pair, rejects when either leg is
  already a transfer, rejects duplicate pair, **accepts** mismatched amount and date (the
  point of the feature), `/unlink` reverses `is_transfer` on both legs and removes the pair
  from `/candidates?status=confirmed`, re-link after unlink works.
- Frontend: picker search/select flow, submit, unlink confirmation dialog.
- E2E: manually link two unmatched transactions → both disappear from the monthly category
  breakdown totals.

## Out of Scope (v1)

- Multi-leg transfers (one withdrawal funding several deposits) — a different shape of
  problem than the PayPal 1:1 case this targets.
- Fuzzy auto-suggestion of near-matches (mismatched amount/date) — manual-only for v1; worth
  revisiting only if manual linking proves too tedious in practice.
- Storing an FX rate or conversion metadata for cross-currency pairs — the user just asserts
  "these two are the same transfer," no rate is recorded.

## Definition of Done

- A user can search for and pick any two transactions in different accounts and link them as
  a transfer regardless of amount or date match.
- Manually linked legs are excluded from reports exactly like auto-detected ones.
- Any confirmed transfer (manual or auto) can be unlinked, restoring both legs to normal
  reporting.
- The Transfers page distinguishes manual from auto-detected pairs.
