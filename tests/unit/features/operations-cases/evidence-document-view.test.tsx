import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VistaDeDocumento } from "@/features/operations-cases/evidence-document-view";
import type { EvidenceDocument } from "@/features/operations-cases/types";

/**
 * ADM-05: la evidencia la sube el cliente, y con ella su tipo. Un `text/html` o un SVG no se abre
 * en otra pestaña (se pintaría en el origen del portal): se re-rotula y se ofrece como descarga.
 */
vi.mock("@/features/operations-cases/services", () => ({
  downloadEvidenceDocument: vi.fn(),
}));

const services = await import("@/features/operations-cases/services");
const createObjectURL = vi.fn((_blob: Blob) => "blob:local");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function documento(mimeType: string | null): EvidenceDocument {
  return {
    documentId: "5",
    documentType: "bank_statement",
    mimeType,
    sizeBytes: 10,
    sha256: null,
    uploadedAt: null,
  } as EvidenceDocument;
}

function pintar(mimeType: string | null, contentType: string) {
  vi.mocked(services.downloadEvidenceDocument).mockResolvedValue({
    blob: new Blob(["x"], { type: contentType }),
    nombre: "evidencia-5",
    contentType,
  });
  render(
    <VistaDeDocumento customerId="900" documento={documento(mimeType)} />,
    {
      wrapper,
    },
  );
}

function ultimoBlob(): Blob {
  const blob = createObjectURL.mock.calls.at(-1)?.[0];
  if (!blob) throw new Error("no se creó ningún blob");
  return blob;
}

describe("VistaDeDocumento · tipos", () => {
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

  it("un PDF se abre en otra pestaña", async () => {
    pintar("application/pdf", "application/pdf");
    const enlace = await screen.findByRole("link", {
      name: "Abrir documento",
    });
    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).not.toHaveAttribute("download");
    expect(ultimoBlob().type).toBe("application/pdf");
  });

  it.each(["text/html", "image/svg+xml", "application/xml"])(
    "«%s» se descarga: nada de pestaña ni de imagen, y el blob no lleva su tipo",
    async (tipo) => {
      pintar(tipo, tipo);
      const enlace = await screen.findByRole("link", {
        name: "Descargar documento",
      });
      expect(enlace).toHaveAttribute("download", "evidencia-5");
      expect(enlace).not.toHaveAttribute("target");
      expect(screen.queryByText("Abrir documento")).not.toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(ultimoBlob().type).toBe("application/octet-stream");
    },
  );

  it("sin `mimeType` en la ficha, decide el tipo que trae la descarga", async () => {
    pintar(null, "text/html");
    await waitFor(() =>
      expect(screen.getByText("Descargar documento")).toBeInTheDocument(),
    );
  });

  it("una imagen JPEG se pinta", async () => {
    pintar("image/jpeg", "image/jpeg");
    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:local");
    expect(ultimoBlob().type).toBe("image/jpeg");
  });
});
