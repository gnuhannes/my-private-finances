from pydantic import BaseModel


class ImportErrorDetail(BaseModel):
    row: int | None = None
    field: str | None = None
    raw_value: str | None = None
    message: str
    hint: str | None = None
    unexpected: bool = False


class ImportResultResponse(BaseModel):
    total_rows: int
    created: int
    skipped: int = 0
    duplicates: int
    failed: int
    errors: list[ImportErrorDetail]
    errors_truncated: bool = False
