Finassist

Local, privacy-first finance assistant.
This repository is a monorepo containing a Python backend and a React frontend.

No cloud services. No telemetry. All data stays local.

Prerequisites

This repository contains multiple runtimes.

Backend:

Python 3.11 or newer

Poetry

Frontend:

Node.js 20 LTS

pnpm (recommended via Corepack and nvm)

Recommended:

Use nvm together with the provided .nvmrc file

Backend Setup (FastAPI)

Change into the backend directory and install dependencies:

cd api
poetry install

Run the backend locally:

poetry run uvicorn finassist_api.main:app --reload

The API will be available at:
http://127.0.0.1:5179

IDE and Python environment decisions are documented in:
docs/adr/0001-python-environment-and-ide-setup.md

Frontend Setup (React + Vite)

Change into the frontend directory:

cd app

Install dependencies:

pnpm install

Start the development server:

pnpm dev

The frontend will be available at:
http://localhost:5173

Notes:

pnpm is used for faster installs and better monorepo support

Some dependencies require explicit approval of build scripts:
pnpm approve-builds

Repository Structure

finassist/

api/ Python backend (FastAPI, Poetry, local venv)

app/ Frontend (React, Vite, pnpm)

docs/ Documentation and architecture decisions