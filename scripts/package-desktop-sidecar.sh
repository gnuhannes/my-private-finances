#!/usr/bin/env bash
# Builds the PyInstaller backend binary (api/desktop.spec) and stages it as a
# Tauri sidecar at app/src-tauri/binaries/<name>-<target-triple>[.exe]. Tauri
# resolves `bundle.externalBin` entries by appending the Rust host triple, so
# the staged filename must match exactly. See docs/product/110-desktop-app.md.
set -euo pipefail

cd "$(dirname "$0")/.."

TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
if [ -z "$TRIPLE" ]; then
  echo "error: could not determine the Rust host triple (is rustc on PATH?)" >&2
  exit 1
fi

echo "==> Building backend sidecar (PyInstaller, target: $TRIPLE)"
(cd api && poetry run pyinstaller desktop.spec --noconfirm)

SRC="api/dist/my-private-finance-api"
EXT=""
if [ -f "${SRC}.exe" ]; then
  SRC="${SRC}.exe"
  EXT=".exe"
fi

mkdir -p app/src-tauri/binaries
DEST="app/src-tauri/binaries/my-private-finance-api-${TRIPLE}${EXT}"
cp "$SRC" "$DEST"
echo "==> Staged sidecar at $DEST"
