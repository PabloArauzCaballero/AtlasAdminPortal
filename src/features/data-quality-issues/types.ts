import type { DataQualityIssue } from "@/features/operations/types";

export type ResolutionState = {
  issue: DataQualityIssue;
  resolution: "resolved" | "ignored";
  reasonCode: string;
  notes: string;
} | null;
