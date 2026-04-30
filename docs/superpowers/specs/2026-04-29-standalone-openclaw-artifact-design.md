# Standalone OpenClaw Artifact Design

## Goal

Package the Threadmark OpenClaw adapter so users can install it from a GitHub release artifact without copying or linking the full monorepo.

## Acceptance criteria

- The OpenClaw adapter distribution format is a GitHub release artifact.
- The standalone artifact includes everything needed for `@threadmark/openclaw` to resolve `@threadmark/core` at runtime.
- The README documents the standalone install path from the artifact.
- The README keeps local linked development install instructions separate.

## Architecture

Add a packaging path that builds the workspace, stages a standalone `@threadmark/openclaw` package, and creates a release-ready artifact. The staged package includes the compiled OpenClaw adapter and a local dependency layout for the compiled `@threadmark/core` package.

The packaging path should not change the runtime OpenClaw integration model. Installed hooks and plugins must continue to point to compiled JavaScript and copied hook assets, not TypeScript source or monorepo paths.

## Components

- A packaging script under the OpenClaw package, such as `packages/openclaw/scripts/package-standalone.sh`.
- A package script entry that builds and invokes the packaging script.
- A staged artifact directory containing:
  - `package.json`
  - `openclaw.plugin.json`
  - `dist/`
  - `scripts/install.sh`
  - `scripts/uninstall.sh`
  - a local `node_modules/@threadmark/core` layout containing the built core package files required at runtime
- README sections for standalone installation and linked local development.

## Artifact format

Use a compressed tarball generated from the staged standalone package directory. This is suitable for attaching to a GitHub release and simple for users to download and extract.

The tarball should contain one top-level directory, for example `threadmark-openclaw-standalone/`, so extraction does not scatter files into the current directory.

## Install flow

1. Maintainer runs the package script from the repository.
2. The script runs or requires the workspace build.
3. The script stages the OpenClaw adapter files and the built core dependency.
4. The script emits a standalone `.tgz` artifact.
5. User downloads and extracts the artifact from GitHub.
6. User runs `scripts/install.sh --yes` from the extracted artifact.
7. User restarts the OpenClaw gateway and validates that the `threadmark` hook and plugin are loaded.

## Error handling

Packaging should fail before producing an artifact if required files are missing, including:

- `packages/openclaw/dist/src/plugin.js`
- `packages/openclaw/dist/hooks/threadmark/HOOK.md`
- `packages/openclaw/openclaw.plugin.json`
- `packages/openclaw/scripts/install.sh`
- `packages/openclaw/scripts/uninstall.sh`
- `packages/core/dist/src/index.js`
- `packages/core/package.json`

The script should recreate its staging directory on each run so stale files do not leak into the artifact.

## Documentation

The README should separate two paths:

- Standalone install from a GitHub release artifact for end users.
- Linked local development install from the repository checkout for contributors and validation.

The standalone instructions should use synthetic examples only and avoid user-specific paths, hostnames, service IDs, credentials, or real personal metadata.

## Testing

Validation should include:

- Existing workspace build and tests.
- Running the packaging script.
- Inspecting the artifact contents for the required OpenClaw files and bundled core dependency.
- Verifying Node can resolve `@threadmark/core` from the staged standalone package layout.

## Out of scope

- Publishing to npm.
- Changing OpenClaw runtime APIs.
- Changing Threadmark persistence behavior.
- Adding archival memory or OpenClaw memory indexing.
