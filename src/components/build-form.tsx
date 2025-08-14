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
import { fetchBuildStatus, postBuildRequest } from "@/lib/api";

type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;
type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface BuildFormProps {
  initValues: BuildFormValues;
  dictionary: Dictionary;
  tags: Tags;
  onValuesChange?: (values: BuildFormValues) => void;
}

export default function BuildForm({
  initValues,
  dictionary,
  tags,
  onValuesChange,
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
    queryFn: () => fetchBuildStatus(buildId!),
    enabled: pollingEnabled && !!buildId,
    refetchInterval: 30000, // Poll every 30 seconds
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

  const formValues = useStore(form.store, (state) => state.values);

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(formValues);
    }
  }, [formValues, onValuesChange]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mt-8 w-full space-y-6 rounded-lg bg-white/80 p-8 backdrop-blur-sm dark:bg-black/80"
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-6">
        <div className="md:col-span-2">
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
                  onValueChange={(value) => {
                    const selectedTag = tags.find((t) => t.name === value);
                    if (selectedTag) {
                      form.setFieldValue("commitSha", selectedTag.commit.sha);
                    }
                    field.handleChange(value);
                  }}
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
        </div>

        <div className="md:col-span-2">
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
                  onValueChange={(value: BuildFormValues["os"]) =>
                    field.handleChange(value)
                  }
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
        </div>

        <div className="md:col-span-2">
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
                  onValueChange={(value: BuildFormValues["arch"]) =>
                    field.handleChange(value)
                  }
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

        <div className="md:col-span-3">
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
                  onValueChange={(value: BuildFormValues["opensslVersion"]) =>
                    field.handleChange(value)
                  }
                >
                  <SelectTrigger id="opensslVersion" className="mt-1">
                    <SelectValue
                      placeholder={
                        dictionary.page.form.opensslVersionPlaceholder
                      }
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
        </div>

        {osValue === "linux" && (
          <div className="md:col-span-3">
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
                    onValueChange={(
                      value: NonNullable<BuildFormValues["glibcVersion"]>
                    ) => field.handleChange(value)}
                  >
                    <SelectTrigger id="glibcVersion" className="mt-1">
                      <SelectValue
                        placeholder={
                          dictionary.page.form.glibcVersionPlaceholder
                        }
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
          </div>
        )}

        <div className="md:col-span-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
        </div>
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
          </div>
        )}
      />
    </form>
  );
}
