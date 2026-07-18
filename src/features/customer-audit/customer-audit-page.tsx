"use client";

import { useState } from "react";
import Link from "next/link";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { CustomerAuditEventsSection } from "./customer-audit-events-section";
import { CustomerAuditFeedSection } from "./customer-audit-feed-section";

const FEED_TAB = "Feed de auditoría";
const EVENTS_TAB = "Historial filtrado (deprecado)";
const tabs = [FEED_TAB, EVENTS_TAB];

/**
 * Las dos rutas del backend devuelven formas distintas de evento (el feed trae
 * `sourceTable`/`targetType`/`targetId` y no trae `summary`; la deprecada trae
 * `summary` y filtros). Se muestran en pestañas separadas, nunca mezcladas en una
 * sola lista, para no presentar como equivalentes datos que no lo son.
 */
export function CustomerAuditPage({
  customerId,
}: Readonly<{ customerId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <PermissionGate permissions={["audit.events.read"]}>
      <PageHeader
        eyebrow="Operaciones"
        title={`Auditoría del cliente #${customerId}`}
        description="Historial de auditoría del cliente unificado desde las 8 fuentes del backend: auditoría operativa, cambios de datos, autenticación, consentimientos, acciones del cliente, cambios de estado, fraude y revisión manual."
        actions={
          <Link
            href={`/internal/operations/customers/${encodeURIComponent(customerId)}/investigation-summary`}
            className="text-sm font-medium text-blue-700 underline"
          >
            Ver investigación
          </Link>
        }
      />
      <BusinessContextNote>
        Esta vista solo lee. Sirve para reconstruir qué le pasó a un cliente y
        quién lo hizo: cuándo cambió de estado, cuándo se autenticó, qué
        consintió y qué decisiones de riesgo o fraude se tomaron sobre él. El
        «Feed de auditoría» es la fuente completa; el «Historial filtrado» es la
        ruta anterior, que el backend va a retirar y que solo conviene usar
        cuando hace falta el resumen por evento o acotar por fechas.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === FEED_TAB ? (
        <CustomerAuditFeedSection customerId={customerId} />
      ) : null}
      {activeTab === EVENTS_TAB ? (
        <CustomerAuditEventsSection customerId={customerId} />
      ) : null}
    </PermissionGate>
  );
}
