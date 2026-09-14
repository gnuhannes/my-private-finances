# 110 — Desktop App

## Status: In Progress 🚧 (Part A shipped)

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

## Open Questions

- Auto-update: Tauri Updater (GitHub releases as update server) — opt-in, out
  of scope for v1 (see Part D, #181)
