export const dynamic = "force-dynamic";

import { TestRunDetailPage } from "@/features/qa-console/test-run-detail-page";

export default async function TestRunDetailRoute({
  params,
}: Readonly<{ params: Promise<{ runId: string }> }>) {
  const { runId } = await params;
  return <TestRunDetailPage runId={runId} />;
}
