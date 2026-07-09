export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { GlobalSearchPage } from "@/features/search/global-search-page";
import { LoadingSkeleton } from "@/shared/components/ui/states";
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} />}>
      <GlobalSearchPage />
    </Suspense>
  );
}
