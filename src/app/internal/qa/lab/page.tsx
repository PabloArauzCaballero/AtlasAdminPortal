export const dynamic = "force-dynamic";

import { QaLabPage } from "@/features/qa-lab/qa-lab-page";

export default async function QaLabRoute({
  searchParams,
}: Readonly<{ searchParams: Promise<{ endpointId?: string }> }>) {
  const { endpointId = "" } = await searchParams;
  return <QaLabPage initialEndpointId={endpointId} />;
}
