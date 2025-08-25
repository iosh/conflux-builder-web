"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DictionaryType } from "@/get-dictionary";
import type { BuildFormValuesType } from "@/shared/form";
import { useFormContext } from "./context";
import { useStore } from "@tanstack/react-form";
import { GitHubTag } from "@/shared/githubTypes";


interface BuildFormFieldsProps {
  dictionary: DictionaryType;
  tags: GitHubTag[];
}

export const BuildFormFields = ({ dictionary, tags }: BuildFormFieldsProps) => {
  const { form, archOptions } = useFormContext();
  const osValue = useStore(form.store, (state) => state.values.os);

  return (
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
        <>
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
        </>
      )}

      <div className="md:col-span-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {osValue !== "macos" && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
