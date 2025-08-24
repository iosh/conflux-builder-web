import { builds } from "@/db/schema";
import { BuildFormValuesType } from "./form";

export type workflowInputsType = BuildFormValuesType & {
  commitSha: string;
  runId?: string; // This run id will add to workflow name.
};

export type BuildTableInsertType = typeof builds.$inferInsert;

export type BuildRecordTYpe = typeof builds.$inferSelect;
