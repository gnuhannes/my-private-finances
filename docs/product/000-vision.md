# 000 — Vision & Principles

## Goal

Build a **local-first, privacy-by-design** personal finance application that helps understand, structure and optimise personal finances **without any cloud dependency**. All data stays on the local machine. The system should be automatable, reproducible, and extensible.

## Core Principles

- Local-first (SQLite, local files)
- No cloud, no telemetry, no external APIs required
- Privacy-by-design
- Deterministic imports and idempotent writes
- Reproducible dev setup
- Pragmatic Clean Architecture
- Strong test coverage

## Long-term Vision

- Import data from multiple sources (banks, credit cards, manual entries, cash)
- Automatically categorise transactions using:
  - First: rules and heuristics
  - Later: optional local ML (trained on the user's own data)
- Provide insights:
  - Monthly overviews and category breakdowns
  - Recurring costs and budget vs actual
  - Spending trends and annual review
  - Net-worth tracking over time
- Support review & correction workflows
- Eventually: granular receipt-level categorisation (line items from scanned bills)
- Remain fully offline-capable

## Non-Goals

- No SaaS
- No multi-user / sync
- No bank API integrations
- No sending data to external AI/ML services

## Success Criteria

- App is useful even with only CSV imports
- User can answer: "Where does my money go?"
- User trusts the system with sensitive data
