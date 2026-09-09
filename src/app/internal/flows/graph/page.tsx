import { Suspense } from "react";
import { FlowGraphPage } from "@/features/flows/graph/flow-graph-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (flujo o módulo a dibujar) exige un límite de Suspense en el App Router.
export default function FlowGraphRoute() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={10} />}>
      <FlowGraphPage />
    </Suspense>
  );
}
