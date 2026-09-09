import { Suspense } from "react";
import { FlowsPage } from "@/features/flows/flows-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (el `?flow=` del enlace profundo) exige un límite de Suspense en el App Router.
export default function FlowsRoute() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={10} />}>
      <FlowsPage />
    </Suspense>
  );
}
