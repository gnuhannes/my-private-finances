# 080 — ML Category Suggestions 💡 Planned

## Goal

Reduce manual categorisation effort by learning from the user's own past behaviour.

## Problem

The rule engine requires explicit pattern definitions. New payees or unusual transaction text won't match any rule and stay uncategorised. ML can generalise from past categorisations without writing new rules.

## Approach

Fully local — no external APIs, no cloud. Uses the user's own categorised transactions as training data.

**Model:** scikit-learn TF-IDF vectoriser + Multinomial Naive Bayes (or k-NN cosine similarity) on `payee + purpose` text.

**Flow:**
1. Train on all currently categorised transactions (fast, milliseconds for typical datasets)
2. Run predictions on uncategorised transactions
3. Return `{ category_id, category_name, confidence }` per transaction
4. User reviews suggestions, bulk-accepts high-confidence ones (≥ 80%) or corrects individually

**Layering with rules:**
- Rules run first (exact, deterministic)
- ML fills gaps where no rule matched
- Accepted ML suggestions can optionally auto-generate a rule

## Design Notes

- Cold start: needs ~20–50 categorised transactions per category to be reliable — show a readiness indicator
- New dependency: `scikit-learn` (~30 MB)
- No model persistence needed — retrain on demand from DB
- Endpoint: `POST /ml/suggest` → predictions for all uncategorised transactions
- UI: suggestions panel (possibly integrated with the Import flow as a post-import review step)

## Definition of Done

- User can run suggestions after import and bulk-accept confident predictions
- Uncategorised count visibly drops without manual rule writing
- Model only ever uses the user's own data
