import { DataEntityMetadataPage } from "@/features/data-catalog/data-entity-metadata-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ entityId: string }> }>) {
  const { entityId } = await params;
  return <DataEntityMetadataPage entityId={entityId} />;
}
