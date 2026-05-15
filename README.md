# Threadmark

![Threadmark comic: preserving recent context across new sessions](docs/assets/threadmark.png)

Threadmark preserves a small active/recent context packet across agent session boundaries so vague follow-ups can be grounded safely.

Threadmark does not write archival memory or run `openclaw memory index`.

## Why

Agents lose context when sessions end. A user says "continue" or "do it again" and the new session has no idea what came before. Threadmark solves this by capturing just enough recent context — the last few exchanges, the current goal, relevant artifacts — and injecting it at session start.

Threadmark is the short-term memory layer. Pairs with [Engrams](https://github.com/FuzzyTG/Engrams) for long-term knowledge retention.

### ThreadMark vs Engrams

| | ThreadMark | Engrams |
|---|---|---|
| Question it answers | "Where was I?" | "What should I know?" |
| Memory type | Short-term | Long-term |
| Scope | Last few exchanges | Accumulated knowledge |
| Ownership | Per-agent, isolated | Cross-agent, shared |
| Lifespan | 24 hours | Durable (evergreen or time-windowed) |
| Trigger | Vague follow-ups ("continue", "do it again") | Every message (active matching) |

## How it works

- Managed hook id: `threadmark`
- Plugin id: `threadmark`
- Captures `/new` and `/reset` from OpenClaw session transcripts.
- Injects `RECENT_CONTEXT.md` during OpenClaw `agent:bootstrap`.

## Compaction behavior

OpenClaw has two compaction code paths that provide different data to the `before_compaction` hook:

| Path | `messages` | `sessionFile` | `sessionId` |
|---|---|---|---|
| Auto-compaction (subscribe handler) | yes | yes | no |
| Explicit compaction (compact runner) | no | no | yes |

Threadmark tries to capture the best context available:

1. If `messages` are provided, extract context directly from them.
2. Otherwise, if `sessionFile` or `sessionId` is available, resolve and read the transcript file.
3. Otherwise, record a partial capture (signal-only).

## Install

Download the latest release tarball from the [Releases page](../../releases).

```sh
tar -xzf threadmark-openclaw-v*.tar.gz
cd threadmark-openclaw-v*/
./install.sh --dry-run   # preview what will be changed
./install.sh --yes       # install hooks and plugin
```

> **For AI agents:** Run `./install.sh --yes` for fresh installs, or `./install.sh --upgrade --yes` to upgrade an existing installation. Do NOT read the script and run individual `openclaw` commands manually — the install order matters and partial runs corrupt the gateway config.

Restart the OpenClaw gateway after install. Verify:

```sh
openclaw hooks list      # should show threadmark
openclaw plugins list    # should show threadmark loaded
```

To upgrade an existing installation:

```sh
./install.sh --upgrade --dry-run   # preview
./install.sh --upgrade --yes       # uninstall existing, then clean install
```

To uninstall:

```sh
./uninstall.sh --dry-run   # preview
./uninstall.sh --yes       # remove hooks, plugin, and extension files
```

Restart the OpenClaw gateway after uninstall.

## Development

Requires Node.js ≥ 22.12.0.

```sh
git clone <repo>
cd threadmark
npm install
npm run check            # build + test
```

Release artifacts are built automatically by CI on tag push (`git tag v0.1.1 && git push --tags`).
