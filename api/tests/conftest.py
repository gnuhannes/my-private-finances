import tempfile
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel import SQLModel

from my_private_finances.db import create_engine, create_session_factory
from my_private_finances.main import create_app


@pytest_asyncio.fixture
async def test_app() -> AsyncGenerator[AsyncClient, None]:
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.sqlite"
        database_url = f"sqlite+aiosqlite:///{db_path.as_posix()}"

        app = create_app()

        engine: AsyncEngine = create_engine(database_url)
        session_factory = create_session_factory(engine)
        app.state.engine = engine
        app.state.session_factory = session_factory

        async with engine.connect() as conn:
            async with conn.begin():
                await conn.run_sync(SQLModel.metadata.create_all)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

        await engine.dispose()
