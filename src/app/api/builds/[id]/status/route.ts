import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BuildRecordType } from "@/shared/types";
import { getCachedWorkflowRun } from "@/services/githubService";

type BuildStatus = BuildRecordType["status"];

const DEFAULT_TIME_OUT = {
  windows: 30 * 60 * 1000,
  linux: 20 * 60 * 1000,
  macos: 15 * 60 * 1000,
};

function shouldCheckGitHubAPI(build: BuildRecordType): boolean {
  const now = new Date();
  const buildCreatedAt = build.createdAt;

  if (
    build.status === "completed" ||
    build.status === "failed" ||
    build.status === "cancelled"
  ) {
    return false;
  }
  return now.getTime() - buildCreatedAt.getTime() > DEFAULT_TIME_OUT[build.os];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: buildIdString } = await params;

  if (!buildIdString) {
    return NextResponse.json({ error: "Invalid build ID" }, { status: 400 });
  }

  const buildId = parseInt(buildIdString, 10);
  if (Number.isNaN(buildId)) {
    return NextResponse.json({ error: "Invalid build ID" }, { status: 400 });
  }

  const build = await db.query.builds.findFirst({
    where: eq(builds.id, buildId),
  });

  if (!build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  if (!shouldCheckGitHubAPI(build)) {
    return NextResponse.json(build);
  }

  console.log(`Build ${build.id}: Checking GitHub API for status update`);

  const now = new Date();
  const buildCreatedAt = build.createdAt;
  const isTimeout =
    now.getTime() - buildCreatedAt.getTime() > DEFAULT_TIME_OUT[build.os];

  if (!build.githubActionRunId && isTimeout) {
    const [updatedBuild] = await db
      .update(builds)
      .set({
        status: "failed",
        updatedAt: now,
      })
      .where(eq(builds.id, build.id))
      .returning();

    console.log(
      `Build ${build.id}: Marked as failed due to timeout (no GitHub Action Run ID)`
    );
    return NextResponse.json(updatedBuild);
  }

  if (build.githubActionRunId) {
    const workflowResult = await getCachedWorkflowRun(build.githubActionRunId);

    if (!workflowResult.success) {
      if (isTimeout) {
        // if timeout and API error mark the build to fail
        const [updatedBuild] = await db
          .update(builds)
          .set({
            status: "failed",
            updatedAt: now,
          })
          .where(eq(builds.id, build.id))
          .returning();

        console.log(
          `Build ${build.id}: Marked as failed due to timeout and API error`
        );
        return NextResponse.json(updatedBuild);
      } else {
        console.log(
          `Build ${build.id}: GitHub API error but not timeout, keeping current status`
        );
        return NextResponse.json(build);
      }
    }

    // update build status
    let newStatus: BuildStatus = build.status as BuildStatus;
    const { status: ghStatus, conclusion: ghConclusion } = workflowResult;

    if (ghStatus === "completed") {
      if (ghConclusion === "success") {
        newStatus = "completed";
      } else if (ghConclusion === "failure" || ghConclusion === "cancelled") {
        newStatus = "failed";
      }
    } else if (ghStatus === "in_progress") {
      newStatus = "in_progress";
    } else if (ghStatus === "queued") {
      newStatus = "pending";
    }

    if (newStatus !== build.status) {
      const [updatedBuild] = await db
        .update(builds)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(builds.id, build.id))
        .returning();

      console.log(
        `Build ${build.id}: Status updated from ${build.status} to ${newStatus} based on GitHub API`
      );
      return NextResponse.json(updatedBuild);
    }
  }

  return NextResponse.json(build);
}
