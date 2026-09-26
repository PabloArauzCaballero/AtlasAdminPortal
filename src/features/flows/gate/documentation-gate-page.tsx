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
import { useDocumentationGate } from "./hooks";

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
  const fallan = gate?.checks.filter((check) => !check.passed).length;

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        eyebrow="Systems Ops · Flujos"
        title="Compuerta de documentación"
        description="Antes de certificar: flujos CRITICAL verificados sobre su código actual, sin escrituras desprotegidas ni deriva de permisos grave abiertas, cola de revisión sin pendientes de riesgo alto y el artefacto de cada bloque cargado."
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Resultado"
          value={
            gate
              ? gate.passed
                ? "Se puede certificar"
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
                <span className="text-lg font-semibold">{check.count}</span>
                <Badge tone={check.passed ? "success" : "critical"} dot>
                  {check.passed ? "Pasa" : "Falla"}
                </Badge>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
