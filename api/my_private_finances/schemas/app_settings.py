from __future__ import annotations

from datetime import datetime
from typing import Optional

from my_private_finances.schemas.base import ReadSchema, StrictSchema


class AppSettingsRead(ReadSchema):
    onboarding_completed_at: Optional[datetime] = None
    onboarding_skipped: bool
    default_currency: str
    locale: Optional[str] = None


class AppSettingsUpdate(StrictSchema):
    onboarding_completed_at: Optional[datetime] = None
    onboarding_skipped: Optional[bool] = None
    default_currency: Optional[str] = None
    locale: Optional[str] = None
