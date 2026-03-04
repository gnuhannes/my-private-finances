# 120 — Watch Folder (Auto-Import)

## Status: Planned 🔜

## Goal

Drop a bank export file into a folder and it gets imported automatically. No clicking, no UI. Works in both the desktop app and the dev server.

## Tech Stack

- **Python `watchdog`** — cross-platform filesystem events (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows)
- Runs as a background asyncio task inside the existing FastAPI app

## Directory Structure

```
<data_dir>/
  watch/
    checking/        ← subfolder maps to an account
    savings/
    *.csv / *.pdf    ← top-level files use watch-config.json assignment
  processed/
    2026-03-04/
      statement.csv
  failed/
    statement_broken.csv
    statement_broken.csv.error.txt
```

## Account Assignment

Two strategies (both supported):

1. **Subfolder per account**: create a subfolder named after the account (e.g. `watch/main-account/`). The folder name is looked up against account names in the DB.
2. **Config file**: `watch/watch-config.json`:
   ```json
   { "default_account_id": 1 }
   ```

## Behaviour

1. New `.csv` or `.pdf` file appears in `watch/**`
2. Wait 500 ms (file-settle debounce) then attempt import
3. On success → move to `processed/YYYY-MM-DD/filename`
4. On failure → move to `failed/filename` + write `filename.error.txt` with the error message
5. Emit a log entry; desktop app (110) shows a toast notification via Tauri event

## Integration Points

- Reuses `import_transactions_from_csv_path` and `import_transactions_from_pdf_path` — no new parsing logic
- Also triggers `run_detection` after successful import (already done by the HTTP import route)
- If no account assignment can be resolved, file moves to `failed/` with a clear error

## Startup

The watcher starts automatically when the FastAPI app starts (`lifespan` event). No separate process needed.

```python
# In main.py lifespan:
asyncio.create_task(watch_folder_task(session_factory, data_dir / "watch"))
```

## Configuration

Exposed via a `GET /settings/watch-folder` endpoint (returns current path, status, account mappings) and a corresponding settings UI panel.
