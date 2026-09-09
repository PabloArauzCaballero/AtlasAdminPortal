"use client";

import { useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { QualityAuditTab, ReadinessTab } from "./audit-tabs-simple";
import { ScrollText } from "lucide-react";
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

/**
 * Los nombres son lo primero que se lee y cuatro de los ocho estaban en la jerga del backend
 * («Production gate», «Readiness», «SLA», «Idempotencia»). Ahora dicen la pregunta que contestan;
 * el nombre técnico sigue apareciendo dentro de cada pestaña, en la explicación.
 */
const tabs = [
  "Configuración",
  "¿Listo para producción?",
  "Preparación",
  "Cumplimiento",
  "Consumo",
  "Consultas repetidas",
  "Purga por antigüedad",
  "Datos sensibles",
];

export function AuditsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <>
      <PageHeader
        icon={ScrollText}
        eyebrow="Proveedores externos"
        title="Auditorías y diagnóstico"
        description="Ocho comprobaciones de solo lectura sobre cómo están configurados los proveedores externos, cómo se portaron, cuánto costaron y qué se guarda de sus respuestas."
      />
      <BusinessContextNote>
        Cada pestaña explica arriba qué comprueba y cuándo se da por fallada.
        Ninguna de estas comprobaciones modifica nada: son lecturas. El detalle
        técnico completo está al final de cada una, en &quot;Ver datos
        crudos&quot;.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Configuración" ? <QualityAuditTab /> : null}
      {activeTab === "¿Listo para producción?" ? <ProductionGateTab /> : null}
      {activeTab === "Preparación" ? <ReadinessTab /> : null}
      {activeTab === "Cumplimiento" ? <SlaReportTab /> : null}
      {activeTab === "Consumo" ? <UsageReportTab /> : null}
      {activeTab === "Consultas repetidas" ? <IdempotencyAuditTab /> : null}
      {activeTab === "Purga por antigüedad" ? <RetentionPreviewTab /> : null}
      {activeTab === "Datos sensibles" ? <SanitizationAuditTab /> : null}
    </>
  );
}
