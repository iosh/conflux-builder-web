import { NextResponse } from "next/server";
import { buildSchema } from "@/shared/form";
import { Octokit } from "@octokit/rest";
import { BUILDER } from "@/shared/repo";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { and, eq, isNull } from "drizzle-orm";
import { getWorkflowId, getWorkflowInputs } from "@/lib/workflowUtils";
import { getCommitShaForTag } from "@/lib/releases";
import { nanoid } from "nanoid";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = buildSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const dataFromClient = validation.data;
    const commitSha = await getCommitShaForTag(dataFromClient.versionTag);

    if (!commitSha) {
      return NextResponse.json(
        { error: `Version tag "${dataFromClient.versionTag}" not found.` },
        { status: 400 }
      );
    }

    const data = { ...dataFromClient, commitSha };

    const existingBuild = await db.query.builds.findFirst({
      where: and(
        eq(builds.commitSha, data.commitSha),
        eq(builds.versionTag, data.versionTag),
        eq(builds.os, data.os),
        eq(builds.arch, data.arch),
        data.glibcVersion
          ? eq(builds.glibcVersion, data.glibcVersion)
          : isNull(builds.glibcVersion),
        data.opensslVersion
          ? eq(builds.opensslVersion, data.opensslVersion)
          : isNull(builds.opensslVersion)
      ),
    });

    if (existingBuild) {
      if (existingBuild.status === "completed") {
        return NextResponse.json({
          message: "Build record already exists.",
          status: existingBuild.status,
          buildId: existingBuild.id,
          downloadUrl: existingBuild.downloadUrl,
        });
      }

      if (
        existingBuild.status === "failed" ||
        existingBuild.status === "cancelled"
      ) {
        console.log(
          `Retrying ${existingBuild.status} build ${existingBuild.id}`
        );

        const appRunId = nanoid(5);

        await db
          .update(builds)
          .set({
            status: "pending",
            runId: appRunId,
            githubActionRunId: null,
            downloadUrl: null,
            updatedAt: new Date(),
          })
          .where(eq(builds.id, existingBuild.id));

        try {
          const workflow_id = getWorkflowId(data.os);
          const inputs = getWorkflowInputs({ ...data, runId: appRunId });

          // dispatch the workflow
          await octokit.actions.createWorkflowDispatch({
            owner: BUILDER.owner,
            repo: BUILDER.repo,
            workflow_id,
            ref: "main",
            inputs: inputs,
          });

          return NextResponse.json({
            message: "Build has been retried successfully.",
            status: "pending",
            buildId: existingBuild.id,
          });

        } catch (error) {
          console.error("Failed to retry workflow:", error);
          await db
            .update(builds)
            .set({ status: "failed" })
            .where(eq(builds.id, existingBuild.id));
          return NextResponse.json(
            { error: "Failed to retry the build." },
            { status: 500 }
          );
        }
      }

      // if build is in progress, return current status
      return NextResponse.json({
        message: "Build is already in progress.",
        status: existingBuild.status,
        buildId: existingBuild.id,
        downloadUrl: existingBuild.downloadUrl,
      });
    }

    const shortSha = data.commitSha.substring(0, 7);
    const fullTag = `${data.versionTag}-${shortSha}`;

    try {
      const release = await octokit.repos.getReleaseByTag({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        tag: fullTag,
      });
      const existingAsset = release.data.assets.find((asset) =>
        isReleaseAssetMatchFormValues(asset.name, data)
      );
      if (existingAsset) {
        const [newBuild] = await db
          .insert(builds)
          .values({
            ...data,
            status: "completed",
            downloadUrl: existingAsset.browser_download_url,
          })
          .returning();
        return NextResponse.json({
          message: "Build found on GitHub!",
          status: "completed",
          buildId: newBuild.id,
          downloadUrl: existingAsset.browser_download_url,
        });
      }
    } catch (error: any) {
      if (error.status !== 404) {
        console.error("GitHub API error:", error);
        return NextResponse.json(
          { error: "Failed to check releases on GitHub." },
          { status: 500 }
        );
      }
    }

    const [newBuild] = await db
      .insert(builds)
      .values({ ...data, status: "pending" })
      .returning();

    try {
      const workflow_id = getWorkflowId(data.os);
      const appRunId = nanoid(5);
      const inputs = getWorkflowInputs({ ...data, runId: appRunId });

      // Update build with the runId for webhook matching
      await db
        .update(builds)
        .set({ runId: appRunId })
        .where(eq(builds.id, newBuild.id));

      // Trigger the GitHub Action
      await octokit.actions.createWorkflowDispatch({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        workflow_id,
        ref: "main",
        inputs: inputs as any,
      });

      return NextResponse.json({
        message: "Build has been queued successfully.",
        status: "pending",
        buildId: newBuild.id,
      });
    } catch (error) {
      console.error("Failed to trigger workflow:", error);
      await db
        .update(builds)
        .set({ status: "failed" })
        .where(eq(builds.id, newBuild.id));
      return NextResponse.json(
        { error: "Failed to trigger a new build." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Build request failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
