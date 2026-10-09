import { AtlasApiError } from "@/shared/api/errors";

/**
 * Los motivos por los que el backend rechaza algo del expediente, en palabras de quien lo lee.
 *
 * ## Por qué se busca por código Y por mensaje
 *
 * El backend lanza `BadRequestException('FILE_TOO_LARGE')`: el filtro de errores pone en `code` un
 * genérico por estado (`VALIDATION_ERROR`, `CONFLICT`…) y el motivo real viaja en `message`. Buscar
 * sólo por `code` hacía que el operador leyera «FILE_TOO_LARGE» tal cual. Se busca en los dos para
 * que siga funcionando el día que el backend empiece a mandar el motivo como código.
 *
 * El mapa cubre TODO lo que lanzan `subida.service.ts`, `nodo.service.ts`,
 * `nodo-movimiento.service.ts`, `contenido.service.ts` y `concesion.service.ts`, y los motivos de
 * `FileService.verifyStored` (`FileRejectionReason`). Lo que falte cae en un mensaje genérico,
 * nunca en el código en mayúsculas.
 */
export const MOTIVO_DE_RECHAZO: Record<string, string> = {
  FILE_EMPTY: "El archivo está vacío.",
  FILE_TOO_LARGE: "El archivo pesa más de 15 MB, que es el máximo permitido.",
  FILE_CONTENT_TYPE_NOT_ALLOWED:
    "Ese tipo de archivo no se admite aquí. Sólo JPG, PNG o PDF.",
  FILE_CONTENT_TYPE_MISMATCH:
    "El contenido no coincide con la extensión: el archivo no es lo que dice ser.",
  FILE_HASH_MISMATCH:
    "Lo que llegó al almacén no coincide con lo que se eligió. Vuelve a subirlo.",
  FILE_SIZE_MISMATCH: "El tamaño de lo subido no coincide con lo autorizado.",
  FILE_MALWARE_DETECTED: "El antivirus marcó este archivo. No se guardó.",
  FILE_SCAN_UNAVAILABLE:
    "No se pudo analizar el archivo. Inténtalo de nuevo en unos minutos.",
  FILE_NOT_FOUND:
    "El archivo no terminó de llegar al almacén. Vuelve a subirlo.",
  EXPEDIENTE_TICKET_VENCIDO:
    "El permiso de subida caducó. Vuelve a intentarlo.",
  EXPEDIENTE_TICKET_NO_ENCONTRADO:
    "El permiso de subida no es válido para este expediente. Vuelve a intentarlo.",
  EXPEDIENTE_TICKET_YA_CONSUMIDO:
    "Ese archivo ya se había confirmado. Recarga la carpeta para verlo.",
  EXPEDIENTE_ARCHIVO_DUPLICADO: "Ese archivo ya está en el expediente.",
  EXPEDIENTE_NODO_CONGELADO:
    "El expediente se congeló al enviarse; sólo se puede añadir en «otros».",
};

const SIN_ACCESO = "Tu acceso a este expediente no alcanza para esto.";

const MENSAJE_DE_CODIGO: Record<string, string> = {
  ...MOTIVO_DE_RECHAZO,
  EXPEDIENTES_DISABLED: "Los expedientes están desactivados en este entorno.",
  EXPEDIENTE_NO_ENCONTRADO:
    "El expediente no existe o tu acceso no alcanza hasta él.",
  EXPEDIENTE_NODO_NO_ENCONTRADO:
    "Ese archivo o carpeta ya no está. Puede que otra persona lo haya movido o borrado.",
  EXPEDIENTE_NOMBRE_INVALIDO:
    "El nombre no es válido: no puede estar vacío, tener más de 255 caracteres ni llevar «/» o «\\».",
  EXPEDIENTE_NOMBRE_OCUPADO: "Ya hay algo con ese nombre en esta carpeta.",
  EXPEDIENTE_PROFUNDIDAD_MAXIMA:
    "No se pueden anidar más carpetas en este punto.",
  EXPEDIENTE_CARPETA_LLENA:
    "Esta carpeta ya tiene el máximo de elementos permitidos.",
  EXPEDIENTE_PADRE_NO_ES_CARPETA:
    "Sólo se puede guardar dentro de una carpeta.",
  EXPEDIENTE_DESTINO_NO_ES_CARPETA: "El destino tiene que ser una carpeta.",
  EXPEDIENTE_MOVIMIENTO_CIRCULAR:
    "No se puede mover una carpeta dentro de sí misma.",
  EXPEDIENTE_NODO_NO_ESTA_EN_PAPELERA:
    "Ese elemento ya no está en la papelera.",
  EXPEDIENTE_NODO_SIN_CONTENIDO: "Ese elemento no tiene contenido que abrir.",
  EXPEDIENTE_OBJETO_AUSENTE: "El archivo ya no está en el almacén.",
  EXPEDIENTE_NIVEL_INSUFICIENTE: SIN_ACCESO,
  EXPEDIENTE_NIVEL_SUPERIOR_AL_PROPIO:
    "No se puede conceder un nivel superior al tuyo.",
  EXPEDIENTE_MOTIVO_REQUERIDO:
    "Falta el motivo: escribe al menos ocho caracteres.",
  EXPEDIENTE_REVELAR_NO_PERMITIDO:
    "No tienes el permiso para ver los contactos completos (expedientes.pii.revelar). Pídelo a quien administra los usuarios internos; reintentar no lo cambia.",
  EXPEDIENTE_CONCESION_NO_ENCONTRADA: "Ese acceso ya no existe.",
  EXPEDIENTE_CONCESION_YA_REVOCADA: "Ese acceso ya se había quitado.",
  EXPEDIENTE_ULTIMA_ADMINISTRACION:
    "No se puede quitar: es el último acceso de administración del expediente.",
  EXPEDIENTE_REQUIERE_SESION_INTERNA:
    "Hace falta una sesión de personal interno para esto.",
};

/**
 * Errores que fabrica el propio portal (red, tiempo agotado, respuesta ilegible). Su mensaje ya
 * está redactado para quien opera, así que se enseña tal cual.
 */
const CODIGOS_DEL_PORTAL = new Set([
  "UNKNOWN_OUTCOME",
  "INVALID_RESPONSE",
  "REJECTED_WITHOUT_REASON",
  "REQUEST_TIMEOUT",
  "NETWORK_ERROR",
  "API_CONTRACT_ERROR",
  "DOWNLOAD_NOT_A_FILE",
]);

/**
 * Un error de la API explicado en español, o `porDefecto` si no se sabe explicarlo.
 *
 * El mensaje crudo del servidor NO se enseña: puede ser un código en mayúsculas o un texto de
 * validación en inglés, y ninguno de los dos le dice al operador qué hacer.
 */
export function explicarError(error: unknown, porDefecto: string): string {
  if (!(error instanceof AtlasApiError)) return porDefecto;
  const conocido =
    MENSAJE_DE_CODIGO[error.code] ?? MENSAJE_DE_CODIGO[error.message.trim()];
  if (conocido) return conocido;
  if (CODIGOS_DEL_PORTAL.has(error.code) && error.message) return error.message;
  if (error.status === 403) return SIN_ACCESO;
  return porDefecto;
}
