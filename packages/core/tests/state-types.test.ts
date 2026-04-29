import test from "node:test";
import assert from "node:assert/strict";
import { SCHEMA_VERSION } from "../src/constants.js";
import type { ContinuityState } from "../src/types.js";

test("continuity state supports active and completed context", () => {
  const state: ContinuityState = {
    meta: {
      schema_version: SCHEMA_VERSION,
      last_capture_event: "command:new",
      last_capture_status: "success",
      captured_at: "2026-04-29T00:00:00.000Z",
      valid_until: "2026-04-30T00:00:00.000Z",
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };

  assert.equal(state.meta.schema_version, 1);
  assert.equal(state.active_context, null);
});
