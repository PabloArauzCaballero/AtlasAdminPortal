import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/api/client";
import { DocumentationGatePage } from "@/features/flows/gate/documentation-gate-page";
import { renderWithProviders } from "../../helpers/render-with-providers";

vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: { children: ReactNode }) => children,
}));

const request = vi.mocked(apiRequest);

/** Lo que devuelve la compuerta en un entorno recién desplegado: nada cargado. */
const sinCargar = {
  passed: false,
  artifactsLoaded: false,
  evaluatedAt: "2026-09-28T12:00:00.000Z",
  checks: [
    {
      code: "CRITICAL_VERIFIED",
      passed: false,
      measured: false,
      count: 0,
      detail: "sin medir: falta cargar endpoints de ATLAS_BACKEND",
    },
    {
      code: "ARTIFACTS_PRESENT",
      passed: false,
      measured: true,
      count: 13,
      detail: "falta cargar: endpoints de ATLAS_BACKEND",
    },
  ],
};

function responder(gate: unknown, imports: unknown[]) {
  request.mockImplementation((path) =>
    Promise.resolve(
      String(path).endsWith("/imports") ? imports : (gate as never),
    ),
  );
}

describe("Compuerta de documentación", () => {
  beforeEach(() => request.mockReset());

  it("una comprobación sin medir no sale como «Pasa» ni cuenta como fallo, y el cero no se pinta", async () => {
    responder(sinCargar, []);
    renderWithProviders(<DocumentationGatePage />);

    const critica = (await screen.findByText("CRITICAL_VERIFIED")).closest(
      "div",
    )!.parentElement!;
    expect(within(critica).getByText("Sin medir")).toBeInTheDocument();
    expect(within(critica).queryByText("Pasa")).toBeNull();
    expect(within(critica).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Nada cargado que evaluar")).toBeInTheDocument();
    expect(
      await screen.findByTestId("flow-catalog-not-loaded"),
    ).toBeInTheDocument();
  });

  it("con el artefacto cargado no hay aviso de catálogo vacío y cada resultado conserva su insignia", async () => {
    responder(
      {
        passed: true,
        artifactsLoaded: true,
        evaluatedAt: "2026-09-28T12:00:00.000Z",
        checks: [
          {
            code: "CRITICAL_VERIFIED",
            passed: true,
            measured: true,
            count: 0,
            detail: "ok",
          },
        ],
      },
      [{ systemCode: "ATLAS_BACKEND", createdAt: "2026-09-28T11:00:00Z" }],
    );
    renderWithProviders(<DocumentationGatePage />);

    expect(await screen.findByText("Pasa")).toBeInTheDocument();
    expect(screen.getByText("Se puede certificar")).toBeInTheDocument();
    expect(screen.queryByTestId("flow-catalog-not-loaded")).toBeNull();
  });
});
