import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { continuityDir, openClawHome, packetPath, statePath } from "../src/paths.js";

test("OpenClaw adapter paths stay under provided OpenClaw home", () => {
  const base = path.join(os.tmpdir(), "openclaw-test-home");
  assert.equal(continuityDir(base), path.join(base, "continuity"));
  assert.equal(statePath(base), path.join(base, "continuity", "state.json"));
  assert.equal(packetPath(base), path.join(base, "continuity", "RECENT_CONTEXT.md"));
});

test("openClawHome reads OPENCLAW_HOME when present", () => {
  const previous = process.env.OPENCLAW_HOME;
  process.env.OPENCLAW_HOME = "/tmp/threadmark-openclaw-home";
  assert.equal(openClawHome(), "/tmp/threadmark-openclaw-home");
  if (previous === undefined) delete process.env.OPENCLAW_HOME;
  else process.env.OPENCLAW_HOME = previous;
});
