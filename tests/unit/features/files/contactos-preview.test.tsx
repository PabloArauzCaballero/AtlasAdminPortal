import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contactos } from "@/features/files/types";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * ADM-10: revelar los contactos pide un motivo de 8 a 500 caracteres, lo manda por POST y enseña
 * el rechazo del servidor (403 sin permiso, 400 con motivo corto) con su texto.
 */
vi.mock("@/features/files/services", () => ({
  obtenerContactos: vi.fn(),
  revelarContactos: vi.fn(),
}));
const permisos = vi.hoisted(() => ({ lista: [] as string[] }));
vi.mock("@/shared/auth/auth-context", () => ({
  useAuth: () => ({ permissions: permisos.lista }),
}));

const { obtenerContactos, revelarContactos } =
  await import("@/features/files/services");
const { VistaDeContactos, problemaDelMotivo } =
  await import("@/features/files/contactos-preview");

function contactos(enmascarado: boolean, valor: string): Contactos {
  return {
    version: 1,
    generadoEn: "2026-10-09T00:00:00.000Z",
    customerId: "c-1",
    enmascarado,
    metodosDeContacto: [
      {
        tipo: "telefono",
        valor,
        esPrincipal: true,
        estado: null,
        origen: null,
        vistoPorPrimeraVez: null,
      },
    ],
    referencias: [],
    agenda: { estado: "sin_permiso", recuentos: {} },
  };
}

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={cliente}>
      <VistaDeContactos expedienteId="42" />
    </QueryClientProvider>,
  );
  return cliente;
}

const MOTIVO = "Verificar la referencia antes de aprobar";

describe("problemaDelMotivo", () => {
  it("exige entre 8 y 500 caracteres sin contar espacios de los bordes", () => {
    expect(problemaDelMotivo("   corto  ")).toMatch(/al menos 8/);
    expect(problemaDelMotivo("12345678")).toBeNull();
    expect(problemaDelMotivo("x".repeat(500))).toBeNull();
    expect(problemaDelMotivo("x".repeat(501))).toMatch(/no puede pasar de 500/);
  });
});

describe("VistaDeContactos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permisos.lista = ["expedientes.leer", "expedientes.pii.revelar"];
    vi.mocked(obtenerContactos).mockResolvedValue(contactos(true, "7*****12"));
  });

  it("sin el permiso no ofrece revelar", async () => {
    permisos.lista = ["expedientes.leer"];
    pintar();
    expect(await screen.findByText(/7\*\*\*\*\*12/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /revelar contactos/i }),
    ).not.toBeInTheDocument();
  });

  it("no manda un motivo corto ni uno largo y dice por qué", async () => {
    const user = userEvent.setup();
    pintar();
    const boton = await screen.findByRole("button", {
      name: /revelar contactos/i,
    });
    await user.click(boton);
    expect(
      screen.getByText(/necesita al menos 8 caracteres/),
    ).toBeInTheDocument();
    const campo = screen.getByLabelText(/motivo para ver/i);
    await user.click(campo);
    await user.paste("x".repeat(501));
    await user.click(boton);
    expect(screen.getByText(/no puede pasar de 500/)).toBeInTheDocument();
    expect(revelarContactos).not.toHaveBeenCalled();
  });

  it("revela con el motivo, no guarda lo revelado en la caché y lo oculta", async () => {
    vi.mocked(revelarContactos).mockResolvedValue(contactos(false, "71234512"));
    const user = userEvent.setup();
    const cliente = pintar();
    await user.type(
      await screen.findByLabelText(/motivo para ver/i),
      `  ${MOTIVO}  `,
    );
    await user.click(
      screen.getByRole("button", { name: /revelar contactos/i }),
    );
    expect(await screen.findByText(/71234512/)).toBeInTheDocument();
    expect(revelarContactos).toHaveBeenCalledWith("42", MOTIVO);
    const enCache = JSON.stringify(
      cliente
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    );
    expect(enCache).not.toContain("71234512");

    await user.click(screen.getByRole("button", { name: /ocultar/i }));
    expect(screen.queryByText(/71234512/)).not.toBeInTheDocument();
    expect(screen.getByText(/7\*\*\*\*\*12/)).toBeInTheDocument();
  });

  it.each([
    [
      new AtlasApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "EXPEDIENTE_REVELAR_NO_PERMITIDO",
      }),
      /no tienes el permiso para ver los contactos completos/i,
    ],
    [
      new AtlasApiError({
        status: 400,
        code: "EXPEDIENTE_MOTIVO_REQUERIDO",
        message: "EXPEDIENTE_MOTIVO_REQUERIDO",
      }),
      /falta el motivo/i,
    ],
    [
      new AtlasApiError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "property extra should not exist",
      }),
      /property extra should not exist/,
    ],
  ])("enseña el rechazo del servidor (%#)", async (error, texto) => {
    vi.mocked(revelarContactos).mockRejectedValue(error);
    const user = userEvent.setup();
    pintar();
    await user.type(await screen.findByLabelText(/motivo para ver/i), MOTIVO);
    await user.click(
      screen.getByRole("button", { name: /revelar contactos/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(texto),
    );
  });

  it("si la lectura enmascarada falla lo dice", async () => {
    vi.mocked(obtenerContactos).mockRejectedValue(new Error("caída"));
    pintar();
    expect(
      await screen.findByText("No se pudieron traer los contactos."),
    ).toBeInTheDocument();
  });
});
