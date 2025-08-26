"use client";

import { useState } from "react";
import { BuildFormValuesType } from "@/shared/form";
import { getDictionary } from "@/get-dictionary";
import BuildForm from "./build-form";
import { useBuildForm } from "@/hooks/useBuildForm";
import { FormContext } from "./build-form/context";
import ReleaseList from "./release-list";
import NoReleaseFound from "./no-release-found";
import { Skeleton } from "@/components/ui/skeleton";
import { GithubRelease, GitHubTag } from "@/shared/githubTypes";
import { useQuery } from "@tanstack/react-query";
import { fetchReleaseByTag } from "@/lib/api";

interface BuilderClientComponentProps {
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  tags: GitHubTag[];
  initialBuildValues: BuildFormValuesType;
  initialRelease: GithubRelease | null;
}

export default function BuilderClientComponent({
  dictionary,
  tags,
  initialBuildValues,
  initialRelease,
}: BuilderClientComponentProps) {
  const [buildValues, setBuildValues] =
    useState<BuildFormValuesType>(initialBuildValues);
  const builderTag = buildValues.versionTag;

  const { data: release, isPending } = useQuery({
    queryKey: ["release", builderTag],
    queryFn: ({ queryKey }) => fetchReleaseByTag(queryKey[1] as string),
    enabled: !!builderTag,
    initialData:
      builderTag === initialRelease?.tag_name ? initialRelease : undefined,
    staleTime: 0,
    retry: false,
  });

  const formState = useBuildForm({
    initValues: buildValues,
    dictionary,
    onValuesChange: setBuildValues,
    releaseList: release,
  });

  const renderContent = () => {
    if (isPending) {
      return <Skeleton className="mt-8 h-64 w-full" />;
    }
    if (release) {
      return (
        <ReleaseList
          isBuilding={formState.isBuilding}
          release={release}
          buildValues={buildValues}
          dictionary={dictionary}
        />
      );
    }
    return <NoReleaseFound dictionary={dictionary} />;
  };

  return (
    <FormContext.Provider value={formState}>
      <div className="w-full max-w-4xl">
        <BuildForm
          dictionary={dictionary}
          tags={tags}
          initValues={buildValues}
          onValuesChange={setBuildValues}
          releaseList={release}
        />
        <div className="mt-8">{renderContent()}</div>
      </div>
    </FormContext.Provider>
  );
}
