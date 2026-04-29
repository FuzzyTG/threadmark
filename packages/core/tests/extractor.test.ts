import test from "node:test";
import assert from "node:assert/strict";
import { extractContinuityState } from "../src/extractor.js";
import type { TranscriptMessage } from "../src/types.js";

const messages: TranscriptMessage[] = [
  { role: "user", text: "Please deploy that page and then continue validating Threadmark." },
  { role: "assistant", text: "I updated docs/threadmark-plan.md and the next step is implementation planning." }
];

test("extractContinuityState creates active context from recent messages", () => {
  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-1",
    messages,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  assert.equal(state.meta.last_capture_event, "command:new");
  assert.equal(state.meta.last_capture_status, "success");
  assert.equal(state.active_context?.source_session, "session-1");
  assert.match(state.active_context?.summary || "", /deploy that page/);
  assert.equal(state.active_context?.confidence, "medium");
});

test("extractContinuityState records partial capture without messages", () => {
  const state = extractContinuityState({
    eventName: "before_compaction",
    sessionId: null,
    messages: [],
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "partial",
    staleReason: "transcript missing"
  });

  assert.equal(state.meta.last_capture_status, "partial");
  assert.equal(state.meta.stale_reason, "transcript missing");
  assert.equal(state.active_context, null);
});
