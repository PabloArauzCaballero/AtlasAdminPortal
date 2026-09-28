import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `apiDownload` rechaza por defecto un 200 con JSON —suele ser la API respondiendo el recurso en
 * vez del archivo—, pero un expediente guarda JSON de verdad (`manifest.json`). `permitirJson` es
 * la excepción explícita, y el comportamiento por defecto no cambia.
 */
vi.mock("@/shared/api/transport", () => ({ rawFetch: vi.fn() }));
vi.mock("@/shared/auth/session-storage", () => ({
  getStoredInternalSession: () => null,
}));

const { rawFetch } = await import("@/shared/api/transport");
const { apiDownload } = await import("@/shared/api/download");

const respuestaJson = () =>
  new Response(JSON.stringify({ version: 1 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("apiDownload con JSON", () => {
  beforeEach(() => vi.clearAllMocks());

  it("por defecto sigue rechazando un JSON como si no fuera el archivo", async () => {
    vi.mocked(rawFetch).mockResolvedValue(respuestaJson());
    await expect(apiDownload("/x", "x.json")).rejects.toMatchObject({
      code: "DOWNLOAD_NOT_A_FILE",
    });
  });

  it("con `permitirJson` lo entrega como archivo", async () => {
    vi.mocked(rawFetch).mockResolvedValue(respuestaJson());
    const archivo = await apiDownload("/x", "manifest.json", {
      permitirJson: true,
    });
    expect(archivo.contentType).toContain("application/json");
    expect(await archivo.blob.text()).toBe('{"version":1}');
    expect(archivo.nombre).toBe("manifest.json");
  });

  it("`permitirJson` no viaja al servidor como parte de la petición", async () => {
    vi.mocked(rawFetch).mockResolvedValue(respuestaJson());
    await apiDownload("/x", "m.json", {
      permitirJson: true,
      query: { disposition: "inline" },
    });
    const [url, init] = vi.mocked(rawFetch).mock.calls[0] ?? [];
    expect(String(url)).not.toContain("permitirJson");
    expect(JSON.stringify(init)).not.toContain("permitirJson");
  });
});
