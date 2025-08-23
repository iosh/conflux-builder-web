import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BUILDER } from "@/shared/repo";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import { buildSchema } from "@/shared/form";
import { Webhooks } from "@octokit/webhooks";

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
      console.error("Missing webhook secret or signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const isValid = await getWebhooks().verify(payload, signature);
    if (!isValid) {
      console.error("Invalid webhook signature");
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
    console.error("Webhook error:", error);
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

  console.log(
    `Workflow run ${action}: ${displayTitle} (GitHub ID: ${githubRunId})`
  );

  // Extract the app runId from display title
  // The display title format should be: "Build v1.2.3 - macOS (aarch64) - abc12"
  // where "abc12" is our generated runId
  const runIdMatch = displayTitle.match(/ - ([a-zA-Z0-9]{5})$/);
  let build = null;

  if (runIdMatch) {
    const appRunId = runIdMatch[1];
    console.log(`Extracted app runId from display title: ${appRunId}`);

    build = await db.query.builds.findFirst({
      where: eq(builds.runId, appRunId),
    });

    // Update the build with the GitHub workflow run ID if found
    if (build && !build.githubActionRunId) {
      console.log(
        `Linking build ${build.id} with GitHub workflow run ${githubRunId}`
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
    console.log(`Could not extract runId from display title: ${displayTitle}`);
    build = await db.query.builds.findFirst({
      where: eq(builds.githubActionRunId, githubRunId),
    });
  }

  if (!build) {
    console.log(
      `No matching build found for workflow run ${githubRunId}: ${displayTitle}`
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

    console.log(`Build ${build.id} marked as in_progress`);
    return NextResponse.json({
      message: "Build status updated to in_progress",
    });
  }

  if (action === "completed") {
    if (workflow_run.conclusion === "success") {
      console.log(
        `Workflow ${githubRunId} completed successfully, checking for release assets`
      );

      await db
        .update(builds)
        .set({ status: "build_success" })
        .where(eq(builds.id, build.id));

      console.log(
        `Build ${build.id} marked as successful (conclusion: ${workflow_run.conclusion})`
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

      console.log(
        `Build ${build.id} marked as failed (conclusion: ${workflow_run.conclusion})`
      );
    } else {
      console.log(
        `Workflow ${githubRunId} completed with conclusion: ${workflow_run.conclusion}`
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

  console.log(
    `Release ${tag} published, checking ${relevantBuilds.length} builds for assets`
  );

  // Update builds with matching release assets
  let assetsMatched = 0;
  for (const build of relevantBuilds) {
    // Skip builds that already have download URLs (already processed)
    if (build.downloadUrl) {
      console.log(`Build ${build.id} already has download URL, skipping`);
      continue;
    }

    try {
      const buildParams = buildSchema.parse({
        ...build,
        staticOpenssl: build.staticOpenssl ?? false,
        compatibilityMode: build.compatibilityMode ?? false,
        opensslVersion: build.opensslVersion ?? "3",
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
        console.log(
          `Matched asset ${matchingAsset.name} for build ${build.id}`
        );
      } else {
        console.log(
          `No matching asset found for build ${build.id} (${buildParams.os}-${buildParams.arch})`
        );
      }
    } catch (error) {
      console.error(`Error processing build ${build.id}:`, error);
    }
  }

  return NextResponse.json({
    message: `Release assets processed: ${assetsMatched} builds updated`,
  });
}
