import { InvestigationSummaryPage } from "@/features/operations-cases/investigation-summary-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ customerId: string }> }>) {
  const { customerId } = await params;
  return <InvestigationSummaryPage customerId={customerId} />;
}
