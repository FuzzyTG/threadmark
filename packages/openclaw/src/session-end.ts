import path from "node:path";
import { captureContinuity } from "./capture.js";
import { openClawHome } from "./paths.js";
import { resolveWorkspaceFromConfig, type OpenClawConfig } from "./openclaw-config.js";

export type SessionEndEvent = {
  sessionId: string;
  sessionKey?: string;
  messageCount: number;
  durationMs?: number;
};

export type SessionEndContext = {
  sessionId: string;
  sessionKey: string;
  agentId: string;
};

export async function handleSessionEnd(
  event: SessionEndEvent,
  ctx: SessionEndContext,
  config?: OpenClawConfig
): Promise<void> {
  const home = openClawHome();
  const sessionFile = path.join(home, "agents", ctx.agentId, "sessions", event.sessionId + ".jsonl");
  const baseDir = resolveWorkspaceFromConfig(config, ctx.agentId, home);

  await captureContinuity({
    baseDir,
    eventName: "session_end",
    sessionId: event.sessionId,
    sessionFile,
    workspaceDir: baseDir,
    now: new Date()
  });
}
