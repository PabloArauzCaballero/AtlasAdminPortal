import { Suspense } from "react";
import { JobsPage } from "@/features/operational-jobs/jobs-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <JobsPage />
    </Suspense>
  );
}
