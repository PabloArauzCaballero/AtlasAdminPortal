"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { DomainOverviewItem } from "@/features/systems/types";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { ReviewStatusBadge } from "@/shared/components/ui/badges";
import { formatNumber } from "@/shared/lib/format";

const LINK = "text-xs font-medium text-atlas-accent underline";

const COLUMNS: ColumnDef<DomainOverviewItem>[] = [
  {
    header: "Dominio",
    accessorKey: "domainName",
    cell: ({ row }) => (
      <div data-testid={`domain-${row.original.domainCode}`}>
        <p className="font-medium text-atlas-text">{row.original.domainName}</p>
        <p className="font-mono text-xs text-atlas-muted">
          {row.original.domainCode}
          {row.original.ownerTeam ? ` · ${row.original.ownerTeam}` : ""}
        </p>
      </div>
    ),
  },
  {
    header: "Revisión",
    accessorKey: "pendingReview",
    cell: ({ row }) => (
      <ReviewStatusBadge
        value={row.original.pendingReview > 0 ? "NEEDS_REVIEW" : "APPROVED"}
      />
    ),
  },
  {
    header: "Descripción",
    accessorKey: "description",
    cell: ({ row }) => (
      <span className="block max-w-sm text-xs text-atlas-muted">
        {row.original.description?.trim() ||
          "Sin descripción registrada en el catálogo de dominios."}
      </span>
    ),
  },
  {
    header: "Operaciones",
    accessorKey: "endpoints",
    cell: ({ row }) => formatNumber(row.original.endpoints),
  },
  {
    header: "Tablas",
    accessorKey: "tables",
    cell: ({ row }) => formatNumber(row.original.tables),
  },
  {
    header: "Baterías de prueba",
    accessorKey: "testSuites",
    cell: ({ row }) => formatNumber(row.original.testSuites),
  },
  {
    header: "PII",
    accessorKey: "piiTables",
    cell: ({ row }) => formatNumber(row.original.piiTables),
  },
  {
    header: "Críticos",
    accessorKey: "criticalEndpoints",
    cell: ({ row }) => formatNumber(row.original.criticalEndpoints),
  },
  {
    header: "En revisión",
    accessorKey: "pendingReview",
    id: "pendingReviewCount",
    cell: ({ row }) => formatNumber(row.original.pendingReview),
  },
  {
    header: "Módulos",
    id: "modules",
    accessorFn: (domain) => domain.modules.join(" "),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.modules.join(" · ") || "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Ver",
    meta: { pinRight: true } satisfies AtlasColumnMeta,
    cell: ({ row }) => {
      const primaryModule =
        row.original.modules[0] ?? row.original.domainCode.toLowerCase();
      return (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/internal/systems/endpoints?q=${encodeURIComponent(primaryModule)}`}
            className={LINK}
          >
            Endpoints
          </Link>
          <Link
            href={`/internal/data-catalog/tables?q=${encodeURIComponent(primaryModule)}`}
            className={LINK}
          >
            Tablas
          </Link>
          <Link href="/internal/review-queue" className={LINK}>
            Revisión
          </Link>
        </div>
      );
    },
  },
];

const FILTERS: LocalListFilter<DomainOverviewItem>[] = [
  {
    name: "review",
    label: "Revisión",
    tooltip:
      "Separa los dominios con elementos esperando revisión de los que están al día.",
    options: [
      {
        value: "pending",
        label: "Con pendientes",
        description: "Tienen tablas o rutas esperando que alguien las revise.",
      },
      {
        value: "clean",
        label: "Al día",
        description: "No tienen nada esperando revisión.",
      },
    ],
    test: (domain, value) => (value === "pending") === domain.pendingReview > 0,
  },
  {
    name: "pii",
    label: "Datos personales",
    tooltip:
      "Separa los dominios que guardan tablas con datos personales (PII) de los que no.",
    options: [
      {
        value: "yes",
        label: "Con PII",
        description: "Al menos una de sus tablas guarda datos personales.",
      },
      {
        value: "no",
        label: "Sin PII",
        description: "Ninguna de sus tablas guarda datos personales.",
      },
    ],
    test: (domain, value) => (value === "yes") === domain.piiTables > 0,
  },
];

/**
 * Los dominios del negocio con las cifras que calcula el servidor sobre el catálogo entero. La
 * lista llega COMPLETA (son pocos): el buscador y los filtros recorren todos. La usan «Dominios y
 * glosario» y el mapa del linaje.
 */
export function DomainsTable({
  domains,
}: Readonly<{ domains: DomainOverviewItem[] }>) {
  return (
    <LocalListTable
      rows={domains}
      columns={COLUMNS}
      searchText={(domain) =>
        `${domain.domainCode} ${domain.domainName} ${domain.description ?? ""} ${domain.ownerTeam ?? ""} ${domain.modules.join(" ")}`
      }
      searchPlaceholder="Buscar dominio, nombre, descripción o módulo…"
      searchTooltip="Recorre los dominios ya calculados por el servidor (son pocos y llegan todos): código, nombre, descripción, equipo dueño y módulos."
      filters={FILTERS}
      emptyTitle="No hay dominios catalogados."
      emptyFilteredTitle="Ningún dominio coincide con la búsqueda."
    />
  );
}
