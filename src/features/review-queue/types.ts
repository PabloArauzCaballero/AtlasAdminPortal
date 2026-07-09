import type {
  ReviewDecisionInput,
  ReviewTargetType,
} from "@/features/systems/types";

export type PendingReview = {
  targetType: ReviewTargetType;
  targetId: string;
  title: string;
  decision: ReviewDecisionInput["reviewStatus"];
};
