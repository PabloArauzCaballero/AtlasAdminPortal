export const dynamic = "force-dynamic";

import { DataEntityDetailPage } from "@/features/data-catalog/data-entity-detail-page";

export default async function DataEntityDetailRoute({
  params,
}: Readonly<{ params: Promise<{ entityId: string }> }>) {
  const { entityId } = await params;
  return <DataEntityDetailPage entityId={entityId} />;
}
