import type {
  DomainEventConsumer,
  PendingWorkDiagnosis,
  RbacDriftSeverity,
} from "./types";

type BadgeTone = "success" | "warning" | "critical" | "info" | "muted";
type Etiqueta = { label: string; tone: BadgeTone; hint: string };

/**
 * Qué significa cada desenlace, en las palabras del backend.
 *
 * Aquí se decide el COLOR, y el color es una afirmación: pintar en rojo un evento que puede ser de
 * auditoría, o en verde uno cuyo mensaje nunca salió, es contar una cosa distinta de la que dice el
 * dato. Por eso sólo lo que el backend llama avería va en rojo.
 */
export const DIAGNOSIS: Record<PendingWorkDiagnosis, Etiqueta> = {
  SIN_CONSUMIDOR: {
    label: "Sin consumidor aquí",
    tone: "warning",
    hint: "Nadie consume el outbox en este entorno: los pendientes no dicen nada de los flujos.",
  },
  SALTADOS: {
    label: "El consumidor salta eventos",
    tone: "critical",
    hint: "El consumidor corre y hay pendientes más viejos que su última pasada.",
  },
  AL_DIA: {
    label: "Al día",
    tone: "success",
    hint: "El consumidor corre y lo pendiente es posterior a su última pasada.",
  },
};

export const CONSUMER: Record<DomainEventConsumer, Etiqueta> = {
  AVISA: {
    label: "Avisa",
    tone: "success",
    hint: "Al menos un mensaje salió hacia un canal.",
  },
  MENSAJE_SIN_SALIDA: {
    label: "Mensaje sin salida",
    tone: "critical",
    hint: "Generó mensajes y ninguno salió: el circuito se rompe en la entrega.",
  },
  SIN_REGISTRO: {
    label: "Sin registro",
    tone: "critical",
    hint: "Fuera del registro de eventos: lo marca procesado el job de compatibilidad sin avisar a nadie.",
  },
  REGISTRADO_SIN_AVISOS: {
    label: "Registrado, sin avisos",
    tone: "warning",
    hint: "Lo consume el motor de notificaciones sin generar mensaje. Puede ser a propósito.",
  },
  SIN_PROCESAR: {
    label: "Sin procesar",
    tone: "muted",
    hint: "Ningún evento procesado todavía: no se puede concluir nada.",
  },
};

export const DRIFT: Record<RbacDriftSeverity, Etiqueta> = {
  SIN_GUARDA: {
    label: "Sin guarda",
    tone: "critical",
    hint: "La API no exige ni el permiso del menú ni ningún rol.",
  },
  SOLO_ROL: {
    label: "Sólo rol",
    tone: "warning",
    hint: "La API deniega por rol, no por el permiso que pide el menú.",
  },
  PUBLIC: {
    label: "Pública",
    tone: "info",
    hint: "La ruta es pública a propósito.",
  },
};

/** Una fecha del backend, o la palabra que corresponde cuando no hay. */
export function fecha(value: string | null, vacio = "—"): string {
  return value ? new Date(value).toLocaleString("es-BO") : vacio;
}
