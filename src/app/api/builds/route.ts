import { NextResponse } from "next/server";
import { buildSchema } from "@/shared/form";
import { Octokit } from "@octokit/rest";
import z from "zod";
import { BUILDER } from "@/shared/repo";
import { db } from "@/db";
import { builds } from "@/db/schema";

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

    const data = validation.data;

    const shortSha = data.commitSha.substring(0, 7);

    const fullTag = `${data.versionTag}-${shortSha}`;

    try {
      const release = await octokit.repos.getReleaseByTag({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        tag: fullTag,
      });

      const assets = release.data.assets;

      const existingAsset = assets.find((asset) => {
        // check os

        if (!asset.name.includes(data.os)) {
          return false;
        }

        // check arch
        if (!asset.name.includes(data.arch)) {
          return false;
        }

        // check openssl

        if (!asset.name.includes(`openssl-${data.opensslVersion}`)) {
          return false;
        }

        // check glibc

        if (
          data.os === "linux" &&
          !asset.name.includes(`glibc${data.glibcVersion}`)
        ) {
          return false;
        }

        // check compatibility mode
        if (data.compatibilityMode && !asset.name.includes("portable")) {
          return false;
        }

        return true;
      });

      if (existingAsset) {
        return NextResponse.json({
          message: "Build found!",
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
      // A 404 error is expected if the release/tag doesn't exist, continue to next step.
    }

    // If we reach here, it means no existing release/asset was found.
    // We need to trigger a new build.
    try {
      await octokit.actions.createWorkflowDispatch({
        owner: BUILDER.owner,
        repo: BUILDER.repo,
        workflow_id: "main.yml",
        ref: "main",
        inputs: {
          version_tag: data.versionTag,
          commit_sha: data.commitSha,
          os: data.os,
          arch: data.arch,
          static_openssl: data.staticOpenssl.toString(),
          openssl_version: data.opensslVersion,
          compatibility_mode: data.compatibilityMode.toString(),
        },
      });

      // Record the build request in the database
      const newBuilds = await db
        .insert(builds)
        .values({
          ...data,
          status: "pending",
          createdAt: new Date(),
        })
        .returning({ id: builds.id });

      const newBuild = newBuilds[0];

      return NextResponse.json({
        message:
          "No existing build found. A new build has been successfully triggered.",
        buildId: newBuild.id,
      });
    } catch (error) {
      console.error("Failed to trigger workflow or record build:", error);
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
