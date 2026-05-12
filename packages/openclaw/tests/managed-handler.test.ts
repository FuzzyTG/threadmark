import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import handler from "../hooks/threadmark/handler.js";
import { packetPath, statePath } from "../src/paths.js";

test("managed handler captures command reset using previousSessionEntry", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const sessions = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-sessions-"));
  const transcript = path.join(sessions, "abc.jsonl");
  await fs.writeFile(transcript, JSON.stringify({ type: "message", message: { role: "user", content: "continue" } }), "utf-8");

  process.env.OPENCLAW_HOME = base;
  await handler({
    type: "command",
    action: "reset",
    context: {
      previousSessionEntry: { sessionId: "abc", sessionFile: transcript },
      sessionEntry: { sessionId: "new", sessionFile: path.join(sessions, "new.jsonl") },
      workspaceDir: sessions
    }
  });

  // With workspace-scoped paths, state is written under the workspace dir
  const state = JSON.parse(await fs.readFile(statePath(sessions), "utf-8"));
  assert.equal(state.meta.last_capture_event, "command:reset");
  delete process.env.OPENCLAW_HOME;
});

test("managed handler injects on agent bootstrap", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  await fs.mkdir(path.dirname(packetPath(base)), { recursive: true });
  await fs.writeFile(packetPath(base), "# Threadmark Context\n", "utf-8");
  process.env.OPENCLAW_HOME = base;

  const event = {
    type: "agent",
    action: "bootstrap",
    context: { bootstrapFiles: [] as Array<{ path: string; content: string }> }
  };

  await handler(event);

  assert.equal(event.context.bootstrapFiles[0].path, "RECENT_CONTEXT.md");
  delete process.env.OPENCLAW_HOME;
});

test("managed handler bootstrap uses workspace-scoped path", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-ws-"));
  await fs.mkdir(path.dirname(packetPath(workspace)), { recursive: true });
  await fs.writeFile(packetPath(workspace), "# Workspace Context\n", "utf-8");

  const validUntil = new Date(Date.now() + 3600_000).toISOString();
  const stateData = {
    meta: {
      schema_version: 1,
      last_capture_event: "before_compaction",
      last_capture_status: "success",
      captured_at: new Date().toISOString(),
      valid_until: validUntil,
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };
  await fs.writeFile(statePath(workspace), JSON.stringify(stateData), "utf-8");

  const event = {
    type: "agent",
    action: "bootstrap",
    context: {
      bootstrapFiles: [] as Array<{ path: string; content: string }>,
      workspaceDir: workspace
    }
  };

  await handler(event);

  assert.equal(event.context.bootstrapFiles.length, 1);
  assert.equal(event.context.bootstrapFiles[0].path, "RECENT_CONTEXT.md");
  assert.equal(event.context.bootstrapFiles[0].content, "# Workspace Context\n");
});
