from pydantic import BaseModel


class ImportResultResponse(BaseModel):
    total_rows: int
    created: int
    duplicates: int
    failed: int
    errors: list[str]
