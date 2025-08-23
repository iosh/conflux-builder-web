import { formOptions } from "@tanstack/react-form/nextjs";
import z from "zod";

const baseBuildSchema = z.object({
  versionTag: z.string().min(1, "Version tag is required"),
  os: z.enum(["linux", "windows", "macos"]),
  arch: z.enum(["x86_64", "aarch64"]),
  staticOpenssl: z.boolean(),
});

export const buildSchema = baseBuildSchema
  .extend({
    glibcVersion: z.enum(["2.27", "2.31", "2.35", "2.39"]).optional(),
    opensslVersion: z.enum(["1", "3"]).optional(),
    compatibilityMode: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.os === "macos") {
        // macOS only supports aarch64, x86 architecture is build error, this will be fix in conflux-rust next version
        if (data.arch !== "aarch64") {
          return false;
        }

        if (data.glibcVersion !== undefined) {
          return false;
        }

        if (data.opensslVersion !== undefined) {
          return false;
        }

        if (data.compatibilityMode === true) {
          return false;
        }
      }

      if (data.os === "windows") {
        // Windows only supports x86_64
        if (data.arch !== "x86_64") {
          return false;
        }
        if (data.glibcVersion !== undefined) {
          return false;
        }
        if (data.opensslVersion !== undefined) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Invalid configuration for the selected operating system",
      path: ["os"], // This will show the error on the OS field
    }
  )
  .transform((data) => {
    // Clean up
    const cleaned = { ...data };
    if (data.os === "macos") {
      delete cleaned.glibcVersion;
      delete cleaned.opensslVersion;
      cleaned.compatibilityMode = false;
    } else if (data.os === "windows") {
      delete cleaned.glibcVersion;
      delete cleaned.opensslVersion;
    } else if (data.os === "linux") {
      if (!cleaned.opensslVersion) {
        cleaned.opensslVersion = "3";
      }
      if (!cleaned.glibcVersion) {
        cleaned.glibcVersion = "2.39";
      }
    }

    return cleaned;
  });

export type BuildFormValuesType = z.infer<typeof buildSchema>;

export const buildForm = formOptions({
  defaultValues: {
    os: "",
    arch: "",
    versionTag: "",
    staticOpenssl: true,
    compatibilityMode: false,
  },
});
