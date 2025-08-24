import { RetroGrid } from "@/components/magicui/retro-grid";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/get-dictionary";
import { Locale } from "@/i18n-config";
import { getAndCacheTags } from "@/lib/tags";
import LocaleSwitcher from "@/components/locale-switcher";
import { headers } from "next/headers";
import { BuildFormValuesType } from "@/shared/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BuilderClientComponent from "@/components/builder-client-component";
import ProvenanceHelper from "@/components/provenance-helper";
import { getReleaseByTag } from "@/services/githubService";

function getOS(userAgent: string): "linux" | "windows" | "macos" {
  if (/mac/i.test(userAgent)) return "macos";
  if (/win/i.test(userAgent)) return "windows";
  return "linux"; // Default to Linux
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const tags = await getAndCacheTags();
  const userAgent = (await headers()).get("user-agent") || "";
  const latestTag = tags.find((t) => !t.name.includes("testnet"));

  const initialBuilderTag = latestTag ? latestTag.name : "";

  const initialRelease = await getReleaseByTag(initialBuilderTag);

  const initialBuildValues: BuildFormValuesType = {
    os: getOS(userAgent),
    arch: "x86_64",
    versionTag: latestTag?.name || "",
    glibcVersion: "2.39",
    staticOpenssl: true,
    opensslVersion: "3",
    compatibilityMode: false,
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:py-24">
      <LocaleSwitcher />
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

        <div className="w-full max-w-4xl mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.page.form.title}</CardTitle>
              <CardDescription>
                {dictionary.page.form.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BuilderClientComponent
                dictionary={dictionary}
                tags={tags}
                initialBuildValues={initialBuildValues}
                initialRelease={initialRelease}
              />
            </CardContent>
          </Card>
        </div>
        <div className="w-full max-w-4xl mt-8">
          <ProvenanceHelper
            dictionary={dictionary}
            releaseTagName={latestTag?.name || "latest"}
          />
        </div>
      </div>
      <RetroGrid />
    </main>
  );
}
