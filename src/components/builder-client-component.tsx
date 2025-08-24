"use client";

import { useState, useMemo } from "react";
import { BuildFormValuesType } from "@/shared/form";
import { getDictionary } from "@/get-dictionary";
import { Locale } from "@/i18n-config";
import { GitHubTag } from "@/lib/tags";
import BuildForm from "./build-form";
import ReleaseList from "./release-list";
import NoReleaseFound from "./no-release-found";
import { Skeleton } from "@/components/ui/skeleton";
import { GithubRelease } from "@/shared/actionsTypes";
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

  const { data: release, isFetching } = useQuery<GithubRelease>({
    initialData: initialRelease ?? undefined,
    queryKey: ["release", builderTag],
    queryFn: () => fetchReleaseByTag(builderTag!),
    enabled: !!builderTag,
    retry: false,
  });

  const renderContent = () => {
    if (isFetching) {
      return <Skeleton className="mt-8 h-64 w-full" />;
    }
    if (release) {
      return (
        <ReleaseList
          release={release}
          buildValues={buildValues}
          dictionary={dictionary}
        />
      );
    }
    return <NoReleaseFound dictionary={dictionary} />;
  };

  return (
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
  );
}
