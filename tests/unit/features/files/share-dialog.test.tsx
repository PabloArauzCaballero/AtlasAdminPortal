import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DialogoDeCompartir } from "@/features/files/share-dialog";
import type { Concesion, Nodo } from "@/features/files/types";

/**
 * Compartir la carpeta de una persona.
 *
 * Dos reglas que la pantalla debe hacer cumplir antes de gastar un viaje al backend —y, sobre todo,
 * antes de que alguien crea que compartió algo que no compartió—:
 *
 *  - sin MOTIVO no se concede nada. Ampliar quién ve el carnet y la cara de alguien es una decisión
 *    sobre datos de un tercero, y «se compartió con fraude» sin más no explica nada seis meses
 *    después;
 *  - una concesión HEREDADA no se quita aquí. Ofrecer el botón haría que quitarla pareciera hecho
 *    cuando el acceso sigue bajando desde la carpeta de arriba.
 */
vi.mock("@/features/files/services", () => ({
  listarConcesiones: vi.fn(),
  conceder: vi.fn(),
  revocar: vi.fn(),
}));

const { listarConcesiones, conceder } =
  await import("@/features/files/services");

const NODO: Nodo = {
  nodoId: "100",
  parentId: null,
  tipo: "carpeta",
  nombre: "auth",
  ruta: "/auth",
  origen: "onboarding",
  clase: null,
  mimeType: null,
  sizeBytes: null,
  sha256: null,
  objetoAusente: false,
  inmutable: false,
  evidenceDocumentId: null,
  engineRequestId: null,
  creadoEn: "2026-08-30T09:00:00.000Z",
  actualizadoEn: "2026-08-30T09:00:00.000Z",
  borradoEn: null,
  nivelEfectivo: "compartir",
};

const HEREDADA: Concesion = {
  id: "5",
  principalTipo: "rol",
  principalId: "COMPLIANCE_ANALYST",
  nivel: "leer",
  motivo: "revisión periódica",
  venceEn: null,
  otorgadaEn: "2026-09-01T00:00:00.000Z",
  heredadaDe: "/",
};

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <DialogoDeCompartir
        expedienteId="42"
        nodo={NODO}
        abierto
        onCerrar={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe("DialogoDeCompartir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listarConcesiones).mockResolvedValue([]);
  });

  it("no deja conceder sin motivo", async () => {
    pintar();
    const boton = await screen.findByRole("button", { name: "Dar acceso" });
    expect(boton).toBeDisabled();
    expect(conceder).not.toHaveBeenCalled();
  });

  it("con motivo suficiente concede y lo manda al backend", async () => {
    vi.mocked(conceder).mockResolvedValue({ concesionId: "9" });
    pintar();
    const motivo = await screen.findByPlaceholderText(
      "Queda en la bitácora del expediente.",
    );
    await userEvent.type(motivo, "investigación de fraude abierta");
    await userEvent.click(screen.getByRole("button", { name: "Dar acceso" }));

    expect(vi.mocked(conceder).mock.calls[0]?.[2]).toMatchObject({
      principalTipo: "rol",
      nivel: "leer",
      motivo: "investigación de fraude abierta",
    });
  });

  it("una concesión heredada se enseña pero no se puede quitar desde aquí", async () => {
    vi.mocked(listarConcesiones).mockResolvedValue([HEREDADA]);
    pintar();
    expect(await screen.findByText(/heredado de \//)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Quitar" }),
    ).not.toBeInTheDocument();
  });

  it("una concesión puesta aquí sí se puede quitar", async () => {
    vi.mocked(listarConcesiones).mockResolvedValue([
      { ...HEREDADA, heredadaDe: null },
    ]);
    pintar();
    expect(
      await screen.findByRole("button", { name: "Quitar" }),
    ).toBeInTheDocument();
  });
});
