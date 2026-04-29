#!/usr/bin/env bash
set -euo pipefail

YES=0

for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

if ! command -v "$OPENCLAW_BIN" >/dev/null 2>&1; then
  echo "openclaw command not found. Set OPENCLAW_BIN=/path/to/openclaw." >&2
  exit 1
fi

echo "Threadmark OpenClaw adapter cleanup plan:"
echo "- disable managed hook: threadmark"
echo "- disable plugin: threadmark"
echo "- keep ~/.openclaw/continuity logs/state unless removed manually"

if [ "$YES" -ne 1 ]; then
  echo "Refusing to disable without --yes."
  exit 1
fi

FAILED=0

if ! "$OPENCLAW_BIN" hooks disable threadmark; then
  echo "Failed to disable managed hook: threadmark" >&2
  FAILED=1
fi

if ! "$OPENCLAW_BIN" plugins disable threadmark; then
  echo "Failed to disable plugin: threadmark" >&2
  FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
  echo "Disable incomplete. Check OpenClaw CLI output above." >&2
  exit 1
fi

echo "Disable complete. Restart OpenClaw gateway to apply."
