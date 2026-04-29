import fs from "node:fs/promises";
import { renderPacket } from "./packet-renderer.js";
import { writeFileAtomic } from "./atomic-write.js";
import type { ContinuityState } from "./types.js";

export type ContinuityStoragePaths = {
  stateFile: string;
  packetFile: string;
};

function isState(value: unknown): value is ContinuityState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { meta?: { schema_version?: unknown; last_capture_status?: unknown } };
  return candidate.meta?.schema_version === 1 &&
    (candidate.meta.last_capture_status === "success" ||
      candidate.meta.last_capture_status === "failed" ||
      candidate.meta.last_capture_status === "partial");
}

export async function loadState(stateFile: string): Promise<ContinuityState | null> {
  try {
    const raw = await fs.readFile(stateFile, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveStateAndPacket(paths: ContinuityStoragePaths, state: ContinuityState): Promise<void> {
  await writeFileAtomic(paths.stateFile, `${JSON.stringify(state, null, 2)}\n`);
  await writeFileAtomic(paths.packetFile, renderPacket(state));
}
