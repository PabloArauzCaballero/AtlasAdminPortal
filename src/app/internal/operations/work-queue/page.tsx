import { Suspense } from "react";
import { WorkQueuePage } from "@/features/operations-cases/work-queue-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// La pestaña vive en la URL (`?cola=`), que se lee con `useSearchParams`: exige su propio Suspense.
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <WorkQueuePage />
    </Suspense>
  );
}
