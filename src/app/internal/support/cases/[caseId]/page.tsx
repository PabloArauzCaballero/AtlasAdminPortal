import { SupportCaseDetailPage } from "@/features/support/case-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ caseId: string }> }>) {
  const { caseId } = await params;
  return <SupportCaseDetailPage caseId={caseId} />;
}
