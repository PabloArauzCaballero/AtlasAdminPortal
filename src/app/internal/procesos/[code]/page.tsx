import { Suspense } from "react";
import { ProcessDetailPage } from "@/features/processes/process-detail-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (la pestaña `?tab=` y el caso `?caso=`) exige un límite de Suspense en el App Router.
export default async function ProcessDetailRoute({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton rows={8} />}>
      <ProcessDetailPage code={code} />
    </Suspense>
  );
}
