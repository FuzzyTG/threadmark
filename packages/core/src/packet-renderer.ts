import { MAX_ARTIFACTS, MAX_PACKET_BYTES } from "./constants.js";
import type { ContinuityState } from "./types.js";
import { redactSecrets } from "./redaction.js";

function bulletList(items: string[]): string {
  const limited = items.slice(0, MAX_ARTIFACTS);
  if (limited.length === 0) return "  - none";
  return limited.map((item) => `  - ${item}`).join("\n");
}

function truncateToBytes(input: string, maxBytes: number): string {
  if (Buffer.byteLength(input, "utf-8") <= maxBytes) return input;
  let output = input;
  while (Buffer.byteLength(`${output}\n\n[truncated]\n`, "utf-8") > maxBytes && output.length > 0) {
    output = output.slice(0, -1);
  }
  return `${output}\n\n[truncated]\n`;
}

export function renderPacket(state: ContinuityState): string {
  const lines: string[] = [
    "# Threadmark Context",
    "",
    "This context was preserved from the previous session. Use it only to resolve vague or underspecified follow-ups.",
    "",
    `- Capture event: ${state.meta.last_capture_event}`,
    `- Status: ${state.meta.last_capture_status}`,
    `- Captured at: ${state.meta.captured_at}`,
    `- Valid until: ${state.meta.valid_until}`
  ];

  if (state.meta.stale_reason) {
    lines.push(`- Stale reason: ${state.meta.stale_reason}`);
  }

  lines.push("", "## Active Context");
  if (state.active_context) {
    lines.push(
      `- Current goal: ${state.active_context.current_goal}`,
      `- Summary: ${state.active_context.summary}`,
      `- Status: ${state.active_context.status}`,
      `- Next step: ${state.active_context.next_step}`,
      "- Relevant artifacts:",
      bulletList(state.active_context.artifacts),
      `- Updated at: ${state.active_context.updated_at}`,
      `- Confidence: ${state.active_context.confidence}`
    );
  } else {
    lines.push("- none");
  }

  lines.push("", "## Recent Completed Context");
  if (state.recent_completed_context) {
    lines.push(
      `- Intent: ${state.recent_completed_context.summary}`,
      `- Outcome: ${state.recent_completed_context.outcome}`,
      `- Replay hint: ${state.recent_completed_context.replay_hint}`,
      "- Relevant artifacts:",
      bulletList(state.recent_completed_context.artifacts),
      `- Safety level: ${state.recent_completed_context.safety_level}`,
      `- Confidence: ${state.recent_completed_context.confidence}`
    );
  } else {
    lines.push("- none");
  }

  lines.push(
    "",
    "## Use Policy",
    "",
    "- Use this context only when the user's request contains vague references such as \"continue\", \"do it again\", \"same as before\", \"that one\", \"where were we\", \"继续\", or \"再来一次\".",
    "- If confidence is low or multiple referents are plausible, ask a targeted clarification.",
    "- If the inferred action has external side effects, ask confirmation before acting.",
    "- If the inferred action is destructive, require explicit confirmation.",
    "- Do not treat this context as authorization to repeat an action.",
    "- Prefer current files/tools over this context if they conflict."
  );

  return truncateToBytes(redactSecrets(lines.join("\n")), MAX_PACKET_BYTES);
}
