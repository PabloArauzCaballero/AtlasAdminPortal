import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ADM-10: el motivo para revelar los contactos va en el CUERPO de un POST, nunca en la URL.
 *
 * Con `GET ?revelar=true&motivo=…` el motivo quedaba en los logs de acceso de cada proxy.
 */
vi.mock("@/shared/api/client", () => ({ apiRequest: vi.fn() }));

const { apiRequest } = await import("@/shared/api/client");
const { obtenerContactos, revelarContactos } =
  await import("@/features/files/services");

describe("contactos del expediente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revelar es un POST a /contactos/revelar con el motivo en el cuerpo", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ enmascarado: false });
    await revelarContactos("42", "verificar la referencia del caso");
    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [ruta, opciones] = vi.mocked(apiRequest).mock.calls[0]!;
    expect(ruta).toBe("/expedientes/42/contactos/revelar");
    expect(opciones).toEqual({
      method: "POST",
      body: { motivo: "verificar la referencia del caso" },
    });
    expect(ruta).not.toContain("motivo");
    expect(ruta).not.toContain("revelar=");
  });

  it("la lectura enmascarada es un GET sin parámetros", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ enmascarado: true });
    await obtenerContactos("a/b");
    expect(vi.mocked(apiRequest).mock.calls[0]).toEqual([
      "/expedientes/a%2Fb/contactos",
    ]);
  });
});
