export const dynamic = "force-dynamic";

import { GovernancePolicyConfigPage } from "@/features/governance-policies/governance-policy-config-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ policyId: string }> }>) {
  const { policyId } = await params;
  return <GovernancePolicyConfigPage policyId={policyId} />;
}
