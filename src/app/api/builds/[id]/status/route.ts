import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { BUILDER } from "@/shared/repo";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const buildId = parseInt(params.id, 10);

  if (isNaN(buildId)) {
    return NextResponse.json({ error: "Invalid build ID" }, { status: 400 });
  }

  try {
    // 1. Find the build in our database
    const build = await db.query.builds.findFirst({
      where: eq(builds.id, buildId),
    });

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // 2. Get the workflow runs for the repository
    const { data: workflowRuns } =
      await octokit.actions.listWorkflowRunsForRepo({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        event: "workflow_dispatch",
      });

    const relevantRun = workflowRuns.workflow_runs.find(
      (run) => run.head_sha === build.commitSha
      // More checks might be needed here
    );

    if (!relevantRun) {
      return NextResponse.json(
        { status: "pending", message: "Workflow run not found yet." },
        { status: 202 }
      );
    }

    // 4. Return the status
    return NextResponse.json({
      status: relevantRun.status,
      conclusion: relevantRun.conclusion,
      url: relevantRun.html_url,
    });
  } catch (error) {
    console.error("Failed to get build status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
