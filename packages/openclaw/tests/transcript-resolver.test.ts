import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveTranscript } from "../src/transcript-resolver.js";

async function makeDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "threadmark-sessions-"));
}

test("resolveTranscript returns exact sessionFile when it exists", async () => {
  const dir = await makeDir();
  const exact = path.join(dir, "abc.jsonl");
  await fs.writeFile(exact, "{}\n", "utf-8");

  const result = await resolveTranscript({ sessionId: "abc", sessionFile: exact });

  assert.deepEqual(result, {
    sessionId: "abc",
    requestedPath: exact,
    resolvedPath: exact,
    status: "exact"
  });
});

test("resolveTranscript falls back to newest rotated reset file", async () => {
  const dir = await makeDir();
  const older = path.join(dir, "abc.jsonl.reset.2026-04-29T00-50-00.000Z");
  const newer = path.join(dir, "abc.jsonl.reset.2026-04-29T00-54-05.670Z");
  await fs.writeFile(older, "older\n", "utf-8");
  await new Promise((resolve) => setTimeout(resolve, 5));
  await fs.writeFile(newer, "newer\n", "utf-8");

  const result = await resolveTranscript({ sessionId: "abc", sessionFile: path.join(dir, "abc.jsonl") });

  assert.equal(result.status, "rotated");
  assert.equal(result.resolvedPath, newer);
});

test("resolveTranscript ignores matching rotated directories", async () => {
  const dir = await makeDir();
  const rotatedDir = path.join(dir, "abc.jsonl.reset.2026-04-29T00-54-05.670Z");
  const rotatedFile = path.join(dir, "abc.jsonl.reset.2026-04-29T00-50-00.000Z");
  await fs.mkdir(rotatedDir);
  await fs.writeFile(rotatedFile, "file\n", "utf-8");

  const result = await resolveTranscript({ sessionId: "abc", sessionFile: path.join(dir, "abc.jsonl") });

  assert.equal(result.status, "rotated");
  assert.equal(result.resolvedPath, rotatedFile);
});

test("resolveTranscript returns missing when no exact or rotated file exists", async () => {
  const dir = await makeDir();
  const requested = path.join(dir, "abc.jsonl");

  const result = await resolveTranscript({ sessionId: "abc", sessionFile: requested });

  assert.deepEqual(result, {
    sessionId: "abc",
    requestedPath: requested,
    resolvedPath: null,
    status: "missing"
  });
});
