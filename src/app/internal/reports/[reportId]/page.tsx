import { ReportDetailPage } from "@/features/reports/report-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ reportId: string }> }>) {
  const { reportId } = await params;
  return <ReportDetailPage reportId={reportId} />;
}
