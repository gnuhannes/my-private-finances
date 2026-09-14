"""Entry point for the PyInstaller-packaged desktop backend sidecar.

Not used in dev mode (``make run`` still uses ``uvicorn --reload`` directly)
or in tests. This module is the ``Analysis`` script in ``desktop.spec``: it
runs Alembic migrations against the resolved ``data_dir``, one-time-migrates
a pre-existing dev-mode database into the app-data dir if found, then serves
the FastAPI app on loopback only. See docs/product/110-desktop-app.md.
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
from pathlib import Path

import uvicorn
from alembic.config import Config

from alembic import command
from my_private_finances.config import get_settings
from my_private_finances.logging_config import setup_logging

logger = logging.getLogger(__name__)

DESKTOP_PORT = 5179

# Files copied out of a pre-existing dev-mode ``data/`` directory on first
# desktop launch. Anything else there (e.g. watch-folder inbox contents)
# stays behind — only the DB and trained model carry over automatically.
_LEGACY_MIGRATE_FILES = ("my_private_finances.sqlite", "ml_model.joblib")


def _bundle_root() -> Path:
    """Directory containing ``alembic.ini`` and the ``alembic/`` scripts.

    Inside a PyInstaller onefile build this is the temporary extraction
    directory (``sys._MEIPASS``); running from source it's the ``api/``
    package root (two levels up from this file).
    """
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass is not None:
        return Path(meipass)
    return Path(__file__).resolve().parent.parent


def migrate_legacy_data_dir() -> None:
    """One-time copy of a pre-existing dev-mode DB into the app-data dir.

    Decision (see docs/product/110-desktop-app.md "First-launch migration"):
    auto-detect and copy, never delete the source, and never overwrite an
    app-data DB that already exists. This covers the common case of a
    developer running the packaged binary from their own repo checkout with
    existing dev data; it intentionally does nothing for end users who never
    had a dev-mode ``data/`` directory to begin with.
    """
    settings = get_settings()
    legacy_dir = Path("data").resolve()
    if settings.sqlite_path.exists() or not legacy_dir.is_dir():
        return
    if legacy_dir == settings.data_dir.resolve():
        return

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    for filename in _LEGACY_MIGRATE_FILES:
        src = legacy_dir / filename
        if src.exists():
            shutil.copy2(src, settings.data_dir / filename)
            logger.info("Migrated legacy dev-mode file into app data dir: %s", filename)


def run_migrations() -> None:
    ini_path = _bundle_root() / "alembic.ini"
    cfg = Config(str(ini_path))
    logger.info("Running database migrations (alembic upgrade head)")
    command.upgrade(cfg, "head")


def main() -> None:
    setup_logging()
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Desktop backend starting (data_dir=%s)", settings.data_dir)

    migrate_legacy_data_dir()
    run_migrations()

    from my_private_finances.main import app

    port = int(os.environ.get("DESKTOP_PORT", DESKTOP_PORT))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
