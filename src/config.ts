import { z } from "zod";

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  DB_FILE_NAME: z.string().min(1, "DB_FILE_NAME is required"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
});

const shouldValidate = process.env.SKIP_ENV_VALIDATION !== "1";

let cached: z.infer<typeof EnvSchema> | null = null;

export function getConfig() {
  if (cached) return cached;

  const rawEnv = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    DB_FILE_NAME: process.env.DB_FILE_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    if (!shouldValidate) {
      cached = {
        GITHUB_TOKEN: rawEnv.GITHUB_TOKEN ?? "",
        GITHUB_WEBHOOK_SECRET: rawEnv.GITHUB_WEBHOOK_SECRET ?? "",
        DB_FILE_NAME: rawEnv.DB_FILE_NAME ?? "/tmp/dummy.sqlite",
        LOG_LEVEL: (rawEnv.LOG_LEVEL as any) ?? "info",
      };
      return cached;
    }

    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  cached = parsed.data;
  return cached;
}

export type AppConfig = ReturnType<typeof getConfig>;
