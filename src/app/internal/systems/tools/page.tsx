import { Suspense } from "react";
import { ToolsPage } from "@/features/systems-tools/tools-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";

// `useSearchParams` (la pestaña `?tab=salud`) exige un límite de Suspense en el App Router.
export default function ToolsRoute() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={8} />}>
      <ToolsPage />
    </Suspense>
  );
}
