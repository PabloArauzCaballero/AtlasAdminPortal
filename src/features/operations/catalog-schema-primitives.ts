import { z } from "zod";

/**
 * Primitivas compartidas por los esquemas de catálogo. Replican una a una las
 * de `catalog-management.schemas.ts` del backend (`code`, `dateOnly`,
 * `isoDate`, `jsonRecord` y los regex de score) para que el operador vea el
 * error en el formulario y no como un 400 opaco al enviar. Viven acá para que
 * los seis esquemas no las redefinan y se desincronicen entre sí.
 */

/** `code` del backend: `/^[a-zA-Z0-9_.:-]+$/`, 2-140. */
export const codeField = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres.")
  .max(140, "Máximo 140 caracteres.")
  .regex(
    /^[a-zA-Z0-9_.:-]+$/,
    "Solo letras, números y los signos _ . : - (sin espacios).",
  );

/** `positiveId` del backend: entero positivo representado como texto. */
export const positiveIdField = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]*$/, "Debe ser un entero positivo.");

/** `dateOnly` del backend: YYYY-MM-DD. */
export const dateOnlyField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser una fecha YYYY-MM-DD.");

/** `isoDate` del backend: `z.string().datetime()` (ISO 8601 con zona). */
export const isoDateTimeField = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(
        value,
      ),
    "Debe ser una fecha y hora ISO 8601 (ej: 2026-07-17T10:30:00Z).",
  );

/** `confidenceScore`: string `/^\d{1,3}(\.\d{1,2})?$/`. El backend lo recibe como texto, no como número. */
export const confidenceScoreField = z
  .string()
  .trim()
  .regex(
    /^\d{1,3}(\.\d{1,2})?$/,
    "Debe ser un número de hasta 3 enteros y 2 decimales (ej: 85.5).",
  );

/** `scorePointsSuggested`: string `/^-?\d{1,6}(\.\d{1,2})?$/` (admite negativos). */
export const scorePointsField = z
  .string()
  .trim()
  .regex(
    /^-?\d{1,6}(\.\d{1,2})?$/,
    "Debe ser un número de hasta 6 enteros y 2 decimales (ej: -12.5).",
  );

/**
 * Campo opcional de formulario: vacío significa "no enviar". Se modela con
 * `refine` sobre un string en vez de `z.union([z.literal(""), …])` porque la
 * unión reporta el error de las dos ramas y el operador termina leyendo
 * "expected literal ''" en un campo de fecha. El backend distingue `undefined`
 * de `""` (un `""` rompe sus `min()`), así que los adaptadores omiten el campo.
 */
export function optionalPattern(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || pattern.test(value), message);
}

/** Campo opcional de texto libre con tope de longitud (vacío = no enviar). */
export function optionalLength(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (value.length >= min && value.length <= max),
      message,
    );
}

/** Normaliza un campo opcional de formulario: "" y solo-espacios se omiten del body. */
export function omitIfBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** `jsonRecord` del backend: `z.record(z.string(), z.unknown())` — un objeto JSON plano. */
export const jsonRecordSchema = z.record(z.string(), z.unknown());

export type JsonRecord = z.infer<typeof jsonRecordSchema>;

/**
 * Valida que un texto sea un objeto JSON (no un array ni un escalar), que es lo
 * que `jsonRecord` acepta. Devuelve el objeto parseado o un mensaje de error:
 * los formularios editan JSON como texto y necesitan mostrar el fallo en el
 * campo, no perderlo en un catch.
 */
export function parseJsonRecord(
  text: string,
): { ok: true; value: JsonRecord } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "JSON inválido: revisa comillas, comas y llaves.",
    };
  }
  const result = jsonRecordSchema.safeParse(parsed);
  if (!result.success)
    return {
      ok: false,
      error: 'Debe ser un objeto JSON (ej: {"clave": "valor"}).',
    };
  return { ok: true, value: result.data };
}

/** Refinamiento reutilizable para campos `<Textarea>` que contienen un objeto JSON. */
export const jsonRecordTextField = z
  .string()
  .refine((text) => parseJsonRecord(text).ok, {
    message: "Debe ser un objeto JSON válido.",
  });
