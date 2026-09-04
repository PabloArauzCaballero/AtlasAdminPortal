/**
 * Las llamadas del explorador de expedientes.
 *
 * Las rutas se escriben enteras y no se componen desde una constante: es lo que permite encontrar
 * de un vistazo qué endpoint usa cada pantalla, y lo que hace legible el diff cuando el backend
 * mueve uno.
 */
import { apiRequest } from "@/shared/api/client";
import { apiDownload, type ArchivoDescargado } from "@/shared/api/download";
import type { QueryParams } from "@/shared/api/types";
import type {
  Actividad,
  ActividadListResponse,
  Concesion,
  Contactos,
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

export function listarExpedientes(query: QueryParams) {
  return apiRequest<ExpedienteListResponse>("/expedientes", { query });
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

export function descargarNodo(
  expedienteId: string,
  nodo: Nodo,
  disposition: "inline" | "attachment" = "inline",
): Promise<ArchivoDescargado> {
  return apiDownload(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodo.nodoId)}/contenido`,
    nodo.nombre,
    { query: { disposition } },
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

export function listarActividad(expedienteId: string, query: QueryParams) {
  return apiRequest<ActividadListResponse>(
    `/expedientes/${encodeURIComponent(expedienteId)}/actividad`,
    { query },
  );
}

export function obtenerContactos(
  expedienteId: string,
  revelar = false,
  motivo?: string,
) {
  return apiRequest<Contactos>(
    `/expedientes/${encodeURIComponent(expedienteId)}/contactos`,
    {
      query: revelar ? { revelar: "true", motivo } : {},
    },
  );
}

export function listarConcesiones(expedienteId: string, nodoId: string) {
  return apiRequest<Concesion[]>(
    `/expedientes/${encodeURIComponent(expedienteId)}/nodos/${encodeURIComponent(nodoId)}/concesiones`,
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

export type { Actividad, Concesion, Contactos, Expediente, Nodo };
