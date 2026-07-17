import { z } from "zod";
import type {
  HttpMethod,
  StressEnvironment,
  TestStepInputMode,
  TestSuiteType,
} from "@/features/systems/types";

export const SUITE_TYPES = [
  "INTEGRATION",
  "SMOKE",
  "REGRESSION",
  "E2E_API",
  "LOAD",
] as const satisfies readonly TestSuiteType[];

export const SUITE_ENVIRONMENTS = [
  "LOCAL",
  "STAGING",
  "PRODUCTION_READONLY",
] as const satisfies readonly StressEnvironment[];

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] as const satisfies readonly HttpMethod[];

export const STEP_INPUT_MODES = [
  "DEFAULT",
  "CONFIGURABLE",
  "GENERATED",
  "FROM_PREVIOUS_STEP",
] as const satisfies readonly TestStepInputMode[];

/**
 * Fuente única de la validación de suites. Replica `createTestSuiteSchema` del
 * backend, incluida la regla cruzada: una suite que declara
 * `PRODUCTION_READONLY` pero no está marcada como segura para producción es un
 * 400 (`PRODUCTION_READONLY_REQUIRES_SAFE_SUITE`). Se valida acá para que el
 * operador lo vea en el formulario y no como un error opaco al enviar.
 */
export const suiteSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mínimo 3 caracteres.")
      .max(180, "Máximo 180 caracteres.")
      .regex(/^[A-Z0-9_]+$/, "Solo mayúsculas, números y guion bajo."),
    name: z
      .string()
      .trim()
      .min(3, "Mínimo 3 caracteres.")
      .max(220, "Máximo 220 caracteres."),
    description: z.string().trim().max(4000, "Máximo 4000 caracteres."),
    module: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres.")
      .max(120, "Máximo 120 caracteres."),
    suiteType: z.enum(SUITE_TYPES),
    environmentScope: z
      .array(z.enum(SUITE_ENVIRONMENTS))
      .min(1, "Selecciona al menos un ambiente."),
    isEnabled: z.boolean(),
    requiresSeedData: z.boolean(),
    isSafeForProduction: z.boolean(),
    requiresDestructivePermission: z.boolean(),
  })
  .refine(
    (value) =>
      !value.environmentScope.includes("PRODUCTION_READONLY") ||
      value.isSafeForProduction,
    {
      message:
        "Para incluir PRODUCTION_READONLY la suite debe marcarse como segura para producción.",
      path: ["environmentScope"],
    },
  );

export type SuiteForm = z.infer<typeof suiteSchema>;

export const emptySuiteForm: SuiteForm = {
  code: "",
  name: "",
  description: "",
  module: "",
  suiteType: "INTEGRATION",
  environmentScope: ["LOCAL", "STAGING"],
  isEnabled: true,
  requiresSeedData: true,
  isSafeForProduction: false,
  requiresDestructivePermission: false,
};

/**
 * JSON opcional escrito a mano. Se valida acá y no al enviar porque un
 * `configSchema`/`assertions` mal formado es el error más fácil de cometer en
 * este formulario y el más caro de diagnosticar desde un 400 del backend.
 */
const jsonObjectField = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    try {
      const parsed: unknown = JSON.parse(value);
      return (
        typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      );
    } catch {
      return false;
    }
  }, 'Debe ser un objeto JSON válido (ej: {"key": "value"}).');

export const stepSchema = z.object({
  endpointId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[1-9][0-9]*$/.test(value),
      "Identificador de endpoint inválido.",
    ),
  /**
   * A propósito **no** usa `z.coerce.number()`: el tipo de entrada de `coerce`
   * es `unknown` y rompe el genérico de `useForm`. El número lo entrega el DOM
   * vía `register("stepOrder", { valueAsNumber: true })`.
   */
  stepOrder: z
    .number({ error: "Ingresa un número válido." })
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1.")
    .max(500, "Máximo 500."),
  name: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres.")
    .max(220, "Máximo 220 caracteres."),
  inputMode: z.enum(STEP_INPUT_MODES),
  method: z.enum(HTTP_METHODS),
  pathTemplate: z
    .string()
    .trim()
    .min(1, "La ruta es obligatoria.")
    .max(1200, "Máximo 1200 caracteres.")
    .refine(
      (value) => value.startsWith("/") && !value.startsWith("//"),
      "Debe empezar con una sola barra (ej: /api/v1/recurso).",
    ),
  defaultHeaders: jsonObjectField,
  defaultPayload: jsonObjectField,
  configSchema: jsonObjectField,
  extractors: jsonObjectField,
  assertions: jsonObjectField,
  continueOnFailure: z.boolean(),
  cleanupRequired: z.boolean(),
});

export type StepForm = z.infer<typeof stepSchema>;

export function emptyStepForm(stepOrder: number): StepForm {
  return {
    endpointId: "",
    stepOrder,
    name: "",
    inputMode: "DEFAULT",
    method: "GET",
    pathTemplate: "/",
    defaultHeaders: "",
    defaultPayload: "",
    configSchema: "",
    extractors: "",
    // El default del backend cuando no se manda nada.
    assertions: JSON.stringify({ expectedStatusCodes: [200, 201] }, null, 2),
    continueOnFailure: false,
    cleanupRequired: false,
  };
}
