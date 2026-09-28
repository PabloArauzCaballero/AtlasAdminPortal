import { isAtlasApiError } from "@/shared/api/errors";

/**
 * Qué se le dice a la persona ante cada fallo del asistente, y si tiene sentido reintentar.
 *
 * Sólo el 400 `ASSIST_REJECTED` enseña el texto del servidor: viene redactado para quien escribe
 * («no compartas datos personales», «la pregunta es demasiado larga»). El resto usa textos propios
 * del portal, porque los de Core están pensados para la app del cliente.
 */

export const ASSIST_DISABLED_MESSAGE =
  "El asistente todavía no está encendido en este ambiente.";

export type AssistFailure = {
  mensaje: string;
  /** Repetir el MISMO mensaje con la MISMA llave puede funcionar (red, espera, indisponible). */
  reintentable: boolean;
};

/** 404: el asistente está apagado en este ambiente. No es un fallo de la persona. */
export function isAssistDisabled(error: unknown): boolean {
  return (
    isAtlasApiError(error) &&
    (error.code === "ASSIST_DISABLED" || error.status === 404)
  );
}

/** 409: la MISMA consulta sigue en curso; la respuesta se recoge repitiendo con la misma llave. */
export function isAssistInFlight(error: unknown): boolean {
  return (
    isAtlasApiError(error) &&
    (error.code === "ASSIST_IN_FLIGHT" || error.status === 409)
  );
}

export function describeAssistFailure(error: unknown): AssistFailure {
  if (!isAtlasApiError(error)) {
    return {
      mensaje: "No se pudo hablar con el asistente. Intenta de nuevo.",
      reintentable: true,
    };
  }
  if (error.code === "ASSIST_REJECTED" || error.status === 400) {
    return {
      mensaje:
        error.message ||
        "El asistente no pudo procesar esa pregunta. Escríbela de otra forma.",
      reintentable: false,
    };
  }
  if (isAssistInFlight(error)) {
    return {
      mensaje:
        "Tu consulta sigue en curso. Espera unos segundos y vuelve a intentar.",
      reintentable: true,
    };
  }
  if (error.code === "ASSIST_BUSY" || error.status === 429) {
    return {
      mensaje:
        "El asistente está atendiendo muchas consultas. Espera un momento y vuelve a intentar.",
      reintentable: true,
    };
  }
  if (error.status === 403) {
    return {
      mensaje: "Tu usuario no tiene acceso al asistente en este portal.",
      reintentable: false,
    };
  }
  if (error.status === 0 || error.code === "UNKNOWN_OUTCOME") {
    return {
      mensaje:
        "No llegó la respuesta del asistente. Revisa la conexión y vuelve a intentar: no se duplica la pregunta.",
      reintentable: true,
    };
  }
  return {
    mensaje:
      "El asistente no está disponible en este momento. Intenta de nuevo en unos minutos.",
    reintentable: true,
  };
}
