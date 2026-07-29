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
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { TutorialLaunchButton } from "@/features/qa-tutorials/tutorial-launch-button";
import { EndpointPicker } from "./endpoint-picker";
import { EndpointTestCard } from "./endpoint-test-card";
import { JourneyRunnerPanel } from "./journey-runner-panel";
import { WorkflowCanvas } from "@/features/workflows/workflow-canvas";
import { QaLabDocsPanel } from "./qa-lab-docs";
import { StressTestCard } from "./stress-test-card";

const UNIT = "Prueba unitaria";
const JOURNEY = "Journey (encadenado)";
const TREE = "Árbol de decisión";

const tabs = [UNIT, JOURNEY, TREE];

/** Cada pestaña abre el recorrido que explica esa herramienta, no uno genérico. */
const tutorialByTab: Record<string, string> = {
  [UNIT]: "qa-lab-functional",
  [JOURNEY]: "qa-lab-journey",
  [TREE]: "qa-lab-decision-tree",
};

export function QaLabPage(props: Readonly<{ initialEndpointId: string }>) {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.endpoints.read"]}>
      <AuthorizedQaLabPage {...props} />
    </PermissionGate>
  );
}

function AuthorizedQaLabPage({
  initialEndpointId,
}: Readonly<{ initialEndpointId: string }>) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [endpointId, setEndpointId] = useState(initialEndpointId);
  const endpoint = useEndpoint(endpointId);

  return (
    <>
      <PageHeader
        eyebrow="QA Console"
        title="Laboratorio de testing"
        description="Prueba unitaria de un endpoint (funcional + stress), un journey de varios endpoints encadenados, y el árbol de decisión del recorrido estándar que publica el backend."
        actions={
          <>
            <TutorialLaunchButton
              tutorialId={tutorialByTab[activeTab] ?? "qa-lab-overview"}
            />
            <Link href="/internal/qa/aprender">
              <Button>Centro de aprendizaje</Button>
            </Link>
            <Link href="/internal/qa/guia" data-tutorial-id="qa-lab-guide-link">
              <Button>Guía</Button>
            </Link>
            <Link href="/internal/qa/runs">
              <Button>Historial QA</Button>
            </Link>
            <Link href="/internal/qa/stress/runs">
              <Button>Stress runs</Button>
            </Link>
          </>
        }
      />
      <div data-tutorial-id="qa-lab-tabs">
        <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === UNIT ? (
        <UnitTestTab
          endpointId={endpointId}
          onSelect={setEndpointId}
          endpoint={endpoint}
        />
      ) : null}
      {activeTab === JOURNEY ? (
        <div data-tutorial-id="qa-lab-journey-panel">
          <JourneyRunnerPanel />
        </div>
      ) : null}
      {activeTab === TREE ? <WorkflowCanvas /> : null}
    </>
  );
}

function UnitTestTab({
  endpointId,
  onSelect,
  endpoint,
}: Readonly<{
  endpointId: string;
  onSelect: (id: string) => void;
  endpoint: ReturnType<typeof useEndpoint>;
}>) {
  return (
    <div className="space-y-6">
      <QaLabDocsPanel />
      <div data-tutorial-id="qa-lab-endpoint-picker">
        <EndpointPicker selectedId={endpointId} onSelect={onSelect} />
      </div>
      {endpointId ? <SelectedEndpointState endpoint={endpoint} /> : null}
      {endpoint.data ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div data-tutorial-id="qa-lab-functional-card">
            <EndpointTestCard
              endpointId={endpointId}
              endpoint={endpoint.data.endpoint}
            />
          </div>
          <div data-tutorial-id="qa-lab-stress-card">
            <StressTestCard
              endpointId={endpointId}
              endpoint={endpoint.data.endpoint}
            />
          </div>
        </div>
      ) : null}
    </div>
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
          className="ml-auto text-sm font-medium text-blue-700 underline"
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
