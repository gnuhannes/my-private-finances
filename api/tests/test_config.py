import sys
from pathlib import Path

import pytest

from my_private_finances.config import Settings, _default_data_dir


@pytest.fixture(autouse=True)
def _clear_config_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start each test from a clean environment (CI sets DATABASE_URL)."""
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)


def test_defaults_hang_off_data_dir() -> None:
    settings = Settings(data_dir=Path("/srv/mpf"))

    assert settings.sqlite_path == Path("/srv/mpf/my_private_finances.sqlite")
    assert settings.ml_model_path == Path("/srv/mpf/ml_model.joblib")
    assert settings.watch_root == Path("/srv/mpf/watch")
    assert settings.resolved_database_url == (
        "sqlite+aiosqlite:////srv/mpf/my_private_finances.sqlite"
    )


def test_database_url_overrides_only_the_database() -> None:
    settings = Settings(
        data_dir=Path("/srv/mpf"),
        database_url="postgresql+asyncpg://user@host/db",
    )

    assert settings.resolved_database_url == "postgresql+asyncpg://user@host/db"
    # Everything else still lives under data_dir.
    assert settings.ml_model_path == Path("/srv/mpf/ml_model.joblib")
    assert settings.watch_root == Path("/srv/mpf/watch")


def test_reads_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATA_DIR", "/from/env")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///custom.sqlite")

    settings = Settings()

    assert settings.data_dir == Path("/from/env")
    assert settings.resolved_database_url == "sqlite+aiosqlite:///custom.sqlite"


def test_default_data_dir_unfrozen_is_relative_data(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delattr(sys, "frozen", raising=False)

    assert _default_data_dir() == Path("data")


def test_default_data_dir_frozen_linux(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    monkeypatch.setattr(Path, "home", lambda: Path("/home/alex"))

    assert _default_data_dir() == Path("/home/alex/.local/share/my-private-finance")


def test_default_data_dir_frozen_linux_honours_xdg_data_home(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", "/custom/xdg")

    assert _default_data_dir() == Path("/custom/xdg/my-private-finance")


def test_default_data_dir_frozen_macos(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr(Path, "home", lambda: Path("/Users/alex"))

    assert _default_data_dir() == Path(
        "/Users/alex/Library/Application Support/my-private-finance"
    )


def test_default_data_dir_frozen_windows(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.setenv("APPDATA", "C:\\Users\\alex\\AppData\\Roaming")

    assert _default_data_dir() == Path(
        "C:\\Users\\alex\\AppData\\Roaming/my-private-finance"
    )


def test_default_data_dir_frozen_windows_falls_back_without_appdata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "platform", "win32")
    monkeypatch.delenv("APPDATA", raising=False)
    monkeypatch.setattr(Path, "home", lambda: Path("/home/alex"))

    assert _default_data_dir() == Path("/home/alex/AppData/Roaming/my-private-finance")
