"use client";

import { BadgeCheck } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { fecha } from "../async/labels";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";
import { useDocumentationGate } from "./hooks";
import type { DocumentationGateCheck } from "./types";

/**
 * La compuerta de antes de certificar, calculada por el backend sobre el estado VIVO del catálogo.
 *
 * Que no pase no es un error de la página: es la respuesta. Lo que importa es que cada comprobación
 * diga su cifra, para que «no se puede certificar» se pueda convertir en una lista de trabajo.
 */
export function DocumentationGatePage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedDocumentationGatePage />
    </PermissionGate>
  );
}

function AuthorizedDocumentationGatePage() {
  const query = useDocumentationGate();
  const gate = query.data;
  const fallan = gate?.checks.filter(
    (check) => !check.passed && check.measured !== false,
  ).length;
  const sinMedir = gate?.checks.filter(
    (check) => check.measured === false,
  ).length;

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        eyebrow="Systems Ops · Mapa de rutas"
        title="Compuerta de documentación"
        description="Antes de certificar: flujos CRITICAL verificados sobre su código actual, sin escrituras desprotegidas ni deriva de permisos grave abiertas, cola de revisión sin pendientes de riesgo alto y el artefacto de cada bloque cargado."
      />
      <FlowCatalogNotLoaded />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Resultado"
          value={
            gate
              ? gate.passed
                ? "Se puede certificar"
                : gate.artifactsLoaded === false
                  ? "Nada cargado que evaluar"
                  : "No se puede certificar"
              : "—"
          }
          icon={BadgeCheck}
          tone={gate?.passed ? "success" : "warning"}
        />
        <MetricCard
          label="Comprobaciones que fallan"
          value={fallan ?? "—"}
          tone={
            fallan === undefined ? "default" : fallan ? "warning" : "success"
          }
        />
        <MetricCard
          label="Sin medir"
          value={sinMedir ?? "—"}
          tone={sinMedir ? "warning" : "default"}
        />
        <MetricCard
          label="Evaluada"
          value={gate ? fecha(gate.evaluatedAt) : "—"}
        />
      </div>
      {query.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo evaluar la compuerta."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      <div className="space-y-3">
        {gate?.checks.map((check) => (
          <Card key={check.code}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-col gap-1">
                <span className="font-mono text-xs">{check.code}</span>
                <span className="text-sm">{check.detail}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-lg font-semibold">
                  {check.measured === false && !check.count ? "—" : check.count}
                </span>
                <CheckBadge check={check} />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

/** Tres estados, no dos: una comprobación que no se pudo medir no «falla» ni «pasa». */
function CheckBadge({ check }: Readonly<{ check: DocumentationGateCheck }>) {
  if (check.measured === false)
    return (
      <Badge tone="muted" dot>
        Sin medir
      </Badge>
    );
  return (
    <Badge tone={check.passed ? "success" : "critical"} dot>
      {check.passed ? "Pasa" : "Falla"}
    </Badge>
  );
}
