"use client";

import { useState } from "react";
import Link from "next/link";
import { Gauge, TestTube } from "lucide-react";
import { useLabEndpoint as useEndpoint } from "./endpoint-lookup";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/layout/page-header";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { TutorialLaunchButton } from "@/features/qa-tutorials/tutorial-launch-button";
import { WorkflowCanvas } from "@/features/workflows/workflow-canvas";
import { JourneysTab } from "@/features/qa-runs/journeys-tab";
import { useRunIdParam } from "@/features/qa-runs/run-url";
import { EndpointPicker } from "./endpoint-picker";
import { TABS, UNIT_TABS, useUrlTabs } from "./qa-lab-tabs";
import { EndpointTestCard } from "./endpoint-test-card";
import { JourneyRunnerPanel } from "./journey-runner-panel";
import { QaLabDocsPanel } from "./qa-lab-docs";
import { SelectedEndpointBar } from "./selected-endpoint-bar";
import { StressTestCard } from "./stress-test-card";

/** Cada pestaña abre el recorrido que explica esa herramienta, no uno genérico. */
const TUTORIAL_BY_TAB: Record<string, string> = {
  [TABS[0]]: "qa-lab-functional",
  [TABS[1]]: "qa-lab-journey",
  [TABS[2]]: "qa-lab-decision-tree",
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
  const { activeTab, unitTab, setActiveTab, setUnitTab } = useUrlTabs();
  // La corrida que se mira (journeys y árbol) vive en `?runId=`: sobrevive a un F5.
  const run = useRunIdParam();
  const [endpointId, setEndpointId] = useState(initialEndpointId);
  const [picking, setPicking] = useState(!initialEndpointId);
  const endpoint = useEndpoint(endpointId);
  const item = endpoint.data?.endpoint;

  function select(nextId: string) {
    setEndpointId(nextId);
    setPicking(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="QA Console"
        title="Laboratorio de testing"
        description="Prueba una operación suelta —si responde bien y cuánta carga aguanta—, encadena varias en un recorrido que reproduce un flujo real de negocio, o mira el árbol de decisión del recorrido estándar. Las pruebas sueltas corren en tu navegador y no se guardan: descarga el registro si necesitas conservarlas."
        actions={
          <>
            <TutorialLaunchButton
              tutorialId={TUTORIAL_BY_TAB[activeTab] ?? "qa-lab-overview"}
            />
            <Link href="/internal/qa/aprender">
              <Button>Centro de aprendizaje</Button>
            </Link>
            <Link href="/internal/qa/guia" data-tutorial-id="qa-lab-guide-link">
              <Button>Guía</Button>
            </Link>
          </>
        }
      />
      <div data-tutorial-id="qa-lab-tabs">
        <DetailTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === TABS[0] ? (
        <div className="space-y-5">
          <QaLabDocsPanel />

          {/* Un único ancla para «dónde se elige el endpoint», esté la lista
              abierta o ya haya uno elegido: el tutorial siempre encuentra algo. */}
          <div data-tutorial-id="qa-lab-endpoint-picker">
            {picking || !item ? (
              <EndpointPicker selectedId={endpointId} onSelect={select} />
            ) : (
              <div data-tutorial-id="qa-lab-endpoint-selected">
                <SelectedEndpointBar
                  endpoint={item}
                  onChange={() => setPicking(true)}
                />
              </div>
            )}
          </div>

          {endpointId && !picking ? (
            <EndpointState endpoint={endpoint} />
          ) : null}

          {item && !picking ? (
            <>
              {/*
                Funcional y carga eran DOS columnas simultáneas de unos treinta campos cada una: la
                pantalla pedía configurar las dos pruebas a la vez para lanzar una sola. Como
                pestañas, cada una ocupa el ancho completo, sus campos respiran y no compiten por la
                atención con la que no se está usando.
              */}
              <DetailTabs
                tabs={UNIT_TABS}
                active={unitTab}
                onChange={setUnitTab}
              />
              {unitTab === UNIT_TABS[0] ? (
                <div data-tutorial-id="qa-lab-functional-card">
                  <EndpointTestCard endpointId={endpointId} endpoint={item} />
                </div>
              ) : (
                <div data-tutorial-id="qa-lab-stress-card">
                  <StressTestCard endpointId={endpointId} endpoint={item} />
                </div>
              )}
            </>
          ) : null}

          {!endpointId ? <PickPrompt /> : null}
        </div>
      ) : null}

      {activeTab === TABS[1] ? (
        <div data-tutorial-id="qa-lab-journey-panel">
          <JourneysTab
            runId={run.runId}
            onRunIdChange={run.setRunId}
            advancedEditor={<JourneyRunnerPanel />}
          />
        </div>
      ) : null}

      {activeTab === TABS[2] ? (
        <WorkflowCanvas
          runControls={{ runId: run.runId, onRunIdChange: run.setRunId }}
        />
      ) : null}
    </>
  );
}

function PickPrompt() {
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-atlas-muted">
      <TestTube className="h-4 w-4 text-atlas-accent" aria-hidden />
      Elige una operación arriba para configurar su prueba funcional y su prueba
      de carga.
    </p>
  );
}

function EndpointState({
  endpoint,
}: Readonly<{ endpoint: ReturnType<typeof useEndpoint> }>) {
  if (endpoint.isLoading) return <LoadingSkeleton rows={2} />;
  if (endpoint.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(endpoint.error)
            ? endpoint.error.message
            : "No se pudo cargar la operación elegida."
        }
        requestId={
          isAtlasApiError(endpoint.error) ? endpoint.error.requestId : undefined
        }
        onRetry={() => void endpoint.refetch()}
      />
    );
  }
  if (!endpoint.data) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <Gauge className="h-4 w-4 shrink-0" aria-hidden />
        No se encontró ninguna operación con ese identificador en el catálogo.
      </p>
    );
  }
  return null;
}
