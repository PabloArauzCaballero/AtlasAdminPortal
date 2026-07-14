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

const tabs = [
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
        eyebrow="Proveedores externos"
        title="Solicitudes a proveedores"
        description="Acciones sobre solicitudes individuales a proveedores externos, identificadas por su ID."
      />
      <BusinessContextNote>
        El backend no expone un listado de solicitudes pendientes — el ID se
        obtiene de otra pantalla (investigación de cliente, logs, un webhook de
        error). Por eso cada acción acá pide el ID directamente.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Aprobar" ? <ApproveRequestTab /> : null}
      {activeTab === "Reintentar" ? <RetryRequestTab /> : null}
      {activeTab === "Reconstruir features" ? <RebuildFeaturesTab /> : null}
      {activeTab === "Vista previa de política" ? <PolicyPreviewTab /> : null}
    </>
  );
}
