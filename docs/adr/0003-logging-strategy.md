# ADR 0003: Logging Strategy

## Status
Accepted

***

## Context

The application had no logging at all. Debugging required attaching a debugger or adding temporary print statements — neither of which is practical once the app is running as a background server. We needed a lightweight, structured approach to observability that fits the local-first, zero-dependency philosophy.

***

## Decision

### Library

Use Python's **stdlib `logging`** module — no new dependencies. Uvicorn already handles HTTP access logging; application logging covers business events in the service layer.

### Configuration

A single `setup_logging()` call in `main.py` (via `my_private_finances/logging_config.py`) configures logging once at startup:

- **Format:** `%(asctime)s | %(levelname)-8s | %(name)s | %(message)s`
- **Level:** controlled by the `LOG_LEVEL` environment variable (default: `INFO`)
- Third-party loggers (`sqlalchemy.engine`, `aiosqlite`) are silenced at `WARNING` level unless `LOG_LEVEL=DEBUG`

Each module declares its own logger:

```python
logger = logging.getLogger(__name__)
```

This gives clean, hierarchical logger names (e.g. `my_private_finances.services.csv_import`) that can be filtered individually if needed.

### Log Levels

| Level   | When to use                                                   |
|---------|---------------------------------------------------------------|
| DEBUG   | Detailed per-item flow: duplicate row skipped, stale pattern marked inactive |
| INFO    | Business events: import started/completed, N candidates found, N patterns upserted |
| WARNING | Non-fatal problems: parse error on a CSV row, import rejected with bad input |
| ERROR   | Not used yet — reserved for unexpected failures that should alert the operator |

### What is logged

| Location | Events logged |
|---|---|
| `main.py` | Application startup with DB path |
| `routes/imports.py` | CSV import request received (filename, size); import rejected (reason) |
| `services/csv_import.py` | Import started (account, file, rule count); per-row parse warnings; duplicate skips (DEBUG); import summary |
| `services/categorization.py` | Count of transactions categorised by bulk rule apply |
| `services/transfer_detection.py` | Detection started (window, tx count); candidates found; confirm/dismiss events |
| `services/recurring_detection.py` | Payee groups analysed; patterns detected; patterns upserted; stale patterns (DEBUG) |

### What is NOT logged

- Individual SQL queries (handled by `sqlalchemy.engine` at DEBUG if needed)
- HTTP request/response details (handled by Uvicorn's access log)
- Successful reads / GETs (too noisy, no debugging value)
- PII such as full payee names or transaction amounts at INFO level

***

## Consequences

- Log output goes to stdout by default, matching Uvicorn's own output stream.
- Setting `LOG_LEVEL=DEBUG` enables verbose per-row output useful during development.
- No log files, log rotation, or external log aggregation — consistent with the local-first principle.
- If a structured logging format is needed in the future (e.g. JSON for log ingestion), only `logging_config.py` needs updating.
