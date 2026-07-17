import { z } from "zod";
import type { RuntimeJobBody, RuntimeJobDefinition } from "./types";

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

/**
 * Fuente única de la validación de los jobs de runtime. Vive fuera del
 * componente para poder probar los límites sin montar la pantalla, y para que
 * los topes del backend (500 mensajes, 43200 minutos, id numérico) se declaren
 * una sola vez en vez de repetirse como `if` sueltos en cada tarjeta.
 */
export const runtimeJobFormSchema = z.object({
  dryRun: z.boolean(),
  limit: optionalInt(1, 500),
  maxIdleMinutes: optionalInt(1, 43200),
  policyCode: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres.")
    .refine(
      (value) => value === "" || value.length >= 1,
      "El código no puede quedar en blanco.",
    ),
  customerId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[1-9][0-9]*$/.test(value),
      "Debe ser un identificador numérico válido (sin ceros a la izquierda).",
    ),
});

export type RuntimeJobForm = z.infer<typeof runtimeJobFormSchema>;

export const emptyRuntimeJobForm: RuntimeJobForm = {
  dryRun: true,
  limit: "",
  maxIdleMinutes: "",
  policyCode: "",
  customerId: "",
};

/**
 * Arma el body real a partir del formulario, quedándose solo con los campos que
 * el job declara y descartando los vacíos (el backend ya tiene defaults; mandar
 * `undefined` explícito o un campo ajeno al job es un 400).
 */
export function buildRuntimeJobBody(
  definition: RuntimeJobDefinition,
  values: RuntimeJobForm,
): RuntimeJobBody {
  const body: RuntimeJobBody = { dryRun: values.dryRun };

  for (const field of definition.fields) {
    const raw = values[field.name].trim();
    if (raw === "") continue;

    // El switch (y no un índice dinámico) es lo que deja que el compilador
    // verifique que cada campo va con su tipo real del contrato.
    switch (field.name) {
      case "limit":
      case "maxIdleMinutes":
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
