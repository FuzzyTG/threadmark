import { injectContinuityPacket } from "../../src/bootstrap.js";
import { captureContinuity } from "../../src/capture.js";
import type { CaptureEvent } from "@threadmark/core/types";

type HookEvent = {
  type?: string;
  action?: string;
  context?: {
    previousSessionEntry?: { sessionId?: string; sessionFile?: string };
    sessionEntry?: { sessionId?: string; sessionFile?: string };
    workspaceDir?: string;
    bootstrapFiles?: Array<{ path: string; content: string }>;
  };
};

function commandEventName(action: string | undefined): CaptureEvent | null {
  if (action === "new") return "command:new";
  if (action === "reset") return "command:reset";
  return null;
}

export default async function handler(event: HookEvent): Promise<void> {
  const context = event.context || {};

  if (event.type === "agent" && event.action === "bootstrap") {
    await injectContinuityPacket(context, context.workspaceDir || undefined);
    return;
  }

  if (event.type !== "command") return;
  const eventName = commandEventName(event.action);
  if (!eventName) return;

  const session = context.previousSessionEntry || context.sessionEntry || {};
  await captureContinuity({
    baseDir: context.workspaceDir || undefined,
    eventName,
    sessionId: session.sessionId || null,
    sessionFile: session.sessionFile || null,
    workspaceDir: context.workspaceDir || null,
    now: new Date()
  });
}
