### Backend (Python)

The backend lives in `api/` and uses a project-local virtual environment.

```bash
cd api
poetry install
poetry run uvicorn finassist_api.main:app
```

Note: PyCharm users must select api/.venv/bin/python as interpreter.
See docs/adr/0001-python-environment-and-ide-setup.md.

