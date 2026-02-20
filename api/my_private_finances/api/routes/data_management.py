from __future__ import annotations

import logging
import os
import sqlite3
import tempfile

from fastapi import APIRouter, HTTPException, Request, UploadFile
from sqlalchemy import delete, func, select

from my_private_finances.deps import SessionDep
from my_private_finances.models import (
    Account,
    Budget,
    CategorizationRule,
    Category,
    CsvProfile,
    RecurringPattern,
    Transaction,
    TransferCandidate,
)

router = APIRouter(tags=["data"])

logger = logging.getLogger(__name__)

_SQLITE_MAGIC = b"SQLite format 3\x00"


@router.post("/restore/sqlite", status_code=200)
async def restore_sqlite(file: UploadFile, request: Request) -> dict:
    data = await file.read()
    if data[:16] != _SQLITE_MAGIC:
        raise HTTPException(status_code=400, detail="Not a valid SQLite file")

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        # Release all pooled async connections before writing
        await request.app.state.engine.dispose()

        src = sqlite3.connect(tmp_path)
        dst = sqlite3.connect(str(request.app.state.db_path))
        src.backup(dst)
        dst.close()
        src.close()
    finally:
        if tmp_path is not None:
            os.unlink(tmp_path)

    logger.info("Database restored from uploaded SQLite backup")
    return {"ok": True}


async def _count(session: SessionDep, model: type) -> int:
    result = await session.execute(select(func.count()).select_from(model))  # type: ignore[arg-type]
    return int(result.scalar_one())


@router.delete("/data/transactions", status_code=200)
async def delete_transactions(session: SessionDep) -> dict:
    """Delete all transactions, transfer candidates, and recurring patterns."""
    models = [TransferCandidate, RecurringPattern, Transaction]
    deleted = sum([await _count(session, m) for m in models])
    for model in models:
        await session.execute(delete(model))
    await session.commit()
    logger.info("Deleted all transactions: %d rows total", deleted)
    return {"deleted": deleted}


@router.delete("/data", status_code=200)
async def wipe_all_data(session: SessionDep) -> dict:
    """Delete all data from all tables in FK-safe order."""
    models = [
        TransferCandidate,
        RecurringPattern,
        Transaction,
        Budget,
        CategorizationRule,
        CsvProfile,
        Category,
        Account,
    ]
    deleted = sum([await _count(session, m) for m in models])
    for model in models:
        await session.execute(delete(model))
    await session.commit()
    logger.info("Wiped all data: %d rows deleted", deleted)
    return {"deleted": deleted}
