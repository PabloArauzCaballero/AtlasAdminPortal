"use client";

import { QualityAuditView, ReadinessView } from "./audit/quality-views";
import { useQualityAudit, useReadiness } from "./hooks";

export function QualityAuditTab() {
  return <QualityAuditView query={useQualityAudit()} />;
}

export function ReadinessTab() {
  return <ReadinessView query={useReadiness()} />;
}
