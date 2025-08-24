import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BUILDER } from "@/shared/repo";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { buildSchema } from "@/shared/form";
import { Webhooks } from "@octokit/webhooks";
import { logger } from "@/lib/logger";

import type { WorkflowRunEvent, ReleaseEvent } from "@octokit/webhooks-types";

function getWebhooks() {
  return new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET || "",
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");

    // Verify webhook signature
    if (!process.env.GITHUB_WEBHOOK_SECRET || !signature) {
      logger.error("Missing webhook secret or signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const isValid = await getWebhooks().verify(payload, signature);
    if (!isValid) {
      logger.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!event || !["workflow_run", "release"].includes(event as any)) {
      return NextResponse.json(
        { message: "Event not supported" },
        { status: 200 }
      );
    }

    const body = JSON.parse(payload);

    if (event === "workflow_run") {
      return await handleWorkflowRun(body as WorkflowRunEvent);
    }

    if (event === "release") {
      return await handleRelease(body as ReleaseEvent);
    }

    return NextResponse.json({ message: "Event not handled" }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Webhook error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleWorkflowRun(body: WorkflowRunEvent) {
  const { action, workflow_run, repository } = body;

  if (repository.full_name !== `${BUILDER.owner}/${BUILDER.repo}`) {
    return NextResponse.json(
      { message: "Repository not relevant" },
      { status: 200 }
    );
  }

  // in requested the display_title is not include our id
  if (action === "requested") {
    return NextResponse.json({ message: "Build requested" });
  }

  const githubRunId = workflow_run.id.toString();
  const displayTitle = workflow_run.display_title || "";

  logger.info(
    {
      action,
      displayTitle,
      githubRunId,
      repo: repository.full_name,
    },
    "Workflow run event received"
  );

  // Extract the app runId from display title
  // The display title format should be: "Build v1.2.3 - macOS (aarch64) - abc12"
  // where "abc12" is our generated runId
  const runIdMatch = displayTitle.match(/ - ([a-zA-Z0-9]{5})$/);
  let build = null;

  if (runIdMatch) {
    const appRunId = runIdMatch[1];
    logger.info({ appRunId }, `Extracted app runId from display title`);

    build = await db.query.builds.findFirst({
      where: eq(builds.runId, appRunId),
    });

    // Update the build with the GitHub workflow run ID if found
    if (build && !build.githubActionRunId) {
      logger.info(
        { buildId: build.id, githubRunId },
        `Linking build with GitHub workflow run`
      );
      await db
        .update(builds)
        .set({
          githubActionRunId: githubRunId,
          updatedAt: new Date(),
        })
        .where(eq(builds.id, build.id));
    }
  } else {
    logger.warn({ displayTitle }, `Could not extract runId from display title`);
    build = await db.query.builds.findFirst({
      where: eq(builds.githubActionRunId, githubRunId),
    });
  }

  if (!build) {
    logger.warn(
      { githubRunId, displayTitle },
      `No matching build found for workflow run`
    );
    return NextResponse.json(
      { message: "No matching build found" },
      { status: 200 }
    );
  }

  if (action === "in_progress") {
    // Workflow is now running
    await db
      .update(builds)
      .set({ status: "in_progress" })
      .where(eq(builds.id, build.id));

    logger.info({ buildId: build.id }, `Build marked as in_progress`);
    return NextResponse.json({
      message: "Build status updated to in_progress",
    });
  }

  if (action === "completed") {
    if (workflow_run.conclusion === "success") {
      logger.info(
        { githubRunId },
        `Workflow completed successfully, checking for release assets`
      );

      await db
        .update(builds)
        .set({ status: "build_success" })
        .where(eq(builds.id, build.id));

      logger.info(
        { buildId: build.id, conclusion: workflow_run.conclusion },
        `Build marked as successful`
      );
    } else if (
      workflow_run.conclusion === "failure" ||
      workflow_run.conclusion === "cancelled"
    ) {
      // Mark build as failed
      await db
        .update(builds)
        .set({ status: "failed" })
        .where(eq(builds.id, build.id));

      logger.warn(
        { buildId: build.id, conclusion: workflow_run.conclusion },
        `Build marked as failed`
      );
    } else {
      logger.info(
        { githubRunId, conclusion: workflow_run.conclusion },
        `Workflow completed with unhandled conclusion`
      );
    }

    return NextResponse.json({ message: "Build status updated" });
  }

  return NextResponse.json({ message: "Workflow event handled" });
}

async function handleRelease(body: ReleaseEvent) {
  const { action, release, repository } = body;

  // Only handle published/edited releases from the builder repository
  if (
    !["published", "edited", "prereleased"].includes(action) ||
    repository.full_name !== `${BUILDER.owner}/${BUILDER.repo}`
  ) {
    return NextResponse.json(
      { message: "Release event not relevant" },
      { status: 200 }
    );
  }

  const tag = release.tag_name;

  // Extract version tag and commit sha from the release tag
  // Assuming format: v1.2.3-abc1234
  const match = tag.match(/^(.+)-([a-f0-9]{7})$/);
  if (!match) {
    return NextResponse.json(
      { message: "Tag format not recognized" },
      { status: 200 }
    );
  }

  const [, versionTag, shortSha] = match;

  // Find ALL builds for this version and commit (not just pending/in_progress)
  // because release events can arrive at any time during the build process
  const allBuilds = await db.query.builds.findMany({
    where: eq(builds.versionTag, versionTag),
  });

  const relevantBuilds = allBuilds.filter((build) =>
    build.commitSha.startsWith(shortSha)
  );

  logger.info(
    { tag, buildCount: relevantBuilds.length },
    `Release event received, checking builds for assets`
  );

  // Update builds with matching release assets
  let assetsMatched = 0;
  for (const build of relevantBuilds) {
    // Skip builds that already have download URLs (already processed)
    if (build.downloadUrl) {
      logger.info({ buildId: build.id }, `Build already has download URL, skipping`);
      continue;
    }

    try {
      const buildParams = buildSchema.parse({
        ...build,
        staticOpenssl: build.staticOpenssl ?? false,
        compatibilityMode: build.compatibilityMode ?? false,
        opensslVersion: build.opensslVersion ?? "3",
        glibcVersion: build.glibcVersion ?? "2.39",
      });

      const matchingAsset = release.assets.find((asset) =>
        isReleaseAssetMatchFormValues(asset.name, buildParams)
      );

      if (matchingAsset) {
        await db
          .update(builds)
          .set({
            status: "completed",
            downloadUrl: matchingAsset.browser_download_url,
          })
          .where(eq(builds.id, build.id));

        assetsMatched++;
        logger.info(
          { assetName: matchingAsset.name, buildId: build.id },
          `Matched asset for build`
        );
      } else {
        logger.info(
          {
            buildId: build.id,
            os: buildParams.os,
            arch: buildParams.arch,
          },
          `No matching asset found for build`
        );
      }
    } catch (error) {
      logger.error({ error, buildId: build.id }, `Error processing build`);
    }
  }

  return NextResponse.json({
    message: `Release assets processed: ${assetsMatched} builds updated`,
  });
}
