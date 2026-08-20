"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useActiveDecisionArtifacts } from "@/features/systems/hooks";
import type { ActiveArtifact } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { TrafficSplit } from "./traffic-split";

export function ActiveArtifactsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.decisionEngine.artifacts.read"]}>
      <AuthorizedActiveArtifactsPage />
    </PermissionGate>
  );
}

function AuthorizedActiveArtifactsPage() {
  const artifacts = useActiveDecisionArtifacts();
  const [q, setQ] = useState("");
  const [environment, setEnvironment] = useState("");
  const report = artifacts.data;
  // Envuelto en useMemo y no `?? []` a secas: un literal nuevo en cada render invalidaría los dos
  // useMemo de abajo en cada tecla escrita en el buscador, recalculando el filtro sobre la lista
  // entera sin que nada haya cambiado.
  const items = useMemo(() => report?.items ?? [], [report?.items]);

  const environmentOptions = useMemo(
    () =>
      [...new Set(items.map((item) => item.environmentCode))].map((code) => ({
        label: code,
        value: code,
      })),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesEnvironment =
          !environment || item.environmentCode === environment;
        const needle = q.trim().toLowerCase();
        const matchesText =
          !needle ||
          item.artifactCode.toLowerCase().includes(needle) ||
          item.artifactName.toLowerCase().includes(needle) ||
          (item.ownerTeam ?? "").toLowerCase().includes(needle);
        return matchesEnvironment && matchesText;
      }),
    [items, environment, q],
  );

  const columns = useMemo<ColumnDef<ActiveArtifact>[]>(
    () => [
      {
        header: "Artefacto",
        accessorKey: "artifactCode",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold">
              {row.original.artifactCode}
            </p>
            <p className="mt-1 text-xs text-atlas-muted">
              {safeText(row.original.artifactName)}
            </p>
          </div>
        ),
      },
      {
        header: "Tipo",
        accessorKey: "artifactType",
        cell: ({ row }) => (
          <Badge tone={row.original.artifactType ? "info" : "muted"}>
            {row.original.artifactType ?? "Sin tipo"}
          </Badge>
        ),
      },
      {
        header: "Versión desplegada",
        accessorKey: "versionNumber",
        cell: ({ row }) => (
          <div className="text-xs">
            <p className="font-mono font-semibold">
              {row.original.versionNumber !== null
                ? `v${row.original.versionNumber}`
                : "—"}
              {row.original.semanticVersion
                ? ` (${row.original.semanticVersion})`
                : ""}
            </p>
            <p className="mt-1 text-atlas-muted">
              {row.original.versionStatus ?? "—"}
            </p>
          </div>
        ),
      },
      {
        header: "Ambiente",
        accessorKey: "environmentCode",
        cell: ({ row }) => (
          <Badge
            tone={
              row.original.environmentCode === "PROD" ? "critical" : "default"
            }
          >
            {row.original.environmentCode}
          </Badge>
        ),
      },
      {
        header: "Despliegue",
        accessorKey: "deploymentStatus",
        cell: ({ row }) => (
          <div className="text-xs">
            <StatusBadge value={row.original.deploymentStatus} />
            <p className="mt-1 font-mono text-atlas-muted">
              {row.original.deploymentMode}
            </p>
          </div>
        ),
      },
      {
        header: "Tráfico",
        cell: ({ row }) => <TrafficSplit rules={row.original.trafficRules} />,
      },
      {
        header: "Vigente desde",
        accessorKey: "effectiveFrom",
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDateTime(row.original.effectiveFrom)}
          </span>
        ),
      },
      {
        header: "Desplegado por",
        accessorKey: "deployedBy",
        cell: ({ row }) => (
          <div className="text-xs">
            <p>{safeText(row.original.deployedBy)}</p>
            <p className="mt-1 text-atlas-muted">
              {formatDateTime(row.original.deployedAt)}
            </p>
          </div>
        ),
      },
      {
        header: "Equipo",
        accessorKey: "ownerTeam",
        cell: ({ row }) => row.original.ownerTeam ?? "—",
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Artefactos activos del motor"
        description="Todo lo que el ATLAS Decision Engine tiene DESPLEGADO ahora mismo, desde `/systems/decision-engine/artifacts`."
        actions={
          <Button
            onClick={() => void artifacts.refetch()}
            isLoading={artifacts.isFetching}
            loadingText="Actualizando…"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />
      <BusinessContextNote>
        «¿Qué política decidió este crédito?» es la primera pregunta de
        cualquier investigación, y hasta ahora había que entrar al motor para
        contestarla. Cada fila es un <strong>despliegue activo</strong>, no un
        artefacto con buen aspecto: un artefacto marcado
        <span className="font-mono"> DEPLOYED_TO_PROD</span> cuyo despliegue fue
        superado sigue diciendo eso, pero ya no decide nada. Si hay más de una
        regla de tráfico, ese artefacto no está resolviendo el 100 % de los
        casos — y eso cambia cómo se lee cualquier métrica suya.
      </BusinessContextNote>

      {report && report.status !== "OK" ? (
        <div className="animate-slide-up flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 text-sm text-amber-800">
            <p className="font-semibold">
              {report.status === "NOT_CONFIGURED"
                ? "El motor de decisión no está configurado en este despliegue"
                : "El motor de decisión no contestó"}
            </p>
            <p className="mt-1 break-words text-xs text-amber-700">
              {safeText(report.message)}
            </p>
          </div>
        </div>
      ) : null}

      {report && report.status === "OK" ? (
        <p className="animate-fade-in text-xs text-atlas-muted">
          {formatDateTime(report.generatedAt)} · {items.length} despliegue(s)
          activo(s)
          {report.environmentFilter
            ? ` · ambiente por defecto de Atlas: ${report.environmentFilter}`
            : ""}
        </p>
      ) : null}

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o equipo…"
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "environment") setEnvironment(value);
        }}
        onClear={() => {
          setQ("");
          setEnvironment("");
        }}
        filters={[
          {
            name: "environment",
            label: "Ambiente",
            value: environment,
            options: environmentOptions,
          },
        ]}
      />

      {artifacts.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {artifacts.error ? (
        <ErrorState
          description={
            isAtlasApiError(artifacts.error)
              ? artifacts.error.message
              : "No se pudieron cargar los artefactos del motor."
          }
          requestId={
            isAtlasApiError(artifacts.error)
              ? artifacts.error.requestId
              : undefined
          }
          onRetry={() => void artifacts.refetch()}
        />
      ) : null}
      {report ? <DataTable data={filtered} columns={columns} /> : null}
    </>
  );
}
