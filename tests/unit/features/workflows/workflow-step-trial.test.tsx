import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import {
  pathParamNames,
  resolveRoutePath,
} from "@/features/workflows/services";
import type { WorkflowStep } from "@/features/workflows/types";

vi.setConfig({ testTimeout: 30000 });

const runWorkflowStepTrial = vi.hoisted(() => vi.fn());
vi.mock("@/features/workflows/services", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  runWorkflowStepTrial,
}));

const { WorkflowStepTrial } =
  await import("@/features/workflows/workflow-step-trial");

function stepFixture(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    stepId: "1",
    stepCode: "first_screen.session_start",
    name: "Abrir la sesión",
    description: null,
    endpointCode: "POST_SESSIONS_START",
    httpMethod: "POST",
    routePath: "/customers/:customerId/sessions/start",
    executionOrder: 10,
    isMandatory: true,
    isRepeatable: false,
    requiresAuth: true,
    requiresIdempotencyKey: true,
    isFlowEntry: true,
    isFlowExit: false,
    allowedRoles: [],
    requiredStates: [],
    resultingStates: [],
    inputContract: { deviceId: "string", channel: "mobile_app | web" },
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
    ...overrides,
  };
}

beforeEach(() => {
  runWorkflowStepTrial.mockReset();
  runWorkflowStepTrial.mockResolvedValue({
    method: "GET",
    path: "/auth/me",
    status: 200,
    ok: true,
    latencyMs: 12,
    body: { role: "customer" },
  });
});

describe("resolveRoutePath · parámetros de ruta", () => {
  it("sustituye los que tienen valor y respeta el resto", () => {
    expect(
      resolveRoutePath("/customers/:customerId/sessions/:sessionId/end", {
        customerId: "42",
      }),
    ).toBe("/customers/42/sessions/:sessionId/end");
  });

  it("escapa el valor: un id con barra no puede inventar otra ruta", () => {
    expect(
      resolveRoutePath("/customers/:customerId/me", { customerId: "a/b" }),
    ).toBe("/customers/a%2Fb/me");
  });

  it("enumera los parámetros que la ruta declara", () => {
    expect(
      pathParamNames("/customers/:customerId/sessions/:sessionId/end"),
    ).toEqual(["customerId", "sessionId"]);
  });
});

describe("WorkflowStepTrial · enviar un payload de prueba", () => {
  it("propone el payload a partir del contrato declarado", () => {
    renderWithProviders(<WorkflowStepTrial step={stepFixture()} />);

    const textarea = screen.getByRole("textbox", { name: "Payload de prueba" });
    expect(textarea).toHaveValue(
      JSON.stringify(
        { deviceId: "<string>", channel: "<mobile_app | web>" },
        null,
        2,
      ),
    );
  });

  it("un GET se envía directo, sin confirmación", async () => {
    renderWithProviders(
      <WorkflowStepTrial
        step={stepFixture({
          httpMethod: "GET",
          routePath: "/auth/me",
          inputContract: {},
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Enviar GET/ }));

    expect(runWorkflowStepTrial).toHaveBeenCalledWith({
      method: "GET",
      routePath: "/auth/me",
      pathParams: {},
      payload: undefined,
    });
    expect(await screen.findByText("HTTP 200")).toBeInTheDocument();
  });

  it("un método que escribe pide confirmación antes de salir", async () => {
    // La llamada va contra el backend configurado: no es una simulación.
    renderWithProviders(<WorkflowStepTrial step={stepFixture()} />);

    await userEvent.click(screen.getByRole("button", { name: /Enviar POST/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Enviar POST de verdad",
    );
    expect(runWorkflowStepTrial).not.toHaveBeenCalled();
  });

  it("un payload con JSON roto no llega a enviarse", async () => {
    renderWithProviders(<WorkflowStepTrial step={stepFixture()} />);
    const textarea = screen.getByRole("textbox", { name: "Payload de prueba" });
    await userEvent.clear(textarea);
    await userEvent.click(textarea);
    await userEvent.paste("{no soy json");

    await userEvent.click(screen.getByRole("button", { name: /Enviar POST/ }));

    expect(screen.getByText(/JSON inválido/)).toBeInTheDocument();
    expect(runWorkflowStepTrial).not.toHaveBeenCalled();
  });

  it("avisa de los parámetros de ruta sin valor en vez de mandar el marcador en silencio", () => {
    renderWithProviders(<WorkflowStepTrial step={stepFixture()} />);

    expect(screen.getByText(/Sin valor para :customerId/)).toBeInTheDocument();
  });
});
