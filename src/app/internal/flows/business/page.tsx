import { Suspense } from "react";
import { BusinessFlowsPage } from "@/features/flows/business/business-flows-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (el `?flow=` que abre la ficha) exige un límite de Suspense en el App Router.
export default function BusinessFlowsRoute() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={8} />}>
      <BusinessFlowsPage />
    </Suspense>
  );
}
