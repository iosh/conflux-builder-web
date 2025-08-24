import { getReleaseByTag } from "@/services/githubService";
import { NextResponse } from "next/server";

interface Params {
  tag: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  const { tag } = await context.params;

  if (!tag) {
    return NextResponse.json(
      { error: "Tag parameter is missing" },
      { status: 400 }
    );
  }

  try {
    const release = await getReleaseByTag(tag);

    if (!release) {
      return NextResponse.json(
        { message: "Release not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error(`API error for tag "${tag}":`, error);
    return NextResponse.json(
      { error: "Failed to fetch release data" },
      { status: 500 }
    );
  }
}
