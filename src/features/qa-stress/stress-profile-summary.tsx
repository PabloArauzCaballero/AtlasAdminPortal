import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import {
  formatBoolean,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/format";
import type { StressProfile } from "@/features/systems/types";
import { ENVIRONMENT_OPTIONS } from "@/features/qa-console/qa-options";
import { optionLabel } from "@/shared/lib/options";

/** La grilla de campos del perfil, separada de la página para que quepa bajo el límite de líneas. */
export function StressProfileSummary({
  profile,
}: Readonly<{ profile: StressProfile }>) {
  return (
    <KeyValueGrid
      items={[
        { label: "Código", value: profile.code, mono: true },
        { label: "Ruta", value: `#${profile.endpointId}`, mono: true },
        {
          label: "Peticiones por segundo objetivo",
          value: formatNumber(profile.targetRps),
        },
        {
          label: "Duración",
          value: `${formatNumber(profile.durationSeconds)} s`,
        },
        { label: "Concurrencia", value: formatNumber(profile.concurrency) },
        { label: "Error máximo aceptable", value: profile.maxErrorRate },
        { label: "P95 máximo (ms)", value: profile.maxP95Ms },
        {
          label: "Ambientes",
          value: profile.environmentScope
            .map((env) => optionLabel(ENVIRONMENT_OPTIONS, env))
            .join(", "),
        },
        { label: "Habilitado", value: formatBoolean(profile.isEnabled) },
        {
          label: "Requiere aprobación",
          value: formatBoolean(profile.requiresApproval),
        },
        { label: "Creado", value: formatDateTime(profile.createdAt) },
        { label: "Actualizado", value: formatDateTime(profile.updatedAt) },
      ]}
    />
  );
}
