"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SectionTable } from "@/shared/components/data-table/section-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { formatDateTime, safeText } from "@/shared/lib/format";
import type {
  ContextItem,
  ContextItemAlias,
  ContextItemRiskMapping,
} from "./catalog-version-types";

const COLUMNAS_ALIAS: ColumnDef<ContextItemAlias>[] = [
  { header: "Valor", accessorKey: "aliasValue" },
  {
    header: "Tipo",
    accessorKey: "aliasType",
    cell: ({ row }) => <Badge tone="info">{row.original.aliasType}</Badge>,
  },
  {
    header: "Normalizado",
    accessorKey: "normalizedAlias",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.normalizedAlias}</span>
    ),
  },
  {
    header: "Confianza",
    accessorFn: (alias) => safeText(alias.confidenceScore),
  },
];

const COLUMNAS_MAPEOS: ColumnDef<ContextItemRiskMapping>[] = [
  { header: "Dimensión", accessorKey: "riskDimension" },
  { header: "Banda", accessorKey: "riskBand" },
  {
    header: "Puntos",
    accessorFn: (mapping) => safeText(mapping.scorePointsSuggested),
    cell: ({ row }) => (
      <Badge tone="warning">
        {safeText(row.original.scorePointsSuggested)} pts
      </Badge>
    ),
  },
  {
    header: "Motivo",
    accessorKey: "reasonCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.reasonCode}</span>
    ),
  },
  { header: "Uso", accessorFn: (mapping) => safeText(mapping.modelUsage) },
  {
    header: "Vigencia",
    accessorFn: (mapping) => mapping.validFrom ?? "",
    cell: ({ row }) =>
      `${formatDateTime(row.original.validFrom)} → ${formatDateTime(row.original.validUntil)}`,
  },
  {
    header: "Explicación",
    accessorFn: (mapping) => mapping.explanation ?? "—",
  },
];

/** Ficha de un item del catálogo: atributos, alias y mapeos de riesgo completos. */
export function CatalogItemDetailDrawer({
  item,
  onClose,
}: Readonly<{ item: ContextItem; onClose: () => void }>) {
  return (
    <DrawerPanel open title={`Elemento ${item.itemCode}`} onClose={onClose}>
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
            description="Datos extra que este elemento aporta a las reglas."
          />
          <JsonViewer value={item.attributes} />
        </section>

        <SectionTable
          title="Alias"
          description="Formas alternativas con las que el motor reconoce este elemento."
          data={item.aliases}
          columns={COLUMNAS_ALIAS}
          searchText={(alias) =>
            `${alias.aliasValue} ${alias.aliasType} ${alias.normalizedAlias}`
          }
          searchPlaceholder="Buscar alias…"
          searchTooltip="Recorre todos los alias del elemento, que llegan enteros con él: coincide con parte del valor, del tipo o del valor normalizado."
          emptyTitle="El elemento no tiene alias registrados."
          emptyDescription="Añade alias creando una versión nueva del catálogo."
        />

        <SectionTable
          title="Mapeos de riesgo"
          description="Cuánto pesa este elemento en cada dimensión de riesgo y con qué motivo."
          data={item.riskMappings}
          columns={COLUMNAS_MAPEOS}
          searchText={(mapping) =>
            `${mapping.riskDimension} ${mapping.riskBand} ${mapping.reasonCode} ${mapping.modelUsage ?? ""} ${mapping.explanation ?? ""}`
          }
          searchPlaceholder="Buscar mapeo de riesgo…"
          searchTooltip="Recorre todos los mapeos del elemento, que llegan enteros con él: coincide con parte de la dimensión, la banda, el motivo, el uso o la explicación."
          emptyTitle="El elemento no tiene mapeos de riesgo."
          emptyDescription="Añade mapeos creando una versión nueva del catálogo."
        />
      </div>
    </DrawerPanel>
  );
}
