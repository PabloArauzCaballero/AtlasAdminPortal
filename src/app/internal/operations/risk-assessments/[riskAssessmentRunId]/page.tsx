import { RiskAssessmentDetailPage } from "@/features/risk-assessments/risk-assessment-detail-page";
import { PermissionGate } from "@/shared/auth/permission-gate";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ riskAssessmentRunId: string }> }>) {
  const { riskAssessmentRunId } = await params;
  return (
    <PermissionGate permissions={["operations.riskPolicy.read"]}>
      <RiskAssessmentDetailPage riskAssessmentRunId={riskAssessmentRunId} />
    </PermissionGate>
  );
}
