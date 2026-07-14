import { AuditRequestPage } from "@/features/audit/audit-request-page";

export default async function AuditRequestRoute({
  params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
  const { requestId } = await params;
  return <AuditRequestPage requestId={requestId} />;
}
