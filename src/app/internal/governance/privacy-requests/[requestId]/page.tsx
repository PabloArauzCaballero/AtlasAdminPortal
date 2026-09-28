import { PrivacyRequestDetailPage } from "@/features/privacy-requests/privacy-request-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
  const { requestId } = await params;
  return <PrivacyRequestDetailPage requestId={requestId} />;
}
