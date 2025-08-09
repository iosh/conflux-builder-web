import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags as tagsSchema } from "@/db/schema";
import { Octokit } from "@octokit/rest";
import { eq } from "drizzle-orm";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const CONFLUX_RUST_OWNER = "Conflux-Chain";
const CONFLUX_RUST_REPO = "conflux-rust";

// we only want to fetch the latest 10 tags
async function fetchAndCacheTags() {
  const { data: remoteTags } = await octokit.repos.listTags({
    owner: CONFLUX_RUST_OWNER,
    repo: CONFLUX_RUST_REPO,
    per_page: 10,
    page: 1,
  });

  if (!remoteTags || remoteTags.length === 0) {
    return [];
  }

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
  return remoteTags;
}

export async function GET() {
  try {
    const allTags = await fetchAndCacheTags();
    return NextResponse.json(allTags);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
