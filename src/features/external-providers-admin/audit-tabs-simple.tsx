"use client";

import { useQualityAudit, useReadiness } from "./hooks";
import { ReportView } from "./report-view";

export function QualityAuditTab() {
  const query = useQualityAudit();
  return <ReportView query={query} title="Auditoría de calidad" />;
}

export function ReadinessTab() {
  const query = useReadiness();
  return <ReportView query={query} title="Readiness de producción" />;
}
