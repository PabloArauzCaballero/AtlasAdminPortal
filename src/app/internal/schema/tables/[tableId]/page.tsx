import { SchemaTableDetailPage } from "@/features/schema-management/schema-table-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ tableId: string }> }>) {
  const { tableId } = await params;
  return <SchemaTableDetailPage tableId={tableId} />;
}
