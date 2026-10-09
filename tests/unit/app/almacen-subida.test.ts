import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El reenvío de subidas al almacén. Lo que se fija: que sólo reenvía permisos firmados a los
 * destinos EXACTOS de `ALMACEN_HOSTS_PERMITIDOS` (falla cerrado), que no arrastra la sesión del
 * portal, que lee el cuerpo con tope y que no devuelve lo que el destino responda.
 */
const { PUT } = await import("@/app/almacen/subida/route");

const FIRMA =
  "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=a&X-Amz-Signature=b";
const TEST = "minio.161.97.85.216.sslip.io";
const DEV = "pablo-h310.taila8f993.ts.net";

function pedir(
  destino: string | null,
  opciones: { cuerpo?: string; longitud?: string | null } = {},
): Request {
  const cuerpo = opciones.cuerpo ?? "PDF";
  const headers: Record<string, string> = {
    "content-type": "application/pdf",
    cookie: "sesion=secreta",
    authorization: "Bearer secreto",
  };
  const longitud =
    opciones.longitud === undefined ? String(cuerpo.length) : opciones.longitud;
  if (longitud !== null) headers["content-length"] = longitud;
  if (destino) headers["x-almacen-destino"] = destino;
  return new Request("https://portal.test/almacen/subida", {
    method: "PUT",
    headers,
    body: cuerpo,
  });
}

function almacenResponde(respuesta = new Response("", { status: 200 })) {
  const fetchFalso = vi.fn().mockResolvedValue(respuesta);
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

describe("reenvío de subidas al almacén", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALMACEN_HOSTS_PERMITIDOS", `${TEST}, ${DEV}`);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reenvía el PUT firmado con el cuerpo y el tipo, sin la sesión del portal", async () => {
    const fetchFalso = almacenResponde();
    const destino = `http://${TEST}/atlas/x.pdf?${FIRMA}`;

    const respuesta = await PUT(pedir(destino));

    expect(respuesta.status).toBe(200);
    const [url, init] = fetchFalso.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(destino);
    const cabeceras = init.headers as Headers;
    expect(cabeceras.get("content-type")).toBe("application/pdf");
    expect(cabeceras.get("cookie")).toBeNull();
    expect(cabeceras.get("authorization")).toBeNull();
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe("PDF");
    expect(init.redirect).toBe("manual");
  });

  it("acepta el almacén de DEV por Tailscale cuando está en la lista", async () => {
    almacenResponde();
    const destino = `https://${DEV}/atlas-evidence/x?${FIRMA}`;
    expect((await PUT(pedir(destino))).status).toBe(200);
  });

  it("rechaza lo que no es un permiso firmado, ni http(s), o lleva usuario", async () => {
    const fetchFalso = almacenResponde();

    expect((await PUT(pedir(null))).status).toBe(400);
    expect((await PUT(pedir(`http://${TEST}/x`))).status).toBe(400);
    expect((await PUT(pedir(`file:///etc/passwd?${FIRMA}`))).status).toBe(400);
    expect((await PUT(pedir(`http://u:p@${TEST}/x?${FIRMA}`))).status).toBe(
      400,
    );
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("un host malicioso o un minio.* no listado → 403, sin salir a la red", async () => {
    const fetchFalso = almacenResponde();

    for (const host of [
      "169.254.169.254",
      "minio.10.0.0.5.sslip.io",
      "minio.169.254.169.254.nip.io",
      "minio.x.sslip.io",
      "otra.taila8f993.ts.net",
      "localhost:9000",
    ]) {
      expect((await PUT(pedir(`http://${host}/x?${FIRMA}`))).status).toBe(403);
    }
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("un host listado sin puerto no admite otro puerto; con puerto, sólo ése", async () => {
    almacenResponde();
    vi.stubEnv("ALMACEN_HOSTS_PERMITIDOS", `${TEST},almacen.local:9000`);

    expect((await PUT(pedir(`http://${TEST}:8080/x?${FIRMA}`))).status).toBe(
      403,
    );
    expect((await PUT(pedir(`http://${TEST}:80/x?${FIRMA}`))).status).toBe(200);
    expect(
      (await PUT(pedir(`http://almacen.local:9000/x?${FIRMA}`))).status,
    ).toBe(200);
    expect(
      (await PUT(pedir(`http://almacen.local:9001/x?${FIRMA}`))).status,
    ).toBe(403);
  });

  it("sin lista en producción no reenvía nada: 503", async () => {
    const fetchFalso = almacenResponde();
    vi.stubEnv("ALMACEN_HOSTS_PERMITIDOS", "");

    for (const host of [TEST, "localhost:9000"]) {
      expect((await PUT(pedir(`http://${host}/x?${FIRMA}`))).status).toBe(503);
    }
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("sin lista fuera de producción sólo admite el equipo local", async () => {
    almacenResponde();
    vi.stubEnv("ALMACEN_HOSTS_PERMITIDOS", "");
    vi.stubEnv("NODE_ENV", "development");

    expect((await PUT(pedir(`http://localhost:9000/x?${FIRMA}`))).status).toBe(
      200,
    );
    expect((await PUT(pedir(`http://127.0.0.1:9000/x?${FIRMA}`))).status).toBe(
      200,
    );
    expect((await PUT(pedir(`http://${TEST}/x?${FIRMA}`))).status).toBe(403);
  });

  it("exige content-length y no lee más de lo declarado", async () => {
    const fetchFalso = almacenResponde();
    const destino = `http://${TEST}/x?${FIRMA}`;

    expect((await PUT(pedir(destino, { longitud: null }))).status).toBe(411);
    expect((await PUT(pedir(destino, { longitud: "-1" }))).status).toBe(400);
    expect(
      (await PUT(pedir(destino, { longitud: String(60 * 1024 * 1024) })))
        .status,
    ).toBe(413);
    expect(
      (await PUT(pedir(destino, { cuerpo: "PDF-largo", longitud: "3" })))
        .status,
    ).toBe(413);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("devuelve el XML de error de S3 pequeño, pero no otros cuerpos", async () => {
    const destino = `http://${TEST}/x?${FIRMA}`;
    const xml = "<Error><Code>SignatureDoesNotMatch</Code></Error>";
    almacenResponde(
      new Response(xml, {
        status: 403,
        headers: { "content-type": "application/xml" },
      }),
    );
    const s3 = await PUT(pedir(destino));
    expect(s3.status).toBe(403);
    expect(await s3.text()).toBe(xml);

    almacenResponde(
      new Response("<html>interno</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    const html = await PUT(pedir(destino));
    expect(html.status).toBe(200);
    expect(await html.text()).toBe("");

    almacenResponde(
      new Response(`<x>${"a".repeat(9000)}</x>`, {
        status: 400,
        headers: { "content-type": "application/xml" },
      }),
    );
    const grande = await PUT(pedir(destino));
    expect(grande.status).toBe(400);
    expect(await grande.text()).toBe("");
  });

  it("una redirección del destino no se sigue ni se devuelve: 502", async () => {
    almacenResponde(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/" },
      }),
    );
    const respuesta = await PUT(pedir(`http://${TEST}/x?${FIRMA}`));
    expect(respuesta.status).toBe(502);
    expect(respuesta.headers.get("location")).toBeNull();
  });

  it("un almacén que no responde se devuelve como 502 en texto plano", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const respuesta = await PUT(pedir(`http://${TEST}/x?${FIRMA}`));

    expect(respuesta.status).toBe(502);
    expect(respuesta.headers.get("content-type")).toBe("text/plain");
  });
});
