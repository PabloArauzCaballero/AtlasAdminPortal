import { Suspense } from "react";
import { ProcessInstancesPage } from "@/features/processes/process-instances-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (el `?caso=` del caso abierto) exige un límite de Suspense en el App Router.
export default async function ProcessInstancesRoute({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <ProcessInstancesPage code={code} />
    </Suspense>
  );
}
