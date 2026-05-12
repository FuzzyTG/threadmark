import fs from "node:fs/promises";
import { PACKET_CONTEXT_PATH } from "@threadmark/core/constants";
import { loadState } from "@threadmark/core";
import { packetPath, statePath } from "./paths.js";

export type BootstrapContext = {
  bootstrapFiles?: Array<{ path: string; content: string }>;
};

export async function injectContinuityPacket(context: BootstrapContext, baseDir?: string): Promise<boolean> {
  if (!Array.isArray(context.bootstrapFiles)) return false;

  const state = await loadState(statePath(baseDir));
  if (state?.meta.valid_until) {
    if (new Date(state.meta.valid_until) < new Date()) {
      return false;
    }
  }

  let content: string;
  try {
    content = await fs.readFile(packetPath(baseDir), "utf-8");
  } catch {
    return false;
  }

  if (!content.trim()) return false;

  context.bootstrapFiles = [
    ...context.bootstrapFiles,
    {
      path: PACKET_CONTEXT_PATH,
      content
    }
  ];

  return true;
}
