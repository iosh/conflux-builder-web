import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  commitSha: text("commit_sha").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date()
  ),
});

export const builds = sqliteTable(
  "builds",
  {
    id: integer("id").primaryKey(),
    commitSha: text("commit_sha").notNull(),
    versionTag: text("version_tag").notNull(),
    os: text("os", { enum: ["linux", "windows", "macos"] }).notNull(),
    arch: text("arch", { enum: ["x86_64", "aarch64"] }).notNull(),
    glibcVersion: text("glibc_version"),
    opensslVersion: text("openssl_version"),
    staticOpenssl: integer("static_openssl", { mode: "boolean" }).default(true),
    compatibilityMode: integer("compatibility_mode", {
      mode: "boolean",
    }).default(false),
    runId: text("run_id"), // App-generated ID for matching with workflows
    githubActionRunId: text("github_action_run_id"),
    status: text("status", {
      enum: [
        "pending",
        "in_progress",
        "build_success",
        "completed",
        "failed",
        "cancelled",
      ],
    }).default("pending"),
    downloadUrl: text("download_url"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("unique_build_config").on(
      table.commitSha,
      table.versionTag,
      table.os,
      table.arch,
      table.glibcVersion,
      table.opensslVersion,
      table.staticOpenssl,
      table.compatibilityMode
    ),
  ]
);
