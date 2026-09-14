from pathlib import Path

import pytest

from my_private_finances import desktop_main
from my_private_finances.config import Settings, get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _patch_settings(monkeypatch: pytest.MonkeyPatch, settings: Settings) -> None:
    monkeypatch.setattr(desktop_main, "get_settings", lambda: settings)


def test_migrate_legacy_data_dir_copies_db_and_model(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    legacy_dir = tmp_path / "legacy"
    legacy_dir.mkdir()
    (legacy_dir / "my_private_finances.sqlite").write_bytes(b"legacy-db")
    (legacy_dir / "ml_model.joblib").write_bytes(b"legacy-model")

    app_data_dir = tmp_path / "app-data"
    settings = Settings(data_dir=app_data_dir)
    _patch_settings(monkeypatch, settings)

    # `migrate_legacy_data_dir` looks for ./data relative to cwd.
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    (workdir / "data").symlink_to(legacy_dir)
    monkeypatch.chdir(workdir)

    desktop_main.migrate_legacy_data_dir()

    assert (app_data_dir / "my_private_finances.sqlite").read_bytes() == b"legacy-db"
    assert (app_data_dir / "ml_model.joblib").read_bytes() == b"legacy-model"
    # Source is left untouched (copy, not move).
    assert (legacy_dir / "my_private_finances.sqlite").exists()


def test_migrate_legacy_data_dir_skips_when_app_db_already_exists(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    legacy_dir = workdir / "data"
    legacy_dir.mkdir()
    (legacy_dir / "my_private_finances.sqlite").write_bytes(b"legacy-db")
    monkeypatch.chdir(workdir)

    app_data_dir = tmp_path / "app-data"
    app_data_dir.mkdir()
    (app_data_dir / "my_private_finances.sqlite").write_bytes(b"existing-db")
    settings = Settings(data_dir=app_data_dir)
    _patch_settings(monkeypatch, settings)

    desktop_main.migrate_legacy_data_dir()

    assert (app_data_dir / "my_private_finances.sqlite").read_bytes() == b"existing-db"


def test_migrate_legacy_data_dir_noop_without_legacy_dir(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    monkeypatch.chdir(workdir)

    app_data_dir = tmp_path / "app-data"
    settings = Settings(data_dir=app_data_dir)
    _patch_settings(monkeypatch, settings)

    desktop_main.migrate_legacy_data_dir()

    assert not app_data_dir.exists()


def test_migrate_legacy_data_dir_noop_when_data_dir_is_legacy_dir(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    workdir = tmp_path / "workdir"
    workdir.mkdir()
    (workdir / "data").mkdir()
    (workdir / "data" / "my_private_finances.sqlite").write_bytes(b"db")
    monkeypatch.chdir(workdir)

    settings = Settings(data_dir=Path("data"))
    _patch_settings(monkeypatch, settings)

    # Should not raise or try to copy a file onto itself.
    desktop_main.migrate_legacy_data_dir()


def test_bundle_root_uses_meipass_when_frozen(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(desktop_main.sys, "_MEIPASS", str(tmp_path), raising=False)

    assert desktop_main._bundle_root() == tmp_path


def test_bundle_root_falls_back_to_api_dir_when_not_frozen(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delattr(desktop_main.sys, "_MEIPASS", raising=False)

    root = desktop_main._bundle_root()

    assert (root / "alembic.ini").exists()
