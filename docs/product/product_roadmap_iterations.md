# My Private Finances — Product Roadmap

> This file is a high-level summary. Full specs live in the numbered files alongside this one.
> See [README.md](README.md) for the index.

---

## Vision

Local-first, privacy-by-design personal finance app. All data stays on the local machine. No cloud, no telemetry, no external APIs. The goal: answer "where does my money go?" with full trust in the system's privacy.

See [000-vision.md](000-vision.md) for full principles.

---

## Completed

### [010 — MVP: Import & Rules](010-mvp-import-and-rules.md) ✅
CSV import pipeline, multi-bank support, idempotent deduplication, rule-based categorisation engine, manual category assignment.

### [020 — Insights & Budgets](020-insights-and-budgets.md) ✅
Monthly dashboard (KPIs, top payees, category breakdown, top spendings), fixed vs variable cost classification, budget definitions, budget vs actual, recurring transaction detection.

### [030 — Multi-Account Aggregation](030-multi-account-aggregation.md) ✅
Transfer detection and confirmation across accounts, all reports exclude transfers, cross-account aggregation mode.

### [040 — Net-Worth Tracking](040-net-worth-tracking.md) ✅
Opening balance per account, cumulative balance series, net worth area chart with month toggle, month-over-month change.

### [050 — Spending Trend Analysis](050-spending-trend-analysis.md) ✅
Rolling average vs current month per category, month-end projection, over/under/on-track indicator, 3M/6M/12M lookback toggle.

### [060 — Annual Overview](060-annual-overview.md) ✅
All 12 months at a glance: income vs expenses grouped bar chart, savings rate per month, year selector, year-level totals.

### [070 — Transaction Search](070-transaction-search.md) ✅
Full-text search on payee/purpose, amount range filter, all-accounts mode — all filters compose.

### [080 — ML Category Suggestions](080-ml-category-suggestions.md) ✅
Local scikit-learn pipeline (TF-IDF char n-grams + LogisticRegression, feature-enriched with amount/date/recurring-payee signals) trained on the user's own categorised transactions. Suggests categories with confidence scores; bulk-accept ≥80% predictions; cached in-process model + auto-retrain after manual categorizations or import. Auto-detects recurring patterns on import.

### [120 — Watch Folder (Auto-Import)](120-watch-folder.md) ✅
`watchdog`-based background task monitors `<data_dir>/watch/`, auto-imports dropped `.csv`/`.pdf` files, moves them to `processed/`/`failed/`.

### [035 — Manual Transfer Linking](035-manual-transfer-linking.md) ✅
`POST /transfers/manual` (no amount/date check) and unlink endpoint to reverse a confirmed pair, closing the gap where auto-detection misses fee/FX/slow-transfer pairs.

### [105 — First-Run Setup](105-first-run-setup.md) ✅
Full-screen wizard on first launch: create a first account with a starting balance, pick a localized starter category set, optionally import a first statement. Backed by `AppSettings` singleton (`onboarding_completed_at`, `default_currency`, `locale`).

### [160 — Transaction Splitting](160-transaction-splitting.md) ✅
Split one bank transaction across several categories by absolute amount or percentage. `transaction_split` child table; category reports (monthly breakdown, budget-vs-actual, fixed-vs-variable, spending-trend) attribute each portion via a UNION-ALL selectable in `services/reporting.py`.

---

## Planned

### [110 — Desktop App](110-desktop-app.md) 🔜
**Goal:** Installable, self-contained desktop app for Windows, macOS, and Linux.

**Stack:** Tauri (Rust shell) + PyInstaller sidecar.

- Tauri wraps the compiled React frontend as a native window.
- The FastAPI backend is packaged with PyInstaller into a standalone binary (no Python install required on the target machine). Tauri starts it as a sidecar on launch and terminates it on exit.
- The SQLite database, ML model, and watch folder live in the OS-standard app-data directory (`~/.local/share/my-private-finance/` on Linux, `%APPDATA%` on Windows, `~/Library/Application Support` on macOS).
- System tray integration: minimise to tray, open on icon click.
- Native file dialogs for CSV/PDF import (replaces the browser upload widget).
- Single-command build pipeline per platform; GitHub Actions releases for all three targets.

