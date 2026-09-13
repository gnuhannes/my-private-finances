from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String
from sqlmodel import Field, SQLModel


class AppSettings(SQLModel, table=True):
    __tablename__ = "app_settings"

    id: Optional[int] = Field(default=None, primary_key=True)
    onboarding_completed_at: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime, nullable=True)
    )
    onboarding_skipped: bool = Field(default=False)
    default_currency: str = Field(
        default="EUR", sa_column=Column(String(3), nullable=False)
    )
    locale: Optional[str] = Field(
        default=None, sa_column=Column(String(10), nullable=True)
    )
