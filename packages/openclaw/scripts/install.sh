#!/usr/bin/env bash
set -euo pipefail

YES=0
DRY_RUN=0
LINK=0

for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --link) LINK=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ADAPTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ADAPTER_DIR/../.." && pwd)"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

if ! command -v "$OPENCLAW_BIN" >/dev/null 2>&1; then
  echo "openclaw command not found. Set OPENCLAW_BIN=/path/to/openclaw." >&2
  exit 1
fi

echo "Threadmark OpenClaw adapter install plan:"
echo "- install managed hook package from repo root: $REPO_DIR"
echo "- install plugin package from repo root: $REPO_DIR"
echo "- run npm checks before installing"
echo "- use OpenClaw CLI only; no direct config edits"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run only. No changes made."
  exit 0
fi

if [ "$YES" -ne 1 ]; then
  echo "Refusing to install without --yes."
  exit 1
fi

(cd "$REPO_DIR" && npm run check)

"$OPENCLAW_BIN" hooks install "$REPO_DIR"

if [ "$LINK" -eq 1 ]; then
  "$OPENCLAW_BIN" plugins install "$REPO_DIR" --link
else
  "$OPENCLAW_BIN" plugins install "$REPO_DIR"
fi

echo "Install complete. Restart OpenClaw gateway to load Threadmark."
