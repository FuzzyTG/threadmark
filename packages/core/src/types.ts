export type CaptureEvent = "command:new" | "command:reset" | "before_compaction";
export type CaptureStatus = "success" | "failed" | "partial";
export type ContextStatus = "active" | "blocked" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type SafetyLevel = "read_only" | "local_write" | "external_side_effect" | "destructive";

export type ContinuityMeta = {
  schema_version: 1;
  last_capture_event: CaptureEvent;
  last_capture_status: CaptureStatus;
  captured_at: string;
  valid_until: string;
  stale_reason: string | null;
};

export type ActiveContext = {
  id: string;
  source_session: string;
  summary: string;
  current_goal: string;
  status: ContextStatus;
  next_step: string;
  artifacts: string[];
  updated_at: string;
  confidence: Confidence;
};

export type RecentCompletedContext = {
  id: string;
  source_session: string;
  summary: string;
  outcome: string;
  replay_hint: string;
  artifacts: string[];
  safety_level: SafetyLevel;
  completed_at: string;
  updated_at: string;
  confidence: Confidence;
};

export type ContinuityState = {
  meta: ContinuityMeta;
  active_context: ActiveContext | null;
  recent_completed_context: RecentCompletedContext | null;
};

export type TranscriptMessage = {
  role: "user" | "assistant";
  text: string;
};
