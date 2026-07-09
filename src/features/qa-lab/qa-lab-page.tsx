"use client";

import { useState } from "react";
import Link from "next/link";
import { useEndpoint } from "@/features/systems/hooks";
import {
  MethodBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { EndpointPicker } from "./endpoint-picker";
import { EndpointTestCard } from "./endpoint-test-card";
import { StressTestCard } from "./stress-test-card";

export function QaLabPage({
  initialEndpointId,
}: Readonly<{ initialEndpointId: string }>) {
  const [endpointId, setEndpointId] = useState(initialEndpointId);
  const endpoint = useEndpoint(endpointId);

  return (
    <PermissionGate permissions={["systems.endpoints.read"]}>
      <PageHeader
        eyebrow="QA Console"
        title="Laboratorio de testing"
        description="Selecciona un endpoint, ejecuta una prueba funcional y prepara una prueba de stress controlada desde la misma vista."
        actions={
          <>
            <Link href="/internal/qa/runs">
              <Button>Historial QA</Button>
            </Link>
            <Link href="/internal/qa/stress/runs">
              <Button>Stress runs</Button>
            </Link>
          </>
        }
      />
      <div className="space-y-6">
        <EndpointPicker selectedId={endpointId} onSelect={setEndpointId} />
        {endpointId ? <SelectedEndpointState endpoint={endpoint} /> : null}
        {endpoint.data ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <EndpointTestCard
              endpointId={endpointId}
              endpoint={endpoint.data.endpoint}
            />
            <StressTestCard
              endpointId={endpointId}
              endpoint={endpoint.data.endpoint}
            />
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}

function SelectedEndpointState({
  endpoint,
}: Readonly<{ endpoint: ReturnType<typeof useEndpoint> }>) {
  if (endpoint.isLoading) return <LoadingSkeleton rows={3} />;
  if (endpoint.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(endpoint.error)
            ? endpoint.error.message
            : "No se pudo cargar el endpoint seleccionado."
        }
        requestId={
          isAtlasApiError(endpoint.error) ? endpoint.error.requestId : undefined
        }
        onRetry={() => void endpoint.refetch()}
      />
    );
  }
  if (!endpoint.data) return null;
  const item = endpoint.data.endpoint;
  return (
    <section className="rounded-2xl border border-atlas-border bg-white p-5 shadow-subtle">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MethodBadge method={item.method} />
        <RiskBadge value={item.riskLevel} />
        <StatusBadge value={item.status} />
        <Link
          className="ml-auto text-sm font-medium text-blue-700 hover:underline"
          href={`/internal/systems/endpoints/${item.endpointId}`}
        >
          Ver ficha completa
        </Link>
      </div>
      <KeyValueGrid
        items={[
          { label: "Ruta", value: item.fullPath ?? item.routePath, mono: true },
          { label: "Módulo", value: item.module },
          { label: "Acción", value: item.businessAction ?? item.routeName },
          { label: "Testable", value: item.isTestableFromPortal },
          { label: "Stress requerido", value: item.requiresStressTest },
          { label: "Owner", value: item.ownerTeam },
        ]}
      />
    </section>
  );
}
