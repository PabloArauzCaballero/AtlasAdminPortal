import { TestSuiteDetailPage } from "@/features/qa-console/test-suite-detail-page";

export default async function TestSuiteDetailRoute({
  params,
}: Readonly<{ params: Promise<{ suiteId: string }> }>) {
  const { suiteId } = await params;
  return <TestSuiteDetailPage suiteId={suiteId} />;
}
