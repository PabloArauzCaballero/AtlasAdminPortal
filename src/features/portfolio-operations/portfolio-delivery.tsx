"use client";

import { ExternalLink } from "lucide-react";
import { engineUrl } from "@/shared/decision-engine/engine-links";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import type { OutcomeDeliveryStatus } from "./types";

/**
 * Las dos piezas del bloque de desenlaces: el estado de la entrega y el enlace a donde se miden.
 *
 * Salen de `portfolio-page.tsx` porque la pantalla pasó de las 300 líneas que admite
 * `yarn max-lines`. El corte es el que ya marcaba la propia pantalla: la calificación es de Atlas
 * y se queda allí; los desenlaces son del Motor y aquí sólo se enseña si la entrega va al día.
 */
export function EstadoEntrega({
  estado,
}: Readonly<{ estado: OutcomeDeliveryStatus }>) {
  return (
    <div className="space-y-3">
      {!estado.configured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Falta la credencial del plano de gestión del Motor
          (DECISION_ENGINE_OUTCOME_API_KEY): el job no puede entregar nada y la
          cola sólo crece.
        </p>
      ) : null}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Esperando entrega"
          value={formatNumber(estado.pending)}
          hint={
            estado.oldestPendingObservedAt
              ? `El más antiguo se observó el ${formatDateTime(estado.oldestPendingObservedAt)}`
              : "Nada en cola"
          }
          tone={estado.pending > 0 ? "info" : "default"}
        />
        <MetricCard
          label="Reintentando"
          value={formatNumber(estado.retrying)}
          hint={`Hasta ${formatNumber(estado.maxAttempts)} intentos`}
          tone={estado.retrying > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Agotados"
          value={formatNumber(estado.exhausted)}
          tone={estado.exhausted > 0 ? "critical" : "default"}
        />
        <MetricCard
          label="Entregados"
          value={formatNumber(estado.sent)}
          hint={
            estado.lastSentAt
              ? `Última entrega: ${formatDateTime(estado.lastSentAt)}`
              : "Todavía ninguna"
          }
          tone="success"
        />
      </div>
    </div>
  );
}

export function EnlaceMotor() {
  const enlace = engineUrl("/decision-quality");
  if (!enlace) return null;
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-atlas-accent underline"
    >
      Medir en el Motor <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
