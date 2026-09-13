# 180 — Category Tree & New-Category Suggestions 🔜 Planned

## Goal

Two related upgrades to how categories are populated and maintained:

1. Replace the flat, one-time starter category list from [105](105-first-run-setup.md) with a
   real, hierarchical, localized **pre-defined category tree** that users can also draw from
   later, not just during onboarding.
2. Have the app **proactively suggest creating new categories** when a cluster of transactions
   doesn't fit any existing category well, instead of silently leaving them uncategorized
   forever.

## Problem

`Category` already supports a tree (`parent_id`, self-referential), but nothing populates it
with more than one level: 105's starter set is a flat checkbox list shown once, at onboarding.
Users who skip it, or whose spending habits change later (a new subscription, a new hobby,
moving to a new city), have no path back to a curated set of categories — they either invent
ad hoc flat categories or leave transactions uncategorized.

[080 — ML Category Suggestions](080-ml-category-suggestions.md) makes the second half of this
worse in a subtle way: it only ever routes a transaction into a category that **already
exists**. If the user's real spending has a shape the category list doesn't (e.g. 15
transactions from a new payee that doesn't match anything), the model just assigns them to the
closest existing category with low confidence, or leaves them uncategorized — there's no
signal today that says "you're missing a category here."

## Approach

Fully local, same constraints as [000 — Vision](000-vision.md): no cloud, no external APIs,
no telemetry.

### A. Pre-defined category tree

- **Source material** (structure only, not copied files/code): the tree skeleton is modeled
  on **COICOP** (UN Classification of Individual Consumption by Purpose — a public statistical
  standard with official German and English labels, which fits this app's existing en/de
  i18n), simplified from its full statistical granularity down to household-relevant groups.
  Leaf naming is cross-checked against **Plaid's Personal Finance Category taxonomy**
  (publicly documented, purpose-built for bank-transaction categorization) and **Actual
  Budget's** default category groups (MIT-licensed, local-first budgeting app — the closest
  UX precedent) for everyday phrasing over statistical jargon. Firefly III's defaults (AGPL)
  are consulted for naming ideas only, never copied verbatim, to stay clear of its copyleft.
- **Shape:** ~12–15 top-level groups × 4–8 children each, each leaf pre-tagged with a
  `cost_type` (fixed / variable / none), same field the 105 starter list already sets.
- **Format:** a JSON seed (e.g. `app/src/data/categoryTree.json`), keyed by i18n key like
  105's `categories.starter.*`, but nested (`{ key, cost_type, children: [...] }`) instead of
  flat. Labels stay in `en.json` / `de.json`; the JSON only carries keys, `cost_type`, and
  tree shape.
- **Reusable beyond onboarding:** 105 step 3 renders this tree (grouped, expandable) instead
  of a flat list, still via `POST /categories/batch` (already `parent_id`-aware, no backend
  change needed). Additionally, a new "Add from starter categories" action on the Categories
  page lets existing users pull in groups they skipped, at any time — diffed against what
  they already have (by i18n key, not name string) so it's safe to run repeatedly without
  creating duplicates.

### B. New-category suggestions

Builds directly on [080](080-ml-category-suggestions.md)'s pipeline — no new heavy dependency
(still just `scikit-learn`, already a dependency).

**Flow:**

1. **Find the gap.** Reuse the TF-IDF-vectorized, trained pipeline from `ml_categorization.py`.
   For uncategorized transactions, distinguish "matches an existing category weakly" (current
   behavior) from "doesn't match any existing category well" — i.e. `predict_proba().max()`
   below a low threshold (e.g. < 40%, tunable, separate from 080's ≥ 80% auto-accept
   threshold) across the board.
2. **Cluster the gap.** Run a cheap clustering pass (e.g. `AgglomerativeClustering` with
   cosine affinity, or a simple greedy threshold merge) over just that low-confidence subset,
   using the same TF-IDF vectors already computed. Discard clusters below a minimum size
   (e.g. 3) as noise.
3. **Name the cluster.** Candidate name = most common normalized payee token in the cluster,
   falling back to top TF-IDF terms when payees vary.
