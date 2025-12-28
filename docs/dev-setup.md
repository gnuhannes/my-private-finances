Development Setup

This document describes the recommended local development setup for this repository.

Node.js and pnpm

The project targets Node.js 20 LTS.

Using nvm (recommended):

Install Node 20:

nvm install 20
nvm use 20
nvm alias default 20

A .nvmrc file is provided in the repository root.
You can simply run:

nvm use

pnpm via Corepack

Enable Corepack and activate pnpm:

corepack enable
corepack prepare pnpm@latest --activate

Verify installation:

node -v
pnpm -v

pnpm Security: approve-builds

pnpm blocks some postinstall scripts by default for supply-chain security.

After installing frontend dependencies, run:

pnpm approve-builds
pnpm rebuild

Currently required for:

esbuild

IDE Notes

WebStorm:

Node interpreter should point to the nvm-managed Node installation

TypeScript should use the workspace version from node_modules

ESLint should use automatic configuration

PyCharm:

Python interpreter should point to:
api/.venv/bin/python

Backend working directory should be:
api/