import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Derive package dir from this file's location, not process.cwd(), so the
// test works regardless of which directory `node --test` is invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This compiled file lives at dist/tests/<name>.js; package root is two up.
const PACKAGE_DIR = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(PACKAGE_DIR, "../..");

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("standalone package archive installs from extracted artifact layout", async () => {
  const packageDir = PACKAGE_DIR;
  const repoRoot = REPO_ROOT;
  const script = path.join(packageDir, "scripts/package-standalone.sh");
  const version = JSON.parse(await fs.readFile(path.join(packageDir, "package.json"), "utf-8")).version;
  const artifactName = `threadmark-openclaw-v${version}`;
  const tarball = path.join(repoRoot, "dist", `${artifactName}.tar.gz`);

  await execFileAsync(script, [], { cwd: repoRoot });

  assert.equal(await exists(tarball), true);

  const { stdout: contents } = await execFileAsync("tar", ["-tzf", tarball], { cwd: repoRoot });
  for (const requiredPath of [
    `${artifactName}/install.sh`,
    `${artifactName}/uninstall.sh`,
    `${artifactName}/openclaw.plugin.json`,
    `${artifactName}/dist/src/plugin.js`,
    `${artifactName}/dist/hooks/threadmark/handler.js`,
    `${artifactName}/dist/hooks/threadmark/HOOK.md`,
    `${artifactName}/node_modules/@threadmark/core/package.json`,
    `${artifactName}/node_modules/@threadmark/core/dist/src/index.js`
  ]) {
    assert.match(contents, new RegExp(`(^|\\n)${requiredPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\n)`));
  }
  assert.doesNotMatch(contents, /\/dist\/tests\//);
  assert.doesNotMatch(contents, /tsconfig\.tsbuildinfo/);
  assert.doesNotMatch(contents, /\.js\.map(\n|$)/);

  const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "threadmark-standalone-"));
  await execFileAsync("tar", ["-xzf", tarball, "-C", extractDir]);
  const artifactDir = path.join(extractDir, artifactName);

  await execFileAsync(process.execPath, ["--input-type=module", "-e", "await import('@threadmark/core')"], { cwd: artifactDir });

  const { stdout: dryRun } = await execFileAsync("./install.sh", ["--dry-run"], { cwd: artifactDir });
  assert.match(dryRun, /install managed hook package from artifact directory/);
  assert.match(dryRun, /install plugin package from artifact directory/);
  assert.doesNotMatch(dryRun, /npm run check/);
  assert.doesNotMatch(dryRun, /repo root/);
});