4. **Place it in the tree.** Compare the candidate name/keywords against the pre-defined tree
   from part A (TF-IDF cosine similarity over each leaf's label + a small keyword list) to
   suggest a parent group. No confident match → suggest it as a new top-level category.
5. **Review, don't auto-create.** New endpoint `POST /ml/suggest-categories` returns
   `{ suggested_name, suggested_parent_id, member_transaction_ids, sample_payees,
   cohesion_score }` per cluster. A UI panel (extends the existing ML suggestions review flow)
   lets the user rename, repick the parent, accept (creates the category via the existing
   `POST /categories` and bulk-assigns members), or dismiss. Dismissed clusters aren't
   persisted as a blocklist in v1 — accepting or manually categorizing the member transactions
   is what makes them stop reappearing.

## Design Notes

### Backend

- `services/ml_categorization.py`: add `suggest_new_categories(session)` alongside the
  existing `train` / `suggest`; reuses `_model_path()` and the fitted pipeline, adds the
  clustering + naming + tree-matching steps described above.
- New `schemas/ml.py` entry: `NewCategorySuggestion` (`suggested_name`, `suggested_parent_id
  | None`, `transaction_ids: list[int]`, `sample_payees: list[str]`, `cohesion_score: float`).
- New route `POST /ml/suggest-categories` in `api/routes/ml.py` (mirrors the existing
  `/ml/suggest`), reusing `ColdStartError` for "no trained model yet."
- Category tree seed stays a **frontend** asset (like 105's starter list) — the backend only
  ever receives `POST /categories/batch` payloads it already understands; no new backend
  concept for "the tree" itself.
- `POST /categories/batch` (from 105) gains dedup-by-existing-name-under-same-parent so
  "Add from starter categories" is idempotent when re-run.

### Frontend

- `app/src/data/categoryTree.json` (nested seed) + i18n keys `categories.tree.*` (en + de),
  replacing/extending `categories.starter.*`.
- 105's wizard step 3 renders the tree as expandable groups instead of a flat checklist.
- New "Add from starter categories" entry point on the Categories page, reusing the same tree
  component read-only-diffed against existing categories.
- `lib/api/ml.ts` + `hooks/useMlCategorySuggestions.ts`: new hook for
  `POST /ml/suggest-categories`.
- New panel/tab alongside the existing ML suggestions review UI: one card per cluster —
  sample payees, editable name, parent picker (defaults to the suggested one), accept /
  dismiss.
- i18n: `ml.newCategory.*` keys.

### Tests

- Backend: `test_ml_new_category_suggestions.py` — clustering picks up an injected group of
  similar low-confidence transactions, ignores singleton noise, tree-matching picks a
  sensible parent for an obvious case (e.g. "Netflix"/"Spotify" → a "Subscriptions"-like
  leaf) and falls back to top-level when nothing matches; cold-start `ColdStartError` reuse.
  `test_categories_batch.py` gains the dedup-on-rerun case.
- Frontend: tree rendering in the wizard step, "Add from starter categories" dedup behavior,
  new-category suggestion panel (accept creates + assigns, dismiss removes from the list for
  the session).

## Sequencing

Independent of [160 — Transaction Splitting](160-transaction-splitting.md) and
[110 — Desktop App](110-desktop-app.md). Part A should land after (or alongside) 105, since it
changes what 105's step 3 renders — implementing 105 first with a flat list and upgrading it
here is fine and avoids blocking 105 on this doc. Part B has no dependency beyond
[080](080-ml-category-suggestions.md), which is already shipped.

## Rollout

Two PRs off `main`:

- **A** — pre-defined category tree: `categoryTree.json` + i18n, wizard step 3 rendering,
  "Add from starter categories" on the Categories page, `POST /categories/batch` dedup.
- **B** — new-category suggestions: `suggest_new_categories()`, `POST /ml/suggest-categories`,
  review panel, tests.

## Out of Scope (v1)

- Fully automatic category creation without user review.
- A local embedding model (e.g. `sentence-transformers`) for taxonomy matching — TF-IDF
  cosine similarity is tried first; only worth revisiting if it clearly fails on
  synonym-heavy cases (e.g. "Streaming" vs. "Video-Abo").
- Persisting dismissed clusters as a permanent blocklist.
- Merchant-category-code (MCC) lookups — German SEPA/TR exports don't carry MCCs today.
- Languages beyond en/de.

## Definition of Done

- A fresh install (or an existing user via "Add from starter categories") can populate a
  real, multi-level, localized category tree instead of a flat list.
- Re-running "Add from starter categories" never creates duplicate categories.
- The app can point at a group of uncategorized transactions and propose a specific new
  category (name + parent) with its members pre-selected, without ever creating it silently.
- Accepting a suggestion creates the category and assigns all member transactions in one
  step.
