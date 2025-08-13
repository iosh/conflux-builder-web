import { db } from "@/db";
import { tags as tagsSchema } from "@/db/schema";
import { Octokit } from "@octokit/rest";
import { desc } from "drizzle-orm";
import { RestEndpointMethodTypes } from "@octokit/rest";

export type GitHubTag =
  RestEndpointMethodTypes["repos"]["listTags"]["response"]["data"][number];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const CONFLUX_RUST_OWNER = "Conflux-Chain";
const CONFLUX_RUST_REPO = "conflux-rust";

// we only want to fetch the latest 10 tags
export async function getAndCacheTags() {
  try {
    const { data: remoteTags } = await octokit.repos.listTags({
      owner: CONFLUX_RUST_OWNER,
      repo: CONFLUX_RUST_REPO,
      per_page: 10,
      page: 1,
    });

    if (remoteTags && remoteTags.length > 0) {
      const upsertPromises = remoteTags.map((tag) => {
        return db
          .insert(tagsSchema)
          .values({
            name: tag.name,
            commitSha: tag.commit.sha,
          })
          .onConflictDoUpdate({
            target: tagsSchema.name,
            set: {
              commitSha: tag.commit.sha,
              updatedAt: new Date(),
            },
          });
      });
      await Promise.all(upsertPromises);
    }

    return remoteTags;
  } catch (error) {
    console.error("Failed to fetch and cache tags from GitHub:", error);
    return [];
  }
}
