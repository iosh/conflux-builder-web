"use client";

import { useState, useActionState } from "react";
import { initialFormState, mergeForm } from "@tanstack/react-form/nextjs";
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
import buildConfluxAction from "@/lib/actions/build";
import { useForm, useStore, useTransform } from "@tanstack/react-form";
import { buildForm, BuildFormValues } from "@/shared/form";

type Tags = Awaited<ReturnType<typeof getAndCacheTags>>;
type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface BuildFormProps {
  initValues: BuildFormValues;
  dictionary: Dictionary;
  tags: Tags;
}

export default function BuildForm({
  initValues,
  dictionary,
  tags,
}: BuildFormProps) {
  const [state, action] = useActionState(buildConfluxAction, initialFormState);
  const form = useForm({
    ...buildForm,
    defaultValues: initValues,
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);

  return (
    <form
      action={action as never}
      onSubmit={() => form.handleSubmit()}
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
                onValueChange={field.handleChange}
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
                onValueChange={field.handleChange}
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

      <form.Field
        name="staticOpenssl"
        children={(field) => (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="static-openssl"
                checked={field.state.value}
                onCheckedChange={() => field.handleChange(!field.state.value)}
              />
              <label
                htmlFor="static-openssl"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {dictionary.page.form.staticOpenssl}
              </label>
            </div>
            <form.Field
              name="compatibilityMode"
              children={(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compatibility-mode"
                    checked={field.state.value}
                    onCheckedChange={() =>
                      field.handleChange(!field.state.value)
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
        )}
      />
      <form.Subscribe
        selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <div className="flex flex-col items-end">
            <ShimmerButton
              className="shadow-2xl"
              type="submit"
              disabled={!canSubmit}
            >
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                {isSubmitting ? "..." : dictionary.page.form.buildButton}
              </span>
            </ShimmerButton>
          </div>
        )}
      />
    </form>
  );
}
