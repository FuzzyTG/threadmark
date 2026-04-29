import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeFileAtomic } from "../src/atomic-write.js";

test("writeFileAtomic creates parent directory and writes final content", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-"));
  const file = path.join(dir, "nested", "state.json");

  await writeFileAtomic(file, "{\"ok\":true}");

  assert.equal(await fs.readFile(file, "utf-8"), "{\"ok\":true}");
  const mode = (await fs.stat(file)).mode & 0o777;
  assert.equal(mode, 0o600);
  const entries = await fs.readdir(path.dirname(file));
  assert.deepEqual(entries, ["state.json"]);
});
