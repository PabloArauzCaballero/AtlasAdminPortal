"use client";

import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { EmptyState } from "@/shared/components/ui/states";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type { ContextItem } from "./catalog-version-types";

/** Ficha de un item del catálogo: atributos, alias y mapeos de riesgo completos. */
export function CatalogItemDetailDrawer({
  item,
  onClose,
}: Readonly<{ item: ContextItem; onClose: () => void }>) {
  return (
    <DrawerPanel open title={`Item ${item.itemCode}`} onClose={onClose}>
      <div className="space-y-6">
        <KeyValueGrid
          items={[
            { label: "Código", value: item.itemCode, mono: true },
            { label: "Nombre", value: item.itemName },
            { label: "Tipo", value: item.itemType },
            { label: "Confianza", value: safeText(item.confidenceScore) },
            { label: "Fuente", value: safeText(item.sourceId), mono: true },
            { label: "Activo", value: item.isActive },
          ]}
        />

        <section>
          <SectionHeader
            title="Atributos"
            description="Payload JSON libre que el item aporta a las reglas."
          />
          <JsonViewer value={item.attributes} />
        </section>

        <section>
          <SectionHeader
            title={`Alias (${item.aliases.length})`}
            description="Formas alternativas con las que el motor reconoce este item."
          />
          {item.aliases.length === 0 ? (
            <EmptyState title="El item no tiene alias registrados." />
          ) : (
            <ul className="space-y-2">
              {item.aliases.map((alias) => (
                <li
                  key={alias.aliasId}
                  className="rounded-lg border border-atlas-border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-medium">{alias.aliasValue}</strong>
                    <Badge tone="info">{alias.aliasType}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-atlas-muted">
                    Normalizado:{" "}
                    <span className="font-mono">{alias.normalizedAlias}</span> ·
                    Confianza: {safeText(alias.confidenceScore)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeader
            title={`Mapeos de riesgo (${item.riskMappings.length})`}
            description="Cuánto pesa este item en cada dimensión de riesgo y con qué motivo."
          />
          {item.riskMappings.length === 0 ? (
            <EmptyState title="El item no tiene mapeos de riesgo." />
          ) : (
            <ul className="space-y-2">
              {item.riskMappings.map((mapping) => (
                <li
                  key={mapping.riskMappingId}
                  className="rounded-lg border border-atlas-border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="font-medium">
                      {mapping.riskDimension} · {mapping.riskBand}
                    </strong>
                    <Badge tone="warning">
                      {safeText(mapping.scorePointsSuggested)} pts
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-atlas-muted">
                    Motivo:{" "}
                    <span className="font-mono">{mapping.reasonCode}</span> ·
                    Uso: {safeText(mapping.modelUsage)} · Vigencia:{" "}
                    {formatDateTime(mapping.validFrom)} →{" "}
                    {formatDateTime(mapping.validUntil)}
                  </p>
                  {mapping.explanation ? (
                    <p className="mt-2 text-sm">{mapping.explanation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DrawerPanel>
  );
}
