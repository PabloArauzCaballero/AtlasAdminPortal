import { isAtlasApiError } from "@/shared/api/errors";

/**
 * El mensaje de un fallo al actuar sobre un cliente, en lenguaje de operación.
 *
 * Estas acciones las restringe el servidor por rol (cumplimiento, riesgo, operación), no por un
 * permiso del catálogo, así que la pantalla no puede saber de antemano si tu rol alcanza: lo dice
 * al volver el 403, con quién sí puede hacerlo.
 */
export function actionErrorMessage(
  error: unknown,
  whoCan: string,
): { message: string; requestId?: string } {
  if (!isAtlasApiError(error))
    return { message: "Error inesperado. Vuelve a intentarlo en un momento." };
  const requestId = error.requestId;
  if (error.status === 403)
    return {
      message: `Tu rol no puede hacer esto. Lo hacen ${whoCan}.`,
      requestId,
    };
  if (/INVALID_STATUS_TRANSITION/.test(`${error.code} ${error.message}`))
    return {
      message:
        "El estado del cliente cambió y esa transición ya no está permitida. Recarga la ficha y vuelve a elegir.",
      requestId,
    };
  if (error.status === 404)
    return { message: "No se encontró el cliente.", requestId };
  return { message: error.message, requestId };
}
