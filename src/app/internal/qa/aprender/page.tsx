import { Suspense } from "react";
import { LearningCenterPage } from "@/features/qa-tutorials/learning-center-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

export default function QaLearningCenterRoute() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <LearningCenterPage />
    </Suspense>
  );
}
