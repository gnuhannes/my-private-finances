from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from my_private_finances.deps import get_session
from my_private_finances.schemas import ImportResultResponse
from my_private_finances.services.csv_import import import_transactions_from_csv_path

router = APIRouter(prefix="/imports", tags=["imports"])

logger = logging.getLogger(__name__)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post("/csv", response_model=ImportResultResponse)
async def import_csv(
    file: UploadFile,
    session: SessionDep,
    account_id: Annotated[int, Query()],
    delimiter: Annotated[str, Query()] = ",",
    date_format: Annotated[str, Query()] = "iso",
    decimal_comma: Annotated[bool, Query()] = False,
) -> ImportResultResponse:
    content = await file.read()
    logger.info(
        "CSV import request: account_id=%d, filename=%r, size=%d bytes",
        account_id,
        file.filename,
        len(content),
    )

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = await import_transactions_from_csv_path(
            session=session,
            account_id=account_id,
            csv_path=tmp_path,
            delimiter=delimiter,
            date_format=date_format,
            decimal_comma=decimal_comma,
        )
    except ValueError as e:
        msg = str(e)
        logger.warning("CSV import rejected: account_id=%d, reason=%s", account_id, msg)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg) from e
        raise HTTPException(status_code=400, detail=msg) from e
    finally:
        tmp_path.unlink(missing_ok=True)

    return ImportResultResponse(
        total_rows=result.total_rows,
        created=result.created,
        duplicates=result.duplicates,
        failed=result.failed,
        errors=result.errors,
    )
