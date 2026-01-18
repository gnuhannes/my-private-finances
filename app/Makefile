.PHONY: help
help:
	@echo "Targets (app):"
	@echo "  make ci         - lint + typecheck (+ test if present)"
	@echo "  make lint       - ESLint"
	@echo "  make typecheck  - TypeScript typecheck"
	@echo "  make test       - Frontend tests (if configured)"

.PHONY: lint
lint:
	pnpm run lint

.PHONY: typecheck
typecheck:
	pnpm run typecheck

.PHONY: test
test:
	@# only if you have tests wired; otherwise keep it green:
	@if pnpm -s run | grep -q "^test"; then pnpm run test; else echo "ℹ️  no frontend tests configured"; fi

.PHONY: ci
ci: lint typecheck test
	@echo "✅ app checks passed"
