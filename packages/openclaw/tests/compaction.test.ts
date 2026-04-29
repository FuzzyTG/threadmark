import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { statePath } from "../src/paths.js";
import { handleCompactionSignal } from "../src/compaction.js";
import plugin from "../src/plugin.js";

test("handleCompactionSignal writes partial state when payload has no transcript", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  process.env.OPENCLAW_HOME = base;

  await handleCompactionSignal({ messageCount: 32, tokenCount: 1000 });

  const state = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(state.meta.last_capture_event, "before_compaction");
  assert.equal(state.meta.last_capture_status, "partial");
  assert.equal(state.meta.stale_reason, "compaction transcript unavailable");
  delete process.env.OPENCLAW_HOME;
});

test("plugin registers before_compaction", () => {
  const calls: Array<{ name: string; handler: unknown }> = [];
  const api = { on: (name: string, handler: unknown) => calls.push({ name, handler }) };

  plugin.register(api);

  assert.equal(plugin.id, "threadmark");
  assert.equal(calls[0].name, "before_compaction");
  assert.equal(typeof calls[0].handler, "function");
});
