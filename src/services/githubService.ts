import { Octokit } from "@octokit/rest";
import { BUILDER, CONFLUX_RUST } from "@/shared/repo";
import { unstable_cache as cache } from "next/cache";
import { logger } from "@/lib/logger";
import { BuildFormValuesType } from "@/shared/form";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { GithubRelease } from "@/shared/actionsTypes";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const getCommitShaCacheTag = (versionTag: string) =>
  `commit-sha:${versionTag}`;

export async function getCommitShaForTag(
  versionTag: string
): Promise<string | null> {
  if (!versionTag) return null;

  const cached = cache(
    async (): Promise<string | null> => {
      try {
        const ref = await octokit.git.getRef({
          owner: CONFLUX_RUST.owner,
          repo: CONFLUX_RUST.repo,
          ref: `tags/${versionTag}`,
        });
        return ref.data.object.sha;
      } catch (error: any) {
        if (error.status === 404) {
          logger.warn(
            { tag: versionTag, repo: CONFLUX_RUST.repo },
            `Tag not found`
          );
          return null;
        }
        logger.error(
          { error, tag: versionTag },
          `Failed to get commit SHA for tag`
        );
        throw error;
      }
    },
    ["commit-sha-for-tag", versionTag],
    { revalidate: 10 * 60, tags: [getCommitShaCacheTag(versionTag)] }
  );

  return cached();
}

export async function findMatchingReleaseAsset(
  data: BuildFormValuesType & { commitSha: string }
) {
  const shortSha = data.commitSha.substring(0, 7);
  const fullTag = `${data.versionTag}-${shortSha}`;

  try {
    const release = await octokit.repos.getReleaseByTag({
      owner: BUILDER.owner,
      repo: BUILDER.repo,
      tag: fullTag,
    });
    return release.data.assets.find((asset) =>
      isReleaseAssetMatchFormValues(asset.name, data)
    );
  } catch (error: any) {
    if (error.status !== 404) {
      logger.error(
        { error, tag: fullTag },
        "GitHub API error checking release"
      );
      throw new Error("Failed to check releases on GitHub.");
    }
    return undefined;
  }
}

export async function dispatchWorkflow(
  workflow_id: string,
  ref: string,
  inputs: Record<string, unknown>
) {
  try {
    await octokit.actions.createWorkflowDispatch({
      owner: BUILDER.owner,
      repo: BUILDER.repo,
      workflow_id,
      ref,
      inputs,
    });
  } catch (error) {
    logger.error({ error, workflow_id }, "Failed to dispatch workflow");
    throw new Error("Failed to trigger a new build workflow.");
  }
}

export const getReleaseCacheTag = (versionTag: string) =>
  `github-release:${versionTag}`;
export async function getReleaseByTag(
  versionTag: string
): Promise<GithubRelease | null> {
  if (!versionTag) {
    return null;
  }

  const cached = cache(
    async (): Promise<GithubRelease | null> => {
      const commitSha = await getCommitShaForTag(versionTag);
      if (!commitSha) {
        return null;
      }

      const shortSha = commitSha.substring(0, 7);
      const fullTag = `${versionTag}-${shortSha}`;

      try {
        const { data: release } = await octokit.repos.getReleaseByTag({
          owner: BUILDER.owner,
          repo: BUILDER.repo,
          tag: fullTag,
        });

        return release;
      } catch (error: any) {
        if (error.status === 404) {
          logger.warn({ tag: fullTag }, `Release with tag not found.`);
          return null;
        }
        logger.error({ error, tag: fullTag }, `Failed to fetch release`);
        throw error;
      }
    },
    ["github-release-by-tag", versionTag],
    {
      revalidate: 3 * 60,
      tags: [
        getReleaseCacheTag(versionTag),
        getCommitShaCacheTag(versionTag),
      ],
    }
  );

  return cached();
}
