"use client";

import type { Release, ReleaseAsset } from "@/lib/releases";
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

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

interface ReleaseListProps {
  release: Release;
  dictionary: Dictionary;
}

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
  if (parts.includes("macos")) info.os = "macOS";
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

export default function ReleaseList({
  release,
  dictionary,
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
            <Github className="h-4 w-4" />
            {assetTable.viewOnGitHub}
          </a>
        </Button>
      </div>
      {assetsToShow.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assetsToShow.map((group) => (
            <Card key={group.key} className="flex flex-col">
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
                <Button asChild className="w-full">
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
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-center border rounded-lg">
          <p>{assetTable.noAssets}</p>
        </div>
      )}
    </div>
  );
}
