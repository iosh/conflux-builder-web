"use client";

import type { getDictionary } from "@/get-dictionary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  FileText,
  HardDrive,
  Cpu,
  Laptop,
  ShieldCheck,
  Wrench,
  Github,
} from "lucide-react";
import { Release, ReleaseAsset } from "@/shared/actionsTypes";
import { ShineBorder } from "./magicui/shine-border";
import { BuildFormValuesType } from "@/shared/form";
import { isReleaseAssetMatchFormValues } from "@/lib/releaseUtils";

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

interface AssetInfo {
  os?: string;
  arch?: string;
  isPortable: boolean;
}

function parseAssetName(name: string): AssetInfo {
  const info: AssetInfo = {
    isPortable: false,
  };
  const parts = name.split("-");
  if (parts.includes("linux")) info.os = "Linux";
  if (parts.includes("windows")) info.os = "Windows";
  if (parts.includes("darwin")) info.os = "macOS";
  if (parts.includes("aarch64")) info.arch = "aarch64";
  if (parts.includes("x86_64")) info.arch = "x86_64";
  if (parts.includes("portable")) info.isPortable = true;
  return info;
}

interface GroupedAsset {
  key: string;
  artifact: ReleaseAsset;
  attestation: ReleaseAsset | null;
  info: AssetInfo;
}

interface ReleaseListProps {
  release: Release;
  dictionary: Dictionary;
  buildValues: BuildFormValuesType;
}

export default function ReleaseList({
  release,
  dictionary,
  buildValues,
}: ReleaseListProps) {
  const { assetTable } = dictionary.page;

  const groupedAssets = release.assets.reduce((acc, asset) => {
    const key = asset.name
      .replace(/\.tar\.gz$/, "")
      .replace(/\.zip$/, "")
      .replace(/-attestation\.json$/, "");

    if (!acc.has(key)) {
      acc.set(key, {
        info: parseAssetName(asset.name),
        artifact: asset,
        attestation: null,
      });
    }

    if (asset.name.endsWith("-attestation.json")) {
      acc.get(key)!.attestation = asset;
    } else {
      acc.get(key)!.artifact = asset;
    }

    return acc;
  }, new Map<string, Omit<GroupedAsset, "key">>());

  const assetsToShow = Array.from(groupedAssets.values()).map(
    (g) => ({ ...g, key: g.artifact.id.toString() } as GroupedAsset)
  );

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{release.name}</h3>
          <p className="text-sm text-muted-foreground">
            {assetTable.version}:{" "}
            <Badge variant="outline">{release.tagName}</Badge>
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href={release.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <title>GitHub</title>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            {assetTable.viewOnGitHub}
          </a>
        </Button>
      </div>
      {assetsToShow.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assetsToShow.map((group) => {
            const isNameMatch = isReleaseAssetMatchFormValues(
              group.artifact.name,
              buildValues
            );

            return (
              <Card key={group.key} className="flex flex-col relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 flex-shrink-0" />
                    {assetTable.buildArtifact}
                  </CardTitle>
                  <CardDescription
                    className="text-xs"
                    title={group.artifact.name}
                  >
                    {group.artifact.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HardDrive className="h-4 w-4" />
                    <span>{formatBytes(group.artifact.size)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.info.os && (
                      <Badge variant="secondary" className="gap-1">
                        <Laptop className="h-3 w-3" /> {group.info.os}
                      </Badge>
                    )}
                    {group.info.arch && (
                      <Badge variant="secondary" className="gap-1">
                        <Cpu className="h-3 w-3" /> {group.info.arch}
                      </Badge>
                    )}
                    {group.info.isPortable && (
                      <Badge variant="secondary" className="gap-1">
                        <Wrench className="h-3 w-3" /> {assetTable.portable}
                      </Badge>
                    )}
                  </div>
                  {group.attestation && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a
                        href={group.attestation.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {assetTable.provenance}
                      </a>
                    </Button>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    className="w-full"
                    variant={isNameMatch ? "default" : "secondary"}
                  >
                    <a
                      href={group.artifact.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {assetTable.download}
                    </a>
                  </Button>
                </CardFooter>
                {isNameMatch && <ShineBorder />}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-center border rounded-lg">
          <p>{assetTable.noAssets}</p>
        </div>
      )}
    </div>
  );
}
