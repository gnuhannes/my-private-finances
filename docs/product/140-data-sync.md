# 140 — Data Sync (Syncthing)

## Status: Mid-term 💡

## Goal

Keep the SQLite database consistent between a desktop PC and an Android device without any cloud service. Works across networks (not just LAN).

## Technology: Syncthing

[Syncthing](https://syncthing.net/) is open source, P2P, end-to-end encrypted, and requires no account or central server. It syncs arbitrary files between devices you control.

On Android: the official Syncthing app (or Syncthing-Fork) runs as a background service.

## What Gets Synced

The entire `<data_dir>/` directory:

```
my-private-finance/
  my-private-finance.sqlite   ← the main database
  ml_model.joblib             ← trained ML model
  processed/                  ← imported file archive
  failed/                     ← failed imports
```

The `watch/` folder is intentionally excluded (device-local).

## Single-Writer Constraint

SQLite is not designed for concurrent writes from multiple processes. The sync strategy:

**Rule: only one device writes at a time.**

Enforced by convention (not technically):
- At home: use the desktop, phone is read-only via LAN mode (130)
- Away from home: use the phone (via the Android app, 150), desktop is idle
- Syncthing syncs when both devices are idle — file is not open by the backend

Syncthing's "pause folder" feature + hooks can gracefully stop the local backend before applying an incoming sync. On Android (150), the Capacitor app lifecycle handles this.

## Conflict Resolution

If both devices write while disconnected (genuinely concurrent edits):

1. Syncthing creates a conflict file: `my-private-finance.sync-conflict-....sqlite`
2. The app detects the conflict file on startup and presents a UI: "Conflict detected — keep local version or incoming version?"
3. The losing version is kept as a backup for N days

In practice, this should be rare for personal finance. The import deduplication (`import_hash`) prevents double-counting even if the same bank statement was imported on both devices.

## Setup Flow (within the app)

1. Desktop: Settings → Sync → "Set up Syncthing" → app opens Syncthing web UI at `http://localhost:8384`
2. User follows Syncthing's standard device-pairing flow
3. App registers the data directory as a shared Syncthing folder
4. Android: same flow in the Syncthing app

The app does not manage Syncthing itself — it just provides a "open Syncthing" shortcut and monitors the conflict file.

## Status Indicator

The system tray (desktop) and a settings panel show:
- Last sync: "3 minutes ago"
- Sync state: Syncing / Up to date / Disconnected
- Conflict detected: ⚠ badge

These are read from Syncthing's local REST API (`http://localhost:8384/rest/`).

## Alternatives Considered

| Option | Verdict |
|--------|---------|
| Litestream | Streaming replication, designed for backup/DR, not device sync |
| CRDTs / custom sync | Far too complex for a SQLite-backed app |
| Cloud relay (S3, etc.) | Violates privacy-first principle |
| Manual export/import | Tedious, error-prone |
| Syncthing | ✅ Open source, P2P, battle-tested, no account |
