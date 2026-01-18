.PHONY: help
help:
	@echo "Targets (root):"
	@echo "  make ci           - Run backend + frontend checks"
	@echo "  make ci-backend   - Run backend checks"
	@echo "  make ci-frontend  - Run frontend checks"
	@echo "  make lint         - Backend lint (ruff)"
	@echo "  make typecheck    - Backend typecheck (mypy)"
	@echo "  make test         - Backend tests (pytest)"
	@echo "  make migrate      - Apply backend migrations (alembic upgrade head)"
	@echo "  make check-migrations - Fail if alembic autogenerate detects drift"
	@echo "  make fe-lint      - Frontend lint"
	@echo "  make fe-typecheck - Frontend typecheck"
	@echo "  make fe-test      - Frontend tests (if configured)"

.PHONY: ci
ci: ci-backend ci-frontend
	@echo "✅ Full CI suite passed"

.PHONY: ci-backend
ci-backend:
	$(MAKE) -C api ci

.PHONY: ci-frontend
ci-frontend:
	$(MAKE) -C app ci

.PHONY: lint typecheck test migrate check-migrations
lint typecheck test migrate check-migrations:
	$(MAKE) -C api $@

.PHONY: fe-lint fe-typecheck fe-test
fe-lint:
	$(MAKE) -C app lint

fe-typecheck:
	$(MAKE) -C app typecheck

fe-test:
	$(MAKE) -C app test

.PHONY: sync sync-backend sync-frontend
sync: sync-backend sync-frontend
	@echo "✅ Dependencies synced (backend + frontend)"

sync-backend:
	$(MAKE) -C api sync

sync-frontend:
	$(MAKE) -C app sync

