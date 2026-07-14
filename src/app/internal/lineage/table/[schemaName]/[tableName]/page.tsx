import { TableLineagePage } from "@/features/lineage/table-lineage-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ schemaName: string; tableName: string }> }>) {
  const { schemaName, tableName } = await params;
  return (
    <TableLineagePage
      schemaName={decodeURIComponent(schemaName)}
      tableName={decodeURIComponent(tableName)}
    />
  );
}
