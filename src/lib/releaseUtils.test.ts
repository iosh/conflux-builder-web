import { describe, it, expect } from "vitest";
import {
  formatBytes,
  isReleaseAssetMatchFormValues,
  parseAssetName,
} from "./releaseUtils";
import type { BuildFormValuesType } from "@/shared/form";

describe("isReleaseAssetMatchFormValues", () => {
  it("should return true when all criteria match a standard asset name", () => {
    const assetName = "conflux-builder-v1.0.0-linux-x86_64-glibc2.31.tar.gz";
    const criteria: BuildFormValuesType = {
      versionTag: "v1.0.0",
      os: "linux",
      arch: "x86_64",
      staticOpenssl: true,
      compatibilityMode: false,
      glibcVersion: "2.31",
    };
    expect(isReleaseAssetMatchFormValues(assetName, criteria)).toBe(true);
  });

  it("should return false for incomplete or empty criteria object", () => {
    const assetName = "conflux-builder-v1.0.0-linux-x86_64.tar.gz";
    const incompleteCriteria: Partial<BuildFormValuesType> = {
      versionTag: "v1.0.0",
      os: "linux",
    };
    expect(
      isReleaseAssetMatchFormValues(
        assetName,
        incompleteCriteria as BuildFormValuesType
      )
    ).toBe(false);
  });

  it("should return true for a portable macos build with dynamic openssl", () => {
    const assetName =
      "conflux-builder-v1.1.0-darwin-aarch64-portable-dynamic-openssl.tar.gz";
    const criteria: BuildFormValuesType = {
      versionTag: "v1.1.0",
      os: "macos",
      arch: "aarch64",
      staticOpenssl: false,
      compatibilityMode: true,
    };
    expect(isReleaseAssetMatchFormValues(assetName, criteria)).toBe(true);
  });

  it("should return false for an attestation file when skipAttestationFile is true or default", () => {
    const assetName = "conflux-builder-v1.0.0-linux-x86_64.tar.gz.attestation";
    const criteria: BuildFormValuesType = {
      versionTag: "v1.0.0",
      os: "linux",
      arch: "x86_64",
      staticOpenssl: true,
      compatibilityMode: false,
    };

    expect(isReleaseAssetMatchFormValues(assetName, criteria)).toBe(false);

    expect(
      isReleaseAssetMatchFormValues(assetName, criteria, {
        skipAttestationFile: true,
      })
    ).toBe(false);
  });

  it("should return false when the os does not match", () => {
    const assetName = "conflux-builder-v1.0.0-linux-x86_64.tar.gz";
    const criteria: BuildFormValuesType = {
      versionTag: "v1.0.0",
      os: "windows",
      arch: "x86_64",
      staticOpenssl: true,
      compatibilityMode: false,
    };
    expect(isReleaseAssetMatchFormValues(assetName, criteria)).toBe(false);
  });

  it("should return false when required criteria fields are null or undefined", () => {
    const assetName = "conflux-builder-v1.0.0-linux-x86_64.tar.gz";
    const criteria = {
      versionTag: null,
      os: "linux",
      arch: undefined,
      staticOpenssl: true,
      compatibilityMode: false,
      glibcVersion: "",
    } as unknown as BuildFormValuesType;
    expect(isReleaseAssetMatchFormValues(assetName, criteria)).toBe(false);
  });
});

describe("formatBytes", () => {
  it("should format bytes to human-readable string", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1234)).toBe("1.21 KB");
    expect(formatBytes(1234567)).toBe("1.18 MB");

    expect(formatBytes(1234000000)).toBe("1.15 GB");
  });
});

describe("parseAssetName", () => {
  it("should parse os and arch", () => {
    const assetName = "conflux-v3.0.1-testnet-fix-windows-x86_64.zip";
    const result = parseAssetName(assetName);
    expect(result.os).toEqual("Windows");
    expect(result.arch).toEqual("x86_64");
    expect(result.isPortable).toEqual(false);
  });

  it("should parse os and portable", () => {
    const assetName = "conflux-v3.0.1-testnet-fix-windows-x86_64-portable.zip";
    const result = parseAssetName(assetName);
    expect(result.os).toEqual("Windows");
    expect(result.arch).toEqual("x86_64");
    expect(result.isPortable).toEqual(true);
  });
});
