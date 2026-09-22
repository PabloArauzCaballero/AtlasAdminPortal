import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import {
  formatBoolean,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/format";
import type { StressProfile } from "@/features/systems/types";

/** La grilla de campos del perfil, separada de la página para que quepa bajo el límite de líneas. */
export function StressProfileSummary({
  profile,
}: Readonly<{ profile: StressProfile }>) {
  return (
    <KeyValueGrid
      items={[
        { label: "Código", value: profile.code, mono: true },
        { label: "Endpoint", value: `#${profile.endpointId}`, mono: true },
        { label: "Target RPS", value: formatNumber(profile.targetRps) },
        {
          label: "Duración",
          value: `${formatNumber(profile.durationSeconds)} s`,
        },
        { label: "Concurrencia", value: formatNumber(profile.concurrency) },
        { label: "Max error rate", value: profile.maxErrorRate },
        { label: "Max p95 ms", value: profile.maxP95Ms },
        { label: "Ambientes", value: profile.environmentScope.join(", ") },
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
