import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Octokit } from "@octokit/rest";
import { BUILDER } from "@/shared/repo";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { buildSchema } from "@/shared/form";
import { BuildStatusApiResponse } from "@/shared/api";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function updateBuildWithReleaseAsset(build: typeof builds.$inferSelect) {
  const shortSha = build.commitSha.substring(0, 7);
  const fullTag = `${build.versionTag}-${shortSha}`;

  try {
    const release = await octokit.repos.getReleaseByTag({
      owner: BUILDER.owner,
      repo: BUILDER.repo,
      tag: fullTag,
    });

    const buildParamsForMatch = buildSchema.parse({
      ...build,
      staticOpenssl: build.staticOpenssl ?? false,
      compatibilityMode: build.compatibilityMode ?? false,
      opensslVersion: build.opensslVersion ?? "3",
    });

    const asset = release.data.assets.find((a) =>
      isReleaseAssetMatchFormValues(a.name, buildParamsForMatch)
    );

    if (asset) {
      const [updatedBuild] = await db
        .update(builds)
        .set({
          status: "completed",
          downloadUrl: asset.browser_download_url,
        })
        .where(eq(builds.id, build.id))
        .returning();
      return updatedBuild;
    }

    console.warn(`Could not find matching asset for release ${fullTag}`);
    const [updatedBuild] = await db
      .update(builds)
      .set({ status: "completed" })
      .where(eq(builds.id, build.id))
      .returning();
    return updatedBuild;
  } catch (error: any) {
    if (error.status !== 404) {
      console.error(`Failed to check release for tag ${fullTag}`, error);
    }

    const [failedBuild] = await db
      .update(builds)
      .set({ status: "failed" })
      .where(eq(builds.id, build.id))
      .returning();
    return failedBuild;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Invalid build ID" }, { status: 400 });
  }

  const buildId = parseInt(id, 10);
  if (Number.isNaN(buildId)) {
    return NextResponse.json({ error: "Invalid build ID" }, { status: 400 });
  }

  const build = await db.query.builds.findFirst({
    where: eq(builds.id, buildId),
  });

  if (!build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  if (build.status === "completed" || build.status === "failed") {
    return NextResponse.json(build);
  }

  if (!build.githubActionRunId) {
    const updatedBuild = await updateBuildWithReleaseAsset(build);
    if (updatedBuild.status === "completed")
      return NextResponse.json(updatedBuild);

    return NextResponse.json(
      { error: "Build is in a pending state without a workflow run ID." },
      { status: 400 }
    );
  }

  try {
    const { data: run } = await octokit.actions.getWorkflowRun({
      owner: BUILDER.owner,
      repo: BUILDER.repo,
      run_id: parseInt(build.githubActionRunId, 10),
    });

    if (run.status === "completed") {
      if (run.conclusion === "success") {
        const finalBuildState = await updateBuildWithReleaseAsset(build);
        return NextResponse.json(finalBuildState);
      } else {
        const [failedBuild] = await db
          .update(builds)
          .set({ status: "failed" })
          .where(eq(builds.id, build.id))
          .returning();
        return NextResponse.json(failedBuild);
      }
    }

    return NextResponse.json(build);
  } catch (error: any) {
    console.error(
      `Error fetching workflow run ${build.githubActionRunId}`,
      error
    );

    if (error.status === 404) {
      const [failedBuild] = await db
        .update(builds)
        .set({ status: "failed" })
        .where(eq(builds.id, build.id))
        .returning();
      return NextResponse.json(failedBuild);
    }
    return NextResponse.json(
      { error: "Failed to fetch workflow status from GitHub." },
      { status: 500 }
    );
  }
}
