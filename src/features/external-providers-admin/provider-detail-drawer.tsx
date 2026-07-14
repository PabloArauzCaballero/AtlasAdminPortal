"use client";

import { useState } from "react";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { ProviderCostPoliciesSection } from "./provider-cost-policies-section";
import { ProviderRuntimeForm } from "./provider-runtime-form";
import { ProviderTestForm } from "./provider-test-form";
import type { ProviderRow } from "./provider-columns";

const tabs = ["Resumen", "Runtime", "Costos", "Probar"];

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
            { label: "Categoría", value: provider.category },
            { label: "Estado", value: provider.status },
            { label: "Modo por defecto", value: provider.defaultMode },
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
            { label: "Salud", value: provider.health?.status },
            { label: "Latencia (ms)", value: provider.health?.latencyMs },
            { label: "Chequeado", value: provider.health?.checkedAt },
          ]}
        />
      ) : null}
      {activeTab === "Runtime" ? (
        <ProviderRuntimeForm provider={provider} />
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
