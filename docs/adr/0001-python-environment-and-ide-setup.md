# ADR 0001: Python Environment & IDE Setup

## Status
Accepted

## Context
This repository is a monorepo containing:
- a Python backend (`api/`, FastAPI)
- a frontend (`app/`, React/Vite)
- potentially additional runtimes (e.g. Tauri/Rust)

During initial setup, multiple virtual environment locations were possible
(root-level `.venv`, Poetry cache venv, or per-subproject venv).
IDE integration (PyCharm 2025.x) also required a clear decision.

## Decision
- The Python virtual environment is located at:
`api/.venv`
- Poetry is configured with:
`virtualenvs.in-project = true`
- PyCharm uses the interpreter:
`api/.venv/bin/python`
- The backend is always run with:
`cd api`
`uvicorn finassist_api.main:app`

## Rationale
- Each `pyproject.toml` owns its own environment
- The backend is isolated from frontend tooling
- Contributors can set up the backend independently:
`cd api && poetry install`
- IDE configuration becomes explicit and reproducible
- Avoids ambiguity caused by Poetry cache environments

## Alternatives Considered
### Root-level `.venv`
Rejected because:
- the repository is not a single Python project
- frontend and future services would not use this environment

### Poetry cache venv only
Rejected because:
- IDE paths become opaque
- harder to reason about environment location

## Consequences
- PyCharm must explicitly select `api/.venv/bin/python`
- Shell users may need to activate the venv manually if not using `poetry run`