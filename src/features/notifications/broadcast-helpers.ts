import { z } from "zod";
import type {
  BroadcastAudience,
  CreateBroadcastNotificationInput,
} from "./types";

/**
 * Validación del formulario de difusión. `customerIdsText`/`internalUserIdsText`
 * son campos de UI (coma-separados) que se traducen a arrays en el submit vía
 * `resolveBroadcastRecipients`. Título y cuerpo son obligatorios porque una
 * notificación real sin ellos no tiene sentido.
 */
export const broadcastSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio."),
  body: z.string().trim().min(1, "El mensaje es obligatorio."),
  // NO `z.coerce.number()`: su tipo de entrada es `unknown` y rompe el genérico
  // de `useForm`. El número llega del DOM vía `register(..., valueAsNumber)`.
  priority: z
    .number({ error: "Ingresa un número entre 0 y 100." })
    .int()
    .min(0)
    .max(100),
  category: z.string(),
  icon: z.string(),
  audience: z.enum(["customers", "internal_users", "both"]),
  customerIdsText: z.string(),
  internalUserIdsText: z.string(),
});

export type BroadcastForm = z.infer<typeof broadcastSchema>;

export const broadcastDefaults: BroadcastForm = {
  title: "",
  body: "",
  priority: 0,
  category: "custom_broadcast",
  icon: "",
  audience: "customers",
  customerIdsText: "",
  internalUserIdsText: "",
};

/** Traduce el formulario completo (con los campos de UI) al payload del backend. */
export function broadcastFormToInput(
  form: BroadcastForm,
): CreateBroadcastNotificationInput {
  return {
    title: form.title,
    body: form.body,
    priority: form.priority,
    category: form.category,
    icon: form.icon.trim() ? form.icon.trim() : undefined,
    audience: form.audience,
    ...resolveBroadcastRecipients(
      form.audience,
      form.customerIdsText,
      form.internalUserIdsText,
    ),
  };
}

/**
 * Parsea una lista de IDs separada por coma. Cadena vacía o solo espacios →
 * `undefined`, que es la señal "todos los activos de la audiencia" que espera el
 * backend — distinta de `[]` (nadie).
 */
export function splitIds(value: string): string[] | undefined {
  const ids = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return ids.length > 0 ? ids : undefined;
}

/**
 * Resuelve a QUIÉN se envía según la audiencia. Es el punto de riesgo real de un
 * broadcast: si los IDs de una audiencia se colaran cuando no corresponde, se
 * notificaría a destinatarios equivocados. Regla: los IDs de customers se
 * ignoran si la audiencia es solo `internal_users`, y viceversa.
 */
export function resolveBroadcastRecipients(
  audience: BroadcastAudience,
  customerIdsText: string,
  internalUserIdsText: string,
): { customerIds?: string[]; internalUserIds?: string[] } {
  return {
    customerIds:
      audience === "internal_users" ? undefined : splitIds(customerIdsText),
    internalUserIds:
      audience === "customers" ? undefined : splitIds(internalUserIdsText),
  };
}

export function toBroadcastInput(
  form: CreateBroadcastNotificationInput,
  customerIdsText: string,
  internalUserIdsText: string,
): CreateBroadcastNotificationInput {
  return {
    ...form,
    icon: form.icon?.trim() ? form.icon.trim() : undefined,
    ...resolveBroadcastRecipients(
      form.audience,
      customerIdsText,
      internalUserIdsText,
    ),
  };
}

export function isBroadcastComplete(
  form: CreateBroadcastNotificationInput,
): boolean {
  return form.title.trim().length > 0 && form.body.trim().length > 0;
}
