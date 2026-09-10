"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GitBranch, ShieldAlert, ShieldOff, Waypoints } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import {
  Badge,
  BlockBadge,
  MethodBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { FlowDetailDrawer } from "./flow-detail-drawer";
import { FlowsFindingsTable } from "./flows-findings-table";
import {
  useFlowImports,
  useFlowModules,
  useFlows,
  useFlowsSummary,
  useVerifyFlowsMutation,
} from "./hooks";
import { groupCount } from "./services";
import { FLOW_CLIENTS, FLOW_RISKS, FLOW_SYSTEMS, type Flow } from "./types";

/**
 * Las columnas de la tabla de flujos.
 *
 * Salen de `flows-page.tsx` porque la pantalla pasaba de las 300 líneas que admite `yarn max-lines`
 * y noventa de ellas eran esta tabla. Es la misma convención que ya siguen `portfolio-columns` y
 * `partner-queue-columns`: la pantalla ORQUESTA —qué se pide, qué se filtra— y las columnas dicen
 * cómo se pinta cada celda.
 */
export function buildFlowColumns(
  openFlow: (flowId: string) => void,
): ColumnDef<Flow>[] {
  return [
    {
      header: "Ruta",
      accessorKey: "path",
      cell: ({ row }) => (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-left font-mono text-xs text-atlas-accent underline"
          onClick={() => openFlow(row.original.id)}
        >
          <MethodBadge method={row.original.httpMethod} />
          {row.original.path}
        </button>
      ),
    },
    {
      header: "Bloque",
      accessorKey: "systemCode",
      cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
    },
    {
      header: "Módulo",
      accessorKey: "module",
      cell: ({ row }) => (
        <Link
          className="text-atlas-accent underline"
          title="Ver grafo del módulo"
          href={`/internal/flows/graph?systemCode=${row.original.systemCode}&module=${row.original.module}`}
        >
          {row.original.module}
        </Link>
      ),
    },
    {
      header: "Riesgo",
      accessorKey: "risk",
      cell: ({ row }) => <RiskBadge value={row.original.risk} />,
    },
    {
      header: "Autorización",
      accessorKey: "isPublic",
      cell: ({ row }) => {
        const flow = row.original;
        if (flow.isPublic) return <Badge tone="warning">Pública</Badge>;
        if (flow.internalPermissions.length)
          return <Badge tone="info">Permiso interno</Badge>;
        if (flow.roles.length)
          return <Badge tone="default">{flow.roles.length} roles</Badge>;
        return <Badge tone="muted">Sólo JWT</Badge>;
      },
    },
    {
      header: "Callers",
      accessorKey: "callers",
      cell: ({ row }) =>
        row.original.callers.length ? (
          row.original.callers.join(", ")
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Señales",
      accessorKey: "findingsCount",
      cell: ({ row }) => {
        const flow = row.original;
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            <span title="Test que nombra la ruta">
              {flow.testStatus === "TESTED" ? "T✓" : "T✗"}
            </span>
            <span title="En el contrato OpenAPI">
              {flow.contractStatus === "IN_CONTRACT"
                ? "C✓"
                : flow.contractStatus === "CODE_ONLY"
                  ? "C✗"
                  : "C—"}
            </span>
            {flow.findingsCount ? (
              <Badge tone="warning">{flow.findingsCount}</Badge>
            ) : null}
          </span>
        );
      },
    },
  ];
}
