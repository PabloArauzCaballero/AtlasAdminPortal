import { LoanDetailPage } from "@/features/loans/loan-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ loanId: string }> }>) {
  const { loanId } = await params;
  return <LoanDetailPage loanId={loanId} />;
}
