"use client";

import { pedirTicketDeSubida, confirmarSubida } from "./services";
import type { Nodo } from "./types";

/**
 * La subida en tres pasos, desde el navegador.
 *
 *   1. se calcula el SHA-256 del archivo AQUÍ,
 *   2. el backend firma un permiso de subida acotado a ese tipo y ese tamaño,
 *   3. el navegador escribe directo en el almacén y el backend confirma.
 *
 * ## Por qué el hash se calcula antes de subir
 *
 * Porque es lo único que permite comprobar que lo que llegó al almacén es lo que la persona
 * eligió. Sin él quedan el tamaño y el tipo, que no distinguen un archivo de otro del mismo peso;
 * con él, el backend descarga el objeto, lo recalcula y rechaza cualquier diferencia. `crypto.subtle`
 * existe en todo navegador que soporte este portal y lo hace sin bloquear la interfaz.
 *
 * ## Por qué el PUT no pasa por la API
 *
 * Los bytes irían dos veces por el backend —entrar y salir— y un extracto de 10 MB por operador
 * convertiría la API en un proxy de archivos. Con el ticket, el backend sólo firma y verifica.
 */
export async function sha256Hex(archivo: File): Promise<string> {
  const buffer = await archivo.arrayBuffer();
  const resumen = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(resumen))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function subirArchivo(input: {
  expedienteId: string;
  parentId: string | null;
  archivo: File;
  onProgreso?: (fase: "hash" | "subida" | "verificacion") => void;
}): Promise<Nodo> {
  input.onProgreso?.("hash");
  const sha256 = await sha256Hex(input.archivo);

  const ticket = await pedirTicketDeSubida(input.expedienteId, {
    parentId: input.parentId,
    nombre: input.archivo.name,
    contentType: input.archivo.type || "application/octet-stream",
    sizeBytes: input.archivo.size,
    sha256,
  });

  input.onProgreso?.("subida");
  /*
   * Las cabeceras van EXACTAMENTE como las devolvió el ticket.
   *
   * Están firmadas: alterar una sola invalida la URL y el almacén responde 403. Es lo que acota
   * tipo y tamaño ANTES de que el objeto exista, en vez de descubrirlo después.
   */
  const respuesta = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.requiredHeaders,
    body: input.archivo,
  });
  if (!respuesta.ok) {
    throw new Error(
      `El almacén rechazó la subida (HTTP ${String(respuesta.status)}).`,
    );
  }

  input.onProgreso?.("verificacion");
  // Aquí el backend descarga el objeto y comprueba hash, tamaño, bytes mágicos y antivirus. Si algo
  // falla, borra el objeto y responde el motivo: el archivo nunca queda a medias en el expediente.
  return confirmarSubida(input.expedienteId, ticket.ticketId);
}

/** Motivos de rechazo del backend, en el idioma de quien los lee. */
export const MOTIVO_DE_RECHAZO: Record<string, string> = {
  FILE_EMPTY: "El archivo está vacío.",
  FILE_TOO_LARGE: "El archivo supera el tamaño permitido.",
  FILE_CONTENT_TYPE_NOT_ALLOWED: "Ese tipo de archivo no se admite aquí.",
  FILE_CONTENT_TYPE_MISMATCH:
    "El contenido no coincide con la extensión: el archivo no es lo que dice ser.",
  FILE_HASH_MISMATCH:
    "Lo que llegó al almacén no coincide con lo que se eligió. Vuelve a subirlo.",
  FILE_SIZE_MISMATCH: "El tamaño de lo subido no coincide con lo autorizado.",
  FILE_MALWARE_DETECTED: "El antivirus marcó este archivo. No se guardó.",
  FILE_SCAN_UNAVAILABLE:
    "No se pudo analizar el archivo. Inténtalo de nuevo en unos minutos.",
  EXPEDIENTE_TICKET_VENCIDO:
    "El permiso de subida caducó. Vuelve a intentarlo.",
  EXPEDIENTE_ARCHIVO_DUPLICADO: "Ese archivo ya está en el expediente.",
  EXPEDIENTE_NODO_CONGELADO:
    "El expediente se congeló al enviarse; sólo se puede añadir en «otros».",
};
