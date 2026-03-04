# 150 — Android App (Capacitor)

## Status: Long-term 💡

## Prerequisites

- 130 (PWA) complete — the React app must be a solid PWA first
- 140 (Syncthing) complete — offline data access requires a local database copy

## Goal

A proper Android APK that runs the full app natively, with background sync, native file access, and a home screen icon — no browser involved.

## Tech Stack

**Capacitor** (from Ionic) wraps the existing React + Vite app as a WebView-based Android app. The web layer is unchanged; Capacitor provides a bridge to native Android APIs.

No React Native rewrite. No new UI framework.

## Architecture

```
[Android APK]
  ├── WebView → compiled React app (bundled assets)
  ├── Capacitor bridge → native plugins:
  │     - File picker (import CSV/PDF)
  │     - Local notifications (import complete, sync status)
  │     - Background service (sync trigger on network change)
  └── Embedded SQLite via capacitor-sqlite plugin
        - runs python backend? → see note below
```

### Backend on Android: the hard problem

Running a full FastAPI + Python backend on Android is not straightforward. Options:

1. **API-only mode** (Phase 1): the app requires LAN access to the desktop (130). The SQLite copy is read-only for offline views; writes go to desktop. Simplest — no Python on Android.

2. **capacitor-sqlite + reimplemented queries** (Phase 2): implement data access in TypeScript using the Capacitor SQLite plugin, talking directly to the synced SQLite file. The Python backend is not involved on Android. Queries must be reimplemented in TS (duplicated logic, but manageable for read paths).

3. **Python via Chaquopy or BeeWare** (Phase 3, complex): embed a Python interpreter in the APK. High complexity, large APK, limited library support.

**Recommended path:** Start with option 1 (requires desktop running). Evolve to option 2 once the sync story (140) is solid.

## Distribution

- Distributed as a sideloaded APK (GitHub releases)
- No Play Store — keeps the app private and avoids review overhead
- Android allows APK installation from "Unknown sources" (one-time setting)

## Features at Launch (Phase 1)

- Home screen icon, splash screen
- Full read access to all reports and transaction history (cached from last LAN session)
- Import via native file picker (sends to desktop API over LAN)
- Push notifications for watch-folder import results (via desktop-to-phone local notification)

## Out of Scope

- iOS: App Store requirement + sandbox limitations make SQLite sync and sideloading impractical
- In-app purchases, telemetry, crash reporting to external services
