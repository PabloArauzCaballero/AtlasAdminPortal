"use client";

import type { ReviewDecisionInput } from "@/features/systems/types";
import { Button } from "@/shared/components/ui/button";

export function ReviewActions({
  canReview,
  onDecision,
}: Readonly<{
  canReview: boolean;
  onDecision: (decision: ReviewDecisionInput["reviewStatus"]) => void;
}>) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        className="h-8 px-2 text-xs"
        disabled={!canReview}
        title={canReview ? undefined : "Requiere systems.reviewQueue.resolve"}
        onClick={() => onDecision("APPROVED")}
      >
        Aprobar
      </Button>
      <Button
        className="h-8 px-2 text-xs"
        disabled={!canReview}
        onClick={() => onDecision("NEEDS_REVIEW")}
      >
        Marcar revisión
      </Button>
      <Button
        className="h-8 px-2 text-xs"
        variant="danger"
        disabled={!canReview}
        onClick={() => onDecision("REJECTED")}
      >
        Rechazar
      </Button>
    </div>
  );
}
