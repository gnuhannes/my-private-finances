# 110 — Desktop App

## Status: Planned 🔜

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

## Open Questions

- PyInstaller vs PyOxidizer: PyInstaller is simpler; PyOxidizer produces smaller binaries but is less mature
- First-launch migration: how to move existing dev SQLite into app-data dir
- Auto-update: Tauri Updater (GitHub releases as update server) — opt-in
