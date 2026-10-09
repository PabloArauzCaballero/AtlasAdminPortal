/**
 * Reenvía al almacén (MinIO) la subida firmada que el navegador hace a ESTE origen.
 *
 * Por qué existe: `src/features/files/almacen.ts`.
 *
 * ## Qué impide que sea un proxy abierto (ADM-01 y ADM-09, auditoría 2026-10-09)
 *
 *  - Sólo PUT con una URL http(s) sin usuario ni contraseña, que lleve los parámetros de una firma
 *    AWS v4 prefirmada. Este reenvío NO valida la firma (no tiene la clave): sólo exige que esté.
 *    Quien la valida es el almacén, y por eso lo que acota de verdad es la lista de destinos.
 *  - Sólo a los destinos EXACTOS de `ALMACEN_HOSTS_PERMITIDOS` (`destino.ts`): `host` con el puerto
 *    implícito o `host:puerto`, sin patrones. Sin lista, en producción responde 503; fuera de
 *    producción sólo admite `localhost`/`127.0.0.1`. Los valores de TEST y DEV los pone
 *    `docker-compose.coolify.yml`.
 *  - Exige `content-length` y lee el cuerpo por trozos con tope: nunca carga más de
 *    `TAMANO_MAXIMO` en memoria.
 *  - Sin seguir redirecciones (un 3xx del destino se devuelve como 502), y sin la sesión del
 *    portal: sólo pasan las cabeceras que la firma cubre.
 *  - No devuelve lo que responda el destino: el estado sí; el cuerpo sólo si es el XML de error de
 *    S3 y cabe en 8 KB. El cliente (`upload.ts`) sólo mira `ok`.
 *
 * La firma incluye el `Host`, y `fetch` lo pone a partir de la URL de destino, así que el almacén
 * recibe exactamente la petición que se firmó.
 */
import { CABECERA_DESTINO } from "@/features/files/almacen";
import { leerCuerpoConTope } from "@/shared/lib/cuerpo-con-tope";
import { veredictoDestino } from "./destino";

export const dynamic = "force-dynamic";

/** Por encima de lo que AtlasBackend autoriza para cualquier documento; frena cuerpos absurdos. */
const TAMANO_MAXIMO = 50 * 1024 * 1024;

/** Lo más que se devuelve del cuerpo del almacén: un error XML de S3 cabe de sobra. */
const RESPUESTA_MAXIMA = 8 * 1024;

const CABECERAS_REENVIADAS = new Set([
  "content-type",
  "content-md5",
  "cache-control",
  "content-disposition",
]);

function rechazo(status: number, message: string): Response {
  return Response.json({ success: false, error: { message } }, { status });
}

function pasarela(): Response {
  return new Response("El almacén no respondió.", {
    status: 502,
    headers: { "content-type": "text/plain" },
  });
}

function leerDestino(request: Request): URL | Response {
  let destino: URL;
  try {
    destino = new URL(request.headers.get(CABECERA_DESTINO) ?? "");
  } catch {
    return rechazo(400, "Falta la dirección firmada de la subida.");
  }
  if (destino.protocol !== "http:" && destino.protocol !== "https:") {
    return rechazo(400, "La dirección de la subida no es http ni https.");
  }
  if (destino.username || destino.password) {
    return rechazo(400, "La dirección de la subida no puede llevar usuario.");
  }
  const q = destino.searchParams;
  if (
    q.get("X-Amz-Algorithm") !== "AWS4-HMAC-SHA256" ||
    !q.get("X-Amz-Signature") ||
    !q.get("X-Amz-Credential")
  ) {
    return rechazo(
      400,
      "La dirección de la subida no es un permiso firmado del almacén.",
    );
  }
  const veredicto = veredictoDestino(destino);
  if (veredicto === "sin-configurar") {
    return rechazo(503, "El almacén de archivos no está configurado.");
  }
  if (veredicto === "no-permitido") {
    return rechazo(
      403,
      `El almacén de archivos ${destino.hostname} no está autorizado.`,
    );
  }
  return destino;
}

/** El estado del almacén, y su cuerpo sólo si es el XML de S3 y es pequeño. */
async function respuestaAcotada(respuesta: Response): Promise<Response> {
  if (respuesta.status >= 300 && respuesta.status < 400) {
    await respuesta.body?.cancel().catch(() => undefined);
    return pasarela();
  }
  const tipo = (respuesta.headers.get("content-type") ?? "").toLowerCase();
  const esXml =
    tipo.startsWith("application/xml") || tipo.startsWith("text/xml");
  if (!esXml) {
    await respuesta.body?.cancel().catch(() => undefined);
    return new Response(null, { status: respuesta.status });
  }
  const cuerpo = await leerCuerpoConTope(respuesta.body, RESPUESTA_MAXIMA);
  if (!cuerpo.ok) return new Response(null, { status: respuesta.status });
  return new Response(cuerpo.bytes, {
    status: respuesta.status,
    headers: { "content-type": "application/xml" },
  });
}

export async function PUT(request: Request): Promise<Response> {
  const destino = leerDestino(request);
  if (destino instanceof Response) return destino;

  const declarado = request.headers.get("content-length");
  if (declarado === null) {
    return rechazo(411, "Falta el tamaño del archivo (content-length).");
  }
  const longitud = Number(declarado);
  if (!/^\d+$/.test(declarado.trim()) || !Number.isSafeInteger(longitud)) {
    return rechazo(400, "El tamaño del archivo no es válido.");
  }
  if (longitud > TAMANO_MAXIMO) {
    return rechazo(413, "El archivo es demasiado grande.");
  }

  const cabeceras = new Headers();
  request.headers.forEach((valor, nombre) => {
    const n = nombre.toLowerCase();
    if (CABECERAS_REENVIADAS.has(n) || n.startsWith("x-amz-"))
      cabeceras.set(n, valor);
  });
  // Tope = lo declarado: un cuerpo más largo que su content-length no se reenvía.
  const cuerpo = await leerCuerpoConTope(request.body, longitud);
  if (!cuerpo.ok) return rechazo(413, "El archivo es demasiado grande.");

  let respuesta: Response;
  try {
    respuesta = await fetch(destino, {
      method: "PUT",
      headers: cabeceras,
      body: cuerpo.bytes,
      redirect: "manual",
    });
  } catch {
    return pasarela();
  }
  return respuestaAcotada(respuesta);
}
