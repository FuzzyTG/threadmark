import { extractContinuityState, saveStateAndPacket, type TranscriptMessage } from "@threadmark/core";
import { captureContinuity } from "./capture.js";
import { packetPath, statePath } from "./paths.js";

export type CompactionEvent = {
  messageCount?: number;
  tokenCount?: number;
  sessionFile?: string;
  messages?: unknown[];
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  agentId?: string;
};

export type CompactionAgentContext = Pick<CompactionEvent, "sessionKey" | "sessionId" | "workspaceDir" | "agentId">;

function extractMessages(raw: unknown[]): TranscriptMessage[] {
  const results: TranscriptMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const msg = entry as { role?: unknown; content?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    let text: string | null = null;
    if (typeof msg.content === "string") {
      text = msg.content;
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content
        .filter((p): p is { type: string; text: string } =>
          p && typeof p === "object" && p.type === "text" && typeof p.text === "string"
        )
        .map((p) => p.text);
      text = parts.length > 0 ? parts.join("\n") : null;
    }
    if (text && text.trim().length > 0) {
      results.push({ role: msg.role as "user" | "assistant", text: text.trim() });
    }
  }
  return results;
}

export async function handleCompactionSignal(
  event: CompactionEvent,
  ctx: CompactionAgentContext = {}
): Promise<void> {
  const merged = { ...event, ...ctx };

  // Path 1: messages provided directly (auto-compaction)
  if (Array.isArray(merged.messages) && merged.messages.length > 0) {
    const messages = extractMessages(merged.messages);
    const status = messages.length > 0 ? "success" as const : "partial" as const;
    const staleReason = messages.length > 0 ? null : "compaction messages could not be parsed";
    const state = extractContinuityState({
      eventName: "before_compaction",
      sessionId: merged.sessionId ?? null,
      messages,
      now: new Date(),
      status,
      staleReason
    });
    await saveStateAndPacket({ stateFile: statePath(), packetFile: packetPath() }, state);
    return;
  }

  // Path 2: sessionFile or sessionId available — try transcript resolution
  if (merged.sessionFile || merged.sessionId) {
    await captureContinuity({
      eventName: "before_compaction",
      sessionId: merged.sessionId ?? null,
      sessionFile: merged.sessionFile ?? null,
      workspaceDir: merged.workspaceDir ?? null,
      now: new Date()
    });
    return;
  }

  // Path 3: signal-only (explicit compaction, no transcript info)
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
