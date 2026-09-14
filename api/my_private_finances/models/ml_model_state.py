from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class MLModelState(SQLModel, table=True):
    """Singleton (id=1) tracking auto-retrain bookkeeping for the ML categorizer."""

    __tablename__ = "ml_model_state"

    id: Optional[int] = Field(default=None, primary_key=True)
    categorizations_since_train: int = Field(default=0)
    last_trained_at: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime)
    )
