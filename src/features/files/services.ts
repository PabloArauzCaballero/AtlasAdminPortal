/**
 * Las llamadas del explorador de expedientes.
 *
 * Las rutas se escriben enteras y no se componen desde una constante: es lo que permite encontrar
 * de un vistazo qué endpoint usa cada pantalla, y lo que hace legible el diff cuando el backend
 * mueve uno.
 */
import { apiRequest } from "@/shared/api/client";
import { apiDownload, type ArchivoDescargado } from "@/shared/api/download";
import type { PaginationMeta, QueryParams } from "@/shared/api/types";
import type {
  Actividad,
  ActividadListResponse,
  Concesion,
  Contactos,
  Espectador,
  Expediente,
  ExpedienteListResponse,
  Nivel,
  Nodo,
  TicketDeSubida,
} from "./types";

function idempotencyKey(prefijo: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefijo}-${crypto.randomUUID()}`;
  return `${prefijo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Las listas del expediente llegan como `{ items, page, pageSize, total, totalPages, hasNextPage }`,
 * con la paginación PLANA. El cliente del portal sólo arma `meta` cuando viene `pagination`, así
 * que la tabla no recibía nada, no pintaba paginador y todo lo que pasara de la primera página era
 * inalcanzable. Aquí se lleva a la forma que entiende `DataTable`: `{ items, meta }`.
 */
export function aPaginaDelPortal<T>(
  respuesta: unknown,
  query: QueryParams,
): { items: T[]; meta: PaginationMeta } {
  const registro = (respuesta ?? {}) as Record<string, unknown>;
  const items = Array.isArray(registro.items) ? (registro.items as T[]) : [];
  const numero = (valor: unknown, porDefecto: number) =>
    typeof valor === "number" && Number.isFinite(valor) ? valor : porDefecto;
  const page = numero(registro.page, Number(query.page) || 1);
  const limit = numero(
    registro.pageSize,
    Number(query.pageSize) || items.length,
  );
  const total = numero(registro.total, items.length);
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: numero(
        registro.totalPages,
        Math.max(1, Math.ceil(total / Math.max(1, limit))),
      ),
    },
  };
}

export async function listarExpedientes(
  query: QueryParams,
): Promise<ExpedienteListResponse> {
  const respuesta = await apiRequest<unknown>("/expedientes", { query });
  return aPaginaDelPortal<Expediente>(respuesta, query);
}

export function obtenerExpediente(expedienteId: string) {
  return apiRequest<Expediente>(
    `/expedientes/${encodeURIComponent(expedienteId)}`,
  );
}

/** El expediente de un cliente. Devuelve `null` si aún no tiene uno: es un estado, no un error. */
export function expedientePorCliente(customerId: string, sessionId?: string) {
  return apiRequest<Expediente | null>(
    `/expedientes/por-sujeto/customer/${encodeURIComponent(customerId)}`,
    sessionId ? { query: { sessionId } } : {},
  );
}

export function listarNodos(expedienteId: string, query: QueryParams) {
  return apiRequest<Nodo[]>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos`,
    { query },
  );
}

/**
 * `permitirJson` porque un archivo del expediente PUEDE ser JSON —el `manifest.json` del envío o
 * la decisión del Motor—, y `apiDownload` lo rechazaría por defecto tomándolo por una respuesta
 * de la API en lugar del archivo.
 */
export function descargarNodo(
  expedienteId: string,
  nodo: Nodo,
  disposition: "inline" | "attachment" = "inline",
): Promise<ArchivoDescargado> {
  return apiDownload(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodo.nodoId)}/contenido`,
    nodo.nombre,
    { query: { disposition }, permitirJson: true },
  );
}

export function crearCarpeta(
  expedienteId: string,
  body: { parentId: string | null; nombre: string },
) {
  return apiRequest<Nodo>(
    `/expedientes/${encodeURIComponent(expedienteId)}/carpetas`,
    {
      method: "POST",
      body,
      idempotencyKey: idempotencyKey("expediente-carpeta"),
    },
  );
}

export function pedirTicketDeSubida(
  expedienteId: string,
  body: {
    parentId: string | null;
    nombre: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
  },
) {
  return apiRequest<TicketDeSubida>(
    `/expedientes/${encodeURIComponent(expedienteId)}/subidas`,
    {
      method: "POST",
      body,
      idempotencyKey: idempotencyKey("expediente-subida"),
    },
  );
}

