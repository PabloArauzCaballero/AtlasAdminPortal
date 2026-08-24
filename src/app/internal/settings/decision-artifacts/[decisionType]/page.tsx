import { DecisionDetailPage } from "@/features/decision-artifacts/decision-detail-page";
import type { DecisionType } from "@/features/decision-artifacts/types";

export default async function Page({ params }: { params: Promise<{ decisionType: string }> }) {
  const { decisionType } = await params;
  return <DecisionDetailPage decisionType={decisionType as DecisionType} />;
}
