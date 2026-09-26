import { AtlasApiError } from "./errors";
import { buildRequestInit, buildUrl } from "./request-init";
import type { ApiRequestOptions } from "./request-init";
import { getApiTimeoutMs } from "./config";
import { parseJsonSafely, toAtlasApiError } from "./response";
import { rawFetch } from "./transport";
import { coordinateSessionRefresh } from "./refresh-coordinator";
import { getStoredInternalSession } from "@/shared/auth/session-storage";

export type ArchivoDescargado = {
  blob: Blob;
  nombre: string;
  contentType: string;
};

/**
 * Trae un archivo del backend por la MISMA puerta autenticada que el resto.
 *
 * ## Por qué hace falta y por qué no vale `apiRequest`
 *
 * `apiRequest` sólo entiende JSON: descarta el cuerpo binario al parsearlo. Y la alternativa
 * ingenua —apuntar un `<img src="/api/v1/…">` o un `<a href download>`— tampoco sirve: cargar un
 * medio o seguir un enlace son navegaciones del navegador, y ahí NO viaja el `Authorization`, que
 * esta aplicación guarda en memoria y no en una cookie. El backend responde 401 y lo que se ve es
 * el icono de imagen rota o un archivo que por dentro es un error.
 *
 * Pidiéndolo aquí la credencial va puesta, la renovación de sesión vale igual que en cualquier otra
 * llamada, y un error del servidor llega como error —con su código— en vez de descargarse como si
 * fuera el archivo.
 *
 * ## Por qué el 401 se reintenta una sola vez
 *
 * Es el mismo criterio de `apiRequest`: una sesión que acaba de caducar se renueva y se repite la
 * petición. Reintentar más veces sobre un 401 que persiste sólo alarga la espera de quien mira una
 * pantalla que ya no va a cargar.
 */
export async function apiDownload(
  path: string,
  fallbackNombre: string,
  options: ApiRequestOptions = {},
): Promise<ArchivoDescargado> {
  const respuesta = await pedir(path, options);

  if (!respuesta.ok) {
    // El cuerpo de un error SÍ es JSON: se parsea para que el mensaje del backend llegue al toast
    // en vez de un «no se pudo descargar» genérico.
    const payload = await parseJsonSafely(respuesta);
    throw toAtlasApiError(respuesta, payload);
  }

  const contentType =
    respuesta.headers.get("content-type") ?? "application/octet-stream";
  if (contentType.includes("application/json")) {
    /*
     * Un 200 con JSON no es una descarga.
     *
     * Pasa cuando el backend responde el recurso en vez del archivo —una ruta que cambió, un
     * `Accept` perdido por el camino—. Sin esta comprobación el blob se guarda igual y el defecto
     * sólo aparece al ABRIR el archivo, que es el peor momento para descubrirlo.
     */
    throw new AtlasApiError({
      status: respuesta.status,
      code: "DOWNLOAD_NOT_A_FILE",
      message: "El servidor devolvió datos en lugar del archivo.",
    });
  }

  return {
    blob: await respuesta.blob(),
    nombre: nombreDeCabecera(respuesta) ?? fallbackNombre,
    contentType,
  };
}

async function pedir(
  path: string,
  options: ApiRequestOptions,
  yaRenovada = false,
): Promise<Response> {
  const session = getStoredInternalSession();
  // `accept: */*` porque el archivo puede ser imagen, PDF o JSON y no se sabe cuál hasta pedirlo.
  const init = buildRequestInit(
    { ...options, headers: { accept: "*/*", ...(options.headers ?? {}) } },
    session,
  );
  const respuesta = await rawFetch(
    buildUrl(path, options.query),
    init,
    getApiTimeoutMs(),
  );

  if (respuesta.status === 401 && !yaRenovada && !options.skipRefresh) {
    const renovada = await coordinateSessionRefresh(session);
    if (renovada) return pedir(path, options, true);
  }
  return respuesta;
}

/** El nombre que el servidor propone. Si no lo dice, decide quien llama. */
function nombreDeCabecera(respuesta: Response): string | null {
  const disposition = respuesta.headers.get("content-disposition");
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
