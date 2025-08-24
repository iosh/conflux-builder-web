"use client";

import type { getAndCacheTags } from "@/lib/tags";
import type { DictionaryType } from "@/get-dictionary";
import { BuildFormValuesType } from "@/shared/form";
import { GithubRelease } from "@/shared/actionsTypes";
import { useBuildForm } from "@/hooks/useBuildForm";
import { FormContext } from "./context";
import BuildButton from "./BuildButton";
import { BuildFormFields } from "./fields";

type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;

interface BuildFormProps {
  initValues: BuildFormValuesType;
  dictionary: DictionaryType;
  tags: Tags;
  onValuesChange?: (values: BuildFormValuesType) => void;
  releaseList?: GithubRelease;
}

export default function BuildForm(props: BuildFormProps) {
  const formState = useBuildForm(props);

  return (
    <FormContext.Provider value={formState}>
      <form
        onSubmit={formState.handleSubmit}
        className="mt-8 w-full space-y-6 rounded-lg bg-white/80 p-8 backdrop-blur-sm dark:bg-black/80"
      >
        <BuildFormFields dictionary={props.dictionary} tags={props.tags} />
        {!formState.isReleaseIsExist && <BuildButton />}
      </form>
    </FormContext.Provider>
  );
}
