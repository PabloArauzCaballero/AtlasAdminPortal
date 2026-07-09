import type { ReviewDecisionInput } from "@/features/systems/types";
import type { PendingReview } from "./types";

export type SetPendingReview = (value: PendingReview) => void;
export type Decision = ReviewDecisionInput["reviewStatus"];
