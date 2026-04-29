import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { packetPath } from "../src/paths.js";
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
