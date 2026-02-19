"""Logging configuration for My Private Finances.

Call setup_logging() once at application startup.
Log level is controlled by the LOG_LEVEL environment variable (default: INFO).
"""

from __future__ import annotations

import logging
import os


def setup_logging() -> None:
    """Configure stdlib logging for the application."""
    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # Silence noisy third-party loggers unless we're in DEBUG
    if level > logging.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("aiosqlite").setLevel(logging.WARNING)
