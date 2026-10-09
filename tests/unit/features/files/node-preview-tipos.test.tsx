import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Nodo } from "@/features/files/types";

/**
 * ADM-05: un archivo que subió un cliente no se abre como documento en el origen del portal.
 *
 * Un HTML o un SVG abierto en otra pestaña como `blob:` se pintaría con el origen del portal y la
 * sesión de un empleado al lado. Sólo PDF e imágenes rasterizadas se pintan o se abren aparte; el
 * resto se descarga, y su blob se rotula `application/octet-stream`.
 */
vi.mock("@/features/files/services", () => ({
  descargarNodo: vi.fn(),
  listarActividad: vi.fn(),
  obtenerContactos: vi.fn(),
  listarVisibilidad: vi.fn(),
}));

const { descargarNodo } = await import("@/features/files/services");
const { PanelDeNodo } = await import("@/features/files/node-detail-panel");

function nodo(nombre: string, mimeType: string): Nodo {
  return {
    nodoId: "7",
    parentId: null,
    tipo: "archivo",
    nombre,
    ruta: `/${nombre}`,
    origen: "sistema",
    clase: null,
    mimeType,
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
  };
}

const createObjectURL = vi.fn((_blob: Blob) => "blob:local");

function pintar(archivo: Nodo, contenido: string, tipo: string) {
  vi.mocked(descargarNodo).mockResolvedValue({
    blob: new Blob([contenido], { type: tipo }),
    nombre: archivo.nombre,
    contentType: tipo,
  });
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <PanelDeNodo
        expedienteId="42"
        nodo={archivo}
        onCerrar={() => undefined}
        onCompartir={() => undefined}
      />
    </QueryClientProvider>,
  );
}

function ultimoBlob(): Blob {
  const blob = createObjectURL.mock.calls.at(-1)?.[0];
  if (!blob) throw new Error("no se creó ningún blob");
  return blob;
}

describe("vista previa · tipos activos", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("un HTML se lee como TEXTO, nunca se abre aparte, y su blob va rotulado para descarga", async () => {
    pintar(
      nodo("factura.html", "text/html"),
      "<script>alert(1)</script>",
      "text/html",
    );
    expect(
      await screen.findByText(
        "<script>alert(1)</script>",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Abrir en otra pestaña")).not.toBeInTheDocument();
    expect(ultimoBlob().type).toBe("application/octet-stream");
  });

  it("un SVG no se pinta como imagen ni se abre aparte", async () => {
    pintar(
      nodo("logo.svg", "image/svg+xml"),
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      "image/svg+xml",
    );
    // Se lee como texto (es XML), nunca como documento.
    expect(
      await screen.findByText(/<svg/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Abrir en otra pestaña")).not.toBeInTheDocument();
    expect(ultimoBlob().type).toBe("application/octet-stream");
  });

  it("un PDF se pinta y se puede abrir en otra pestaña", async () => {
    pintar(
      nodo("extracto.pdf", "application/pdf"),
      "%PDF-1.7",
      "application/pdf",
    );
    expect(
      await screen.findByText("Abrir en otra pestaña", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByTitle("extracto.pdf")).toBeInTheDocument();
    expect(ultimoBlob().type).toBe("application/pdf");
  });

  it("un tipo desconocido no se previsualiza ni se abre aparte", async () => {
    pintar(
      nodo("paquete.bin", "application/x-msdownload"),
      "MZ",
      "application/x-msdownload",
    );
    expect(
      await screen.findByText(
        "Este tipo de archivo no se puede previsualizar.",
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Abrir en otra pestaña")).not.toBeInTheDocument();
    expect(ultimoBlob().type).toBe("application/octet-stream");
  });

  it("una imagen PNG se pinta", async () => {
    pintar(nodo("carnet.png", "image/png"), "png", "image/png");
    expect(
      await screen.findByRole("img", { name: "carnet.png" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Abrir en otra pestaña")).toBeInTheDocument();
  });
});
