# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the My Private Finances desktop backend sidecar.

Bundles the FastAPI app + Alembic migrations + all Python deps (including
scikit-learn/joblib for ML) into a single onefile executable — no system
Python required on the target machine. Tauri (Part B, #179) spawns this
binary as a sidecar process.

Build: ``poetry run pyinstaller desktop.spec`` (from ``api/``), or
``make desktop-build`` from the repo root. Output lands in ``api/dist/``.

Decision (docs/product/110-desktop-app.md, "Open Questions"): PyInstaller
over PyOxidizer — simpler and more mature, and this app's dependency set
(FastAPI, scikit-learn, aiosqlite) is well-trodden ground for PyInstaller;
PyOxidizer's smaller binaries weren't worth its rougher edges for a v1.
"""

from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# PyInstaller execs spec files without setting __file__; it injects SPECPATH
# (the directory containing this spec) into the exec namespace instead.
ROOT = Path(SPECPATH).resolve()  # noqa: F821


def _collect_submodules_no_tests(package: str) -> list[str]:
    """Like collect_submodules, but skips the *.tests* subpackages.

    sklearn ships its own unit tests as importable submodules; pulling those
    into the bundle roughly doubles analysis time and binary size for zero
    runtime benefit.
    """
    return [m for m in collect_submodules(package) if ".tests" not in m]


hidden_imports = (
    _collect_submodules_no_tests("sklearn")
    + collect_submodules("uvicorn")
    + [
        "aiosqlite",
        "alembic",
    ]
)

datas = collect_data_files("sklearn") + [
    (str(ROOT / "alembic.ini"), "."),
    (str(ROOT / "alembic" / "env.py"), "alembic"),
    (str(ROOT / "alembic" / "script.py.mako"), "alembic"),
]
datas += [
    (str(p), "alembic/versions") for p in (ROOT / "alembic" / "versions").glob("*.py")
]

a = Analysis(
    [str(ROOT / "my_private_finances" / "desktop_main.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

# Onefile build: pass scripts/binaries/datas directly to EXE (no COLLECT
# step) so everything is packed into a single executable.
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="my-private-finance-api",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)
