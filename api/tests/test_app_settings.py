from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_app_settings_creates_default_row(test_app: AsyncClient) -> None:
    resp = await test_app.get("/api/settings/app")
    assert resp.status_code == 200
    body = resp.json()
    assert body["onboarding_completed_at"] is None
    assert body["onboarding_skipped"] is False
    assert body["default_currency"] == "EUR"
    assert body["locale"] is None


@pytest.mark.asyncio
async def test_get_app_settings_is_idempotent(test_app: AsyncClient) -> None:
    first = await test_app.get("/api/settings/app")
    second = await test_app.get("/api/settings/app")
    assert first.json() == second.json()


@pytest.mark.asyncio
async def test_patch_app_settings_updates_fields(test_app: AsyncClient) -> None:
    resp = await test_app.patch(
        "/api/settings/app",
        json={"default_currency": "USD", "locale": "de-DE"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["default_currency"] == "USD"
    assert body["locale"] == "de-DE"
    assert body["onboarding_completed_at"] is None
    assert body["onboarding_skipped"] is False


@pytest.mark.asyncio
async def test_patch_app_settings_onboarding_lifecycle(test_app: AsyncClient) -> None:
    skipped = await test_app.patch(
        "/api/settings/app", json={"onboarding_skipped": True}
    )
    assert skipped.status_code == 200
    assert skipped.json()["onboarding_skipped"] is True
    assert skipped.json()["onboarding_completed_at"] is None

    completed = await test_app.patch(
        "/api/settings/app",
        json={"onboarding_completed_at": "2026-01-01T00:00:00Z"},
    )
    assert completed.status_code == 200
    assert completed.json()["onboarding_completed_at"] is not None


@pytest.mark.asyncio
async def test_patch_app_settings_partial_update_leaves_other_fields(
    test_app: AsyncClient,
) -> None:
    await test_app.patch("/api/settings/app", json={"default_currency": "GBP"})
    resp = await test_app.patch("/api/settings/app", json={"locale": "en-GB"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["default_currency"] == "GBP"
    assert body["locale"] == "en-GB"
