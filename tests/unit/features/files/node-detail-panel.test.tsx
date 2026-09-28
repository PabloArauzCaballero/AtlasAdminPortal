import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";
import type { Nodo } from "@/features/files/types";

/**
 * Descargar desde el panel: se registra como DESCARGA (no como vista) y, si falla, se dice.
 */
vi.mock("@/features/files/services", () => ({
  descargarNodo: vi.fn(),
  listarActividad: vi.fn(),
  obtenerContactos: vi.fn(),
  listarVisibilidad: vi.fn(),
}));

const { descargarNodo } = await import("@/features/files/services");
const { PanelDeNodo } = await import("@/features/files/node-detail-panel");

const NODO = {
  nodoId: "101",
  parentId: null,
  tipo: "archivo",
  nombre: "manifest.json",
  ruta: "/manifest.json",
  origen: "sistema",
  clase: null,
  mimeType: "application/json",
  sizeBytes: "20",
  sha256: null,
  objetoAusente: false,
  inmutable: true,
  evidenceDocumentId: null,
  engineRequestId: null,
  creadoEn: "2026-08-30T09:00:00.000Z",
  actualizadoEn: "2026-08-30T09:00:00.000Z",
  borradoEn: null,
  nivelEfectivo: "leer",
} satisfies Nodo;

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <PanelDeNodo
        expedienteId="42"
        nodo={NODO}
        onCerrar={() => undefined}
        onCompartir={() => undefined}
      />
    </QueryClientProvider>,
  );
}

const JSON_DESCARGADO = {
  blob: new Blob(['{"a":1}'], { type: "application/json" }),
  nombre: "manifest.json",
  contentType: "application/json",
};

describe("PanelDeNodo", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:local"),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("un JSON del expediente se abre en la vista previa", async () => {
    vi.mocked(descargarNodo).mockResolvedValue(JSON_DESCARGADO);
    pintar();
    expect(
      await screen.findByText('{"a":1}', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("«Descargar» pide el archivo como descarga, no como vista", async () => {
    vi.mocked(descargarNodo).mockResolvedValue(JSON_DESCARGADO);
    pintar();
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /Descargar/ },
        // La vista previa espera a la descarga y al blob; con toda la batería en paralelo el
        // segundo por defecto no alcanza.
        { timeout: 5000 },
      ),
    );
    await vi.waitFor(() =>
      expect(vi.mocked(descargarNodo)).toHaveBeenCalledWith(
        "42",
        NODO,
        "attachment",
      ),
    );
  });

  it("si la descarga falla, lo dice", async () => {
    vi.mocked(descargarNodo)
      .mockResolvedValueOnce(JSON_DESCARGADO)
      .mockRejectedValueOnce(
        new AtlasApiError({
          status: 404,
          code: "NOT_FOUND",
          message: "EXPEDIENTE_OBJETO_AUSENTE",
        }),
      );
    pintar();
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /Descargar/ },
        // La vista previa espera a la descarga y al blob; con toda la batería en paralelo el
        // segundo por defecto no alcanza.
        { timeout: 5000 },
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El archivo ya no está en el almacén.",
    );
  });
});
