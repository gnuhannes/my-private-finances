# Finassist

Finassist is a local-first, privacy-respecting personal finance assistant.

The goal of this project is to help individuals understand and organize their
personal finances without sending sensitive financial data to third-party
services or cloud providers.

All processing happens locally.

***

## Key Principles

- Local-first: all data stays on your machine
- Privacy by design: no telemetry, no tracking, no hidden network calls
- Open source: transparent implementation and auditable behavior
- Developer-friendly: clean architecture, reproducible setup, strong tooling

*** 

## Repository Structure:

This repository is a monorepo:
- api/ Python backend (FastAPI, Poetry, local SQLite)
- app/ Frontend (React, Vite, pnpm)
- docs/ Architecture decisions and develop

Each subproject is developed and run independently.

***

## Quickstart

Backend (API):

```bash
cd api
poetry install
poetry run uvicorn finassist_api.main:app --reload
```

The API will be available at:
http://127.0.0.1:5179

***

Frontend (UI):

```bash
cd app
pnpm install
pnpm dev
```

The frontend will be available at:
http://localhost:5173

***

## Privacy and Data Handling

Finassist is designed to work entirely offline.
- Financial data is stored locally (e.g. SQLite)
- No external APIs are contacted by default
- No analytics, telemetry, or tracking is performed
- Network access is only required for dependency installation during development

Users are encouraged to inspect the source code and CI configuration to verify
this behavior.

***

## Development Setup
See the following documents for details:
- [docs/dev-setup.md](docs/dev-setup.md)
- [docs/adr/0001-python-environment-and-ide-setup.md](docs/adr/0001-python-environment-and-ide-setup.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

***

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.