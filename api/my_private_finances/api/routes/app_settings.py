from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body

from my_private_finances.deps import SessionDep
from my_private_finances.models.app_settings import AppSettings
from my_private_finances.schemas import AppSettingsRead, AppSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

_SETTINGS_ID = 1


async def _get_or_create_settings(session: SessionDep) -> AppSettings:
    settings = await session.get(AppSettings, _SETTINGS_ID)
    if settings is None:
        settings = AppSettings(id=_SETTINGS_ID)
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    return settings


@router.get("/app", response_model=AppSettingsRead)
async def get_app_settings(session: SessionDep) -> AppSettings:
    return await _get_or_create_settings(session)


@router.patch("/app", response_model=AppSettingsRead)
async def update_app_settings(
    payload: Annotated[AppSettingsUpdate, Body()],
    session: SessionDep,
) -> AppSettings:
    settings = await _get_or_create_settings(session)

    for field in payload.model_fields_set:
        setattr(settings, field, getattr(payload, field))

    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    return settings
