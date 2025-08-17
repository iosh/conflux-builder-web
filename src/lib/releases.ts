import { Octokit } from "@octokit/rest";
import { BUILDER, CONFLUX_RUST } from "@/shared/repo";
import { unstable_cache as cache } from "next/cache";
import { Release } from "@/shared/actionsTypes";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const getCommitShaForTag = cache(
  async (versionTag: string): Promise<string | null> => {
    if (!versionTag) return null;
    try {
      const ref = await octokit.git.getRef({
        owner: CONFLUX_RUST.owner,
        repo: CONFLUX_RUST.repo,
        ref: `tags/${versionTag}`,
      });
      return ref.data.object.sha;
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`Tag "${versionTag}" not found in ${CONFLUX_RUST.repo}.`);
        return null;
      }
      console.error(`Failed to get commit SHA for tag "${versionTag}":`, error);
      throw error;
    }
  },
  ["commit-sha-for-tag"],
  { revalidate: 600 } // Cache for 10 minutes
);

export const getReleaseByTag = cache(
  async (versionTag: string): Promise<Release | null> => {
    if (!versionTag) {
      return null;
    }

    const commitSha = await getCommitShaForTag(versionTag);
    if (!commitSha) {
      // If the primary tag doesn't exist, the release can't exist either.
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

      return {
        id: release.id,
        tagName: release.tag_name,
        name: release.name,
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        assets: release.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          downloadUrl: asset.browser_download_url,
          size: asset.size,
        })),
      };
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`Release with tag "${fullTag}" not found.`);
        return null;
      }
      console.error(`Failed to fetch release with tag "${fullTag}":`, error);
      throw error;
    }
  },
  ["github-release-by-tag"], // Base cache key
  {
    revalidate: 300, // Revalidate every 3 minutes
  }
);
