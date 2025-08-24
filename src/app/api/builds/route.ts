import { NextResponse } from "next/server";
import { buildSchema } from "@/shared/form";
import { Octokit } from "@octokit/rest";
import { BUILDER } from "@/shared/repo";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { and, eq } from "drizzle-orm";
import { getWorkflowId, getWorkflowInputs } from "@/lib/workflowUtils";
import { getCommitShaForTag } from "@/lib/releases";
import { nanoid } from "nanoid";
import z from "zod";
import { getBuildQueryConditions } from "@/lib/db";
import { logger } from "@/lib/logger";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = buildSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: z.treeifyError(validation.error) },
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

    // First, check for existing builds using conditional fields based on OS
    const buildQueryConditions = getBuildQueryConditions(data);

    const existingBuild = await db.query.builds.findFirst({
      where: and(...buildQueryConditions),
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

      // Prevent duplicate builds for pending/in_progress status
      if (
        existingBuild.status === "pending" ||
        existingBuild.status === "in_progress"
      ) {
        logger.info(
          { buildId: existingBuild.id, status: existingBuild.status },
          "Build is already in progress, preventing duplicate"
        );
        return NextResponse.json({
          message: "Build is already in progress.",
          status: existingBuild.status,
          buildId: existingBuild.id,
          downloadUrl: existingBuild.downloadUrl,
        });
      }

      if (
        existingBuild.status === "failed" ||
        existingBuild.status === "cancelled"
      ) {
        logger.info(
          { buildId: existingBuild.id, status: existingBuild.status },
          "Retrying build"
        );

        const appRunId = nanoid(5);

        logger.info(
          { buildId: existingBuild.id, runId: appRunId },
          "Generated new runId for retry"
        );

        // Update the existing build for retry
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
          logger.error(
            { error, buildId: existingBuild.id },
            "Failed to retry workflow"
          );
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
        logger.error({ error, tag: fullTag }, "GitHub API error");
        return NextResponse.json(
          { error: "Failed to check releases on GitHub." },
          { status: 500 }
        );
      }
    }

    // Try to create a new build record with the unique constraint protection
    let newBuild;
    try {
      [newBuild] = await db
        .insert(builds)
        .values({ ...data, status: "pending" })
        .returning();
    } catch (error: any) {
      // Handle unique constraint violation (duplicate build)
      if (error.message && error.message.includes("UNIQUE constraint failed")) {
        logger.warn(
          { data: data },
          "Duplicate build detected on insert, checking existing build"
        );

        const duplicateQueryConditions = getBuildQueryConditions(data);

        const duplicateBuild = await db.query.builds.findFirst({
          where: and(...duplicateQueryConditions),
        });

        if (duplicateBuild) {
          return NextResponse.json({
            message: "Build is already in progress or completed.",
            status: duplicateBuild.status,
            buildId: duplicateBuild.id,
            downloadUrl: duplicateBuild.downloadUrl,
          });
        }
      }

      logger.error({ error }, "Failed to create build record");
      return NextResponse.json(
        { error: "Failed to create build record." },
        { status: 500 }
      );
    }

    try {
      const workflow_id = getWorkflowId(data.os);
      const appRunId = nanoid(5);
      const inputs = getWorkflowInputs({ ...data, runId: appRunId });

      // Update build with the runId for webhook matching
      await db
        .update(builds)
        .set({
          runId: appRunId,
          updatedAt: new Date(),
        })
        .where(eq(builds.id, newBuild.id));

      logger.info(
        { buildId: newBuild.id, runId: appRunId },
        "Created build record and generated runId"
      );

      // Trigger the GitHub Action
      await octokit.actions.createWorkflowDispatch({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        workflow_id,
        ref: "main",
        inputs: inputs,
      });

      return NextResponse.json({
        message: "Build has been queued successfully.",
        status: "pending",
        buildId: newBuild.id,
      });
    } catch (error) {
      logger.error(
        { error, buildId: newBuild.id },
        "Failed to trigger workflow"
      );
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
    logger.error({ error }, "Build request failed");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
