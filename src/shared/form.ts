import { formOptions } from "@tanstack/react-form/nextjs";
import z from "zod";

export const buildSchema = z.object({
  versionTag: z.string().min(1, "Version tag is required"),
  commitSha: z.string().min(1, "Commit SHA is required"),
  os: z.enum(["linux", "windows", "macos"]),
  arch: z.enum(["x86_64", "aarch64"]),
  staticOpenssl: z.boolean(),
  compatibilityMode: z.boolean(),
});

export type BuildFormValues = z.infer<typeof buildSchema>;

export const buildForm = formOptions({
  defaultValues: {
    os: "",
    arch: "",
    versionTag: "",
    commitSha: "",
    staticOpenssl: true,
    compatibilityMode: false,
  },
});
