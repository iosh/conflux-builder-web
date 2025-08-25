import { z } from "zod";

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  DB_FILE_NAME: z.string().min(1, "DB_FILE_NAME is required"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("info"),
});

const rawEnv = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  DB_FILE_NAME: process.env.DB_FILE_NAME,
  LOG_LEVEL: process.env.LOG_LEVEL,
};

const parsed = EnvSchema.safeParse(rawEnv);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = parsed.data;
export type AppConfig = typeof config;
