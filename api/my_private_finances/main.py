from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from my_private_finances.db import (
    DEFAULT_DB_PATH,
    create_engine,
    create_session_factory,
)
from my_private_finances.api.router import api_router
from my_private_finances.logging_config import setup_logging

setup_logging()

logger = logging.getLogger(__name__)


def create_app(db_path: Path = DEFAULT_DB_PATH) -> FastAPI:
    logger.info("Starting My Private Finances, database: %s", db_path)

    app = FastAPI(title="My Private Finances")

    engine: AsyncEngine = create_engine()
    session_factory: async_sessionmaker[AsyncSession] = create_session_factory(engine)

    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.db_path = db_path
    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