**Security:** Tauri's allowlist restricts renderer access to only declared native APIs. The sidecar API is bound to localhost only.

---

### [180 — Category Tree & New-Category Suggestions](180-category-tree-and-suggestions.md) 🔜
**Goal:** A real, hierarchical, localized pre-defined category tree (beyond 105's flat
starter list), plus proactive suggestions to create a **new** category when a cluster of
transactions doesn't fit any existing one — extending
[080 — ML Category Suggestions](080-ml-category-suggestions.md), which today only ever
routes transactions into categories that already exist.

Tree skeleton modeled on COICOP (public UN taxonomy, official en/de labels), cross-checked
against Plaid's Personal Finance Category taxonomy and Actual Budget's defaults for everyday
naming. New-category detection reuses the existing TF-IDF pipeline: cluster low-confidence
uncategorized transactions, name the cluster from common payee tokens, and match it against
the pre-defined tree to suggest a parent — all reviewed by the user before any category is
created. No new backend dependency.

---

## Mid-term

### [130 — PWA + LAN Mobile Access](130-pwa-lan-access.md) 💡
**Goal:** Use the app on an Android device without any native packaging.

**Approach:** Two-part:
1. **PWA manifest + service worker** added to the React app. The browser installs it as a home screen app icon; offline shell loads instantly.
2. **LAN mode**: the desktop app (110) optionally exposes the API on `0.0.0.0` (configurable, off by default). The phone visits `http://[desktop-ip]:port` on the same WiFi and gets the full UI. No sync needed — one database, one server.

**Limitations:** Requires same network. Offline on phone = read-only cached views only (no writes without server).

---

### [140 — Data Sync (Syncthing)](140-data-sync.md) 💡
**Goal:** Keep the SQLite database consistent between desktop and a mobile device when not on the same network.

**Approach:** File-level sync via [Syncthing](https://syncthing.net/) (open source, P2P, no account, no cloud).

- Syncthing syncs the `my-private-finance.sqlite` file between devices.
- Single-writer constraint: the backend must not be running on the receiving device while the file is being synced. Syncthing's pause/resume hooks trigger a graceful shutdown of the local backend before applying the incoming file.
- Conflict strategy: last-write-wins is acceptable for personal finance (you're not editing on two devices simultaneously). The existing `import_hash` deduplication prevents double-counting if the same import is applied on both sides.
- The desktop app (110) includes a "Sync status" indicator in the system tray (Syncthing's REST API).

**Non-goal:** Real-time bidirectional sync. Syncthing syncs at rest, not while the app is active on both devices simultaneously.

---

## Long-term Ideas

### [150 — Android App (Capacitor)](150-android-app.md) 💡
**Goal:** A proper Android APK that runs the PWA shell natively, with background sync and native file access.

**Stack:** Capacitor (from Ionic) wraps the existing React app as a WebView-based Android app.

- Distributed as a sideloaded APK (no Play Store required, preserves privacy).
- Native file picker for CSV import on mobile.
- Background service polls the desktop server on LAN and triggers Syncthing when connected to the home network.
- Requires 130 (PWA) and 140 (Syncthing) to be solid first.

---

### [090 — Cash Transactions](090-cash-transactions.md) 💡
Manual cash account for tracking cash income and spending. Phase 2: link ATM withdrawals to a cash envelope and reconcile against manual cash entries.

### [100 — Bill Scanning & Line-Item Split](100-bill-scanning.md) 💡
Upload a receipt photo → local OCR (Tesseract) extracts line items → each item gets a category → single bank transaction is "expanded" into granular sub-transactions. Optionally use a local vision LLM (e.g., via Ollama) for better parsing accuracy on messy receipts. Entirely local, privacy-preserving.
