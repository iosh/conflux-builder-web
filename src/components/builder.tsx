import { headers } from "next/headers";
import { getConfluxRepoTags, getReleaseByTag } from "@/services/githubService";
import { BuildFormValuesType } from "@/shared/form";
import { getOS } from "@/lib/utils";
import BuilderClientComponent from "@/components/builder-client-component";
import { DictionaryType } from "@/get-dictionary";

export default async function Builder({
  dictionary,
}: {
  dictionary: DictionaryType;
}) {
  const tags = await getConfluxRepoTags();
  const userAgent = (await headers()).get("user-agent") || "";
  const latestTag = tags.find((t) => !t.name.includes("testnet"));
  const initialBuilderTag = latestTag ? latestTag.name : "";
  const initialRelease = await getReleaseByTag(initialBuilderTag);

  const initialBuildValues: BuildFormValuesType = {
    os: getOS(userAgent),
    arch: "x86_64",
    versionTag: latestTag?.name || "",
    glibcVersion: "2.39",
    staticOpenssl: true,
    opensslVersion: "3",
    compatibilityMode: false,
  };

  return (
    <BuilderClientComponent
      dictionary={dictionary}
      tags={tags}
      initialBuildValues={initialBuildValues}
      initialRelease={initialRelease}
    />
  );
}
