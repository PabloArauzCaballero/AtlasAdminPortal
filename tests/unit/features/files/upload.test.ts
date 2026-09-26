import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * La subida en tres pasos.
 *
 * Lo que se fija aquí es el CONTRATO con el almacén, que es donde una equivocación no se nota:
 * las cabeceras del ticket van tal cual —van firmadas, y alterar una sola invalida la URL—, y el
 * hash se calcula en el navegador ANTES de subir, que es lo único que permite al backend comprobar
 * después que lo guardado es lo que la persona eligió.
 */
vi.mock("@/features/files/services", () => ({
  pedirTicketDeSubida: vi.fn(),
  confirmarSubida: vi.fn(),
}));

const { pedirTicketDeSubida, confirmarSubida } =
  await import("@/features/files/services");
const { sha256Hex, subirArchivo, MOTIVO_DE_RECHAZO } =
  await import("@/features/files/upload");

const TICKET = {
  ticketId: "t1",
  uploadUrl: "https://almacen.local/bucket/objeto?X-Amz-Signature=abc",
  method: "PUT" as const,
  requiredHeaders: { "content-type": "image/jpeg", "content-length": "3" },
  expiresAt: "2026-09-04T12:00:00.000Z",
};

describe("subida al expediente", () => {
  beforeEach(() => {
    vi.mocked(pedirTicketDeSubida).mockResolvedValue(TICKET);
    vi.mocked(confirmarSubida).mockResolvedValue({ nodoId: "9" } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("el hash es el SHA-256 real del contenido, no del nombre", async () => {
    // El vacío tiene un hash conocido: si la implementación resumiera otra cosa, aquí se ve.
    const vacio = new File([], "vacio.txt");
    await expect(sha256Hex(vacio)).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("pide el ticket con el hash y sube con las cabeceras firmadas SIN tocarlas", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchFalso);

    const archivo = new File(["abc"], "anverso.jpg", { type: "image/jpeg" });
    await subirArchivo({ expedienteId: "42", parentId: "100", archivo });

    expect(vi.mocked(pedirTicketDeSubida).mock.calls[0]?.[1]).toMatchObject({
      parentId: "100",
      nombre: "anverso.jpg",
      contentType: "image/jpeg",
      sizeBytes: 3,
      sha256:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
    expect(fetchFalso).toHaveBeenCalledWith(TICKET.uploadUrl, {
      method: "PUT",
      headers: TICKET.requiredHeaders,
      body: archivo,
    });
    expect(confirmarSubida).toHaveBeenCalledWith("42", "t1");
  });

  it("si el almacén rechaza el PUT no se confirma nada", async () => {
    // Confirmar una subida que no llegó dejaría una ficha apuntando a un objeto inexistente: el
    // expediente diría que el documento está cuando no está, que es peor que no tenerlo.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    const archivo = new File(["abc"], "anverso.jpg", { type: "image/jpeg" });

    await expect(
      subirArchivo({ expedienteId: "42", parentId: null, archivo }),
    ).rejects.toThrow(/403/);
    expect(confirmarSubida).not.toHaveBeenCalled();
  });

  it("informa el progreso en las tres fases, en orden", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
    const fases: string[] = [];
    await subirArchivo({
      expedienteId: "42",
      parentId: null,
      archivo: new File(["abc"], "x.jpg", { type: "image/jpeg" }),
      onProgreso: (fase) => fases.push(fase),
    });
    expect(fases).toEqual(["hash", "subida", "verificacion"]);
  });

  it("cada motivo de rechazo del backend tiene una explicación en castellano", () => {
    expect(MOTIVO_DE_RECHAZO.FILE_CONTENT_TYPE_MISMATCH).toMatch(
      /no es lo que dice ser/,
    );
    expect(
      Object.values(MOTIVO_DE_RECHAZO).every((texto) => texto.length > 10),
    ).toBe(true);
  });
});
