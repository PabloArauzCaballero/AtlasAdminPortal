import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * El reenvío de subidas al almacén. Lo que se fija: que sólo reenvía permisos firmados a hosts
 * del almacén, que no arrastra la sesión del portal y que un almacén caído se lee como pasarela.
 */
const { PUT } = await import("@/app/almacen/subida/route");

const FIRMA =
  "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=a&X-Amz-Signature=b";

function pedir(destino: string | null): Request {
  const headers: Record<string, string> = {
    "content-type": "application/pdf",
    cookie: "sesion=secreta",
    authorization: "Bearer secreto",
  };
  if (destino) headers["x-almacen-destino"] = destino;
  return new Request("https://portal.test/almacen/subida", {
    method: "PUT",
    headers,
    body: "PDF",
  });
}

describe("reenvío de subidas al almacén", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reenvía el PUT firmado con el cuerpo y el tipo, sin la sesión del portal", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    const destino = `http://minio.test.local/atlas/x.pdf?${FIRMA}`;

    const respuesta = await PUT(pedir(destino));

    expect(respuesta.status).toBe(200);
    const [url, init] = fetchFalso.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(destino);
    const cabeceras = init.headers as Headers;
    expect(cabeceras.get("content-type")).toBe("application/pdf");
    expect(cabeceras.get("cookie")).toBeNull();
    expect(cabeceras.get("authorization")).toBeNull();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe("PDF");
    expect(init.redirect).toBe("manual");
  });

  it("rechaza lo que no es un permiso firmado o no va al almacén", async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal("fetch", fetchFalso);

    expect((await PUT(pedir(null))).status).toBe(400);
    expect((await PUT(pedir("http://minio.test.local/x"))).status).toBe(400);
    expect((await PUT(pedir(`http://169.254.169.254/x?${FIRMA}`))).status).toBe(
      403,
    );
    expect((await PUT(pedir(`file:///etc/passwd?${FIRMA}`))).status).toBe(400);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("con ALMACEN_HOSTS_PERMITIDOS manda la lista, no el prefijo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 200 })),
    );
    vi.stubEnv("ALMACEN_HOSTS_PERMITIDOS", "almacen.atlas.bo");

    expect(
      (await PUT(pedir(`https://almacen.atlas.bo/x?${FIRMA}`))).status,
    ).toBe(200);
    expect(
      (await PUT(pedir(`http://minio.test.local/x?${FIRMA}`))).status,
    ).toBe(403);
  });

  it("un almacén que no responde se devuelve como 502 en texto plano", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const respuesta = await PUT(pedir(`http://minio.test.local/x?${FIRMA}`));

    expect(respuesta.status).toBe(502);
    expect(respuesta.headers.get("content-type")).toBe("text/plain");
  });
});
