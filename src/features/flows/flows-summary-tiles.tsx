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
import {
  FLOW_CLIENTS,
  FLOW_RISKS,
  FLOW_SYSTEMS,
  type Flow,
  type FlowsSummary,
} from "./types";
import { buildFlowColumns } from "./flows-columns";

/**
 * Las seis cifras de cabecera del mapa de flujos.
 *
 * Salen de `flows-page.tsx` porque la pantalla seguía por encima de las 300 líneas que admite
 * `yarn max-lines` después de llevarse las columnas. Son presentación pura: reciben ya calculado
 * lo que muestran, y así la pantalla queda con lo que decide qué se pide y qué se filtra.
 */
export function FlowsSummaryTiles({
  summary,
  critical,
  broken,
  stale,
  setFilter,
}: Readonly<{
  summary: FlowsSummary | undefined;
  critical: number;
  broken: number;
  stale: number;
  setFilter: (name: string, value: string) => void;
}>) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        label="Flujos"
        value={summary?.total ?? "—"}
        icon={GitBranch}
        hint="Una fila por operación HTTP de cada bloque"
      />
      <button
        type="button"
        className="text-left"
        onClick={() => setFilter("risk", "CRITICAL")}
      >
        <MetricCard
          label="Críticos"
          value={summary ? critical : "—"}
          tone="critical"
          hint="Escriben en identidad, crédito, dinero o borran"
        />
      </button>
      <button
        type="button"
        className="text-left"
        onClick={() => setFilter("verification", "BROKEN")}
      >
        <MetricCard
          label="Rotos"
          value={summary ? broken : "—"}
          tone={broken ? "critical" : "success"}
          hint="Una corrida contradijo el mapa"
        />
      </button>
      <MetricCard
        label="Desactualizados"
        value={summary ? stale : "—"}
        tone={stale ? "warning" : "default"}
        hint="Cambió código desde la última verificación"
      />
      <MetricCard
        label="Escrituras públicas"
        value={summary?.publicWrites ?? "—"}
        icon={ShieldOff}
        tone={summary?.publicWrites ? "warning" : "default"}
        hint="POST/PUT/PATCH/DELETE con @Public"
      />
      <MetricCard
        label="Críticos sin test"
        value={summary?.untestedCritical ?? "—"}
        icon={ShieldAlert}
        tone={summary?.untestedCritical ? "warning" : "success"}
        hint="Riesgo HIGH o CRITICAL sin test que nombre la ruta"
      />
    </div>
  );
}
