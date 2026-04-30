# Project Instructions

## Working style

- Keep public docs and fixtures free of real user messages, personal metadata, service IDs, credentials, hostnames, and deployment-specific secrets.
- Use synthetic examples in tests and README assets.
- Prefer OpenClaw CLI flows for installation, plugin enable/disable, and gateway restart instead of manually editing OpenClaw config.
- Do not upgrade Node.js, npm, OpenClaw, or other validation environment components as part of routine validation.

## Validation notes

- Threadmark installs an OpenClaw managed hook for `/new`, `/reset`, and `agent:bootstrap`.
- Threadmark installs an OpenClaw plugin for `before_compaction`.
- The hook runtime must point to compiled JavaScript (`handler.js`), not TypeScript source.
- The repository root contains `openclaw.plugin.json` because OpenClaw validates the installed plugin root for that manifest.
- When validating reinstall behavior, cleanly disable/uninstall plugins through OpenClaw before removing plugin files.

## Release process

- Before tagging a release, bump `packages/openclaw/package.json` version to match the tag. The standalone packaging script reads the version from `package.json` to name the tarball — a mismatch produces an artifact named after the old version.
- Tag and version bump must be in the same commit or the commit immediately before the tag.
- Keep backup copies outside OpenClaw hook/plugin discovery directories so they are not loaded as duplicate candidates.
- If files are copied between machines, ensure OpenClaw-owned installed files have the expected local owner before restart.
