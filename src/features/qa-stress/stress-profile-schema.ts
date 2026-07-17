import { z } from "zod";
import type {
  StressEnvironment,
  StressProfile,
  StressProfileStatus,
  UpsertStressProfileInput,
} from "@/features/systems/types";

export const STRESS_ENVIRONMENTS = [
  "LOCAL",
  "STAGING",
  "PRODUCTION_READONLY",
] as const satisfies readonly StressEnvironment[];

export const STRESS_PROFILE_STATUSES = [
  "ACTIVE",
  "DISABLED",
  "NEEDS_REVIEW",
  "DEPRECATED",
] as const satisfies readonly StressProfileStatus[];

/**
 * Campo numérico del formulario.
 *
 * A propósito **no** usa `z.coerce.number()`: el tipo de entrada de `coerce` es
 * `unknown`, y eso rompe el genérico de `useForm` (el resolver queda
 * `Resolver<{targetRps: unknown}>` contra un formulario que promete `number`).
 * En su lugar el número lo entrega el DOM vía `register(..., { valueAsNumber: true })`,
 * así entrada y salida del schema son ambas `number` y el compilador vuelve a
 * servir de algo. Un input vacío llega como `NaN`, que este schema rechaza con
 * el mensaje de abajo en vez del "expected number, received nan" de Zod.
 */
function numberField() {
  return z.number({ error: "Ingresa un número válido." });
}

/**
 * Fuente única de la validación del perfil de stress. Los topes replican
 * `upsertStressProfileSchema` del backend para que el operador vea el error en
 * el campo y no como un 400 opaco después de enviar.
 *
 * Vive fuera del componente para poder probar los límites (y la conversión de
 * `maxErrorRate` de % a fracción) sin montar la pantalla.
 */
export const stressProfileSchema = z.object({
  endpointId: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]*$/, "Selecciona el endpoint objetivo."),
  code: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[A-Z0-9_]{3,180}$/.test(value),
      "Solo mayúsculas, números y guion bajo (3 a 180 caracteres).",
    ),
  name: z
    .string()
    .trim()
    .min(3, "El nombre es obligatorio (mínimo 3 caracteres).")
    .max(220, "Máximo 220 caracteres."),
  targetRps: numberField()
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1 RPS.")
    .max(10000, "Máximo 10000 RPS."),
  durationSeconds: numberField()
    .int("Debe ser un entero.")
    .min(5, "Mínimo 5 segundos.")
    .max(86400, "Máximo 86400 segundos (24 h)."),
  concurrency: numberField()
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1.")
    .max(5000, "Máximo 5000."),
  environmentScope: z
    .array(z.enum(STRESS_ENVIRONMENTS))
    .min(1, "Selecciona al menos un ambiente."),
  /**
   * Se captura en **porcentaje** porque es como lo razona el operador ("1% de
   * error"), pero el backend espera una fracción 0–1. La conversión ocurre en
   * `toUpsertInput`, una sola vez, en lugar de confiar en que quien llene el
   * formulario recuerde escribir 0.01.
   */
  maxErrorRatePercent: numberField()
    .min(0, "No puede ser negativo.")
    .max(100, "Máximo 100%."),
  maxP95Ms: numberField()
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1 ms.")
    .max(300000, "Máximo 300000 ms."),
  isEnabled: z.boolean(),
  requiresApproval: z.boolean(),
  status: z.enum(STRESS_PROFILE_STATUSES),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres."),
});

export type StressProfileForm = z.infer<typeof stressProfileSchema>;

export const emptyStressProfileForm: StressProfileForm = {
  endpointId: "",
  code: "",
  name: "",
  targetRps: 10,
  durationSeconds: 60,
  concurrency: 10,
  environmentScope: ["LOCAL", "STAGING"],
  maxErrorRatePercent: 1,
  maxP95Ms: 1000,
  isEnabled: true,
  requiresApproval: true,
  status: "ACTIVE",
  notes: "",
};

function toPercent(maxErrorRate: StressProfile["maxErrorRate"]): number {
  const fraction = Number(maxErrorRate ?? 0.01);
  return Number.isFinite(fraction) ? fraction * 100 : 1;
}

/** Prellena el formulario desde un perfil existente para editarlo. */
export function toStressProfileForm(profile: StressProfile): StressProfileForm {
  return {
    endpointId: profile.endpointId,
    code: profile.code,
    name: profile.name,
    targetRps: profile.targetRps,
    durationSeconds: profile.durationSeconds,
    concurrency: profile.concurrency,
    environmentScope: profile.environmentScope.filter(
      (scope): scope is StressEnvironment =>
        (STRESS_ENVIRONMENTS as readonly string[]).includes(scope),
    ),
    maxErrorRatePercent: toPercent(profile.maxErrorRate),
    maxP95Ms: profile.maxP95Ms ?? 1000,
    isEnabled: profile.isEnabled,
    requiresApproval: profile.requiresApproval,
    status: (STRESS_PROFILE_STATUSES as readonly string[]).includes(
      profile.status,
    )
      ? (profile.status as StressProfileStatus)
      : "NEEDS_REVIEW",
    notes: profile.notes ?? "",
  };
}

export function toUpsertInput(
  values: StressProfileForm,
): UpsertStressProfileInput {
  return {
    endpointId: values.endpointId,
    // Vacío = el backend deriva `STRESS_<código del endpoint>`.
    code: values.code.trim() || undefined,
    name: values.name,
    targetRps: values.targetRps,
    durationSeconds: values.durationSeconds,
    concurrency: values.concurrency,
    environmentScope: values.environmentScope,
    maxErrorRate: values.maxErrorRatePercent / 100,
    maxP95Ms: values.maxP95Ms,
    isEnabled: values.isEnabled,
    requiresApproval: values.requiresApproval,
    status: values.status,
    notes: values.notes.trim() || undefined,
  };
}
