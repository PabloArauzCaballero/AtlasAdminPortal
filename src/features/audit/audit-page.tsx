"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { AuditSqlSection } from "./audit-sql-section";
import { MongoLogsSection } from "./mongo-logs-section";

const tabs = ["Registro del sistema", "Auditoría de acciones"];

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
        title="Registro y auditoría del sistema"
        description="Las acciones registradas en el sistema y, en la otra pestaña, el registro técnico completo tal como lo escribe el sistema."
      />
      <BusinessContextNote>
        Cuando algo sale mal para un cliente — un pago rechazado, una decisión
        de riesgo incorrecta, un dato que cambió sin explicación — alguien
        necesita reconstruir exactamente qué pasó, cuándo y quién lo hizo. Esta
        auditoría existe para eso: es el registro forense de la plataforma.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Registro del sistema" ? <MongoLogsSection /> : null}
      {activeTab === "Auditoría de acciones" ? <AuditSqlSection /> : null}
    </>
  );
}