export function confirmarSubida(expedienteId: string, ticketId: string) {
  return apiRequest<Nodo>(
    `/expedientes/${encodeURIComponent(expedienteId)}/subidas/${encodeURIComponent(ticketId)}/confirmar`,
    { method: "POST", idempotencyKey: idempotencyKey("expediente-confirmar") },
  );
}

export function actualizarNodo(
  expedienteId: string,
  nodoId: string,
  body: { nombre?: string; parentId?: string | null },
) {
  return apiRequest<Nodo>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}`,
    {
      method: "PATCH",
      body,
      idempotencyKey: idempotencyKey("expediente-nodo"),
    },
  );
}

export function borrarNodo(expedienteId: string, nodoId: string) {
  return apiRequest<{ nodosEnPapelera: number }>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}`,
    { method: "DELETE", idempotencyKey: idempotencyKey("expediente-borrar") },
  );
}

export function restaurarNodo(expedienteId: string, nodoId: string) {
  return apiRequest<Nodo>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/restaurar`,
    { method: "POST", idempotencyKey: idempotencyKey("expediente-restaurar") },
  );
}

export function purgarPapelera(expedienteId: string, motivo: string) {
  return apiRequest<{
    nodos: number;
    objetosBorrados: number;
    objetosConservados: number;
  }>(`/expedientes/${encodeURIComponent(expedienteId)}/papelera`, {
    method: "DELETE",
    body: { motivo },
    idempotencyKey: idempotencyKey("expediente-purgar"),
  });
}

export async function listarActividad(
  expedienteId: string,
  query: QueryParams,
): Promise<ActividadListResponse> {
  const respuesta = await apiRequest<unknown>(
    `/expedientes/${encodeURIComponent(expedienteId)}/actividad`,
    { query },
  );
  return aPaginaDelPortal<Actividad>(respuesta, query);
}

/** Los contactos del expediente, ENMASCARADOS. Para verlos completos está `revelarContactos`. */
export function obtenerContactos(expedienteId: string) {
  return apiRequest<Contactos>(
    `/expedientes/${encodeURIComponent(expedienteId)}/contactos`,
  );
}

/**
 * Los contactos SIN enmascarar (ADM-10).
 *
 * Es un POST y el motivo va en el CUERPO: antes era `GET ?revelar=true&motivo=…`, y el motivo —que
 * suele nombrar a la persona o al caso— quedaba escrito en los logs de acceso de cada proxy por el
 * que pasaba la URL. Responde el mismo JSON que el GET; `403 EXPEDIENTE_REVELAR_NO_PERMITIDO` sin
 * el permiso y `400 EXPEDIENTE_MOTIVO_REQUERIDO` con un motivo corto.
 */
export function revelarContactos(expedienteId: string, motivo: string) {
  return apiRequest<Contactos>(
    `/expedientes/${encodeURIComponent(expedienteId)}/contactos/revelar`,
    { method: "POST", body: { motivo } },
  );
}

export function listarConcesiones(expedienteId: string, nodoId: string) {
  return apiRequest<Concesion[]>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/concesiones`,
  );
}

/**
 * Quién ve este nodo, incluida la gente que lo ve por su rol.
 *
 * Endpoint distinto al de concesiones porque responde otra pregunta y exige otro nivel: listar
 * concesiones es cosa de quien administra el acceso; saber quién mira el expediente es parte de
 * revisar el caso.
 */
export function listarVisibilidad(expedienteId: string, nodoId: string) {
  return apiRequest<Espectador[]>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/concesiones/visibilidad`,
  );
}

export function conceder(
  expedienteId: string,
  nodoId: string,
  body: {
    principalTipo: "rol" | "usuario_interno";
    principalId: string;
    nivel: Nivel;
    motivo: string;
    venceEn?: string;
  },
) {
  return apiRequest<{ concesionId: string }>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/concesiones`,
    {
      method: "POST",
      body,
      idempotencyKey: idempotencyKey("expediente-conceder"),
    },
  );
}

export function revocar(expedienteId: string, nodoId: string, grantId: string) {
  return apiRequest<{ revocada: boolean }>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/concesiones/${encodeURIComponent(grantId)}`,
    { method: "DELETE", idempotencyKey: idempotencyKey("expediente-revocar") },
  );
}

export type { Actividad, Concesion, Contactos, Espectador, Expediente, Nodo };
