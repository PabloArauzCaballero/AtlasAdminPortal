import { CatalogVersionDetailPage } from "@/features/operations/catalog-version-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ catalogCode: string; versionId: string }> }>) {
  const { catalogCode, versionId } = await params;
  return (
    <CatalogVersionDetailPage catalogCode={catalogCode} versionId={versionId} />
  );
}
