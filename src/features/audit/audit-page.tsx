"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { AuditSqlSection } from "./audit-sql-section";
import { MongoLogsSection } from "./mongo-logs-section";

const tabs = ["Terminal backend", "Auditoría SQL"];

export function AuditPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["audit.events.read"]}>
      <AuthorizedAuditPage />
    </PermissionGate>
  );
}

function AuthorizedAuditPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  return (
    <>
      <PageHeader
        icon={Terminal}
        title="Terminal y auditoría del backend"
        description="Eventos registrados por Systems Ops desde `/systems/action-logs`, más el tail crudo de `Archivo.log` sincronizado a MongoDB."
      />
      <BusinessContextNote>
        Cuando algo sale mal para un cliente — un pago rechazado, una decisión
        de riesgo incorrecta, un dato que cambió sin explicación — alguien
        necesita reconstruir exactamente qué pasó, cuándo y quién lo hizo. Esta
        auditoría existe para eso: es el registro forense de la plataforma.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Terminal backend" ? <MongoLogsSection /> : null}
      {activeTab === "Auditoría SQL" ? <AuditSqlSection /> : null}
    </>
  );
}
