import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { statePath } from "../src/paths.js";
import { handleCompactionSignal } from "../src/compaction.js";
import plugin from "../src/plugin.js";

async function makeTmpHome(): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  process.env.OPENCLAW_HOME = base;
  return base;
}

test("compaction with messages array extracts context successfully", async () => {
  const base = await makeTmpHome();

  await handleCompactionSignal(
    {
      messageCount: 2,
      messages: [
        { role: "user", content: "Deploy the staging server" },
        { role: "assistant", content: "Deployed staging server to us-east-1." }
      ]
    },
    { sessionId: "sess-123" }
  );

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_event, "before_compaction");
  assert.equal(state.meta.last_capture_status, "success");
  assert.equal(state.meta.stale_reason, null);
  assert.ok(state.active_context);
  assert.ok(state.active_context.summary.includes("Deploy the staging server"));
  delete process.env.OPENCLAW_HOME;
});

test("compaction with unparseable messages falls back to partial", async () => {
  const base = await makeTmpHome();

  await handleCompactionSignal(
    {
      messageCount: 1,
      messages: [{ type: "system", text: "not a user/assistant message" }]
    },
    {}
  );

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_status, "partial");
  assert.equal(state.meta.stale_reason, "compaction messages could not be parsed");
  delete process.env.OPENCLAW_HOME;
});

test("compaction with sessionFile attempts transcript resolution", async () => {
  const base = await makeTmpHome();
  // sessionFile that doesn't exist — should fall through to partial via captureContinuity
  await handleCompactionSignal(
    { messageCount: 10, sessionFile: "/tmp/nonexistent-session.jsonl" },
    { sessionId: "sess-456" }
  );

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_event, "before_compaction");
  assert.equal(state.meta.last_capture_status, "partial");
  delete process.env.OPENCLAW_HOME;
});

test("compaction with only sessionId attempts transcript resolution", async () => {
  const base = await makeTmpHome();

  await handleCompactionSignal(
    { messageCount: 10 },
    { sessionId: "sess-789" }
  );

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_event, "before_compaction");
  assert.equal(state.meta.last_capture_status, "partial");
  delete process.env.OPENCLAW_HOME;
});

test("compaction with no transcript info writes partial state", async () => {
  const base = await makeTmpHome();

  await handleCompactionSignal({ messageCount: 32, tokenCount: 1000 }, {});

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_event, "before_compaction");
  assert.equal(state.meta.last_capture_status, "partial");
  assert.equal(state.meta.stale_reason, "compaction transcript unavailable");
  delete process.env.OPENCLAW_HOME;
});

test("plugin registers before_compaction with event and ctx", () => {
  const calls: Array<{ name: string; handler: unknown }> = [];
  const api = { on: (name: string, handler: unknown) => calls.push({ name, handler }) };

  plugin.register(api);

  assert.equal(plugin.id, "threadmark");
  assert.equal(calls[0].name, "before_compaction");
  assert.equal(typeof calls[0].handler, "function");
});
