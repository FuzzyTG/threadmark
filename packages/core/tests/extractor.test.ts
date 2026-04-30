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
  assert.equal(state.active_context?.current_goal, "Please deploy that page and then continue validating Threadmark.");
  assert.deepEqual(state.active_context?.recent_exchanges, messages);
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

test("extractContinuityState derives current_goal from latest user message, not first", () => {
  const mixed: TranscriptMessage[] = [
    { role: "user", text: "say it again?" },
    { role: "assistant", text: "Sure, repeating the greeting..." },
    { role: "user", text: "What is the weather in Sample City tomorrow?" },
    { role: "assistant", text: "Tomorrow in Sample City will be cloudy, 12-20°C." }
  ];

  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-2",
    messages: mixed,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  assert.equal(state.active_context?.current_goal, "What is the weather in Sample City tomorrow?");
  assert.match(state.active_context?.summary || "", /weather/i);
  assert.equal(state.active_context?.recent_exchanges?.length, 4);
});

test("extractContinuityState keeps only last 3 exchanges when given more", () => {
  const many: TranscriptMessage[] = [
    { role: "user", text: "exchange one" },
    { role: "assistant", text: "reply one" },
    { role: "user", text: "exchange two" },
    { role: "assistant", text: "reply two" },
    { role: "user", text: "exchange three" },
    { role: "assistant", text: "reply three" },
    { role: "user", text: "exchange four" },
    { role: "assistant", text: "reply four" }
  ];

  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-3",
    messages: many,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  const exchanges = state.active_context?.recent_exchanges || [];
  assert.equal(exchanges.length, 6);
  assert.equal(exchanges[0].text, "exchange two");
  assert.equal(exchanges[5].text, "reply four");
  assert.equal(state.active_context?.current_goal, "exchange four");
  assert.doesNotMatch(state.active_context?.summary || "", /exchange one/);
});

test("extractContinuityState handles user-only messages without assistant", () => {
  const userOnly: TranscriptMessage[] = [
    { role: "user", text: "just a question" }
  ];

  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-4",
    messages: userOnly,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  assert.equal(state.active_context?.current_goal, "just a question");
  assert.equal(state.active_context?.next_step, "Ask the user what to continue.");
  assert.equal(state.active_context?.recent_exchanges?.length, 1);
});

test("extractContinuityState redacts secrets in recent_exchanges", () => {
  const withSecret: TranscriptMessage[] = [
    { role: "user", text: "Set API_KEY=sk-secret-12345 in the config" },
    { role: "assistant", text: "Done, I set API_KEY=sk-secret-12345 for you." }
  ];

  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-5",
    messages: withSecret,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  const exchanges = state.active_context?.recent_exchanges || [];
  assert.equal(exchanges.length, 2);
  for (const msg of exchanges) {
    assert.doesNotMatch(msg.text, /sk-secret-12345/);
    assert.match(msg.text, /\[REDACTED\]/);
  }
  assert.ok(state.active_context?.next_step);
  assert.doesNotMatch(state.active_context!.next_step, /sk-secret-12345/);
  assert.match(state.active_context!.next_step, /\[REDACTED\]/);
});

test("extractContinuityState produces no active context from assistant-only messages", () => {
  const assistantOnly: TranscriptMessage[] = [
    { role: "assistant", text: "Session started." },
    { role: "assistant", text: "Heartbeat OK." }
  ];

  const state = extractContinuityState({
    eventName: "command:new",
    sessionId: "session-6",
    messages: assistantOnly,
    now: new Date("2026-04-29T00:00:00.000Z"),
    status: "success",
    staleReason: null
  });

  assert.equal(state.active_context, null);
});
