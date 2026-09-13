# 170 — ML for Transfer & Recurring Detection 🔬 Investigated — Not Pursuing

## Goal

Evaluate whether transfer detection ([030](030-multi-account-aggregation.md)) and recurring
transaction detection ([020](020-insights-and-budgets.md)) should move from their current
deterministic/heuristic algorithms to a learned model, in the style of
[080 — ML Category Suggestions](080-ml-category-suggestions.md).

## Current Algorithms

- **Transfer detection** (`transfer_detection.py`): exact amount match, opposite sign, different
  accounts, date within a 3-day window. Confidence = `1.0 − 0.1 × days_apart`, floored at 0.70.
  Pairs that don't match (fees, FX spread, slow international transfers) are handled by manual
  linking ([035](035-manual-transfer-linking.md)), not auto-detection.
- **Recurring detection** (`recurring_detection.py`): group transactions by normalized payee,
  score interval regularity against fixed frequency buckets (weekly/monthly/quarterly/yearly),
  boost confidence when amounts are consistent (coefficient of variation).

## Why 080 Is Not a Template Here

080 is multi-class text classification: free-text `payee + purpose` is genuinely ambiguous and
must be mapped to one of many categories. That's exactly the kind of problem TF-IDF + a linear
classifier is good at, and there's abundant labeled data (thousands of already-categorized
transactions across many classes) to train on.

Transfer and recurring detection are different in kind:
- Transfer matching is a narrow, structured problem (amount, date, account) — not a language
  ambiguity problem.
- Recurring detection is unsupervised periodicity/pattern detection, not classification.
- Neither has 080's data volume: a single user produces a few dozen transfers and recurring
  patterns a year, not thousands of labeled text samples per class.

## Data Check

A spot-check of a real (single-user, personal) database backing this app found:
1. **Zero dismissed transfer candidates** — every auto-detected candidate had been confirmed
   (directly or after manual re-linking). The deterministic matcher has been 100% precise in
   practice. There is no negative-class signal to teach a classifier what a *false* candidate
   looks like, and no evidence the current rule is producing false positives worth fixing.
2. The handful of manually-linked transfers (fee/slow-transfer edge cases the auto-matcher
   structurally can't catch) are already handled by the 035 manual-linking escape hatch — the
   recall gap ML might otherwise close is already covered.
3. Recurring patterns have no explicit "user rejected this as not recurring" action today (only
   `user_confirmed` opt-in and an automatic `is_active` flip on staleness) — so there isn't even
   a labeled-rejection signal to bootstrap a supervised recurring-pattern classifier.

This pattern (near-total absence of negative labels, orders of magnitude fewer samples than
080's categorized-transaction volume) should hold for any single-user instance of this app, not
just the one checked — it follows from how few transfers/recurring patterns one household
produces per year, not from anything specific to one dataset.

## Decision

**Do not build this now.** The heuristics are accurate at current data scale, and the manual
linking fallback already covers the structural gap (fee/FX/slow transfers) that ML would
otherwise target. Building a classifier here would be a solution without a data-backed problem.

## Where ML Could Help Later (if the trigger below fires)

A **binary "is this pair a transfer?" classifier**, trained on `TransferCandidate.status`
(`confirmed` vs. `dismissed`) plus `source == "manual"` as positive examples, with features like:
- amount delta (absolute and %) — to relax the exact-match requirement
- date delta in days
- payee-text similarity between the two legs
- historical transfer frequency for this account pair

This would let candidate generation relax the exact-amount/±3-day constraints (catching FX/fee-
adjusted or slow transfers automatically) while the classifier filters false positives that the
looser generation would introduce. Recurring detection has a structurally weaker case for ML at
any point — it's better served by refining the heuristic (e.g., an explicit reject action to
start collecting negative examples) than by a model.

## Revisit Trigger

Revisit this if either becomes true:
- Dismissal rate on auto-detected transfer candidates becomes non-trivial (evidence the rule is
  producing false positives), **or**
- Users are routinely missing real transfers/recurring patterns that manual linking doesn't
  adequately cover (evidence of a recall gap beyond the fee/FX/slow-transfer cases 035 already
  handles).

Until then, there isn't enough labeled data or a demonstrated failure mode to justify the added
complexity and maintenance cost of a second ML model.
