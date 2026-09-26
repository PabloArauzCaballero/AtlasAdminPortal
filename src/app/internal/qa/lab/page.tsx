import { Suspense } from "react";
import { QaLabPage } from "@/features/qa-lab/qa-lab-page";

export default async function QaLabRoute({
  searchParams,
}: Readonly<{ searchParams: Promise<{ endpointId?: string }> }>) {
  const { endpointId = "" } = await searchParams;
  return (
    // La página lee la pestaña activa de la URL (`useSearchParams`), que
    // suspende en el servidor: va en su propio boundary.
    <Suspense fallback={null}>
      <QaLabPage initialEndpointId={endpointId} />
    </Suspense>
  );
}
