"use client";

import Link from "next/link";
import type { StressRunCapabilities } from "@/features/systems/stress-hooks";

/**
 * Aviso de que en este entorno nadie ejecuta las corridas de estrés. Sin él,
 * «Encolar» respondía «encolado» y la corrida se quedaba en cola para siempre.
 */
export function StressConsumerNotice({
  capabilities,
}: Readonly<{ capabilities: StressRunCapabilities | undefined }>) {
  if (capabilities?.consumerEnabled !== false) return null;
  return (
    <p
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <strong>Encolar está desactivado en este entorno.</strong>{" "}
      {capabilities.disabledReason ??
        "El consumidor de corridas de estrés está apagado."}{" "}
      Lo enciende quien administra el servidor; mientras tanto, una corrida no
      se ejecutaría.
    </p>
  );
}

/** Tras encolar: el número de la corrida y dónde seguirla. */
export function QueuedStressRunLink({
  jobRunId,
}: Readonly<{ jobRunId: string | undefined }>) {
  if (!jobRunId) return null;
  return (
    <p className="text-sm text-atlas-muted">
      Corrida <span className="font-mono">#{jobRunId}</span> en cola.{" "}
      <Link
        className="font-medium text-atlas-accent underline"
        href={`/internal/qa/stress/runs`}
      >
        Seguirla en el historial de corridas
      </Link>
    </p>
  );
}
