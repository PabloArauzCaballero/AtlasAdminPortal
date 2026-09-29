import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunCountsLayer } from "@/features/qa-runs/workflow-run-overlay";
import type { WorkflowStep } from "@/features/workflows/types";
import { WorkflowNodeCard } from "@/features/workflows/workflow-node";
import { WorkflowStepDetail } from "@/features/workflows/workflow-step-detail";
import { renderWithProviders } from "../../../helpers/render-with-providers";

/**
 * Un paso que hace una persona (p. ej. `accounting_documents_cycle/accounting_approval`) llega del
 * catálogo sin método ni ruta. El árbol reventaba con `null.length` al pintarlo.
 */
function manualStep(): WorkflowStep {
  return {
    stepId: "1",
    stepCode: "accounting_approval",
    name: "Aprobar el asiento",
    description: null,
    endpointCode: null,
    httpMethod: null,
    routePath: null,
    executionOrder: 10,
    isMandatory: true,
    isRepeatable: false,
    requiresAuth: true,
    requiresIdempotencyKey: false,
    isFlowEntry: false,
    isFlowExit: false,
    allowedRoles: [],
    requiredStates: [],
    resultingStates: [],
    inputContract: {},
    outputContract: {},
    validationRules: [],
    possibleErrors: [],
    retryStrategy: {},
    producesEvents: [],
    consumesEvents: [],
    successCriteria: {},
    failureCriteria: {},
    dependsOn: [],
    previousStepCodes: [],
    nextStepCodes: [],
  };
}

const node = {
  id: "accounting_approval",
  step: manualStep(),
  stageCode: "approval",
  actorType: "ERP_PORTAL",
  x: 0,
  y: 0,
  width: 220,
  height: 80,
};

describe("paso del flujo que hace una persona", () => {
  it("el nodo se pinta como MANUAL en vez de romper el árbol", () => {
    render(
      <svg>
        <WorkflowNodeCard
          node={node}
          selected={false}
          highlighted={false}
          dimmed={false}
        />
      </svg>,
    );
    expect(screen.getByText("MANUAL")).toBeInTheDocument();
    expect(screen.getByText("lo hace una persona")).toBeInTheDocument();
  });

  it("el detalle no ofrece probar un endpoint que no existe", () => {
    renderWithProviders(<WorkflowStepDetail step={manualStep()} />);
    expect(screen.getByText(/Sin operación/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Enviar/ }),
    ).not.toBeInTheDocument();
  });

  it("la capa de corridas QA lo salta sin normalizar una ruta nula", () => {
    const counts = new Map([
      ["GET /x", { passed: 1, failed: 0, skipped: 0, pending: 0 }],
    ]);
    render(
      <svg>
        <RunCountsLayer nodes={[node]} counts={counts as never} />
      </svg>,
    );
  });
});
