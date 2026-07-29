import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../helpers/render-with-providers";
import type { EndpointItem } from "@/features/systems/types";
import { endpointFixture } from "./endpoint-fixture";

vi.setConfig({ testTimeout: 30000 });

const useEndpointsByIds = vi.hoisted(() => vi.fn());
vi.mock("@/features/systems/hooks", () => ({ useEndpointsByIds }));

const { JourneyDecisionTreePanel } =
  await import("@/features/qa-lab/journey-tree/journey-tree-panel");
const { JourneyWorkspaceProvider, useJourneyWorkspace } =
  await import("@/features/qa-lab/journey-workspace");

// El ejemplo por defecto del editor: health → onboarding (extrae customerId) →
// resumen de investigación (lo consume en la ruta).
const CATALOG = new Map<string, EndpointItem>([
  [
    "REEMPLAZA_CON_ID_DE_/health",
    endpointFixture({ method: "GET", fullPath: "/api/v1/health" }),
  ],
  [
    "REEMPLAZA_CON_ID_DE_/customer-onboarding/start",
    endpointFixture({
      method: "POST",
      fullPath: "/api/v1/customer-onboarding/start",
    }),
  ],
  [
    "REEMPLAZA_CON_ID_DE_/operations/customers/:customerId/investigation-summary",
    endpointFixture({
      method: "GET",
      fullPath: "/api/v1/operations/customers/:customerId/summary",
    }),
  ],
]);

beforeEach(() => {
  useEndpointsByIds.mockReset();
  useEndpointsByIds.mockReturnValue({ isLoading: false, byId: CATALOG });
});

function StepsSetter() {
  const { setStepsText } = useJourneyWorkspace();
  return (
    <button type="button" onClick={() => setStepsText("no soy json")}>
      romper la secuencia
    </button>
  );
}

function render_() {
  return renderWithProviders(
    <JourneyWorkspaceProvider>
      <StepsSetter />
      <JourneyDecisionTreePanel />
    </JourneyWorkspaceProvider>,
  );
}

function tile(label: string): HTMLElement {
  const term = screen.getByText(label);
  return term.parentElement as HTMLElement;
}

describe("JourneyDecisionTreePanel · dibujo", () => {
  it("pinta un nodo por paso con su método y su ruta", () => {
    render_();

    expect(
      screen.getByRole("button", { name: /Paso 1: Health check/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paso 2: Iniciar onboarding/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /POST \/api\/v1\/customer-onboarding\/start/,
      }),
    ).toBeInTheDocument();
  });

  it("resume el recorrido: pasos, datos encadenados y escrituras", () => {
    render_();

    expect(tile("pasos")).toHaveTextContent("3");
    expect(tile("datos encadenados")).toHaveTextContent("1");
    expect(tile("pasos que escriben")).toHaveTextContent("1");
  });

  it("avisa de que en dry-run ninguna variable llega resuelta", () => {
    // Es el comportamiento real del runner, no un defecto del dibujo.
    render_();

    expect(tile("pasos en riesgo")).toHaveTextContent("1");
    expect(
      screen.getByText(/En dry-run el runner no extrae variables/),
    ).toBeInTheDocument();
  });

  it("en ejecución real el dato sí encadena y nadie queda en riesgo", async () => {
    render_();

    await userEvent.click(
      screen.getByRole("button", { name: "Ejecución real" }),
    );

    expect(tile("pasos en riesgo")).toHaveTextContent("0");
  });
});

describe("JourneyDecisionTreePanel · simulación", () => {
  it("simular un fallo tiñe a los pasos que dependían de su dato", async () => {
    render_();
    await userEvent.click(
      screen.getByRole("button", { name: "Ejecución real" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Paso 2: Iniciar onboarding/ }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Simular que este paso falla" }),
    );

    expect(tile("pasos en riesgo")).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: /Paso 3.*en riesgo/ }),
    ).toBeInTheDocument();
  });

  it("la ficha del paso explica qué se pierde si responde mal", async () => {
    render_();

    await userEvent.click(
      screen.getByRole("button", { name: /Paso 2: Iniciar onboarding/ }),
    );

    expect(
      screen.getAllByText(/Se pierde customerId: el paso 3/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("data.customerId")).toBeInTheDocument();
  });

  it("reproducir deja pendientes los pasos que aún no se evaluaron", async () => {
    render_();

    await userEvent.click(
      screen.getByRole("button", { name: "Reproducir recorrido" }),
    );

    expect(
      screen.getByRole("button", { name: /Paso 3.*aún no evaluado/ }),
    ).toBeInTheDocument();
  });
});

describe("JourneyDecisionTreePanel · secuencia compartida", () => {
  it("dibuja la secuencia del editor, no una copia propia", async () => {
    // Si el árbol tuviera su propio estado, romper el JSON del editor no le
    // afectaría y las dos pestañas mostrarían recorridos distintos.
    render_();

    await userEvent.click(
      screen.getByRole("button", { name: "romper la secuencia" }),
    );

    expect(
      screen.getByText("Todavía no hay recorrido que dibujar"),
    ).toBeInTheDocument();
  });
});
