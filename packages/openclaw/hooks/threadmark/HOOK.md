---
name: threadmark
description: "Preserve tiny Threadmark context across /new, /reset, and compaction"
metadata: {"openclaw":{"events":["command:new","command:reset","agent:bootstrap"]}}
---

# Threadmark

Captures recent active/completed context at OpenClaw session boundaries and injects a small `RECENT_CONTEXT.md` packet during OpenClaw agent bootstrap.
