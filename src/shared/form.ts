import { formOptions } from "@tanstack/react-form/nextjs";
import z from "zod";

export const buildSchema = z.object({
  versionTag: z.string().min(1, "Version tag is required"),
  os: z.enum(["linux", "windows", "macos"]),
  arch: z.enum(["x86_64", "aarch64"]),
  staticOpenssl: z.boolean(),
  glibcVersion: z.enum(["2.27", "2.31", "2.35", "2.39"]).optional(),
  opensslVersion: z.enum(["1", "3"]),
  compatibilityMode: z.boolean(),
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
