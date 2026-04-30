import { DEFAULT_VALIDITY_HOURS, MAX_ARTIFACTS, SCHEMA_VERSION } from "./constants.js";
import { redactSecrets } from "./redaction.js";
import type { CaptureEvent, CaptureStatus, ContinuityState, TranscriptMessage } from "./types.js";

const DEFAULT_RECENT_EXCHANGES = 3;

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

/**
 * Walk through messages and collect the last N user-led exchanges.
 * A user-led exchange is a user message followed by zero or more assistant messages
 * before the next user message. Groups that start with an assistant (no leading
 * user message) are dropped.
 */
function collectRecentExchanges(messages: TranscriptMessage[], maxExchanges: number): TranscriptMessage[] {
  const exchanges: TranscriptMessage[][] = [];
  let current: TranscriptMessage[] = [];

  // Walk forward, splitting on user messages
  for (const msg of messages) {
    if (msg.role === "user") {
      if (current.length > 0) exchanges.push(current);
      current = [msg];
    } else {
      // Only add assistant messages to a group that starts with a user message
      if (current.length > 0 && current[0].role === "user") {
        current.push(msg);
      }
      // Otherwise drop — assistant-only group
    }
  }
  if (current.length > 0 && current[0].role === "user") exchanges.push(current);

  // Take the last N exchanges and flatten back to chronological order
  return exchanges.slice(-maxExchanges).flat();
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

  const recentExchanges = collectRecentExchanges(input.messages, DEFAULT_RECENT_EXCHANGES);
  if (recentExchanges.length === 0) return base;

  const redactedExchanges = recentExchanges.map((m) => ({ role: m.role, text: redactSecrets(m.text) }));
  const summary = summarize(recentExchanges);
  const lastUser = [...recentExchanges].reverse().find((m) => m.role === "user")?.text || "unknown";
  const lastAssistant = [...recentExchanges].reverse().find((m) => m.role === "assistant")?.text || "";

  return {
    ...base,
    active_context: {
      id: `active-${capturedAt}`,
      source_session: input.sessionId || "unknown",
      summary,
      current_goal: redactSecrets(lastUser),
      status: "active",
      next_step: redactSecrets(lastAssistant) || "Ask the user what to continue.",
      recent_exchanges: redactedExchanges,
      artifacts: artifactCandidates(input.messages),
      updated_at: capturedAt,
      confidence: "medium"
    }
  };
}
