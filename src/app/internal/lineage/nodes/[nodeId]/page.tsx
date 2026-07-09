export const dynamic = "force-dynamic";

import { LineageNodeDetailPage } from "@/features/lineage-official/lineage-node-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ nodeId: string }> }>) {
  const { nodeId } = await params;
  return <LineageNodeDetailPage nodeId={nodeId} />;
}
