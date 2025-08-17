import { Release } from "@/shared/actionsTypes";
import { BuildApiResponse, BuildStatusApiResponse } from "@/shared/api";
import { BuildFormValuesType } from "@/shared/form";

export const fetchReleaseByTag = async (
  builderTag: string
): Promise<Release> => {
  const response = await fetch(`/api/releases/${builderTag}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("RELEASE_NOT_FOUND");
    }
    throw new Error(`Failed to fetch release: ${response.statusText}`);
  }
  return response.json();
};

export const fetchBuildStatus = async (
  buildId: number
): Promise<BuildStatusApiResponse> => {
  const response = await fetch(`/api/builds/${buildId}/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch build status: ${response.statusText}`);
  }
  return response.json();
};
export const postBuildRequest = async (
  values: BuildFormValuesType
): Promise<BuildApiResponse> => {
  const response = await fetch("/api/builds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to submit build request");
  }

  return response.json();
};
