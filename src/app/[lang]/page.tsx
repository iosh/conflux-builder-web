import { RetroGrid } from "@/components/magicui/retro-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { cn } from "@/lib/utils";
import { getDictionary } from "../../get-dictionary";
import { Locale } from "../../i18n-config";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="z-10 flex w-full max-w-4xl flex-col items-center justify-center">
        <div
          className={cn(
            "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          )}
        >
          <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
            <span>✨ {dictionary.page.title}</span>
          </AnimatedShinyText>
        </div>

        <p className="mt-6 max-w-2xl text-center text-base text-neutral-600 dark:text-neutral-400">
          {dictionary.page.description}
        </p>

        <div className="mt-8 w-full space-y-6 rounded-lg bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-black/80">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="version-tag"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.versionTag}
              </label>
              <Select>
                <SelectTrigger id="version-tag" className="mt-1">
                  <SelectValue
                    placeholder={dictionary.page.form.versionTagPlaceholder}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loading">
                    {dictionary.page.form.loadingTags}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                htmlFor="os"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.os}
              </label>
              <Select>
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
            <div>
              <label
                htmlFor="arch"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {dictionary.page.form.arch}
              </label>
              <Select>
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
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="static-openssl" />
              <label
                htmlFor="static-openssl"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {dictionary.page.form.staticOpenssl}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="compatibility-mode" />
              <label
                htmlFor="compatibility-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {dictionary.page.form.compatibilityMode}
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <ShimmerButton className="shadow-2xl">
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                {dictionary.page.form.buildButton}
              </span>
            </ShimmerButton>
          </div>
        </div>
      </div>
      <RetroGrid />
    </main>
  );
}
