"use client";

import { Button } from "@/components/ui/button";
import type { getDictionary } from "@/get-dictionary";
import { FileQuestion } from "lucide-react";

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface NoReleaseFoundProps {
  dictionary: Dictionary;
  onBuildClick: () => void;
}

export default function NoReleaseFound({
  dictionary,
  onBuildClick,
}: NoReleaseFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h3 className="text-xl font-semibold">
        {dictionary.page.assetTable.noAssets}
      </h3>
      <p className="text-muted-foreground">
        {dictionary.page.form.noReleaseFoundDescription}
      </p>
      <Button onClick={onBuildClick} className="mt-4">
        {dictionary.page.form.buildButton}
      </Button>
    </div>
  );
}