from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    sf: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with sf() as session:
        yield session
