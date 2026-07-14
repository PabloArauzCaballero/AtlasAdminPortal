import { StressProfileDetailPage } from "@/features/qa-stress/stress-profile-detail-page";

export default async function StressProfileDetailRoute({
  params,
}: Readonly<{ params: Promise<{ profileId: string }> }>) {
  const { profileId } = await params;
  return <StressProfileDetailPage profileId={profileId} />;
}
