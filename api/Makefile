.PHONY: help
help:
	@echo "Targets (api):"
	@echo "  make ci              - ruff + mypy + pytest + migration drift check"
	@echo "  make lint            - Ruff check + format check"
	@echo "  make lint-fix         - Ruff auto-fix + format"
	@echo "  make typecheck       - Mypy"
	@echo "  make test            - Pytest"
	@echo "  make migrate         - Alembic upgrade head"
	@echo "  make check-migrations - Detect schema drift via autogenerate"

.PHONY: lint
lint:
	poetry run ruff check .
	poetry run ruff format --check .

.PHONY: lint-fix
lint-fix:
	poetry run ruff check . --fix
	poetry run ruff format .

.PHONY: typecheck
typecheck:
	poetry run mypy my_private_finances

.PHONY: test
test:
	poetry run pytest

.PHONY: migrate
migrate:
	poetry run alembic upgrade head

.PHONY: check-migrations
check-migrations:
	@# Ensure the target DB is at head so autogenerate can diff metadata vs database
	@poetry run alembic upgrade head >/dev/null

	@rm -f alembic/versions/__ci_check__*.py
	@poetry run alembic revision --autogenerate -m "__ci_check__" --rev-id __ci_check__ >/dev/null || { \
		echo "❌ Alembic autogenerate failed. Is the database up to date?"; \
		exit 1; \
	}

	@f=$$(ls alembic/versions/__ci_check__*.py 2>/dev/null | head -n 1); \
	if [ -z "$$f" ]; then \
		echo "✅ No schema drift (no file generated)."; \
		exit 0; \
	fi; \
	if grep -Eq "op\.(create_table|drop_table|add_column|drop_column|alter_column|create_index|drop_index|create_unique_constraint|drop_constraint|execute)\b" "$$f"; then \
		echo "❌ Schema drift detected (autogenerate has operations)."; \
		echo "   Please create and commit a real migration."; \
		echo ""; \
		sed -n '1,220p' "$$f"; \
		rm -f "$$f"; \
		exit 1; \
	else \
		echo "✅ No schema drift (autogenerate produced empty migration)."; \
		rm -f "$$f"; \
	fi

.PHONY: ci
ci: lint typecheck test check-migrations
	@echo "✅ api checks passed"

.PHONY: sync
sync:
	poetry install --no-interaction --sync

