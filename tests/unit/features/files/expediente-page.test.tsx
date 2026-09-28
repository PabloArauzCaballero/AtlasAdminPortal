import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExpedientePage } from "@/features/files/expediente-page";
import { AtlasApiError } from "@/shared/api/errors";
import type { Expediente, Nodo } from "@/features/files/types";

/**
 * Lo que el expediente afirma antes de que nadie abra un archivo.
 *
 * Estas pruebas no fijan que la tabla pinte filas: fijan las tres distinciones que cambian cómo se
 * lee un caso y que, si se pierden, no dan error en ninguna parte —simplemente hacen que dos
 * situaciones opuestas se vean igual—:
 *
 *  - un expediente CON manifiesto afirma «esto es lo que había al enviarse, firmado»; uno rellenado
 *    a posteriori no puede afirmarlo, y confundirlos convierte una reconstrucción en evidencia;
 *  - un archivo cuyo objeto DESAPARECIÓ del almacén no es un archivo que el cliente no subió;
 *  - un nodo congelado no ofrece acciones que el backend va a rechazar.
 */
vi.mock("@/features/files/services", () => ({
  obtenerExpediente: vi.fn(),
  listarNodos: vi.fn(),
  listarActividad: vi.fn(),
  listarConcesiones: vi.fn(),
  listarVisibilidad: vi.fn(),
  obtenerContactos: vi.fn(),
  descargarNodo: vi.fn(),
  crearCarpeta: vi.fn(),
  actualizarNodo: vi.fn(),
  borrarNodo: vi.fn(),
  restaurarNodo: vi.fn(),
  pedirTicketDeSubida: vi.fn(),
  confirmarSubida: vi.fn(),
  conceder: vi.fn(),
  revocar: vi.fn(),
  purgarPapelera: vi.fn(),
  listarExpedientes: vi.fn(),
  expedientePorCliente: vi.fn(),
}));

vi.mock("@/shared/auth/permission-gate", () => ({
  PermissionGate: ({ children }: Readonly<{ children: ReactNode }>) => (
    <>{children}</>
  ),
}));

const { obtenerExpediente, listarNodos, purgarPapelera, crearCarpeta } =
  await import("@/features/files/services");

const EXPEDIENTE: Expediente = {
  expedienteId: "42",
  subjectType: "customer",
  subjectId: "900",
  sessionId: null,
  customerCode: "CLI-900",
  estado: "enviado",
  enviadoEn: "2026-09-01T12:00:00.000Z",
  manifestPresente: true,
  retencionHasta: null,
  purgadoEn: null,
  creadoEn: "2026-08-30T09:00:00.000Z",
  nivelEfectivo: "escribir",
  nodosTotal: 4,
  bytesTotal: "2097152",
};

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
  nivelEfectivo: "escribir",
};

function pintar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={cliente}>
      <ExpedientePage expedienteId="42" />
    </QueryClientProvider>,
  );
}

