import type { Option } from "@/shared/lib/options";
import { formatNumber } from "@/shared/lib/format";

/**
 * Los estados de una identidad de comercio, en palabras de quien la administra.
 *
 * La pantalla ofrecía «invited», «active», «suspended», «disabled» tal cual, en el filtro, en la
 * columna y en el selector de cambio. Aquí se dicen una sola vez, con lo que significan.
 */
export const MERCHANT_USER_STATUS_OPTIONS: Option[] = [
  {
    value: "invited",
    label: "Invitada",
    description:
      "Identidad creada que todavía no puede iniciar sesión: sólo entra cuando pasa a activa.",
  },
  {
    value: "active",
    label: "Activa",
    description:
      "Puede iniciar sesión en el portal del comercio con normalidad.",
  },
  {
    value: "suspended",
    label: "Suspendida",
    description:
      "Acceso cortado de forma temporal; se puede reactivar y su historial se conserva.",
  },
  {
    value: "disabled",
    label: "Dada de baja",
    description:
      "Acceso cortado de forma definitiva, por ejemplo porque la persona dejó el comercio.",
  },
];

/** Las peticiones de acceso que manda el ERP. */
export const PROVISIONING_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  provisioned: "Concedida",
  rejected: "Rechazada",
};

export function merchantUserStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return "Sin estado";
  return (
    MERCHANT_USER_STATUS_OPTIONS.find((opcion) => opcion.value === status)
      ?.label ?? `Otro estado (${status})`
  );
}

export function provisioningStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return "Sin estado";
  return PROVISIONING_STATUS_LABELS[status] ?? `Otro estado (${status})`;
}

/** Los estados a los que se puede llevar una identidad: todos menos el que ya tiene. */
export function statusChangeOptions(actual: string): Option[] {
  return MERCHANT_USER_STATUS_OPTIONS.filter(
    (opcion) => opcion.value !== actual,
  );
}

/**
 * Un contador de cabecera que no miente: mientras carga dice «…», y si la consulta falló dice «—»
 * en vez de un 0 que se leería como «no hay ninguna».
 */
export function formatCount(query: {
  isLoading: boolean;
  error: unknown;
  total: number | undefined;
}): string {
  if (query.error) return "—";
  if (query.isLoading || query.total === undefined) return "…";
  return formatNumber(query.total);
}
