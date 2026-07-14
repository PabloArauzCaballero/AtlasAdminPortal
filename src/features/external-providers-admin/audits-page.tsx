"use client";

import { useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { QualityAuditTab, ReadinessTab } from "./audit-tabs-simple";
import {
  ProductionGateTab,
  SlaReportTab,
  UsageReportTab,
} from "./audit-tabs-provider-filtered";
import {
  IdempotencyAuditTab,
  RetentionPreviewTab,
  SanitizationAuditTab,
} from "./audit-tabs-window-filtered";

const tabs = [
  "Calidad",
  "Production gate",
  "Readiness",
  "SLA",
  "Uso",
  "Idempotencia",
  "Retención",
  "Sanitización",
];

export function AuditsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <>
      <PageHeader
        eyebrow="Proveedores externos"
        title="Auditorías y diagnóstico"
        description="Reportes de solo lectura del backend sobre calidad de configuración, gate de producción, SLA, uso/costo, idempotencia, retención y sanitización de datos de proveedores externos."
      />
      <BusinessContextNote>
        Estos reportes no tienen un contrato de respuesta fijo (son
        diagnósticos, no un DTO estable) — se muestran como JSON estructurado
        tal como los devuelve el backend.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Calidad" ? <QualityAuditTab /> : null}
      {activeTab === "Production gate" ? <ProductionGateTab /> : null}
      {activeTab === "Readiness" ? <ReadinessTab /> : null}
      {activeTab === "SLA" ? <SlaReportTab /> : null}
      {activeTab === "Uso" ? <UsageReportTab /> : null}
      {activeTab === "Idempotencia" ? <IdempotencyAuditTab /> : null}
      {activeTab === "Retención" ? <RetentionPreviewTab /> : null}
      {activeTab === "Sanitización" ? <SanitizationAuditTab /> : null}
    </>
  );
}
