/**
 * Funciones puras de presentación del módulo de proveedores externos.
 *
 * Viven aparte de los componentes para poder probarlas sin montar nada: son justo las que
 * decidían qué afirmaba la pantalla —qué modo se pinta, qué etiqueta lleva un literal del
 * backend, si un JSON escrito a mano vale— y las que se equivocaban en silencio.
 */

/**
 * El modo con el que la API EJECUTA de verdad, no el que dice la base.
 *
 * El backend decide el modo con `providerModeFromEnv`: si el entorno fija un modo para el
 * proveedor, ése gana sobre la columna `default_mode`. En TEST los ocho tenían `mock_local` en la
 * base y se ejecutaban en `mock_server` por el entorno, así que la tabla afirmaba un modo que no
 * era el que corría. La sonda de salud ya trae el modo efectivo: si existe, manda.
 */
export function modoEfectivo(provider: {
  defaultMode: string;
  health?: { mode?: string | null } | null;
}): string {
  const medido = provider.health?.mode?.trim();
  return medido ? medido : provider.defaultMode;
}

/**
 * El modo que fija el entorno cuando NO coincide con el guardado, o `null`.
 *
 * Es lo que hace falta para avisar de que guardar el modo en el formulario no cambia nada: el
 * backend respondía «guardado» y seguía ejecutando con el del entorno.
 */
export function modoFijadoPorEntorno(
  defaultMode: string,
  healthMode?: string | null,
): string | null {
  const efectivo = healthMode?.trim().toLowerCase();
  if (!efectivo) return null;
  return efectivo === defaultMode.trim().toLowerCase() ? null : efectivo;
}

/** Tipos de consulta que declaran las políticas de costo y los adaptadores del backend. */
const TIPOS_DE_CONSULTA: Record<string, string> = {
  IDENTITY_VERIFICATION: "Verificación de identidad",
  CREDIT_REPORT: "Informe de buró de crédito",
  CREDIT_SCORE: "Puntaje de crédito",
  DIGITAL_TRUST_CHECK: "Confianza digital",
  SOCIAL_TRUST_CHECK: "Confianza en redes sociales",
  PHONE_TRUST_CHECK: "Confianza de la línea telefónica",
  PAYMENT_VERIFICATION: "Verificación de pago",
  BANK_TRANSFER_VERIFICATION: "Verificación de transferencia bancaria",
  WHATSAPP_OTP_VERIFICATION: "Código de verificación por WhatsApp",
};

/** Etiqueta de un tipo de consulta; un tipo desconocido se enseña tal cual antes que inventarle nombre. */
export function etiquetaTipoConsulta(tipo?: string | null): string {
  if (!tipo) return "—";
  return TIPOS_DE_CONSULTA[tipo.trim().toUpperCase()] ?? tipo;
}

export type TramoDeCosto = "FREE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const ETIQUETA_DE_TRAMO: Record<TramoDeCosto, string> = {
  FREE: "Sin costo",
  LOW: "Costo bajo",
  MEDIUM: "Costo medio",
  HIGH: "Costo alto",
  CRITICAL: "Costo crítico",
};

export const DESCRIPCION_DE_TRAMO: Record<TramoDeCosto, string> = {
  FREE: "La consulta no le cuesta nada a Atlas.",
  LOW: "Cuesta poco; se puede consultar con frecuencia.",
  MEDIUM: "Cuesta lo bastante para vigilar cuántas se hacen.",
  HIGH: "Cara: conviene limitarla y revisar quién la pide.",
  CRITICAL: "La más cara: debería pasar siempre por aprobación.",
};

/** Resultado de leer un JSON escrito a mano en un formulario. */
export type LecturaJson =
  { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/**
 * Lee el texto de un campo «Datos de la consulta (JSON)».
 *
 * Exige un OBJETO: el backend valida `input` como un registro, y un `[]` o un `"texto"` pasaban
 * la lectura del navegador para morir después con un 400 que no decía qué campo.
 * `obligatorio` distingue el reintento —sin datos el backend responde 400— de la prueba, donde
 * vacío equivale a `{}`.
 */
export function leerJsonObjeto(
  texto: string,
  { obligatorio = false }: { obligatorio?: boolean } = {},
): LecturaJson {
  const limpio = texto.trim();
  if (!limpio) {
    return obligatorio
      ? { ok: false, error: "Escribe los datos de la consulta." }
      : { ok: true, value: {} };
  }
  let valor: unknown;
  try {
    valor = JSON.parse(limpio);
  } catch {
    return {
      ok: false,
      error: "Los datos no son un JSON válido. Revisa comillas y llaves.",
    };
  }
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return {
      ok: false,
      error:
        'Los datos deben ser un objeto entre llaves, p. ej. {"documentNumber": "123"}.',
    };
  }
  if (obligatorio && Object.keys(valor).length === 0) {
    return {
      ok: false,
      error: "Hacen falta los datos de la consulta: un objeto vacío no basta.",
    };
  }
  return { ok: true, value: valor as Record<string, unknown> };
}

/** El tipo que el backend usa si no se le manda ninguno. */
export const TIPO_DE_CONSULTA_POR_DEFECTO = "IDENTITY_VERIFICATION";

/**
 * El tipo de consulta con el que probar un proveedor: el de su primera política ACTIVA.
 *
 * El probador mandaba `IDENTITY_VERIFICATION` a todos y sólo SEGIP tiene política con ese tipo,
 * así que en los demás la prueba no ejercitaba la política que se aplica de verdad.
 */
export function tipoDeConsultaDePrueba(
  politicas: ReadonlyArray<{ queryType: string; active: boolean }> | undefined,
): string {
  const lista = politicas ?? [];
  const elegida = lista.find((p) => p.active) ?? lista[0];
  return elegida?.queryType ?? TIPO_DE_CONSULTA_POR_DEFECTO;
}

/**
 * Opciones del selector «Tipo de consulta»: los tipos con política del proveedor, sin repetir.
 *
 * `actual` entra siempre, aunque no tenga política, para que el selector no quede vacío (un
 * proveedor sin políticas se prueba con el tipo por defecto del backend).
 */
export function opcionesDeTipoDeConsulta(
  politicas: ReadonlyArray<{ queryType: string; active: boolean }> | undefined,
  actual: string,
): Array<{ value: string; label: string; description: string }> {
  const vistos = new Map<string, boolean>();
  for (const politica of politicas ?? []) {
    vistos.set(
      politica.queryType,
      (vistos.get(politica.queryType) ?? false) || politica.active,
    );
  }
  if (!vistos.has(actual)) vistos.set(actual, false);
  return [...vistos].map(([value, activa]) => ({
    value,
    label: etiquetaTipoConsulta(value),
    description: activa
      ? "Tiene política de costo activa: la prueba la aplica tal cual."
      : "Sin política de costo activa para este proveedor.",
  }));
}
