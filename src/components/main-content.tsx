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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BuildForm from "./build-form";
import ReleaseList from "./release-list";
import NoReleaseFound from "./no-release-found";

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
  const [showBuildForm, setShowBuildForm] = useState(!initialRelease);

  const builderTag =
    selectedTag && selectedSha
      ? `${selectedTag}-${selectedSha.substring(0, 7)}`
      : "";

  const {
    data: release,
    isLoading,
    error,
  } = useQuery<Release | null, Error>({
    queryKey: ["release", builderTag],
    queryFn: () => fetchReleaseByTag(builderTag),
    initialData:
      builderTag ===
      `${
        initialBuildValues.versionTag
      }-${initialBuildValues.commitSha.substring(0, 7)}`
        ? initialRelease
        : undefined,
    enabled: !!builderTag,
  });

  const handleVersionChange = (value: string) => {
    const selected = tags.find((t) => t.name === value);
    if (selected) {
      setSelectedTag(selected.name);
      setSelectedSha(selected.commit.sha);
      setShowBuildForm(false); // Reset form visibility on version change
    }
  };

  if (!tags || tags.length === 0) {
    return (
      <div className="mt-8 text-center text-muted-foreground">
        <p>{dictionary.page.assetTable.noTagsFound}</p>
      </div>
    );
  }
  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className="mt-8 h-64 w-full" />;
    }
    if (error) {
      return <p className="mt-8 text-center text-red-500">{error.message}</p>;
    }
    if (release) {
      return (
        <>
          <ReleaseList release={release} dictionary={dictionary} />
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowBuildForm(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {dictionary.page.form.customBuildPrompt}
            </button>
          </div>
        </>
      );
    }

    // If release is not found, show the prompt
    if (!release && !isLoading) {
      return (
        <NoReleaseFound
          dictionary={dictionary}
          onBuildClick={() => setShowBuildForm(true)}
        />
      );
    }

    return null; // Should not be reached
  };

  return (
    <div className="w-full max-w-4xl mt-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {dictionary.page.form.selectVersionTitle}
        </h2>
        <p className="text-muted-foreground">
          {dictionary.page.form.selectVersionDescription}
        </p>
      </div>
      <div className="mt-4">
        <label htmlFor="version-select" className="sr-only">
          {dictionary.page.form.versionTag}
        </label>
        <Select value={selectedTag} onValueChange={handleVersionChange}>
          <SelectTrigger id="version-select" className="w-full md:w-1/3">
            <SelectValue
              placeholder={dictionary.page.form.versionTagPlaceholder}
            />
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

      <div className="mt-8">{renderContent()}</div>

      {showBuildForm && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.page.form.title}</CardTitle>
              <CardDescription>
                {dictionary.page.form.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BuildForm
                dictionary={dictionary}
                tags={tags}
                initValues={{
                  ...initialBuildValues,
                  versionTag: selectedTag,
                  commitSha: selectedSha,
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
