import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { statePath } from "../src/paths.js";
import { captureContinuity } from "../src/capture.js";

function externalUserText(text: string): string {
  return `Conversation info (untrusted metadata):
\`\`\`json
{
  "message_id": "msg-1",
  "sender_id": "sender-1",
  "sender": "Test User",
  "timestamp": "Wed 2026-04-29 08:38 UTC"
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

test("captureContinuity resolves rotated transcript and writes state", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const sessions = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-sessions-"));
  const rotated = path.join(sessions, "abc.jsonl.reset.2026-04-29T00-54-05.670Z");
  await fs.writeFile(rotated, [
    JSON.stringify({ type: "message", message: { role: "user", content: externalUserText("continue Threadmark work") } }),
    JSON.stringify({ type: "message", message: { role: "assistant", content: "Next step is implementation planning." } })
  ].join("\n"), "utf-8");

  const result = await captureContinuity({
    baseDir: base,
    eventName: "command:reset",
    sessionId: "abc",
    sessionFile: path.join(sessions, "abc.jsonl"),
    workspaceDir: null,
    now: new Date("2026-04-29T00:00:00.000Z")
  });

  assert.equal(result.status, "success");
  const saved = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(saved.meta.last_capture_event, "command:reset");
  assert.equal(saved.active_context.source_session, "abc");
});

test("captureContinuity writes partial state when transcript is missing", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const sessions = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-sessions-"));

  const result = await captureContinuity({
    baseDir: base,
    eventName: "before_compaction",
    sessionId: "abc",
    sessionFile: path.join(sessions, "abc.jsonl"),
    workspaceDir: null,
    now: new Date("2026-04-29T00:00:00.000Z")
  });

  assert.equal(result.status, "partial");
  const saved = JSON.parse(await fs.readFile(statePath(base), "utf-8"));
  assert.equal(saved.meta.stale_reason, "transcript missing");
});
