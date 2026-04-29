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

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
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
