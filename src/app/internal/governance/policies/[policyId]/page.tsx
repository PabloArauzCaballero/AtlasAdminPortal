import { GovernancePolicyDetailPage } from "@/features/governance-policies/governance-policy-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ policyId: string }> }>) {
  const { policyId } = await params;
  return <GovernancePolicyDetailPage policyId={policyId} />;
}
