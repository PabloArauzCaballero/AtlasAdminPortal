"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { ProviderAuthSection } from "./provider-auth-section";
import {
  ProviderCategoryLabel,
  ProviderHealthBadge,
  ProviderModeBadge,
  ProviderStatusBadge,
} from "./provider-badges";
import { ProviderCostPoliciesSection } from "./provider-cost-policies-section";
import { ProviderRuntimeForm } from "./provider-runtime-form";
import { ProviderTestForm } from "./provider-test-form";
import type { ProviderRow } from "./provider-columns";

// "Autenticación" va justo después de "Runtime": ambas responden a "¿por qué este proveedor no
// está respondiendo?", y separarlas del bloque de costos evita confundir un fallo de credencial
// con un bloqueo por política de gasto.
const tabs = ["Resumen", "Runtime", "Autenticación", "Costos", "Probar"];

export function ProviderDetailDrawer({
  provider,
  onClose,
}: Readonly<{ provider: ProviderRow; onClose: () => void }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <DrawerPanel
      open
      title={`${provider.name} (${provider.code})`}
      onClose={onClose}
    >
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Resumen" ? (
        <KeyValueGrid
          items={[
            { label: "Código", value: provider.code, mono: true },
            {
              label: "Categoría",
              value: <ProviderCategoryLabel value={provider.category} />,
            },
            // Las mismas insignias que la tabla de la que se abrió este panel: si el operador
            // acaba de leer «Caído» en rojo en la fila, encontrarse aquí un `DOWN` en texto
            // llano le obliga a traducir dos veces lo mismo.
            {
              label: "Estado",
              value: <ProviderStatusBadge value={provider.status} />,
            },
            {
              label: "Modo por defecto",
              value: <ProviderModeBadge value={provider.defaultMode} />,
            },
            {
              label: "Requiere consentimiento",
              value: provider.requiresConsent,
            },
            {
              label: "Requiere aprobación manual",
              value: provider.requiresManualApproval,
            },
            { label: "Costoso", value: provider.isCostly },
            { label: "Descripción", value: provider.description },
            {
              label: "Salud",
              value: <ProviderHealthBadge value={provider.health?.status} />,
            },
            {
              label: "Latencia",
              value: provider.health
                ? `${formatNumber(provider.health.latencyMs)} ms`
                : null,
            },
            // La fecha, en el formato del portal y no en ISO crudo: «2026-09-06T10:02:00.000Z»
            // obliga a hacer la cuenta del huso mentalmente para saber si la sonda es de hace un
            // minuto o de hace tres días, que es lo único que se le pregunta a este campo.
            {
              label: "Último chequeo",
              value: provider.health
                ? formatDateTime(provider.health.checkedAt)
                : null,
            },
          ]}
        />
      ) : null}
      {activeTab === "Runtime" ? (
        <ProviderRuntimeForm provider={provider} />
      ) : null}
      {activeTab === "Autenticación" ? (
        <ProviderAuthSection providerCode={provider.code} />
      ) : null}
      {activeTab === "Costos" ? (
        <ProviderCostPoliciesSection providerCode={provider.code} />
      ) : null}
      {activeTab === "Probar" ? (
        <ProviderTestForm providerCode={provider.code} />
      ) : null}
    </DrawerPanel>
  );
}
