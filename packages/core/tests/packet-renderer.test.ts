import test from "node:test";
import assert from "node:assert/strict";
import { MAX_PACKET_BYTES } from "../src/constants.js";
import { renderPacket } from "../src/packet-renderer.js";
import type { ContinuityState } from "../src/types.js";

function stateWithArtifacts(artifacts: string[]): ContinuityState {
  return {
    meta: {
      schema_version: 1,
      last_capture_event: "command:new",
      last_capture_status: "success",
      captured_at: "2026-04-29T00:00:00.000Z",
      valid_until: "2026-04-30T00:00:00.000Z",
      stale_reason: null
    },
    active_context: {
      id: "active-1",
      source_session: "session-1",
      summary: "Working on Threadmark.",
      current_goal: "Implement the MVP.",
      status: "active",
      next_step: "Write the implementation plan.",
      artifacts,
      updated_at: "2026-04-29T00:00:00.000Z",
      confidence: "medium"
    },
    recent_completed_context: null
  };
}

test("renderPacket includes use policy and active context", () => {
  const packet = renderPacket(stateWithArtifacts(["a", "b"]));

  assert.match(packet, /# Threadmark Context/);
  assert.match(packet, /Current goal: Implement the MVP\./);
  assert.match(packet, /Use this context only when/);
});

test("renderPacket limits artifacts to ten and packet to max bytes", () => {
  const artifacts = Array.from({ length: 20 }, (_, index) => `artifact-${index}`);
  const packet = renderPacket(stateWithArtifacts(artifacts));

  assert.equal(packet.includes("artifact-9"), true);
  assert.equal(packet.includes("artifact-10"), false);
  assert.ok(Buffer.byteLength(packet, "utf-8") <= MAX_PACKET_BYTES);
});

test("renderPacket marks stale context", () => {
  const state = stateWithArtifacts([]);
  state.meta.last_capture_status = "partial";
  state.meta.stale_reason = "transcript missing";

  const packet = renderPacket(state);

  assert.match(packet, /Status: partial/);
  assert.match(packet, /Stale reason: transcript missing/);
});
