import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { statePath } from "../src/paths.js";
import { handleSessionEnd } from "../src/session-end.js";
import plugin from "../src/plugin.js";

async function makeTmpHome(): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  process.env.OPENCLAW_HOME = base;
  return base;
}

function externalUserText(text: string): string {
  return `Conversation info (untrusted metadata):
\`\`\`json
{
  "message_id": "msg-1",
  "sender_id": "sender-1",
  "sender": "Test User",
  "timestamp": "Wed 2026-05-14 10:00 UTC"
}
\`\`\`

Sender (untrusted metadata):
\`\`\`json
{
  "label": "Test User (sender-1)",
  "id": "sender-1",
  "name": "Test User"
}
\`\`\`

${text}`;
}

test("session_end with valid transcript captures context successfully", async () => {
  const base = await makeTmpHome();
  const agentId = "main";
  const sessionId = "sess-end-001";

  // Create the transcript file at the convention path
  const sessionsDir = path.join(base, "agents", agentId, "sessions");
  await fs.mkdir(sessionsDir, { recursive: true });
  const transcriptPath = path.join(sessionsDir, sessionId + ".jsonl");
  await fs.writeFile(transcriptPath, [
    JSON.stringify({ type: "message", message: { role: "user", content: externalUserText("Implement the session_end handler") } }),
    JSON.stringify({ type: "message", message: { role: "assistant", content: "Handler implementation complete." } })
  ].join("\n"), "utf-8");

  await handleSessionEnd(
    { sessionId, messageCount: 2 },
    { sessionId, sessionKey: "key-001", agentId }
  );

  // Default agent writes to workspace dir
  const workspaceDir = path.join(base, "workspace");
  const state = JSON.parse(await fs.readFile(statePath(workspaceDir), "utf-8"));
  assert.equal(state.meta.last_capture_event, "session_end");
  assert.equal(state.meta.last_capture_status, "success");
  assert.equal(state.meta.stale_reason, null);
  assert.ok(state.active_context);
  delete process.env.OPENCLAW_HOME;
});

test("session_end with missing transcript produces partial capture", async () => {
  const base = await makeTmpHome();
  const agentId = "main";
  const sessionId = "sess-end-missing";

  // Do NOT create any transcript file
  await handleSessionEnd(
    { sessionId, messageCount: 5 },
    { sessionId, sessionKey: "key-002", agentId }
  );

  const workspaceDir = path.join(base, "workspace");
  const state = JSON.parse(await fs.readFile(statePath(workspaceDir), "utf-8"));
  assert.equal(state.meta.last_capture_event, "session_end");
  assert.equal(state.meta.last_capture_status, "partial");
  assert.equal(state.meta.stale_reason, "transcript missing");
  delete process.env.OPENCLAW_HOME;
});

test("session_end resolves correct workspace for non-default agent", async () => {
  const base = await makeTmpHome();
  const agentId = "cto";
  const sessionId = "sess-end-cto";

  const config = {
    agents: {
      list: [
        { id: "main", default: true },
        { id: "cto" }
      ]
    }
  };

  // Create transcript at convention path
  const sessionsDir = path.join(base, "agents", agentId, "sessions");
  await fs.mkdir(sessionsDir, { recursive: true });
  const transcriptPath = path.join(sessionsDir, sessionId + ".jsonl");
  await fs.writeFile(transcriptPath, [
    JSON.stringify({ type: "message", message: { role: "user", content: externalUserText("Review architecture decisions") } }),
    JSON.stringify({ type: "message", message: { role: "assistant", content: "Architecture is well-structured." } })
  ].join("\n"), "utf-8");

  await handleSessionEnd(
    { sessionId, messageCount: 2 },
    { sessionId, sessionKey: "key-003", agentId },
    config
  );

  // Non-default agent writes to workspace-<agentId>
  const expectedWorkspace = path.join(base, "workspace-cto");
  const state = JSON.parse(await fs.readFile(statePath(expectedWorkspace), "utf-8"));
  assert.equal(state.meta.last_capture_event, "session_end");
  assert.equal(state.meta.last_capture_status, "success");
  delete process.env.OPENCLAW_HOME;
});

test("session_end with default agent resolves to default workspace path", async () => {
  const base = await makeTmpHome();
  const agentId = "main";
  const sessionId = "sess-end-default";

  const config = {
    agents: {
      list: [
        { id: "main", default: true }
      ]
    }
  };

  await handleSessionEnd(
    { sessionId, messageCount: 0 },
    { sessionId, sessionKey: "key-004", agentId },
    config
  );

  // Default agent should use <stateDir>/workspace
  const expectedWorkspace = path.join(base, "workspace");
  const state = JSON.parse(await fs.readFile(statePath(expectedWorkspace), "utf-8"));
  assert.equal(state.meta.last_capture_event, "session_end");
  assert.equal(state.meta.last_capture_status, "partial");
  delete process.env.OPENCLAW_HOME;
});

test("plugin registers both before_compaction and session_end handlers", () => {
  const calls: Array<{ name: string; handler: unknown }> = [];
  const api = { on: (name: string, handler: unknown) => calls.push({ name, handler }) };

  plugin.register(api);

  assert.equal(plugin.id, "threadmark");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].name, "before_compaction");
  assert.equal(typeof calls[0].handler, "function");
  assert.equal(calls[1].name, "session_end");
  assert.equal(typeof calls[1].handler, "function");
});
