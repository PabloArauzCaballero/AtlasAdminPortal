import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ArbolDeCarpetas } from "@/features/files/folder-tree";
import type { Nodo } from "@/features/files/types";

/**
 * El panel lateral tiene que contestar solo «qué hay aquí».
 *
 * Antes sólo pintaba carpetas: abrir una obligaba a mirar la tabla de la derecha para saber qué
 * contenía, aunque los archivos ya venían en la MISMA respuesta y se estaban descartando. Lo que
 * se fija es que el archivo aparezca en el árbol, que un clic sobre él lo abra sin cambiar de
 * carpeta, y que las carpetas sigan yendo antes que los archivos.
 */
vi.mock("@/features/files/services", () => ({ listarNodos: vi.fn() }));

const { listarNodos } = await import("@/features/files/services");

function nodo(overrides: Partial<Nodo>): Nodo {
  return {
    nodoId: "1",
    parentId: null,
    tipo: "archivo",
    nombre: "archivo",
    ruta: "/archivo",
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
    nivelEfectivo: "leer",
    ...overrides,
  };
}

const CARPETA = nodo({
  nodoId: "100",
  tipo: "carpeta",
  nombre: "auth",
  ruta: "/auth",
});
const ARCHIVO = nodo({
  nodoId: "101",
  nombre: "anverso.jpg",
  ruta: "/anverso.jpg",
  mimeType: "image/jpeg",
});

function pintar(onAbrirArchivo = vi.fn()) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={cliente}>
      <ArbolDeCarpetas
        expedienteId="42"
        carpetaActual={null}
        onSeleccionar={vi.fn()}
        onAbrirArchivo={onAbrirArchivo}
      />
    </QueryClientProvider>,
  );
  return onAbrirArchivo;
}

describe("ArbolDeCarpetas", () => {
  beforeEach(() => {
    vi.mocked(listarNodos).mockResolvedValue([CARPETA, ARCHIVO]);
  });

  it("enseña los archivos junto a las carpetas, no sólo las carpetas", async () => {
    pintar();
    expect(await screen.findByText("anverso.jpg")).toBeInTheDocument();
    expect(screen.getByText("auth")).toBeInTheDocument();
  });

  it("pone las carpetas antes que los archivos", async () => {
    pintar();
    await screen.findByText("anverso.jpg");
    const nombres = screen
      .getAllByRole("listitem")
      .map((fila) => fila.textContent);
    expect(nombres[0]).toContain("auth");
    expect(nombres.at(-1)).toContain("anverso.jpg");
  });

  it("al pulsar un archivo lo abre en vez de navegar a una carpeta", async () => {
    const onAbrirArchivo = pintar();
    const boton = await screen.findByText("anverso.jpg");
    await userEvent.click(boton);
    await waitFor(() => {
      expect(onAbrirArchivo).toHaveBeenCalledWith(
        expect.objectContaining({ nodoId: "101" }),
      );
    });
  });

  it("no pinta lo que está en la papelera", async () => {
    vi.mocked(listarNodos).mockResolvedValue([
      CARPETA,
      { ...ARCHIVO, borradoEn: "2026-09-01T00:00:00.000Z" },
    ]);
    pintar();
    await screen.findByText("auth");
    expect(screen.queryByText("anverso.jpg")).not.toBeInTheDocument();
  });
});
