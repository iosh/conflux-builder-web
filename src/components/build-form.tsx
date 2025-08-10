"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import type { getAndCacheTags } from "@/lib/tags";
import type { getDictionary } from "@/get-dictionary";
import { useForm, useStore } from "@tanstack/react-form";
import { buildForm, BuildFormValues, buildSchema } from "@/shared/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { BuildApiResponse, BuildStatusApiResponse } from "@/shared/api";

type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;
type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface BuildFormProps {
  initValues: BuildFormValues;
  dictionary: Dictionary;
  tags: Tags;
}

async function postBuildRequest(
  values: BuildFormValues
): Promise<BuildApiResponse> {
  const response = await fetch("/api/builds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to submit build request");
  }

  return response.json();
}

export default function BuildForm({
  initValues,
  dictionary,
  tags,
}: BuildFormProps) {
  const [buildId, setBuildId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const mutation = useMutation<BuildApiResponse, Error, BuildFormValues>({
    mutationFn: postBuildRequest,
    onSuccess: (data) => {
      if (data.buildId) {
        setBuildId(data.buildId);
        setPollingEnabled(true);
      }
    },
  });

  const {
    data: statusData,
    error: statusError,
    isFetching: isStatusFetching,
  } = useQuery<BuildStatusApiResponse | null, Error>({
    queryKey: ["buildStatus", buildId],
    queryFn: async () => {
      if (!buildId) return null;
      const response = await fetch(`/api/builds/${buildId}/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch build status");
      }
      return response.json();
    },
    enabled: pollingEnabled && !!buildId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  useEffect(() => {
    if (statusData?.conclusion) {
      setPollingEnabled(false); // Stop polling when build is complete
    }
  }, [statusData]);

  const form = useForm({
    ...buildForm,
    defaultValues: initValues,
    validators: {
      onSubmit: buildSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(value);
    },
  });

  const osValue = useStore(form.store, (state) => state.values.os);

  const getBuildStatusMessage = () => {
    const statusDict = dictionary.page.form.status;
    if (!pollingEnabled && !statusData) return null;

    if (isStatusFetching && !statusData) {
      return <p className="mt-4 text-blue-600">{statusDict.checking}</p>;
    }

    if (statusError) {
      return (
        <p className="mt-4 text-red-600">
          {statusDict.error}: {statusError.message}
        </p>
      );
    }

    if (statusData) {
      switch (statusData.conclusion) {
        case "success":
          return <p className="mt-4 text-green-600">{statusDict.success}</p>;
        case "failure":
          return (
            <p className="mt-4 text-red-600">
              {statusDict.failed}:{" "}
              <a
                href={statusData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {statusDict.workflowRun}
              </a>
            </p>
          );
        default:
          // Handle in-progress statuses
          if (statusData.status === "in_progress") {
            return (
              <p className="mt-4 text-blue-600">{statusDict.inProgress}</p>
            );
          }
          if (statusData.status === "queued") {
            return <p className="mt-4 text-blue-600">{statusDict.queued}</p>;
          }
          return (
            <p className="mt-4 text-blue-600">
              {statusData.message || statusDict.pending}
            </p>
          );
      }
    }

    return null;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mt-8 w-full space-y-6 rounded-lg bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-black/80"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <form.Field
          name="versionTag"
          children={(field) => (
            <div>
              <label
                htmlFor="version-tag"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.versionTag}
              </label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id="version-tag" className="mt-1">
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
          )}
        />

        <form.Field
          name="os"
          children={(field) => (
            <div>
              <label
                htmlFor="os"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.os}
              </label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id="os" className="mt-1">
                  <SelectValue
                    placeholder={dictionary.page.form.osPlaceholder}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linux">
                    {dictionary.page.form.linux}
                  </SelectItem>
                  <SelectItem value="windows">
                    {dictionary.page.form.windows}
                  </SelectItem>
                  <SelectItem value="macos">
                    {dictionary.page.form.macos}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <form.Field
          name="arch"
          children={(field) => (
            <div>
              <label
                htmlFor="arch"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.arch}
              </label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id="arch" className="mt-1">
                  <SelectValue
                    placeholder={dictionary.page.form.archPlaceholder}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x86_64">
                    {dictionary.page.form.x86_64}
                  </SelectItem>
                  <SelectItem value="aarch64">
                    {dictionary.page.form.aarch64}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>

      {osValue === "linux" && (
        <form.Field
          name="glibcVersion"
          children={(field) => (
            <div>
              <label
                htmlFor="glibcVersion"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.glibcVersion}
              </label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger id="glibcVersion" className="mt-1">
                  <SelectValue
                    placeholder={dictionary.page.form.glibcVersionPlaceholder}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2.27">
                    {dictionary.page.form.glibcVersion227}
                  </SelectItem>
                  <SelectItem value="2.31">
                    {dictionary.page.form.glibcVersion231}
                  </SelectItem>
                  <SelectItem value="2.35">
                    {dictionary.page.form.glibcVersion235}
                  </SelectItem>
                  <SelectItem value="2.39">
                    {dictionary.page.form.glibcVersion239}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        />
      )}

      <form.Field
        name="opensslVersion"
        children={(field) => (
          <div>
            <label
              htmlFor="opensslVersion"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {dictionary.page.form.opensslVersion}
            </label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            >
              <SelectTrigger id="opensslVersion" className="mt-1">
                <SelectValue
                  placeholder={dictionary.page.form.opensslVersionPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  {dictionary.page.form.opensslVersion1}
                </SelectItem>
                <SelectItem value="3">
                  {dictionary.page.form.opensslVersion3}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className="space-y-4">
        <form.Field
          name="staticOpenssl"
          children={(field) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="static-openssl"
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(Boolean(checked))
                }
              />
              <label
                htmlFor="static-openssl"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {dictionary.page.form.staticOpenssl}
              </label>
            </div>
          )}
        />
        <form.Field
          name="compatibilityMode"
          children={(field) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compatibility-mode"
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(Boolean(checked))
                }
              />
              <label
                htmlFor="compatibility-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {dictionary.page.form.compatibilityMode}
              </label>
            </div>
          )}
        />
      </div>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex flex-col items-end">
            <ShimmerButton
              className="shadow-2xl"
              type="submit"
              disabled={!canSubmit || mutation.isPending}
            >
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                {mutation.isPending ? "..." : dictionary.page.form.buildButton}
              </span>
            </ShimmerButton>
            {mutation.isSuccess &&
              !pollingEnabled &&
              mutation.data?.downloadUrl && (
                <div className="mt-4 text-green-600">
                  <p>{mutation.data.message}</p>
                  <a
                    href={mutation.data.downloadUrl}
                    className="text-blue-500 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {dictionary.page.form.downloadNow}
                  </a>
                </div>
              )}
            {mutation.isError && (
              <p className="mt-4 text-red-600">{mutation.error.message}</p>
            )}
            {getBuildStatusMessage()}
          </div>
        )}
      />
    </form>
  );
}
