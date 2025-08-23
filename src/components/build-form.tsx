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
import { buildForm, BuildFormValuesType, buildSchema } from "@/shared/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import type { BuildApiResponse, BuildStatusApiResponse } from "@/shared/api";
import { fetchBuildStatus, postBuildRequest } from "@/lib/api";
import { Release } from "@/shared/actionsTypes";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";

type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;
type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface BuildFormProps {
  initValues: BuildFormValuesType;
  dictionary: Dictionary;
  tags: Tags;
  onValuesChange?: (values: BuildFormValuesType) => void;
  releaseList?: Release;
}

export default function BuildForm({
  initValues,
  dictionary,
  tags,
  onValuesChange,
  releaseList,
}: BuildFormProps) {
  const [buildId, setBuildId] = useState<number | null>(null);
  const [currentBuildStatus, setCurrentBuildStatus] =
    useState<BuildStatusApiResponse | null>(null);

  const { mutate, isPending: isSubmitting } = useMutation<
    BuildApiResponse,
    Error,
    BuildFormValuesType
  >({
    mutationFn: postBuildRequest,
    onSuccess: (data) => {
      setBuildId(data.buildId || null);
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ["buildStatus", buildId],
    queryFn: () => fetchBuildStatus(buildId!),
    enabled:
      !!buildId &&
      currentBuildStatus?.status !== "completed" &&
      currentBuildStatus?.status !== "failed",
    refetchInterval: 10000, // Poll every 10 seconds
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
  });

  useEffect(() => {
    if (statusData) {
      setCurrentBuildStatus(statusData);
    }
  }, [statusData]);

  const form = useForm({
    ...buildForm,
    defaultValues: initValues,
    validators: {
      onSubmit: buildSchema,
    },
    onSubmit: ({ value }) => {
      // Prevent multiple submissions
      if (isSubmitting) {
        console.log("Submission already in progress, ignoring");
        return;
      }

      // Reset state before new submission
      setBuildId(null);
      setCurrentBuildStatus(null);
      mutate(value);
    },
  });

  const osValue = useStore(form.store, (state) => state.values.os);
  const formValues = useStore(form.store, (state) => state.values);

  const isReleaseIsExist = useMemo(() => {
    if (!releaseList) return false;
    return releaseList.assets.some((asset) =>
      isReleaseAssetMatchFormValues(asset.name, formValues)
    );
  }, [releaseList, formValues]);

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(formValues);
    }
  }, [formValues, onValuesChange]);

  useEffect(() => {
    setCurrentBuildStatus(null);
    setBuildId(null);
  }, [formValues]);

  const buttonState = useMemo(() => {
    const { buttonStates, buildButton } = dictionary.page.form;

    if (isSubmitting) {
      return {
        text: buttonStates.triggering,
        disabled: true,
      };
    }
    if (
      currentBuildStatus?.status === "in_progress" ||
      currentBuildStatus?.status === "pending"
    ) {
      return {
        text: buttonStates.building,
        disabled: true,
      };
    }
    if (currentBuildStatus?.status === "completed") {
      return {
        text: buttonStates.download,
        disabled: false,
        isLink: true,
        url: currentBuildStatus.downloadUrl ?? undefined,
      };
    }
    if (currentBuildStatus?.status === "failed") {
      return {
        text: buttonStates.retry,
        disabled: false,
        isRetry: true,
      };
    }
    return { text: buildButton, disabled: false };
  }, [isSubmitting, currentBuildStatus, dictionary.page.form]);

  const archOptions = useMemo((): BuildFormValuesType["arch"][] => {
    if (osValue === "macos") {
      return ["aarch64"];
    }
    if (osValue === "windows") {
      return ["x86_64"];
    }
    return ["x86_64", "aarch64"];
  }, [osValue]);

  useEffect(() => {
    if (osValue === "windows" && formValues.arch === "aarch64") {
      form.setFieldValue("arch", "x86_64");
    }
    if (osValue === "macos" && formValues.arch === "x86_64") {
      form.setFieldValue("arch", "aarch64");
    }
    // Clear OS-specific fields when switching OS
    if (osValue === "macos" || osValue === "windows") {
      form.setFieldValue("opensslVersion", undefined);
      form.setFieldValue("glibcVersion", undefined);
      if (osValue === "macos") {
        form.setFieldValue("compatibilityMode", false);
      }
    }
  }, [osValue, formValues.arch, form.setFieldValue]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="mt-8 w-full space-y-6 rounded-lg bg-white/80 p-8 backdrop-blur-sm dark:bg-black/80"
    >
      {/* Form fields remain the same */}
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
                  onValueChange={field.handleChange}
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
                  onValueChange={(value: BuildFormValuesType["os"]) =>
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
                  onValueChange={(value: BuildFormValuesType["arch"]) => {
                    if (value) {
                      field.handleChange(value);
                    }
                  }}
                >
                  <SelectTrigger id="arch" className="mt-1">
                    <SelectValue
                      placeholder={dictionary.page.form.archPlaceholder}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {archOptions.map((v) => (
                      <SelectItem value={v} key={v}>
                        {dictionary.page.form[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>

        {osValue === "linux" && (
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
                    onValueChange={(value) =>
                      field.handleChange(
                        value as BuildFormValuesType["opensslVersion"]
                      )
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
        )}

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
                      value: NonNullable<BuildFormValuesType["glibcVersion"]>
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
            {osValue !== "macos" && (
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
            )}
          </div>
        </div>
      </div>

      {!isReleaseIsExist && (
        <div className="flex flex-col items-end">
          <ShimmerButton
            className="shadow-2xl"
            type={buttonState.isLink ? "button" : "submit"}
            disabled={buttonState.disabled}
            onClick={() => {
              if (buttonState.isLink && buttonState.url) {
                window.open(buttonState.url, "_blank");
              } else if (buttonState.isRetry) {
                setBuildId(null);
                setCurrentBuildStatus(null);
                form.handleSubmit();
              }
            }}
          >
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
              {buttonState.text}
            </span>
          </ShimmerButton>
        </div>
      )}
    </form>
  );
}
