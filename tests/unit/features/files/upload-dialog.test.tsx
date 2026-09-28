import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AtlasApiError } from "@/shared/api/errors";

/**
 * El diálogo de subida dice ANTES qué se admite y DESPUÉS dónde quedó o por qué no.
 */
vi.mock("@/features/files/upload", async (original) => ({
  ...(await original<typeof import("@/features/files/upload")>()),
  subirArchivo: vi.fn(),
}));

const { subirArchivo } = await import("@/features/files/upload");
const { DialogoDeSubida } = await import("@/features/files/upload-dialog");

function pintar(parentId: string | null) {
  const cliente = new QueryClient();
  return render(
    <QueryClientProvider client={cliente}>
      <DialogoDeSubida
        expedienteId="42"
        parentId={parentId}
        abierto
        onCerrar={() => undefined}
      />
    </QueryClientProvider>,
  );
}

const archivo = () => new File(["abc"], "anverso.jpg", { type: "image/jpeg" });

describe("DialogoDeSubida", () => {
  beforeEach(() => vi.clearAllMocks());

  it("el selector filtra por los tipos que admite el servidor y dice el límite", () => {
    pintar("100");
    const entrada = screen.getByLabelText("Archivos para añadir");
    expect(entrada).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,application/pdf",
    );
    expect(screen.getByText(/JPG, PNG o PDF, hasta 15 MB/)).toBeInTheDocument();
    expect(screen.queryByText(/carpeta «otros»/)).not.toBeInTheDocument();
  });

  it("desde la raíz avisa de que lo subido va a «otros», y al terminar dice dónde quedó", async () => {
    vi.mocked(subirArchivo).mockResolvedValue({
      ruta: "/otros/anverso.jpg",
    } as never);
    pintar(null);
    expect(screen.getByText(/carpeta «otros»/)).toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText("Archivos para añadir"),
      archivo(),
    );
    expect(await screen.findByText("Guardado en /otros")).toBeInTheDocument();
  });

  it("un rechazo del servidor se explica en español, no con su código", async () => {
    vi.mocked(subirArchivo).mockRejectedValue(
      new AtlasApiError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "FILE_TOO_LARGE",
      }),
    );
    pintar("100");
    await userEvent.upload(
      screen.getByLabelText("Archivos para añadir"),
      archivo(),
    );
    expect(await screen.findByText(/más de 15 MB/)).toBeInTheDocument();
    expect(screen.queryByText(/FILE_TOO_LARGE/)).not.toBeInTheDocument();
  });
});
