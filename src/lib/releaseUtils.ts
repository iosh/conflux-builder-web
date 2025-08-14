import type { BuildFormValues } from "@/shared/form";

export const isReleaseAssetMatchFormValues = (
  assetName: string,
  criteria: BuildFormValues
): boolean => {
  const {
    versionTag,
    os,
    arch,
    staticOpenssl,
    compatibilityMode,
    glibcVersion,
  } = criteria;
  if (!versionTag || !os || !arch) {
    return false;
  }
  if (
    !assetName.includes(versionTag) ||
    !assetName.includes(os) ||
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
