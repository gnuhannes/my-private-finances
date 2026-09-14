# 110 — Desktop App

## Status: In Progress 🚧 (Parts A + B shipped)

## Goal

Ship My Private Finance as a standalone, installable desktop application for Windows, macOS, and Linux. No Python, Node, or browser required on the target machine.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Desktop shell | **Tauri** (Rust) | Small binary (~10 MB shell), strong security allowlist, native look, first-class Linux/macOS/Windows |
| Backend packaging | **PyInstaller** | Bundles FastAPI + all Python deps into a single executable sidecar |
| Frontend | React (unchanged) | Served by Tauri's asset pipeline from the compiled Vite output |
| Database | SQLite (unchanged) | Lives in OS app-data directory |

## Architecture

```
[Tauri shell]
  ├── starts sidecar: my-private-finance-api(.exe)   ← PyInstaller bundle
  │     - FastAPI on 127.0.0.1:5179
  │     - data/ → OS app-data dir
  ├── loads frontend from bundled assets
  └── on window close → SIGTERM sidecar → exit
```

## Data Directory (per OS)

| OS | Path |
|----|------|
| Linux | `~/.local/share/my-private-finance/` |
| macOS | `~/Library/Application Support/my-private-finance/` |
| Windows | `%APPDATA%\my-private-finance\` |

Contains: `my-private-finance.sqlite`, `ml_model.joblib`, `watch/`, `processed/`, `failed/`

## Features

- **System tray**: minimise to tray; left-click reopens window; right-click → Quit
- **Native file dialogs**: CSV/PDF import uses OS file picker instead of browser upload
- **Auto-start sidecar**: Python API starts on app launch, stops on exit
- **Single instance**: launching a second instance focuses the existing window
- **Deep-link**: `myprivatefinance://` scheme for future integrations

## Build Pipeline

```
make desktop-build   # runs on the current OS
make desktop-release # cross-compiles via GitHub Actions matrix
```

GitHub Actions matrix:
- `ubuntu-latest` → `.deb` + `.AppImage`
- `windows-latest` → `.msi` + `.exe`
- `macos-latest` → `.dmg` (universal binary: x86_64 + arm64)

## Security

- Tauri allowlist: renderer can only call explicitly declared APIs (file dialog, shell open)
- Sidecar bound to `127.0.0.1` only; not accessible from network
- No webview access to filesystem except through Tauri commands
- PyInstaller binary signed on macOS (notarisation) and Windows (code signing, optional)

## Decisions (Part A, #178)

- **PyInstaller over PyOxidizer**: simpler and more mature; this app's dependency
  set (FastAPI, scikit-learn, aiosqlite) is well-trodden ground for PyInstaller.
  Onefile build via `api/desktop.spec`, ~80 MB (dominated by scikit-learn/scipy).
- **First-launch migration**: auto-detect and copy, silently, once. On desktop
  startup, if the resolved app-data DB doesn't exist yet and a dev-mode
  `./data/my_private_finances.sqlite` is found relative to cwd, copy it (and
  `ml_model.joblib` if present) into the app-data dir before running
  migrations. The source is never deleted or modified, and an existing
  app-data DB is never overwritten. This covers a developer running the
  packaged binary from their own checkout; it does nothing for end users who
  never had a dev-mode `data/` dir. No UI prompt yet (Part A ships no UI) — a
  confirmation dialog can be layered on top once Part C's native dialogs land,
  if this ever turns out to be surprising in practice.
- `data_dir` now defaults to the OS-standard app-data path (table above) only
  inside a PyInstaller-frozen build (`sys.frozen`); source/dev runs
  (`uvicorn --reload`, pytest, the CLI) keep the existing `./data` default
  unchanged. See `Settings._default_data_dir` in `api/my_private_finances/config.py`.

## Decisions (Part B, #179)

- Tauri v2, scaffolded via `cargo tauri init` into `app/src-tauri/`. The sidecar
  is spawned from Rust's `setup()` hook (never from the webview), so the
  renderer has zero shell/native permissions declared in
  `src-tauri/capabilities/default.json` — satisfies "renderer can only call
  explicitly declared APIs" without needing any allowlist entries yet, since
  there's nothing to allow until Part C adds native file dialogs.
  `wait_for_sidecar_health` polls `GET /api/health` (not just a TCP connect)
  before the window is considered ready, and `RunEvent::ExitRequested` sends a
  real SIGTERM (via `libc`, Unix only — Windows falls back to
  `CommandChild::kill()`/`TerminateProcess`) so the sidecar's FastAPI lifespan
  shutdown runs instead of a hard kill.
- The frontend's fetch client (`app/src/lib/api/client.ts`) now targets
  `http://127.0.0.1:5179` explicitly when `window.__TAURI_INTERNALS__` is
  present, since the webview's asset origin (`tauri://localhost`) differs from
  the sidecar's; `Settings.cors_origins` allows that origin accordingly.
- `make desktop-sidecar` / `desktop-dev` / `desktop-build` (root Makefile) plus
  `scripts/package-desktop-sidecar.sh` build the Part A PyInstaller binary and
  stage it at `app/src-tauri/binaries/my-private-finance-api-<target-triple>`,
  matching `bundle.externalBin` in `tauri.conf.json`.
- Verified end-to-end on Linux: `cargo tauri dev` spawns the sidecar, which
  correctly resolves the OS app-data dir, auto-migrates a legacy dev DB, and
  runs Alembic migrations; the webview loads the built frontend and makes real
  API calls (`/api/settings/app`, `/api/accounts`) through the sidecar
  successfully. The window-close → SIGTERM path is implemented and reviewed
  against the `tauri-plugin-shell` source, but wasn't exercised by an actual
  window-close click in this environment (no `xdotool`/`wmctrl`) — worth a
  manual check on a real desktop before relying on it, or an automated check
  in Part D's CI matrix.

## Open Questions

- Auto-update: Tauri Updater (GitHub releases as update server) — opt-in, out
  of scope for v1 (see Part D, #181)
