from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import JSON, Column, String
from sqlmodel import Field, SQLModel


class CsvProfile(SQLModel, table=True):
    __tablename__ = "csv_profile"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False, unique=True))
    delimiter: str = Field(default=",")
    date_format: str = Field(default="iso")
    decimal_comma: bool = Field(default=False)
    # Maps field name → list of candidate CSV column headers (first match wins).
    # Only overrides are stored; missing fields fall back to DEFAULT_COLUMN_MAP.
    # Example: {"booking_date": ["Buchungstag", "Valutadatum"], "amount": ["Betrag"]}
    column_map: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, server_default="{}"),
    )
