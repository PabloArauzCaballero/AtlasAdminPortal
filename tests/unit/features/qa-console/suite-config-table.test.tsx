import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuiteConfigTable } from "@/features/qa-console/suite-config-table";
import type { TestStep } from "@/features/systems/types";

const step = (over: Partial<TestStep>): TestStep => ({
  stepId: "1",
  suiteId: "9",
  endpointId: null,
  stepOrder: 1,
  name: "Iniciar sesión",
  inputMode: "DEFAULT",
  method: "POST",
  pathTemplate: "/auth/login",
  defaultHeaders: {},
  defaultPayload: { email: "qa@atlas.test" },
  configSchema: {},
  extractors: { token: "$.data.token" },
  assertions: { status: 200 },
  continueOnFailure: false,
  cleanupRequired: false,
  ...over,
});

describe("Configuración de la suite · tabla de pasos", () => {
  it("una fila por paso, con una columna por bloque de configuración", () => {
    render(
      <SuiteConfigTable
        steps={[step({}), step({ stepId: "2", stepOrder: 2, name: "Salir" })]}
      />,
    );
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "#",
      "Paso",
      "Payload por defecto",
      "Comprobaciones",
      "Extrae para los siguientes",
      "Esquema configurable",
    ]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText(/qa@atlas.test/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("un bloque vacío se ve como «—», no como un objeto vacío", () => {
    render(<SuiteConfigTable steps={[step({ configSchema: {} })]} />);
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(within(row).queryByText("{}")).toBeNull();
  });

  it("sin pasos dice que la suite no tiene pasos", () => {
    render(<SuiteConfigTable steps={[]} />);
    expect(screen.getByText("Esta suite no tiene pasos.")).toBeInTheDocument();
  });
});
