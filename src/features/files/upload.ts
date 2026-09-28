"use client";

import { pedirTicketDeSubida, confirmarSubida } from "./services";
import { CABECERA_DESTINO, RUTA_SUBIDA_AL_ALMACEN } from "./almacen";
import type { Nodo } from "./types";

/**
 * La subida en tres pasos, desde el navegador.
 *
 *   1. se calcula el SHA-256 del archivo AQUÍ,
 *   2. el backend firma un permiso de subida acotado a ese tipo y ese tamaño,
 *   3. el navegador sube al almacén —a través de este mismo origen, ver `almacen.ts`— y el
 *      backend confirma.
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

/** El PUT al almacén falló. Su mensaje ya está escrito para quien opera. */
export class ErrorDelAlmacen extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorDelAlmacen";
  }
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
   * tipo y tamaño ANTES de que el objeto exista, en vez de descubrirlo después. La URL firmada
   * viaja en una cabecera aparte hacia el reenvío del mismo origen (`almacen.ts`).
   */
  const respuesta = await fetch(RUTA_SUBIDA_AL_ALMACEN, {
    method: ticket.method,
    headers: {
      ...ticket.requiredHeaders,
      [CABECERA_DESTINO]: ticket.uploadUrl,
    },
    body: input.archivo,
  });
  if (!respuesta.ok) {
    // Sin el estado HTTP en el texto: a quien opera no le dice nada, y el detalle ya queda en la
    // pestaña de red para quien lo investigue.
    throw new ErrorDelAlmacen(
      "El almacén no aceptó el archivo. Vuelve a intentarlo; si se repite, avisa a soporte.",
    );
  }

  input.onProgreso?.("verificacion");
  // Aquí el backend descarga el objeto y comprueba hash, tamaño, bytes mágicos y antivirus. Si algo
  // falla, borra el objeto y responde el motivo: el archivo nunca queda a medias en el expediente.
  return confirmarSubida(input.expedienteId, ticket.ticketId);
}

/** Los motivos viven en `errores.ts`; se reexportan para quien ya los importaba de aquí. */
export { MOTIVO_DE_RECHAZO } from "./errores";

/**
 * Lo que el backend admite por defecto (`FILE_UPLOAD_ALLOWED_MIME_TYPES` y `FILE_UPLOAD_MAX_BYTES`
 * en `env.files.schema.ts`; TEST los arranca con estos mismos valores). Filtrar en el selector
 * ahorra al operador elegir algo que el servidor va a rechazar después de subirlo.
 */
export const TIPOS_ADMITIDOS = "image/jpeg,image/png,application/pdf";
export const LIMITES_DE_SUBIDA = "JPG, PNG o PDF, hasta 15 MB cada uno.";
