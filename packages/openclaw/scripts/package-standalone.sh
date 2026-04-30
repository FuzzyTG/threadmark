#!/usr/bin/env bash
# Creates a standalone release artifact: dist/threadmark-openclaw-v<version>.tar.gz
# The extracted artifact supports:
#   tar -xzf threadmark-openclaw-v0.1.0.tar.gz
#   cd threadmark-openclaw-v0.1.0
#   ./install.sh --yes
# No Git, npm install, TypeScript, or npm run check required by end users.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_DIR/../.." && pwd)"

VERSION="$(node -e "process.stdout.write(require('$PACKAGE_DIR/package.json').version)")"
ARTIFACT_NAME="threadmark-openclaw-v${VERSION}"
STAGE_DIR="$REPO_ROOT/dist/standalone/$ARTIFACT_NAME"
DIST_DIR="$REPO_ROOT/dist"
TARBALL="$DIST_DIR/${ARTIFACT_NAME}.tar.gz"

echo "Building standalone artifact: $ARTIFACT_NAME"
echo "  package dir : $PACKAGE_DIR"
echo "  staging     : $STAGE_DIR"
echo "  tarball     : $TARBALL"

# ── 1. Clean staging area ─────────────────────────────────────────────────────
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
mkdir -p "$DIST_DIR"

# ── 2. Require built JS (build must have been run already) ────────────────────
if [ ! -f "$PACKAGE_DIR/dist/src/plugin.js" ]; then
  echo "Error: dist/src/plugin.js not found. Run 'npm run build' first." >&2
  exit 1
fi
if [ ! -f "$PACKAGE_DIR/dist/hooks/threadmark/handler.js" ]; then
  echo "Error: dist/hooks/threadmark/handler.js not found. Run 'npm run build' first." >&2
  exit 1
fi

# ── 3. Stage compiled adapter (dist/src + dist/hooks) ─────────────────────────
mkdir -p "$STAGE_DIR/dist"
cp -r "$PACKAGE_DIR/dist/src" "$STAGE_DIR/dist/src"
cp -r "$PACKAGE_DIR/dist/hooks" "$STAGE_DIR/dist/hooks"

# ── 4. Stage openclaw.plugin.json ─────────────────────────────────────────────
cp "$PACKAGE_DIR/openclaw.plugin.json" "$STAGE_DIR/openclaw.plugin.json"

# ── 5. Bundle @threadmark/core runtime dependency ─────────────────────────────
CORE_SRC="$REPO_ROOT/packages/core"
CORE_DEST="$STAGE_DIR/node_modules/@threadmark/core"
mkdir -p "$CORE_DEST/dist"
cp "$CORE_SRC/package.json" "$CORE_DEST/package.json"
cp -r "$CORE_SRC/dist/src" "$CORE_DEST/dist/src"

# ── 6. Stage a minimal package.json for module resolution ─────────────────────
node -e "
const pkg = require('$PACKAGE_DIR/package.json');
const out = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type,
  main: pkg.main || 'dist/src/plugin.js',
  openclaw: pkg.openclaw
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
" > "$STAGE_DIR/package.json"

# ── 7. Stage standalone install.sh ────────────────────────────────────────────
cat > "$STAGE_DIR/install.sh" << 'INSTALL_EOF'
#!/usr/bin/env bash
set -euo pipefail

YES=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ARTIFACT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"

echo "Threadmark OpenClaw adapter install plan:"
echo "- install managed hook package from artifact directory: $ARTIFACT_DIR"
echo "- install plugin package from artifact directory: $ARTIFACT_DIR"
echo "- use OpenClaw CLI only; no direct config edits"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run only. No changes made."
  exit 0
fi

if ! command -v "$OPENCLAW_BIN" >/dev/null 2>&1; then
  echo "openclaw command not found. Set OPENCLAW_BIN=/path/to/openclaw." >&2
  exit 1
fi

if [ "$YES" -ne 1 ]; then
  echo "Refusing to install without --yes."
  exit 1
fi

"$OPENCLAW_BIN" hooks install "$ARTIFACT_DIR"
"$OPENCLAW_BIN" plugins install "$ARTIFACT_DIR"

echo "Install complete. Restart OpenClaw gateway to load Threadmark."
INSTALL_EOF
chmod +x "$STAGE_DIR/install.sh"

# ── 8. Stage standalone uninstall.sh ──────────────────────────────────────────
cat > "$STAGE_DIR/uninstall.sh" << 'UNINSTALL_EOF'
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
UNINSTALL_EOF
chmod +x "$STAGE_DIR/uninstall.sh"

# ── 9. Remove non-runtime build artifacts ─────────────────────────────────────
find "$STAGE_DIR" -name "*.js.map" -delete

# ── 10. Create tarball with single top-level directory ────────────────────────
(cd "$REPO_ROOT/dist/standalone" && tar -czf "$TARBALL" "$ARTIFACT_NAME")

echo "Packaging complete: $TARBALL"
