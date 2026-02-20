from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, UploadFile
from my_private_finances.deps import SessionDep
from my_private_finances.models import CsvProfile
from my_private_finances.schemas import ImportResultResponse
from my_private_finances.services.csv_import import (
    ColumnMap,
    import_transactions_from_csv_path,
)
from my_private_finances.services.pdf_import import import_transactions_from_pdf_path

router = APIRouter(prefix="/imports", tags=["imports"])

logger = logging.getLogger(__name__)


@router.post("/csv", response_model=ImportResultResponse)
async def import_csv(
    file: UploadFile,
    session: SessionDep,
    account_id: Annotated[int, Query()],
    delimiter: Annotated[str | None, Query()] = None,
    date_format: Annotated[str | None, Query()] = None,
    decimal_comma: Annotated[bool | None, Query()] = None,
    profile_id: Annotated[int | None, Query()] = None,
) -> ImportResultResponse:
    content = await file.read()
    logger.info(
        "CSV import request: account_id=%d, filename=%r, size=%d bytes, profile_id=%s",
        account_id,
        file.filename,
        len(content),
        profile_id,
    )

    # Resolve effective settings: explicit param → profile default → service default
    column_map: ColumnMap | None = None
    profile_delimiter: str = ","
    profile_date_format: str = "iso"
    profile_decimal_comma: bool = False

    if profile_id is not None:
        profile = await session.get(CsvProfile, profile_id)
        if profile is None:
            raise HTTPException(
                status_code=404, detail=f"CSV profile {profile_id} not found"
            )
        profile_delimiter = profile.delimiter
        profile_date_format = profile.date_format
        profile_decimal_comma = profile.decimal_comma
        if profile.column_map:
            column_map = profile.column_map  # type: ignore[assignment]

    effective_delimiter = delimiter if delimiter is not None else profile_delimiter
    effective_date_format = (
        date_format if date_format is not None else profile_date_format
    )
    effective_decimal_comma = (
        decimal_comma if decimal_comma is not None else profile_decimal_comma
    )

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = await import_transactions_from_csv_path(
            session=session,
            account_id=account_id,
            csv_path=tmp_path,
            delimiter=effective_delimiter,
            date_format=effective_date_format,
            decimal_comma=effective_decimal_comma,
            column_map=column_map,
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


@router.post("/pdf", response_model=ImportResultResponse)
async def import_pdf(
    file: UploadFile,
    session: SessionDep,
    account_id: Annotated[int, Query()],
) -> ImportResultResponse:
    content = await file.read()
    logger.info(
        "PDF import request: account_id=%d, filename=%r, size=%d bytes",
        account_id,
        file.filename,
        len(content),
    )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = await import_transactions_from_pdf_path(
            session=session,
            account_id=account_id,
            pdf_path=tmp_path,
        )
    except ValueError as e:
        msg = str(e)
        logger.warning("PDF import rejected: account_id=%d, reason=%s", account_id, msg)
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
