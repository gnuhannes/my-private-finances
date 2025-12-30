# CONTRIBUTING.md
## Contributing to Finassist

Thanks for your interest in contributing to Finassist!
This project aims to be a local-first, privacy-respecting personal finance assistant.

***

### Repository Structure

This repository is a monorepo:
- api/ Python backend (FastAPI, Poetry)
- app/ Frontend (React, Vite, pnpm)
- docs/ Architecture decisions and development docs

Each subproject is set up independently.

***

### Prerequisites

Backend:
- Python 3.11 or newer
- Poetry

Frontend:
- Node.js 20 LTS
- pnpm (recommended via Corepack or nvm)

A `.nvmrc` file is provided in the repository root.

***

### Backend Development (api/)

Setup:

```bash
cd api
poetry install
```

Run the API locally:

```bash
poetry run uvicorn finassist_api.main:app --reload
```

Run checks:

```bash
poetry run ruff check .
poetry run mypy finassist_api
poetry run pytest
```

***

### Frontend Development (app/)

Setup:

```bash
cd app
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Run checks:

```bash
pnpm lint
pnpm build
```

If pnpm blocks build scripts, run:

```bash
pnpm approve-builds
pnpm rebuild
```

***

### Contributing Workflow
1. Fork the repository 
2. Create a feature branch from main 
3. Make your changes
4. Ensure CI passes locally (backend + frontend)
5. Open a pull request

***

### Code Style
- Backend: follow Ruff and MyPy checks 
- Frontend: follow ESLint rules 
- Prefer small, focused commits
- Clear commit messages are appreciated

***

### License

By contributing to this project, you agree that your contributions
will be licensed under the Apache License 2.0.