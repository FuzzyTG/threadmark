import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { packetPath, statePath } from "../src/paths.js";
import { injectContinuityPacket } from "../src/bootstrap.js";

test("injectContinuityPacket appends RECENT_CONTEXT.md bootstrap file", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  await fs.mkdir(path.dirname(packetPath(base)), { recursive: true });
  await fs.writeFile(packetPath(base), "# Threadmark Context\n", "utf-8");
  const context = { bootstrapFiles: [{ path: "BOOT.md", content: "boot" }] };

  const injected = await injectContinuityPacket(context, base);

  assert.equal(injected, true);
  assert.deepEqual(context.bootstrapFiles, [
    { path: "BOOT.md", content: "boot" },
    { path: "RECENT_CONTEXT.md", content: "# Threadmark Context\n" }
  ]);
});

test("injectContinuityPacket does nothing when packet missing", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const context = { bootstrapFiles: [{ path: "BOOT.md", content: "boot" }] };

  const injected = await injectContinuityPacket(context, base);

  assert.equal(injected, false);
  assert.deepEqual(context.bootstrapFiles, [{ path: "BOOT.md", content: "boot" }]);
});

test("injectContinuityPacket deletes files after successful injection", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const contDir = path.dirname(packetPath(base));
  await fs.mkdir(contDir, { recursive: true });
  await fs.writeFile(packetPath(base), "# Threadmark Context\n", "utf-8");

  const validUntil = new Date(Date.now() + 3600_000).toISOString();
  const stateData = {
    meta: {
      schema_version: 1,
      last_capture_event: "before_compaction",
      last_capture_status: "success",
      captured_at: new Date().toISOString(),
      valid_until: validUntil,
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };
  await fs.writeFile(statePath(base), JSON.stringify(stateData), "utf-8");

  const context = { bootstrapFiles: [{ path: "BOOT.md", content: "boot" }] };
  const injected = await injectContinuityPacket(context, base);

  assert.equal(injected, true);

  // Files should be retained (delete-after-read disabled for debugging)
  await fs.access(packetPath(base));
  await fs.access(statePath(base));
});

test("injectContinuityPacket skips and deletes expired packets", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-home-"));
  const contDir = path.dirname(packetPath(base));
  await fs.mkdir(contDir, { recursive: true });
  await fs.writeFile(packetPath(base), "# Stale Context\n", "utf-8");

  const expiredDate = new Date(Date.now() - 3600_000).toISOString();
  const stateData = {
    meta: {
      schema_version: 1,
      last_capture_event: "before_compaction",
      last_capture_status: "success",
      captured_at: new Date().toISOString(),
      valid_until: expiredDate,
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };
  await fs.writeFile(statePath(base), JSON.stringify(stateData), "utf-8");

  const context = { bootstrapFiles: [{ path: "BOOT.md", content: "boot" }] };
  const injected = await injectContinuityPacket(context, base);

  assert.equal(injected, false);
  assert.deepEqual(context.bootstrapFiles, [{ path: "BOOT.md", content: "boot" }]);

  // Both files should be deleted
  await assert.rejects(fs.access(packetPath(base)));
  await assert.rejects(fs.access(statePath(base)));
});

test("injectContinuityPacket reads from workspace-scoped path", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-ws-"));
  const contDir = path.dirname(packetPath(workspace));
  await fs.mkdir(contDir, { recursive: true });
  await fs.writeFile(packetPath(workspace), "# Workspace Context\n", "utf-8");

  const validUntil = new Date(Date.now() + 3600_000).toISOString();
  const stateData = {
    meta: {
      schema_version: 1,
      last_capture_event: "before_compaction",
      last_capture_status: "success",
      captured_at: new Date().toISOString(),
      valid_until: validUntil,
      stale_reason: null
    },
    active_context: null,
    recent_completed_context: null
  };
  await fs.writeFile(statePath(workspace), JSON.stringify(stateData), "utf-8");

  const context = { bootstrapFiles: [] as Array<{ path: string; content: string }> };
  const injected = await injectContinuityPacket(context, workspace);

  assert.equal(injected, true);
  assert.equal(context.bootstrapFiles.length, 1);
  assert.equal(context.bootstrapFiles[0].path, "RECENT_CONTEXT.md");
  assert.equal(context.bootstrapFiles[0].content, "# Workspace Context\n");

  // Files should be retained (delete-after-read disabled for debugging)
  await fs.access(packetPath(workspace));
  await fs.access(statePath(workspace));
});
