from __future__ import annotations

import os
import sys
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    """Default ``data_dir`` when ``DATA_DIR`` is unset.

    Running from source (uvicorn --reload, pytest, the CLI) keeps the
    long-standing ``./data`` default, relative to the process cwd. The
    PyInstaller-packaged desktop binary (``sys.frozen`` is only set inside a
    frozen build, see ``desktop_main.py``) instead defaults to the OS-standard
    per-user app-data directory, since a desktop app has no meaningful "cwd"
    and must not scatter its database next to wherever it happens to be
    launched from. See docs/product/110-desktop-app.md.
    """
    if not getattr(sys, "frozen", False):
        return Path("data")
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "my-private-finance"
    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA")
        base = Path(appdata) if appdata else Path.home() / "AppData" / "Roaming"
        return base / "my-private-finance"
    xdg_data_home = os.environ.get("XDG_DATA_HOME")
    base = Path(xdg_data_home) if xdg_data_home else Path.home() / ".local" / "share"
    return base / "my-private-finance"


class Settings(BaseSettings):
    """Single source of runtime configuration.

    Everything on-disk hangs off ``data_dir`` (env ``DATA_DIR``). ``DATABASE_URL``
    is an optional override for the database only; when unset the database lives
    inside ``data_dir``. Nothing else in the codebase should read the environment
    for these values.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    data_dir: Path = Field(default_factory=_default_data_dir)
    database_url: str | None = None
    log_level: str = "INFO"

    # Browser origins allowed to call the API. Localhost-only by default; the
    # PWA/LAN roadmap (feature 130) must widen this *and* add auth (see #99).
    # The tauri:// / http://tauri.localhost entries are the desktop shell's
    # webview asset origin (Part B, #179) — unreachable from a real browser,
    # so listing them here doesn't widen the *practical* attack surface.
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ]

    @property
    def sqlite_path(self) -> Path:
        return self.data_dir / "my_private_finances.sqlite"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite+aiosqlite:///{self.sqlite_path.as_posix()}"

    @property
    def ml_model_path(self) -> Path:
        return self.data_dir / "ml_model.joblib"

    @property
    def watch_root(self) -> Path:
        return self.data_dir / "watch"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings, read from the environment once."""
    return Settings()