describe("ExpedientePage", () => {
  beforeEach(() => {
    vi.mocked(listarNodos).mockResolvedValue([NODO]);
  });

  it("dice que el expediente está congelado y su manifiesto firmado", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    pintar();
    expect(await screen.findByText("Manifiesto firmado")).toBeInTheDocument();
    expect(screen.getByText(/Congelado/)).toBeInTheDocument();
  });

  it("avisa cuando NO hay manifiesto, en vez de callarlo", async () => {
    // Un expediente rellenado a posteriori: las fichas existen, la foto del momento del envío no.
    vi.mocked(obtenerExpediente).mockResolvedValue({
      ...EXPEDIENTE,
      manifestPresente: false,
    });
    pintar();
    expect(await screen.findByText("Sin manifiesto")).toBeInTheDocument();
  });

  it("un expediente purgado explica que faltan bytes a propósito", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue({
      ...EXPEDIENTE,
      estado: "purgado",
      purgadoEn: "2026-09-02T00:00:00.000Z",
      nivelEfectivo: "leer",
    });
    pintar();
    expect(await screen.findByText(/se purgó/)).toBeInTheDocument();
    // Sin escritura no hay botones de subida: el backend los rechazaría.
    expect(screen.queryByText("Añadir archivos")).not.toBeInTheDocument();
  });

  it("con nivel de escritura ofrece añadir archivos y crear carpetas", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    pintar();
    expect(await screen.findByText("Añadir archivos")).toBeInTheDocument();
    expect(screen.getByText("Nueva carpeta")).toBeInTheDocument();
  });

  it("marca el archivo cuyo objeto ya no está en el almacén", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    vi.mocked(listarNodos).mockResolvedValue([
      {
        ...NODO,
        nodoId: "101",
        tipo: "archivo",
        nombre: "anverso.jpg",
        mimeType: "image/jpeg",
        objetoAusente: true,
      },
    ]);
    pintar();
    // Se espera primero a la cabecera: la tabla es una segunda consulta y el aviso sólo tiene
    // sentido una vez que el expediente cargó.
    await screen.findByText("Manifiesto firmado");
    expect(
      await screen.findByLabelText("El archivo ya no está en el almacén"),
    ).toBeInTheDocument();
  });

  it("con la papelera a la vista ofrece vaciarla, y la purga viaja con el motivo", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    vi.mocked(purgarPapelera).mockResolvedValue({
      nodos: 2,
      objetosBorrados: 2,
      objetosConservados: 0,
    });
    pintar();
    await screen.findByText("Manifiesto firmado");

    // Sin la papelera a la vista no hay purga que ofrecer: vaciar lo que no se ve es un accidente.
    expect(screen.queryByText("Vaciar la papelera")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Ver la papelera"));
    await userEvent.click(screen.getByText("Vaciar la papelera"));

    const dialogo = screen.getByRole("dialog");
    const [motivo, frase] = within(dialogo).getAllByRole("textbox");
    const vaciar = within(dialogo).getByRole("button", { name: "Vaciar" });

    // El backend exige ocho caracteres: con menos, el botón no se habilita y se dice por qué.
    await userEvent.type(motivo!, "corto");
    await userEvent.type(frase!, "VACIAR");
    expect(vaciar).toBeDisabled();
    expect(
      within(dialogo).getByText(/al menos 8 caracteres/),
    ).toBeInTheDocument();

    await userEvent.type(motivo!, " y cerrado");
    expect(vaciar).toBeEnabled();
    await userEvent.click(vaciar);

    expect(purgarPapelera).toHaveBeenCalledWith("42", "corto y cerrado");
  });

  it("si el servidor rechaza la purga, el motivo se pinta en el diálogo", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    vi.mocked(purgarPapelera).mockRejectedValue(
      new AtlasApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "EXPEDIENTE_NIVEL_INSUFICIENTE",
      }),
    );
    pintar();
    await screen.findByText("Manifiesto firmado");
    await userEvent.click(screen.getByText("Ver la papelera"));
    await userEvent.click(screen.getByText("Vaciar la papelera"));
    const dialogo = screen.getByRole("dialog");
    const [motivo, frase] = within(dialogo).getAllByRole("textbox");
    await userEvent.type(motivo!, "cierre del expediente");
    await userEvent.type(frase!, "VACIAR");
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Vaciar" }),
    );

    expect(
      await within(dialogo).findByText(
        "Tu acceso a este expediente no alcanza para esto.",
      ),
    ).toBeInTheDocument();
  });

  it("un fallo al crear la carpeta se explica en vez de callarse", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    vi.mocked(crearCarpeta).mockRejectedValue(
      new AtlasApiError({
        status: 409,
        code: "CONFLICT",
        message: "EXPEDIENTE_NOMBRE_OCUPADO",
      }),
    );
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("auth");
    pintar();
    await userEvent.click(await screen.findByText("Nueva carpeta"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya hay algo con ese nombre en esta carpeta.",
    );
    prompt.mockRestore();
  });

  it("«Ver la papelera» vuelve a pedir la carpeta incluyendo lo borrado", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue(EXPEDIENTE);
    pintar();
    await screen.findByText("Manifiesto firmado");
    await userEvent.click(screen.getByText("Ver la papelera"));

    await vi.waitFor(() =>
      expect(vi.mocked(listarNodos)).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({ incluirPapelera: "true" }),
      ),
    );
  });

  it("en el expediente de un comercio no habla de «esta persona» ni «el cliente»", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue({
      ...EXPEDIENTE,
      subjectType: "partner",
    });
    vi.mocked(listarNodos).mockResolvedValue([]);
    pintar();
    expect(await screen.findByText(/sobre este comercio/)).toBeInTheDocument();
    expect(await screen.findByText(/Sus QR de cobro/)).toBeInTheDocument();
    expect(screen.queryByText(/esta persona/)).not.toBeInTheDocument();
    expect(screen.queryByText(/suba el cliente/)).not.toBeInTheDocument();
  });

  it("sin nivel de escritura la papelera se ve pero no se vacía", async () => {
    vi.mocked(obtenerExpediente).mockResolvedValue({
      ...EXPEDIENTE,
      nivelEfectivo: "leer",
    });
    pintar();
    await screen.findByText("Manifiesto firmado");
    await userEvent.click(screen.getByText("Ver la papelera"));
    expect(screen.queryByText("Vaciar la papelera")).not.toBeInTheDocument();
  });
});
