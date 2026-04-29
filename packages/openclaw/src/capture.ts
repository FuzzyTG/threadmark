import { extractContinuityState, saveStateAndPacket, type CaptureEvent, type CaptureStatus } from "@threadmark/core";
import { statePath, packetPath } from "./paths.js";
import { readTranscriptMessages } from "./transcript-reader.js";
import { resolveTranscript } from "./transcript-resolver.js";

export type CaptureResult = {
  status: CaptureStatus;
  transcriptPath: string | null;
  messageCount: number;
  error: string | null;
};

export async function captureContinuity(input: {
  baseDir?: string;
  eventName: CaptureEvent;
  sessionId: string | null;
  sessionFile: string | null;
  workspaceDir: string | null;
  now: Date;
}): Promise<CaptureResult> {
  try {
    const resolution = await resolveTranscript({ sessionId: input.sessionId, sessionFile: input.sessionFile });
    const paths = { stateFile: statePath(input.baseDir), packetFile: packetPath(input.baseDir) };

    if (!resolution.resolvedPath) {
      const state = extractContinuityState({
        eventName: input.eventName,
        sessionId: input.sessionId,
        messages: [],
        now: input.now,
        status: "partial",
        staleReason: "transcript missing"
      });
      await saveStateAndPacket(paths, state);
      return { status: "partial", transcriptPath: null, messageCount: 0, error: null };
    }

    const messages = await readTranscriptMessages(resolution.resolvedPath, 50);
    const status: CaptureStatus = messages.length > 0 ? "success" : "partial";
    const staleReason = messages.length > 0 ? null : "transcript empty";
    const state = extractContinuityState({
      eventName: input.eventName,
      sessionId: input.sessionId,
      messages,
      now: input.now,
      status,
      staleReason
    });

    await saveStateAndPacket(paths, state);
    return { status, transcriptPath: resolution.resolvedPath, messageCount: messages.length, error: null };
  } catch (error) {
    return {
      status: "failed",
      transcriptPath: null,
      messageCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
