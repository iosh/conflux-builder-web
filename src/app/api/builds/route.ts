import { NextResponse } from "next/server";
import { buildSchema } from "@/shared/form";
import { getWorkflowId, getWorkflowInputs } from "@/lib/workflowUtils";
import { nanoid } from "nanoid";
import z from "zod";
import { logger } from "@/lib/logger";
import * as githubService from "@/services/githubService";
import * as buildsService from "@/services/buildsService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    logger.info(
      {
        versionTag: body.versionTag,
        os: body.os,
        arch: body.arch,
      },
      "Received build request"
    );
    const validation = buildSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: z.treeifyError(validation.error) },
        { status: 400 }
      );
    }

    const dataFromClient = validation.data;

    const supportedTagsList = await githubService.getAndCacheTags();

    if (!supportedTagsList || supportedTagsList.length === 0) {
      logger.error("Failed to fetch supported tags from GitHub");
      return NextResponse.json(
        { error: "Unable to validate version tag. Please try again later." },
        { status: 503 }
      );
    }

    const validVersionTag = supportedTagsList.find(
      (tag) => tag.name === dataFromClient.versionTag
    );

    if (!validVersionTag) {
      return NextResponse.json(
        {
          error: `Version tag "${dataFromClient.versionTag}" is not supported.`,
        },
        { status: 400 }
      );
    }

    const commitSha = validVersionTag.commit.sha;

    if (!commitSha) {
      return NextResponse.json(
        { error: `Version tag "${dataFromClient.versionTag}" not found.` },
        { status: 400 }
      );
    }

    const data = { ...dataFromClient, commitSha };

    const existingBuild = await buildsService.findBuild(data);

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

        await buildsService.updateBuildForRetry(existingBuild.id, appRunId);

        try {
          const workflow_id = getWorkflowId(data.os);
          const inputs = getWorkflowInputs({ ...data, runId: appRunId });

          await githubService.dispatchWorkflow(workflow_id, "main", inputs);

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
          await buildsService.updateBuildStatus(existingBuild.id, "failed");
          return NextResponse.json(
            { error: "Failed to retry the build." },
            { status: 500 }
          );
        }
      }
    }

    try {
      const existingAsset = await githubService.findMatchingReleaseAsset(data);
      if (existingAsset) {
        const newBuild = await buildsService.createCompletedBuild(
          data,
          existingAsset.browser_download_url
        );
        return NextResponse.json({
          message: "Build found on GitHub!",
          status: "completed",
          buildId: newBuild.id,
          downloadUrl: existingAsset.browser_download_url,
        });
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to check releases on GitHub." },
        { status: 500 }
      );
    }

    // Try to create a new build record with the unique constraint protection
    let newBuild;
    try {
      newBuild = await buildsService.createPendingBuild(data);
    } catch (error: any) {
      // Handle unique constraint violation (duplicate build)
      if (error.message && error.message.includes("UNIQUE constraint failed")) {
        logger.warn(
          { data: data },
          "Duplicate build detected on insert, checking existing build"
        );

        const duplicateBuild = await buildsService.findBuild(data);

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

      await buildsService.updateBuildRunId(newBuild.id, appRunId);

      logger.info(
        { buildId: newBuild.id, runId: appRunId },
        "Created build record and generated runId"
      );

      await githubService.dispatchWorkflow(workflow_id, "main", inputs);

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
      await buildsService.updateBuildStatus(newBuild.id, "failed");
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
