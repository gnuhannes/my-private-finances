.PHONY: help
help:
	@echo "Targets (app):"
	@echo "  make ci         - lint + typecheck (+ test if present)"
	@echo "  make lint       - ESLint"
	@echo "  make format     - Prettier (write)"
	@echo "  make format-check - Prettier (check)"
	@echo "  make typecheck  - TypeScript typecheck"
	@echo "  make test       - Frontend tests (if configured)"
	@echo "  make sync       - Install dependencies"
	@echo "  make run        - Run dev server"


.PHONY: lint
lint:
	pnpm run lint

.PHONY: format
format:
	pnpm run format

.PHONY: format-check
format-check:
	pnpm run format:check

.PHONY: typecheck
typecheck:
	pnpm run typecheck

.PHONY: test
test:
	@# only if you have tests wired; otherwise keep it green:
	@if pnpm -s run | grep -q "^test"; then pnpm run test; else echo "ℹ️  no frontend tests configured"; fi

.PHONY: ci
ci: lint typecheck format-check test
	@echo "✅ app checks passed"

.PHONY: sync
sync:
	pnpm install --frozen-lockfile

.PHONY: run
run:
	pnpm dev
