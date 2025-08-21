import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json(build);
}
