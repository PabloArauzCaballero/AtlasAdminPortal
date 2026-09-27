import { ProcessDetailPage } from "@/features/processes/process-detail-page";

export default async function ProcessDetailRoute({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;
  return <ProcessDetailPage code={code} />;
}
