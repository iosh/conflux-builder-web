import { builds } from "@/db/schema";
import { BuildFormValuesType, buildSchema } from "@/shared/form";
import { workflowInputsType } from "@/shared/types";
import { eq, isNull } from "drizzle-orm";

export const getBuildQueryConditions = (data: workflowInputsType) => {
  const conditions = [
    eq(builds.commitSha, data.commitSha),
    eq(builds.versionTag, data.versionTag),
    eq(builds.os, data.os),
    eq(builds.arch, data.arch),
    eq(builds.staticOpenssl, data.staticOpenssl || true),
  ];

  if (data.os === "linux") {
    conditions.push(
      data.glibcVersion
        ? eq(builds.glibcVersion, data.glibcVersion)
        : isNull(builds.glibcVersion),
      data.opensslVersion
        ? eq(builds.opensslVersion, data.opensslVersion)
        : isNull(builds.opensslVersion),
      eq(builds.compatibilityMode, data.compatibilityMode || false)
    );
  } else if (data.os === "windows") {
    conditions.push(
      isNull(builds.glibcVersion),
      isNull(builds.opensslVersion),
      eq(builds.compatibilityMode, data.compatibilityMode || false)
    );
  } else if (data.os === "macos") {
    conditions.push(
      isNull(builds.glibcVersion),
      isNull(builds.opensslVersion),
      eq(builds.compatibilityMode, false)
    );
  }

  return conditions;
};
