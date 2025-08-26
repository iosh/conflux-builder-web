import type { BuildFormValuesType } from "@/shared/form";

export const isReleaseAssetMatchFormValues = (
  assetName: string,
  criteria: BuildFormValuesType,
  options?: {
    // don't match the attestation file
    skipAttestationFile: boolean;
  }
): boolean => {
  const { skipAttestationFile = true } = options || {};
  const {
    versionTag,
    os,
    arch,
    staticOpenssl,
    compatibilityMode,
    glibcVersion,
  } = criteria;

  if (skipAttestationFile && assetName.includes("attestation")) {
    return false;
  }

  if (!versionTag || !os || !arch) {
    return false;
  }
  if (
    !assetName.includes(versionTag) ||
    !assetName.includes(os === "macos" ? "darwin" : os) ||
    !assetName.includes(arch)
  ) {
    return false;
  }

  if (
    os === "linux" &&
    glibcVersion &&
    !assetName.includes(`glibc${glibcVersion}`)
  ) {
    return false;
  }

  const isPortable = assetName.includes("portable");
  if (compatibilityMode !== isPortable) {
    return false;
  }

  const isDynamicOpenssl = assetName.includes("dynamic-openssl");
  if (!staticOpenssl !== isDynamicOpenssl) {
    return false;
  }
  return true;
};

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export interface AssetInfo {
  os?: string;
  arch?: string;
  isPortable: boolean;
  glibcVersion?: string;
  sslLinking?: "static" | "dynamic";
  archive?: "tar.gz" | "zip";
}

export function parseAssetName(name: string): AssetInfo {
  const lower = name.toLowerCase();

  const info: AssetInfo = {
    isPortable: false,
  };

  // OS
  if (lower.includes("linux")) info.os = "Linux";
  if (lower.includes("windows")) info.os = "Windows";
  if (lower.includes("darwin")) info.os = "macOS";

  if (lower.includes("aarch64")) info.arch = "aarch64";
  if (lower.includes("x86_64")) info.arch = "x86_64";

  if (lower.includes("portable")) info.isPortable = true;

  if (lower.endsWith(".tar.gz")) info.archive = "tar.gz";
  if (lower.endsWith(".zip")) info.archive = "zip";

  const glibcMatch = lower.match(/glibc(\d+(?:.\d+)?)/);
  if (glibcMatch) info.glibcVersion = glibcMatch[1];

  // OpenSSL
  if (lower.includes("dynamic-openssl")) {
    info.sslLinking = "dynamic";
  } else if (info.os === "Windows" || info.os === "Linux") {
    info.sslLinking = "static";
  }

  return info;
}
