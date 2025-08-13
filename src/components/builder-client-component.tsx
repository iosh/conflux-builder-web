"use client";

import { useState, useEffect } from "react";
import { BuildFormValues } from "@/shared/form";
import { getDictionary } from "@/get-dictionary";
import { Locale } from "@/i18n-config";
import { GitHubTag } from "@/lib/tags";
import { Release } from "@/lib/releases";
import BuildForm from "./build-form";
import ReleaseList from "./release-list";
import NoReleaseFound from "./no-release-found";
import { Skeleton } from "@/components/ui/skeleton";

interface BuilderClientComponentProps {
  dictionary: Awaited<ReturnType<typeof getDictionary>>;
  tags: GitHubTag[];
  initialBuildValues: BuildFormValues;
  initialRelease: Release | null;
  lang: Locale;
}

export default function BuilderClientComponent({
  dictionary,
  tags,
  initialBuildValues,
  initialRelease,
  lang,
}: BuilderClientComponentProps) {
  const [release, setRelease] = useState<Release | null>(initialRelease);
  const [buildValues, setBuildValues] =
    useState<BuildFormValues>(initialBuildValues);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchRelease = async () => {
      if (!buildValues.versionTag || !buildValues.commitSha) return;
      setIsFetching(true);
      try {
        const builderTag = `${
          buildValues.versionTag
        }-${buildValues.commitSha.substring(0, 7)}`;
        const response = await fetch(`/api/releases/${builderTag}`);
        if (response.ok) {
          const data = await response.json();
          setRelease(data);
        } else {
          setRelease(null);
        }
      } catch (error) {
        console.error("Failed to fetch release:", error);
        setRelease(null);
      } finally {
        setIsFetching(false);
      }
    };

    fetchRelease();
  }, [buildValues.versionTag, buildValues.commitSha]);

  const renderContent = () => {
    if (isFetching) {
      return <Skeleton className="mt-8 h-64 w-full" />;
    }
    if (release) {
      return <ReleaseList release={release} dictionary={dictionary} />;
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
      />
      <div className="mt-8">{renderContent()}</div>
    </div>
  );
}
