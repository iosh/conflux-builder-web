"use client";

import type { Release } from "@/lib/releases";
import type { getDictionary } from "@/get-dictionary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

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

export default function ReleaseList({
  release,
  dictionary,
}: ReleaseListProps) {
  const { assetTable } = dictionary.page;

  return (
    <div className="mt-8 w-full overflow-hidden rounded-lg border shadow-sm">
      <div className="p-4">
        <h3 className="text-lg font-semibold">{release.name}</h3>
        <p className="text-sm text-muted-foreground">
          {assetTable.version}:{" "}
          <Badge variant="outline">{release.tagName}</Badge>
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{assetTable.assetName}</TableHead>
            <TableHead className="w-32 text-right">{assetTable.size}</TableHead>
            <TableHead className="w-32 text-right">
              {assetTable.download}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {release.assets.length > 0 ? (
            release.assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell className="text-right">
                  {formatBytes(asset.size)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    aria-label={`Download ${asset.name}`}
                  >
                    <a
                      href={asset.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                {assetTable.noAssets}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}