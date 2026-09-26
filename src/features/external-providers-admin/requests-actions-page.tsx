"use client";

import { useState } from "react";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import {
  ApproveRequestTab,
  RebuildFeaturesTab,
  RetryRequestTab,
} from "./approve-retry-request-tabs";
import { PolicyPreviewTab } from "./policy-preview-tab";
import { RequestsListTab } from "./requests-list-tab";
import { Inbox } from "lucide-react";

const tabs = [
  "Listado",
  "Aprobar",
  "Reintentar",
  "Reconstruir features",
  "Vista previa de política",
];

export function RequestsActionsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <>
      <PageHeader
        icon={Inbox}
        eyebrow="Proveedores externos"
        title="Solicitudes a proveedores"
        description="Las consultas hechas a proveedores externos, con lo que pasó con cada una, y las acciones que se pueden tomar sobre una en concreto."
      />
      <BusinessContextNote>
        Las acciones trabajan sobre UNA solicitud, identificada por su ID. El
        listado es de dónde se saca: cada fila copia su identificador con un
        clic. Aprobar y editar costos está restringido a{" "}
        <span className="font-mono">admin</span>/
        <span className="font-mono">platform_admin</span> en el backend.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Listado" ? <RequestsListTab /> : null}
      {activeTab === "Aprobar" ? <ApproveRequestTab /> : null}
      {activeTab === "Reintentar" ? <RetryRequestTab /> : null}
      {activeTab === "Reconstruir features" ? <RebuildFeaturesTab /> : null}
      {activeTab === "Vista previa de política" ? <PolicyPreviewTab /> : null}
    </>
  );
}
