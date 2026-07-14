import { DataQualityRuleDetailPage } from "@/features/data-quality-rules/data-quality-rule-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ ruleId: string }> }>) {
  const { ruleId } = await params;
  return <DataQualityRuleDetailPage ruleId={ruleId} />;
}
