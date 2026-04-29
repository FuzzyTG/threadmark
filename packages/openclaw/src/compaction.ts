import { extractContinuityState, saveStateAndPacket } from "@threadmark/core";
import { packetPath, statePath } from "./paths.js";

export type CompactionContext = {
  messageCount?: number;
  tokenCount?: number;
  sessionKey?: string;
  sessionFile?: string;
  messages?: unknown[];
};

export async function handleCompactionSignal(_context: CompactionContext): Promise<void> {
  const state = extractContinuityState({
    eventName: "before_compaction",
    sessionId: null,
    messages: [],
    now: new Date(),
    status: "partial",
    staleReason: "compaction transcript unavailable"
  });
  await saveStateAndPacket({ stateFile: statePath(), packetFile: packetPath() }, state);
}
