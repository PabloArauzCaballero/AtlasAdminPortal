import { ExportDetailPage } from "@/features/data-exports/export-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ exportId: string }> }>) {
  const { exportId } = await params;
  return <ExportDetailPage exportId={exportId} />;
}
