/**
 * Defines the shared types for API responses.
 */

/**
 * The response from `POST /api/builds`.
 */
export type BuildApiResponse = {
  message: string;
  downloadUrl?: string;
  buildId?: number;
};

/**
 * The response from `GET /api/builds/[id]/status`.
 */
export type BuildStatusApiResponse = {
  status:
    | "queued"
    | "in_progress"
    | "completed"
    | "action_required"
    | "cancelled"
    | "failure"
    | "neutral"
    | "skipped"
    | "stale"
    | "success"
    | "timed_out"
    | "waiting";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  url?: string;
  message?: string; // For pending/not found states
};