"use client";

import { useState } from "react";
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
        title="Historial de auditoría"
        description="Consulta las acciones realizadas dentro de la plataforma, identifica quién realizó cada operación y revisa su resultado, su riesgo y su rastro técnico."
      />
      <BusinessContextNote>
        Cuando algo sale mal para un cliente — un pago rechazado, una decisión
        de riesgo incorrecta, un dato que cambió sin explicación — alguien
        necesita reconstruir exactamente qué pasó, cuándo y quién lo hizo. Esta
        auditoría existe para eso: es el registro forense de la plataforma.
        <br />
        <strong>Ejemplo:</strong> para investigar un cambio no explicado en una
        ficha, filtra por <em>Módulo</em> = <code>customers</code>,{" "}
        <em>Método</em> = <code>PATCH</code> y el rango de fechas del incidente;
        después abre el evento para ver el actor, el registro afectado y su
        identificador de petición.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Terminal backend" ? <MongoLogsSection /> : null}
      {activeTab === "Auditoría SQL" ? <AuditSqlSection /> : null}
    </>
  );
}
