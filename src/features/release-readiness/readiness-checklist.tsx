"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import type { ReadyItem } from "./readiness-types";

const READY_STATUS_OPTIONS = [
  {
    value: "OK",
    label: "Listo",
    description: "La comprobación se cumple: no frena el release.",
  },
  {
    value: "NEEDS_REVIEW",
    label: "Por revisar",
    description: "Hay una advertencia: conviene mirarla antes de avanzar.",
  },
  {
    value: "BLOCKED",
    label: "Bloqueado",
    description: "La comprobación falla y frena el release.",
  },
];

const CHECK_COLUMNS: ColumnDef<ReadyItem>[] = [
  {
    header: "Comprobación",
    accessorKey: "label",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.label}</span>
    ),
  },
  {
    header: "Detalle",
    accessorKey: "detail",
    cell: ({ row }) => (
      <span className="text-atlas-muted">{row.original.detail}</span>
    ),
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
];

const CHECK_FILTERS: LocalListFilter<ReadyItem>[] = [
  {
    name: "status",
    label: "Estado",
    tooltip:
      "Deja sólo las comprobaciones con ese resultado: listas, por revisar o bloqueadas.",
    options: READY_STATUS_OPTIONS,
    test: (row, value) => row.status === value,
  },
];

export function ReadinessChecklist({
  items,
}: Readonly<{ items: ReadyItem[] }>) {
  return (
    <section>
      <SectionHeader
        title="Checklist de release"
        description="Detecta deuda de catálogo, QA, gobierno y riesgo antes de avanzar."
      />
      <LocalListTable
        rows={items}
        columns={CHECK_COLUMNS}
        searchText={(item) => `${item.label} ${item.detail}`}
        searchPlaceholder="Buscar por comprobación o detalle…"
        searchTooltip="Recorre las comprobaciones del release, que llegan enteras del servidor: coincide con parte del nombre o del detalle."
        filters={CHECK_FILTERS}
        emptyTitle="El release no declara comprobaciones."
        emptyFilteredTitle="Ninguna comprobación coincide con la búsqueda."
      />
    </section>
  );
}

export function ReadinessActions() {
  const actions = [
    ["Resolver revisión", "/internal/review-queue"],
    ["Sincronizar catálogo", "/internal/settings/catalog-sync"],
    ["Cerrar issues calidad", "/internal/data-quality/issues"],
    ["Revisar gobierno", "/internal/governance/policies"],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Acciones recomendadas"
          description="Pantallas donde se resuelven pendientes."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(([label, href]) => (
          <Link
            key={href}
            className="rounded-md border border-atlas-border p-4 text-sm font-medium hover:bg-atlas-soft"
            href={href}
          >
            {label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
