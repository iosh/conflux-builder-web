import { BuildFormValuesType } from "./form";

export type workflowInputsType = BuildFormValuesType & {
  commitSha: string;
  runId?: string;  // This run id will add to workflow name.
};
