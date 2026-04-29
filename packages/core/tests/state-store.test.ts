import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadState, saveStateAndPacket } from "../src/state-store.js";
import type { ContinuityState } from "../src/types.js";

function sampleState(): ContinuityState {
  return {
    meta: {
      schema_version: 1,
      last_capture_event: "command:reset",
      last_capture_status: "success",
      captured_at: "2026-04-29T00:00:00.000Z",
      valid_until: "2026-04-30T00:00:00.000Z",
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };
}

test("saveStateAndPacket writes valid JSON state and packet to explicit paths", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-core-"));
  const stateFile = path.join(dir, "state.json");
  const packetFile = path.join(dir, "RECENT_CONTEXT.md");

  await saveStateAndPacket({ stateFile, packetFile }, sampleState());

  const loaded = JSON.parse(await fs.readFile(stateFile, "utf-8"));
  const packet = await fs.readFile(packetFile, "utf-8");

  assert.equal(loaded.meta.schema_version, 1);
  assert.match(packet, /# Threadmark Context/);
});

test("loadState returns null for missing or corrupt state", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-core-"));
  const stateFile = path.join(dir, "state.json");
  assert.equal(await loadState(stateFile), null);

  await fs.writeFile(stateFile, "not json", "utf-8");
  assert.equal(await loadState(stateFile), null);
});
