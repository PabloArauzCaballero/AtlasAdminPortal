export const dynamic = "force-dynamic";

import { ToolDetailPage } from "@/features/systems-tools/tool-detail-page";

export default async function ToolDetailRoute({
  params,
}: Readonly<{ params: Promise<{ toolId: string }> }>) {
  const { toolId } = await params;
  return <ToolDetailPage toolId={toolId} />;
}
