import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExploradorDeExpedientesPage } from "@/features/files/files-explorer-page";
import type { Expediente } from "@/features/files/types";
import { elegirOpcion } from "../../shared/option-select-helpers";

/**
 * Cliente y comercio en la misma lista.
 *
 * Lo que se fija: que la fila de un comercio se distinga de la de una persona sin abrirla, y que
 * el filtro «Tipo» viaje al backend como `subjectType` en vez de recortar la página en el navegador
 * (recortar aquí dejaría páginas medio vacías y contadores que mienten).
 */
vi.mock("@/features/files/services", () => ({
  listarExpedientes: vi.fn(),
}));

vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: Readonly<{ children: ReactNode }>) => (
    <>{children}</>
  ),
}));

const { listarExpedientes } = await import("@/features/files/services");

function expediente(parcial: Partial<Expediente>): Expediente {
  return {
    expedienteId: "1",
    subjectType: "customer",
    subjectId: "900",
    sessionId: null,
    customerCode: "CLI-900",
    estado: "abierto",
    enviadoEn: null,
    manifestPresente: false,
    retencionHasta: null,
    purgadoEn: null,
    creadoEn: "2026-08-30T09:00:00.000Z",
    nivelEfectivo: "leer",
    nodosTotal: 1,
    bytesTotal: "10",
    ...parcial,
  };
}

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <ExploradorDeExpedientesPage />
    </QueryClientProvider>,
  );
}

describe("ExploradorDeExpedientesPage", () => {
  beforeEach(() => {
    vi.mocked(listarExpedientes).mockReset();
    vi.mocked(listarExpedientes).mockResolvedValue({
      items: [
        expediente({ expedienteId: "1" }),
        expediente({
          expedienteId: "2",
          subjectType: "partner",
          subjectId: "31",
          customerCode: "Andina",
        }),
        expediente({
          expedienteId: "3",
          subjectType: "partner",
          subjectId: "32",
          customerCode: null,
        }),
      ],
      meta: { page: 1, limit: 25, total: 3, totalPages: 1 },
    });
  });

  it("etiqueta cada fila como Cliente o Comercio, y nombra al comercio sin rótulo por su tipo", async () => {
    pintar();

    expect(await screen.findByText("Andina")).toBeInTheDocument();
    expect(screen.getByText("CLI-900")).toBeInTheDocument();
    expect(screen.getByText("Comercio 32")).toBeInTheDocument();
    expect(screen.getAllByText("Comercio")).toHaveLength(2);
    expect(screen.getAllByText("Cliente")).toHaveLength(1);
  });

  it("el filtro «Tipo» manda subjectType al servicio; sin filtro no manda nada", async () => {
    pintar();
    await screen.findByText("Andina");

    expect(vi.mocked(listarExpedientes)).toHaveBeenLastCalledWith(
      expect.objectContaining({ subjectType: "" }),
    );

    await elegirOpcion(
      screen.getByRole("combobox", { name: "Tipo" }),
      "partner",
    );

    await waitFor(() =>
      expect(vi.mocked(listarExpedientes)).toHaveBeenLastCalledWith(
        expect.objectContaining({ subjectType: "partner", page: 1 }),
      ),
    );
  });
});
