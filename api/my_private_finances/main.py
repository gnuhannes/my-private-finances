from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from my_private_finances.db import (
    DEFAULT_DB_PATH,
    create_engine,
    create_session_factory,
)
from my_private_finances.api.routes import accounts_router, health_router


def create_app(db_path: Path = DEFAULT_DB_PATH) -> FastAPI:
    app = FastAPI(title="My Private Finances")

    engine: AsyncEngine = create_engine(db_path)
    session_factory: async_sessionmaker[AsyncSession] = create_session_factory(engine)

    app.state.engine = engine
    app.state.session_factory = session_factory

    app.include_router(health_router)
    app.include_router(accounts_router)

    return app


app = create_app()
