import { CustomerAuditPage } from "@/features/customer-audit/customer-audit-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ customerId: string }> }>) {
  const { customerId } = await params;
  return <CustomerAuditPage customerId={customerId} />;
}
