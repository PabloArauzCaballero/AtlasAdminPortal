import { CreditApplicationDetailPage } from "@/features/credit/application-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ applicationId: string }> }>) {
  const { applicationId } = await params;
  return <CreditApplicationDetailPage applicationId={applicationId} />;
}
