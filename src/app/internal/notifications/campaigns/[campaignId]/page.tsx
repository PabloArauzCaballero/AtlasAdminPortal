import { CampaignDetailPage } from "@/features/notification-campaigns/campaign-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ campaignId: string }> }>) {
  const { campaignId } = await params;
  return <CampaignDetailPage campaignId={campaignId} />;
}
