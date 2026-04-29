import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(tempPath, content, { encoding: "utf-8", mode: 0o600 });
  await fs.rename(tempPath, filePath);
}
