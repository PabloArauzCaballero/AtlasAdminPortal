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
    hint: "Nadie recoge la cola de eventos en este entorno: los pendientes no dicen nada de los flujos.",
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
  PERMISO_FUERA_DEL_CATALOGO: {
    label: "Permiso que no existe",
    tone: "critical",
    hint: "Se exige un permiso que la base no tiene: nadie puede tenerlo, ni un superadministrador.",
  },
  MENU_PERMISO_DISTINTO: {
    label: "El menú pide otro permiso",
    tone: "critical",
    hint: "El menú deja entrar con un permiso y la operación pide otro: quien entra ve «sin permiso».",
  },
  SIN_GUARDA: {
    label: "Sin protección",
    tone: "critical",
    hint: "La operación no pide ni el permiso del menú ni ningún rol.",
  },
  PUBLIC: {
    label: "Pública",
    tone: "info",
    hint: "La operación es pública a propósito. Informativo.",
  },
  SOLO_ROL: {
    label: "Decide por rol",
    tone: "muted",
    hint: "La operación deniega por rol, no por el permiso que pide el menú. Informativo.",
  },
};

/** Una fecha del backend, o la palabra que corresponde cuando no hay. */
export function fecha(value: string | null, vacio = "—"): string {
  return value ? new Date(value).toLocaleString("es-BO") : vacio;
}
