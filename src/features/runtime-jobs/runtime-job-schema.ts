import { z } from "zod";
import type {
  RuntimeJobBody,
  RuntimeJobDefinition,
  RuntimeJobNumericField,
} from "./types";

/**
 * Entero opcional escrito en un input de texto.
 *
 * Los campos viven como string en el formulario (un `<input>` vacío es `""`,
 * no `undefined`), así que la validación se hace sobre el string y la
 * conversión a número ocurre en `buildRuntimeJobBody`. Evita el clásico
 * `NaN` de `z.coerce.number()` sobre `""`, que se traduce en un 400 del
 * backend por un campo que el operador ni siquiera llenó.
 */
function optionalInt(min: number, max: number) {
  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[0-9]+$/.test(value),
      "Debe ser un número entero.",
    )
    .refine((value) => {
      if (value === "") return true;
      const parsed = Number(value);
      return parsed >= min && parsed <= max;
    }, `Debe estar entre ${min} y ${max}.`);
}

/** Sin declaración del job, el campo no viaja: cualquier texto vale. */
const unconstrained = z.string();

const NUMERIC_FIELDS: readonly RuntimeJobNumericField[] = [
  "limit",
  "maxIdleMinutes",
  "olderThanMinutes",
  "olderThanDays",
  "retentionDays",
];

/**
 * Validación del formulario, construida PARA UN JOB.
 *
 * Antes era un esquema único con los topes escritos a mano, y eso se rompió en
 * cuanto el backend dejó de tener un solo tope: admite 500 mensajes de outbox
 * pero 10 000 claves de idempotencia y 2 000 flujos de onboarding. Con un tope
 * global, el formulario bloqueaba ejecuciones que el backend acepta y, al revés,
 * dejaba pasar valores que iban a volver como 400.
 *
 * Los rangos viven en el catálogo, junto al job que los impone.
 */
export function runtimeJobFormSchema(definition: RuntimeJobDefinition) {
  const bounds = new Map(
    definition.fields.map((field) => [field.name, field] as const),
  );

  const numeric = (name: RuntimeJobNumericField) => {
    const field = bounds.get(name);
    if (!field) return unconstrained;
    return optionalInt(field.min ?? 1, field.max ?? Number.MAX_SAFE_INTEGER);
  };

  return z.object({
    dryRun: z.boolean(),
    limit: numeric("limit"),
    maxIdleMinutes: numeric("maxIdleMinutes"),
    olderThanMinutes: numeric("olderThanMinutes"),
    olderThanDays: numeric("olderThanDays"),
    retentionDays: numeric("retentionDays"),
    policyCode: z.string().trim().max(120, "Máximo 120 caracteres."),
    customerId: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^[1-9][0-9]*$/.test(value),
        "Debe ser un identificador numérico válido (sin ceros a la izquierda).",
      ),
  });
}

export type RuntimeJobForm = {
  dryRun: boolean;
  limit: string;
  maxIdleMinutes: string;
  olderThanMinutes: string;
  olderThanDays: string;
  retentionDays: string;
  policyCode: string;
  customerId: string;
};

export const emptyRuntimeJobForm: RuntimeJobForm = {
  dryRun: true,
  limit: "",
  maxIdleMinutes: "",
  olderThanMinutes: "",
  olderThanDays: "",
  retentionDays: "",
  policyCode: "",
  customerId: "",
};

/**
 * Arma el body real a partir del formulario, quedándose solo con los campos que
 * el job declara y descartando los vacíos (el backend ya tiene defaults; mandar
 * `undefined` explícito o un campo ajeno al job es un 400).
 *
 * `dryRun` sólo viaja si el job lo acepta: el cierre de onboardings abandonados
 * valida su cuerpo en modo estricto y lo rechazaría.
 */
export function buildRuntimeJobBody(
  definition: RuntimeJobDefinition,
  values: RuntimeJobForm,
): RuntimeJobBody {
  const body: RuntimeJobBody =
    definition.supportsDryRun === false ? {} : { dryRun: values.dryRun };

  for (const field of definition.fields) {
    const raw = values[field.name].trim();
    if (raw === "") continue;

    // El switch (y no un índice dinámico) es lo que deja que el compilador
    // verifique que cada campo va con su tipo real del contrato.
    switch (field.name) {
      case "limit":
      case "maxIdleMinutes":
      case "olderThanMinutes":
      case "olderThanDays":
      case "retentionDays":
        body[field.name] = Number(raw);
        break;
      case "policyCode":
      case "customerId":
        body[field.name] = raw;
        break;
    }
  }

  return body;
}
