from __future__ import annotations

from pydantic import BaseModel

# Valid field names that can be remapped via column_map
REMAPPABLE_FIELDS = frozenset(
    {"booking_date", "amount", "currency", "payee", "purpose", "external_id"}
)


class CsvProfileCreate(BaseModel):
    name: str
    delimiter: str = ","
    date_format: str = "iso"
    decimal_comma: bool = False
    # Keys must be members of REMAPPABLE_FIELDS; values are ordered candidate headers.
    column_map: dict[str, list[str]] = {}


class CsvProfileRead(CsvProfileCreate):
    id: int


class CsvProfileUpdate(BaseModel):
    name: str | None = None
    delimiter: str | None = None
    date_format: str | None = None
    decimal_comma: bool | None = None
    column_map: dict[str, list[str]] | None = None
