import fs from "node:fs/promises";
import path from "node:path";

export type TranscriptResolution = {
  sessionId: string | null;
  requestedPath: string | null;
  resolvedPath: string | null;
  status: "exact" | "rotated" | "missing";
};

async function exists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function allowedOwner(fileUid: number, dirUid: number): boolean {
  const currentUid = typeof process.getuid === "function" ? process.getuid() : null;
  return fileUid === dirUid || fileUid === currentUid;
}

export async function resolveTranscript(input: {
  sessionId: string | null;
  sessionFile: string | null;
}): Promise<TranscriptResolution> {
  const requestedPath = input.sessionFile;
  const sessionId = input.sessionId;

  if (requestedPath && await exists(requestedPath)) {
    return { sessionId, requestedPath, resolvedPath: requestedPath, status: "exact" };
  }

  if (!requestedPath || !sessionId) {
    return { sessionId, requestedPath, resolvedPath: null, status: "missing" };
  }

  const dir = path.dirname(requestedPath);
  const prefix = `${sessionId}.jsonl.reset.`;

  try {
    const dirStat = await fs.stat(dir);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const candidates = (await Promise.all(
      entries
        .filter((entry) => entry.name.startsWith(prefix))
        .map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          if (!stat.isFile()) return null;
          if (!allowedOwner(stat.uid, dirStat.uid)) return null;
          return { fullPath, mtimeMs: stat.mtimeMs };
        })
    )).filter((candidate): candidate is { fullPath: string; mtimeMs: number } => candidate !== null);

    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (candidates[0]) {
      return { sessionId, requestedPath, resolvedPath: candidates[0].fullPath, status: "rotated" };
    }
  } catch {
    return { sessionId, requestedPath, resolvedPath: null, status: "missing" };
  }

  return { sessionId, requestedPath, resolvedPath: null, status: "missing" };
}
