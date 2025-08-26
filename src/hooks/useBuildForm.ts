"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildForm, BuildFormValuesType, buildSchema } from "@/shared/form";
import type { BuildApiResponse, BuildStatusApiResponse } from "@/shared/api";
import { fetchBuildStatus, postBuildRequest } from "@/lib/api";
import { GithubRelease } from "@/shared/githubTypes";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";
import type { DictionaryType } from "@/get-dictionary";

interface UseBuildFormProps {
  initValues: BuildFormValuesType;
  dictionary: DictionaryType;
  onValuesChange?: (values: BuildFormValuesType) => void;
  releaseList?: GithubRelease;
}

export function useBuildForm({
  initValues,
  dictionary,
  onValuesChange,
  releaseList,
}: UseBuildFormProps) {
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
    onError: (error) => {
      toast.error(dictionary.page.form.errors.buildTriggerFailed, {
        description: error.message,
      });
    },
  });

  const queryClient = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ["buildStatus", buildId],
    queryFn: () => fetchBuildStatus(buildId!),
    enabled:
      !!buildId &&
      currentBuildStatus?.status !== "completed" &&
      currentBuildStatus?.status !== "failed",
    refetchInterval: 10000, // Poll every 10 seconds
    retry: (failureCount) => failureCount < 3,
  });

  const form = useForm({
    ...buildForm,
    defaultValues: initValues,
    validators: {
      onSubmit: buildSchema,
    },
    onSubmit: ({ value }) => {
      if (isSubmitting) {
        console.log("Submission already in progress, ignoring");
        return;
      }
      setBuildId(null);
      setCurrentBuildStatus(null);
      mutate(value);
    },
  });

  const formValues = useStore(form.store, (state) => state.values);

  useEffect(() => {
    if (statusData) {
      setCurrentBuildStatus(statusData);
    }
  }, [statusData]);

  useEffect(() => {
    if (currentBuildStatus?.status === "completed") {
      queryClient.invalidateQueries({
        queryKey: ["release", formValues.versionTag],
      });
    }
  }, [currentBuildStatus?.status, queryClient, formValues.versionTag]);

  const osValue = formValues.os;

  const isReleaseIsExist = useMemo(() => {
    if (!releaseList) return false;
    return releaseList.assets.some((asset) =>
      isReleaseAssetMatchFormValues(asset.name, formValues)
    );
  }, [releaseList, formValues]);

  useEffect(() => {
    onValuesChange?.(formValues);
  }, [formValues, onValuesChange]);

  useEffect(() => {
    setCurrentBuildStatus(null);
    setBuildId(null);
  }, []);

  const buttonState = useMemo(() => {
    const { buttonStates, buildButton } = dictionary.page.form;

    if (isSubmitting) {
      return { text: buttonStates.triggering, disabled: true };
    }
    if (
      currentBuildStatus?.status === "in_progress" ||
      currentBuildStatus?.status === "pending"
    ) {
      return { text: buttonStates.building, disabled: true };
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
      return { text: buttonStates.retry, disabled: false, isRetry: true };
    }
    return { text: buildButton, disabled: false };
  }, [isSubmitting, currentBuildStatus, dictionary.page.form]);

  const isBuilding =
    isSubmitting ||
    currentBuildStatus?.status === "in_progress" ||
    currentBuildStatus?.status === "pending";

  const archOptions = useMemo((): BuildFormValuesType["arch"][] => {
    if (osValue === "macos") return ["aarch64"];
    if (osValue === "windows") return ["x86_64"];
    return ["x86_64", "aarch64"];
  }, [osValue]);

  useEffect(() => {
    if (osValue === "windows" && formValues.arch === "aarch64") {
      form.setFieldValue("arch", "x86_64");
    }
    if (osValue === "macos" && formValues.arch === "x86_64") {
      form.setFieldValue("arch", "aarch64");
    }
    if (osValue === "macos" || osValue === "windows") {
      form.setFieldValue("opensslVersion", undefined);
      form.setFieldValue("glibcVersion", undefined);
      if (osValue === "macos") {
        form.setFieldValue("compatibilityMode", false);
      }
    }
    if (osValue === "linux") {
      if (!formValues.opensslVersion) form.setFieldValue("opensslVersion", "3");
      if (!formValues.glibcVersion) form.setFieldValue("glibcVersion", "2.39");
    }
  }, [
    osValue,
    formValues.arch,
    form.setFieldValue,
    formValues.opensslVersion,
    formValues.glibcVersion,
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await form.handleSubmit();
  };

  const handleButtonClick = async () => {
    if (buttonState.isLink && buttonState.url) {
      window.open(buttonState.url, "_blank");
    } else if (buttonState.isRetry) {
      setBuildId(null);
      setCurrentBuildStatus(null);
      await form.handleSubmit();
    }
  };

  return {
    form,
    buttonState,
    isReleaseIsExist,
    isBuilding,
    archOptions,
    handleSubmit,
    handleButtonClick,
  };
}
