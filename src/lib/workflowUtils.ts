import { BuildFormValuesType, buildSchema } from "@/shared/form";
import { workflowInputsType } from "@/shared/types";
import z from "zod";

export function getWorkflowId(os: BuildFormValuesType["os"]): string {
  switch (os) {
    case "linux":
      return "linux.yml";
    case "macos":
      return "macos.yml";
    case "windows":
      return "windows.yml";
    default:
      throw new Error(`Unsupported OS: ${os}`);
  }
}

export function getWorkflowInputs(data: workflowInputsType) {
  const baseInputs = {
    commit_sha: data.commitSha,
    version_tag: data.versionTag,
    arch: data.arch,
  };
  switch (data.os) {
    case "linux":
      return {
        ...baseInputs,
        glibc_version: data.glibcVersion,
        openssl_version: data.opensslVersion,
        static_openssl: data.staticOpenssl,
        compatibility_mode: data.compatibilityMode,
      };
    case "windows":
      return {
        ...baseInputs,
        static_openssl: data.staticOpenssl,
        compatibility_mode: data.compatibilityMode,
      };
    case "macos":
      return baseInputs;
    default:
      return {};
  }
}
