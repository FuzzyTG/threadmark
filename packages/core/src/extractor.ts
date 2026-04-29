import { DEFAULT_VALIDITY_HOURS, MAX_ARTIFACTS, SCHEMA_VERSION } from "./constants.js";
import { redactSecrets } from "./redaction.js";
import type { CaptureEvent, CaptureStatus, ContinuityState, TranscriptMessage } from "./types.js";

function isoPlusHours(now: Date, hours: number): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function summarize(messages: TranscriptMessage[]): string {
  return redactSecrets(messages.map((message) => `${message.role}: ${message.text}`).join("\n")).slice(0, 1200);
}

function artifactCandidates(messages: TranscriptMessage[]): string[] {
  const text = messages.map((message) => message.text).join("\n");
  const matches = text.match(/[A-Za-z0-9_.\/-]+\.(md|ts|js|json|jsonl|sh|yml|yaml)/g) || [];
  return Array.from(new Set(matches)).slice(0, MAX_ARTIFACTS);
}

export function extractContinuityState(input: {
  eventName: CaptureEvent;
  sessionId: string | null;
  messages: TranscriptMessage[];
  now: Date;
  status: CaptureStatus;
  staleReason: string | null;
}): ContinuityState {
  const capturedAt = input.now.toISOString();
  const base = {
    meta: {
      schema_version: SCHEMA_VERSION,
      last_capture_event: input.eventName,
      last_capture_status: input.status,
      captured_at: capturedAt,
      valid_until: isoPlusHours(input.now, DEFAULT_VALIDITY_HOURS),
      stale_reason: input.staleReason
    },
    active_context: null,
    recent_completed_context: null
  } satisfies ContinuityState;

  if (input.messages.length === 0 || input.status !== "success") {
    return base;
  }

  const summary = summarize(input.messages);
  const lastAssistant = [...input.messages].reverse().find((message) => message.role === "assistant")?.text || "";

  return {
    ...base,
    active_context: {
      id: `active-${capturedAt}`,
      source_session: input.sessionId || "unknown",
      summary,
      current_goal: summary.split("\n")[0]?.replace(/^user: /, "") || "unknown",
      status: "active",
      next_step: lastAssistant || "Ask the user what to continue.",
      artifacts: artifactCandidates(input.messages),
      updated_at: capturedAt,
      confidence: "medium"
    }
  };
}
