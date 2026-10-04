/**
 * La opinión del Motor sobre una solicitud del titular, en palabras del equipo.
 *
 * Mismos códigos que publica `PRIVACIDAD_SOLICITUD_TITULAR` (AtlasDecisionEngineBackend,
 * `docs/artifacts/privacidad-solicitud-titular.md`). Un código que el portal no conozca se enseña tal cual: esconderlo
 * sería peor que verlo en bruto.
 */
export const ENGINE_DECISION_LABELS: Record<string, string> = {
  ACEPTAR: "Aceptar",
  RECHAZAR: "Rechazar",
  REVISION_HUMANA: "Que lo decida una persona",
};

/** Por qué, dicho como se le explicaría a quien atiende. Las referencias legales son las del plan (§13). */
export const ENGINE_REASON_LABELS: Record<string, string> = {
  DSR_BORRADO_CON_DEUDA:
    "Tiene saldo, un préstamo activo, cuotas en mora o un pago por conciliar: la cuenta no se cierra con deuda.",
  DSR_YA_EN_CURSO: "Ya hay otra solicitud igual en curso.",
  DSR_USAR_AUTOSERVICIO:
    "Teléfono y correo los cambia el cliente desde Perfil, con un código al contacto nuevo.",
  DSR_BORRADO_CON_RETENCION:
    "Operó con crédito o verificó identidad: se cierra y se borra lo borrable; lo que la ley obliga se conserva 10 años (Ley 393, DS 4904).",
  DSR_BORRADO_TOTAL: "Nunca operó ni verificó identidad: se puede borrar todo.",
  DSR_CORRECCION_BAJO_RIESGO:
    "Dato de domicilio, identidad verificada, PIN confirmado y sin señales de robo de cuenta.",
  DSR_CASO_ABIERTO: "Tiene un caso de fraude o un reclamo abierto.",
  DSR_POSIBLE_ROBO_DE_CUENTA:
    "Señales de cuenta robada: contacto o dispositivo nuevos esta semana, o no confirmó su PIN.",
  DSR_PROCESO_EN_CURSO: "Tiene un extracto bancario en revisión.",
  DSR_ESTADO_DE_CUENTA:
    "La cuenta no está activa ni en alta (observada, bloqueada, suspendida o cerrada).",
  DSR_CAMBIO_DE_IDENTIDAD:
    "Es un dato del carnet: exige documento y actualizar la diligencia debida.",
  DSR_AFECTA_CREDITO:
    "Cambia un dato con el que se calcula su línea (ocupación, empleador o ingreso).",
  DSR_CAMPO_NO_CATALOGADO: "Pidió corregir un dato fuera de la lista.",
  DSR_CAMBIOS_REPETIDOS: "Es la tercera corrección del mismo dato en un año.",
  DSR_SIN_CRITERIO_AUTOMATICO:
    "Ninguna regla automática lo cubre (por ejemplo, sin identidad verificada o desde un dispositivo nuevo).",
};

export const ENGINE_ACTION_LABELS: Record<string, string> = {
  CORREGIR: "Corregir el dato",
  CERRAR_Y_ANONIMIZAR: "Cerrar la cuenta y conservar sólo lo obligatorio",
  BORRAR_TODO: "Borrar la cuenta y sus datos",
  AUTOSERVICIO: "Indicarle que lo cambie desde Perfil",
  NINGUNA: "Ninguna todavía",
};

/** Los hechos que vio el Motor. El orden es el de lectura: primero lo que lo decide casi todo. */
export const ENGINE_INPUT_LABELS: Array<[string, string]> = [
  ["dsr_saldo_pendiente", "Saldo pendiente (Bs)"],
  ["dsr_prestamos_activos", "Préstamos activos"],
  ["dsr_cuotas_en_mora", "Cuotas en mora"],
  ["dsr_pagos_en_conciliacion", "Pagos por conciliar"],
  ["dsr_fraude_abierto", "Caso de fraude abierto"],
  ["dsr_caso_abierto", "Reclamo o caso de soporte abierto"],
  ["dsr_contacto_cambiado_7d", "Teléfono o correo nuevo en 7 días"],
  ["dsr_dispositivo_nuevo_7d", "Dispositivo nuevo en 7 días"],
  ["dsr_pin_confirmado", "Confirmó su PIN al pedir"],
  ["dsr_identidad_verificada", "Identidad verificada"],
  ["dsr_cuenta_operativa", "Cuenta activa o en alta"],
  ["dsr_tuvo_credito", "Operó con crédito alguna vez"],
  ["dsr_extracto_en_revision", "Extracto en revisión"],
  ["dsr_solicitudes_iguales_abiertas", "Otras solicitudes iguales abiertas"],
  ["dsr_cambios_del_campo_365d", "Correcciones del mismo dato en un año"],
];

export function engineLabel(
  map: Record<string, string>,
  code: string | null | undefined,
): string {
  if (!code) return "—";
  return map[code] ?? code;
}

export function engineInputValue(value: unknown): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  if (value === null || value === undefined) return "—";
  return String(value);
}
