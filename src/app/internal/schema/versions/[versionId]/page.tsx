import { SchemaVersionDetailPage } from "@/features/schema-management/schema-version-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ versionId: string }> }>) {
  const { versionId } = await params;
  return <SchemaVersionDetailPage versionId={versionId} />;
}
