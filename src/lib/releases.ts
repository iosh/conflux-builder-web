import { Octokit } from "@octokit/rest";
import { BUILDER } from "@/shared/repo";
import { unstable_cache as cache } from "next/cache";

export type ReleaseAsset = {
  id: number;
  name: string;
  downloadUrl: string;
  size: number;
};

export type Release = {
  id: number;
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  htmlUrl: string;
  assets: ReleaseAsset[];
};

export const getReleaseByTag = cache(
  async (tag: string): Promise<Release | null> => {
    if (!tag) {
      return null;
    }
    try {
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });

      const { data: release } = await octokit.repos.getReleaseByTag({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        tag,
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
      // If the release is not found, GitHub API returns a 404 status.
      // We check for this specific case and return null.
      if (error.status === 404) {
        console.log(`Release with tag "${tag}" not found.`);
        return null;
      }
      // For any other errors, we log them and re-throw to indicate a problem.
      console.error(
        `Failed to fetch release with tag "${tag}":`,
        error
      );
      throw error;
    }
  },
  ["github-release-by-tag"], // Base cache key
  {
    revalidate: 180, // Revalidate every 3 minutes
  }
);
