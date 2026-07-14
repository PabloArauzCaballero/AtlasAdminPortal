"use client";

import { FraudDecisionForm } from "./fraud-decision-form";
import { ManualReviewDecisionForm } from "./manual-review-decision-form";
import type { WorkQueueItem } from "./types";

export function DecisionDialog({
  item,
  onClose,
}: Readonly<{ item: WorkQueueItem; onClose: () => void }>) {
  return item.workItemType === "fraud" ? (
    <FraudDecisionForm item={item} onClose={onClose} />
  ) : (
    <ManualReviewDecisionForm item={item} onClose={onClose} />
  );
}
