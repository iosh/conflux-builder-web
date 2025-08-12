"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { getDictionary } from "@/get-dictionary";
import type { getAndCacheTags } from "@/lib/tags";
import type { Release } from "@/lib/releases";
import type { BuildFormValues } from "@/shared/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BuildForm from "./build-form";
import ReleaseList from "./release-list";

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;

interface MainContentProps {
  dictionary: Dictionary;
  tags: Tags;
  initialRelease: Release | null;
  initialBuildValues: BuildFormValues;
}

async function fetchReleaseByTag(tag: string): Promise<Release | null> {
  if (!tag) return null;
  const response = await fetch(`/api/releases/${tag}`);
  if (response.status === 404) {
    return null; // Explicitly return null for "Not Found"
  }
  if (!response.ok) {
    throw new Error("Failed to fetch release data");
  }
  return response.json();
}

export default function MainContent({
  dictionary,
  tags,
  initialRelease,
  initialBuildValues,
}: MainContentProps) {
  const [selectedTag, setSelectedTag] = useState(initialBuildValues.versionTag);
  const [selectedSha, setSelectedSha] = useState(initialBuildValues.commitSha);

  const builderTag = selectedTag && selectedSha ? `${selectedTag}-${selectedSha.substring(0, 7)}` : "";

  const {
    data: release,
    isLoading,
    error,
  } = useQuery<Release | null, Error>({
    queryKey: ["release", builderTag],
    queryFn: () => fetchReleaseByTag(builderTag),
    initialData: builderTag === `${initialBuildValues.versionTag}-${initialBuildValues.commitSha.substring(0, 7)}` ? initialRelease : undefined,
    enabled: !!builderTag,
  });

  const handleVersionChange = (value: string) => {
    const selected = tags.find((t) => t.name === value);
    if (selected) {
      setSelectedTag(selected.name);
      setSelectedSha(selected.commit.sha);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className="mt-8 h-64 w-full" />;
    }
    if (error) {
      return <p className="mt-8 text-center text-red-500">{error.message}</p>;
    }
    if (release) {
      return <ReleaseList release={release} dictionary={dictionary} />;
    }
    
    // If release is null (not found) or there was no tag, show the build form
    const formInitValues = { ...initialBuildValues, versionTag: selectedTag, commitSha: selectedSha };
    return <BuildForm dictionary={dictionary} tags={tags} initValues={formInitValues} />;
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <label
            htmlFor="version-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {dictionary.page.form.versionTag}
          </label>
          <Select value={selectedTag} onValueChange={handleVersionChange}>
            <SelectTrigger id="version-select" className="mt-1">
              <SelectValue placeholder={dictionary.page.form.versionTagPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tag) => (
                <SelectItem key={tag.node_id} value={tag.name}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}