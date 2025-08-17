/**
 * Defines the shared types for API responses.
 */

import { builds } from "@/db/schema";

/**
 * The response from `POST /api/builds`.
 */
export type BuildApiResponse = {
  buildId?: number;
  downloadUrl?: string;
  message: string;
  status: BuildState["status"];
};
export type BuildState = typeof builds.$inferSelect;

export type BuildStatusApiResponse = BuildState;
