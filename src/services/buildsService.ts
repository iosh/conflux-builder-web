import { db } from "@/db";
import { builds } from "@/db/schema";
import { getBuildQueryConditions } from "@/lib/db";
import {
  BuildTableInsertType,
  BuildRecordTYpe,
  workflowInputsType,
} from "@/shared/types";
import { and, eq } from "drizzle-orm";

export async function findBuild(data: workflowInputsType) {
  const buildQueryConditions = getBuildQueryConditions(data);
  return await db.query.builds.findFirst({
    where: and(...buildQueryConditions),
  });
}

export async function createCompletedBuild(
  data: BuildTableInsertType,
  downloadUrl: string
) {
  const [newBuild] = await db
    .insert(builds)
    .values({
      ...data,
      status: "completed",
      downloadUrl: downloadUrl,
    })
    .returning();
  return newBuild;
}

export async function createPendingBuild(data: BuildTableInsertType) {
  const [newBuild] = await db
    .insert(builds)
    .values({ ...data, status: "pending" })
    .returning();
  return newBuild;
}

export async function updateBuildForRetry(buildId: number, runId: string) {
  await db
    .update(builds)
    .set({
      status: "pending",
      runId: runId,
      githubActionRunId: null,
      downloadUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(builds.id, buildId));
}

export async function updateBuildRunId(buildId: number, runId: string) {
  await db
    .update(builds)
    .set({
      runId: runId,
      updatedAt: new Date(),
    })
    .where(eq(builds.id, buildId));
}

export async function updateBuildStatus(
  buildId: number,
  status: "failed" | "completed"
) {
  await db.update(builds).set({ status }).where(eq(builds.id, buildId));
}
