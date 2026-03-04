from __future__ import annotations

from typing import Optional

from sqlmodel import SQLModel


class WatchSettingsRead(SQLModel):
    root_path: str


class WatchSettingsUpdate(SQLModel):
    root_path: str


class WatchFolderConfigCreate(SQLModel):
    subfolder_name: str
    account_id: int
    profile_id: Optional[int] = None


class WatchFolderConfigRead(SQLModel):
    id: int
    subfolder_name: str
    account_id: int
    profile_id: Optional[int]


class WatchFolderConfigUpdate(SQLModel):
    account_id: Optional[int] = None
    profile_id: Optional[int] = None
