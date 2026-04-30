import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readTranscriptMessages } from "../src/transcript-reader.js";

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

function slackRelayUserText(text: string): string {
  return `System: [2026-04-30 16:40:49 GMT+8] Slack DM from TestUser: ${text}

${externalUserText(text)}`;
}

test("readTranscriptMessages extracts user and assistant text and skips slash commands", async () => {
  const file = path.join(
    process.cwd(),
    "tests/fixtures/sessions/rotated-session.jsonl.reset.2026-04-29T00-54-05.670Z"
  );

  const messages = await readTranscriptMessages(file, 10);

  assert.deepEqual(messages, []);
});

test("readTranscriptMessages returns the most recent maxMessages", async () => {
  const file = path.join(
    process.cwd(),
    "tests/fixtures/sessions/rotated-session.jsonl.reset.2026-04-29T00-54-05.670Z"
  );

  const messages = await readTranscriptMessages(file, 2);

  assert.deepEqual(messages, []);
});

test("readTranscriptMessages keeps only external human user messages", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-transcript-"));
  const file = path.join(dir, "session.jsonl");
  const entries = [
    { type: "message", message: { role: "user", content: externalUserText("Please check the sample city weather") } },
    { type: "message", message: { role: "assistant", content: "The sample city is cloudy today." } },
    { type: "message", message: { role: "assistant", content: "Session saved and indexed to an internal memory file." } },
    { type: "message", message: { role: "assistant", content: "✅ New session started · model: github-copilot/claude-opus-4.6" } },
    { type: "message", message: { role: "user", content: "A new session was started via /new or /reset. Execute your Session Startup sequence now ..." } },
    { type: "message", message: { role: "user", content: "Read the runtime heartbeat file if it exists. If nothing needs attention, reply with the idle status." } },
    { type: "message", message: { role: "user", content: externalUserText("Can you do it again?") } }
  ];
  await fs.writeFile(file, entries.map((entry) => JSON.stringify(entry)).join("\n"), "utf-8");

  const messages = await readTranscriptMessages(file, 10);

  assert.deepEqual(messages, [
    { role: "user", text: "Please check the sample city weather" },
    { role: "user", text: "Can you do it again?" }
  ]);
});

test("readTranscriptMessages extracts user text from Slack relay format with System: prefix", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-slack-"));
  const file = path.join(dir, "session.jsonl");
  const entries = [
    { type: "message", message: { role: "user", content: slackRelayUserText("分析下今天的南京天气") } },
    { type: "message", message: { role: "assistant", content: "南京今天多云转晴。" } },
    { type: "message", message: { role: "user", content: slackRelayUserText("谢谢") } }
  ];
  await fs.writeFile(file, entries.map((entry) => JSON.stringify(entry)).join("\n"), "utf-8");

  const messages = await readTranscriptMessages(file, 10);

  assert.deepEqual(messages, [
    { role: "user", text: "分析下今天的南京天气" },
    { role: "user", text: "谢谢" }
  ]);
});
