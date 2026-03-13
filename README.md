# My Private Finances
[![CI](https://github.com/gnuhannes/my-private-finances/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/gnuhannes/my-private-finances/actions/workflows/ci.yml)

"My Private Finances" is a local-first, privacy-respecting personal finance assistant.

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
- `api/` — Python backend (FastAPI, Poetry, local SQLite)
- `app/` — Frontend (React, Vite, pnpm)
- `docs/` — Architecture decisions and development documentation

Each subproject is developed and run independently.

***

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| [Poetry](https://python-poetry.org/) | latest | Backend dependency management |
| Node.js | 20 LTS | Frontend runtime |
| [pnpm](https://pnpm.io/) | latest | Frontend package manager |
| make | any | Run project tasks |

A `.nvmrc` file is provided for [nvm](https://github.com/nvm-sh/nvm) users. Install pnpm via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable && corepack prepare pnpm@latest --activate`.

***

## Quickstart

Install all dependencies:

```bash
make sync
```

Apply database migrations:

```bash
make migrate
```

Start the backend (port 5179):

```bash
make -C api run
```

Start the frontend (port 5173, proxies `/api` to backend):

```bash
make -C app run
```

The UI will be available at http://localhost:5173 and the API at http://127.0.0.1:5179.

***

## Privacy and Data Handling

"My Private Finances" is designed to work entirely offline.
- Financial data is stored locally (e.g. SQLite)
- No external APIs are contacted by default
- No analytics, telemetry, or tracking is performed
- Network access is only required for dependency installation during development

Users are encouraged to inspect the source code and CI configuration to verify
this behavior.

***

## Development Setup
See the following documents for details:
- [docs/adr/0001-python-environment-and-ide-setup.md](docs/adr/0001-python-environment-and-ide-setup.md) — IDE and virtualenv setup
- [CONTRIBUTING.md](CONTRIBUTING.md) — full contributor guide with CI commands

***

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.
