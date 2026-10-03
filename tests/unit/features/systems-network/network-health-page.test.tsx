import { render, screen, within } from "@testing-library/react";
import {
  buscar,
  esperarFilas,
  esTablaHomogenea,
  filasDeDatos,
  filtrarPor,
} from "../../shared/tabla-helpers";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NetworkBlockHealth,
  NetworkHealth,
} from "@/features/systems/types";

vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { useNetworkHealth, useFederateBlocksMutation, useHostStatus } =
  vi.hoisted(() => ({
    useNetworkHealth: vi.fn(),
    useFederateBlocksMutation: vi.fn(),
    // La sección «Servidor de TEST» tiene su propia prueba: aquí sólo hace falta que no estorbe.
    useHostStatus: vi.fn(() => ({
      data: { available: false },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
  }));
vi.mock("@/features/systems/hooks", () => ({
  useNetworkHealth,
  useFederateBlocksMutation,
  useHostStatus,
}));

import { NetworkHealthPage } from "@/features/systems-network/network-health-page";

function block(
  overrides: Partial<Omit<NetworkBlockHealth, "catalog">> & {
    catalog?: Partial<NetworkBlockHealth["catalog"]>;
  },
): NetworkBlockHealth {
  const { catalog, ...rest } = overrides;
  return {
    systemCode: "DECISION_ENGINE",
    name: "ATLAS Decision Engine",
    repository: "AtlasDecisionEngineBackend",
    kind: "FEDERATED",
    purpose: "Motor de políticas.",
    degradation: "la decisión cae a revisión manual",
    liveState: "UP",
    healthMessage: "Responde.",
    isCritical: true,
    ...rest,
    catalog: {
      endpoints: 0,
      dataEntities: 0,
      federationStatus: "NEVER_RUN",
      federationMessage: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      remoteVersion: null,
      remoteCommit: null,
      ...catalog,
    },
  };
}

function renderWith(blocks: NetworkBlockHealth[], federateData?: unknown) {
  const report: NetworkHealth = {
    generatedAt: "2026-09-28T21:00:00.000Z",
    overallState: "UP",
    blocksUp: blocks.length,
    blocksDown: 0,
    blocksNotConfigured: 0,
    blocks,
  };
  useNetworkHealth.mockReturnValue({
    data: report,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
  useFederateBlocksMutation.mockReturnValue({
    data: federateData,
    isPending: false,
    mutateAsync: vi.fn(),
  });
  return render(<NetworkHealthPage />);
}

/** La fila (`<tr>`) de un sistema, localizada por la marca de su primera celda. */
function fila(systemCode: string): HTMLElement {
  return screen.getByTestId(`network-block-${systemCode}`).closest("tr")!;
}

/**
 * Lo que Pablo vio en TEST el 2026-09-28: una ruta de API en la cabecera, «NEVER_RUN» en el aviso y
 * «Endpoints 0» en un sistema que nadie había medido. La pantalla tiene que hablar en lenguaje de
 * quien la usa y no afirmar un cero que no midió.
 */
describe("Salud de la red", () => {
  beforeEach(() => {
    useNetworkHealth.mockReset();
    useFederateBlocksMutation.mockReset();
  });

  const neverRun = [
    block({
      systemCode: "ATLAS_BACKEND",
      name: "ATLAS Backend",
      kind: "SELF",
      catalog: { dataEntities: 220, federationStatus: "NEVER_RUN" },
    }),
    block({ systemCode: "DECISION_ENGINE" }),
    block({ systemCode: "ERP_BACKEND", name: "ATLAS ERP Backend" }),
  ];

  it("no enseña rutas de API ni códigos crudos", () => {
    const { container } = renderWith(neverRun);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\/systems\/health\/network/);
    expect(text).not.toMatch(
      /NEVER_RUN|NOT_CONFIGURED|SELF_INTROSPECTED|ATLAS_BACKEND/,
    );
    expect(text).not.toMatch(/federa/i);
  });

  it("un cero que nadie midió se lee «Sin medir», y lo medido se enseña tal cual", () => {
    renderWith(neverRun);
    const self = fila("ATLAS_BACKEND");
    expect(within(self).getByText("Sin medir")).toBeTruthy();
    expect(within(self).getByText("220")).toBeTruthy();
  });

  it("un cero medido sigue siendo cero", () => {
    renderWith([
      block({
        catalog: {
          federationStatus: "OK",
          lastSuccessAt: "2026-09-28T20:00:00.000Z",
          measured: true,
          endpoints: 0,
        },
      }),
    ]);
    const card = fila("DECISION_ENGINE");
    expect(within(card).queryByText("Sin medir")).toBeNull();
    expect(within(card).getAllByText("0").length).toBeGreaterThan(0);
  });

  it("los sistemas van en una tabla con cabeceras, buscador y filtros que recortan", async () => {
    renderWith(neverRun);
    esTablaHomogenea(
      [
        "Sistema",
        "Estado en vivo",
        "Operaciones",
        "Tablas",
        "Catálogo",
        "Si falta",
      ],
      /Buscar por sistema, propósito o mensaje/,
    );
    expect(filasDeDatos()).toHaveLength(3);
    await buscar(/Buscar por sistema, propósito o mensaje/, "ERP");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ERP");
    await buscar(/Buscar por sistema, propósito o mensaje/, "no-existe");
    expect(
      await screen.findByText("Ningún sistema coincide con la búsqueda."),
    ).toBeTruthy();
  });

  it("el filtro de catálogo separa los sistemas al día de los que no", async () => {
    renderWith([
      block({
        systemCode: "ATLAS_BACKEND",
        kind: "SELF",
        catalog: { federationStatus: "SELF_INTROSPECTED" },
      }),
      block({ systemCode: "ERP_BACKEND", name: "ATLAS ERP Backend" }),
    ]);
    await filtrarPor(/^Catálogo/, "stale");
    await esperarFilas(1);
    expect(filasDeDatos()[0]).toHaveTextContent("ERP");
  });

  it("el aviso nombra los sistemas y traduce su estado", () => {
    renderWith(neverRun);
    expect(
      screen.getByText("El catálogo de 3 sistemas no está al día"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Motor de decisiones: sin leer todavía/),
    ).toBeTruthy();
  });

  it("el mensaje técnico queda plegado bajo «Detalle técnico», no en el texto principal", () => {
    renderWith([
      block({
        systemCode: "ERP_BACKEND",
        catalog: {
          federationStatus: "NOT_CONFIGURED",
          federationMessage: "falta ERP_BACKEND_CATALOG_API_KEY",
        },
      }),
    ]);
    const card = fila("ERP_BACKEND");
    expect(within(card).getByText("Falta configurar")).toBeTruthy();
    expect(
      within(card).getByText("Detalle técnico").closest("details")?.textContent,
    ).toMatch(/ERP_BACKEND_CATALOG_API_KEY/);
  });

  it("el resultado de «Actualizar catálogos» habla con nombres y cifras, no con códigos", () => {
    renderWith(neverRun, [
      {
        systemCode: "DECISION_ENGINE",
        status: "OK",
        message: "x",
        endpointsImported: 241,
        dataEntitiesImported: 100,
        remoteVersion: null,
        remoteCommit: null,
      },
      {
        systemCode: "ERP_BACKEND",
        status: "NOT_CONFIGURED",
        message: "falta ERP_BACKEND_CATALOG_API_KEY",
        endpointsImported: 0,
        dataEntitiesImported: 0,
        remoteVersion: null,
        remoteCommit: null,
      },
    ]);
    const result = screen.getByText(
      "Resultado de la actualización",
    ).parentElement!;
    expect(result.textContent).toMatch(
      /Motor de decisiones · Catálogo al día — 241 endpoints y 100 tablas/,
    );
    expect(result.textContent).toMatch(/ERP · Falta configurar/);
    expect(result.textContent).not.toMatch(
      /NOT_CONFIGURED|ERP_BACKEND_CATALOG_API_KEY/,
    );
  });
});
